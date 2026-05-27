"""
Lance tout le pipeline ML en une seule commande :
  python run_pipeline.py

Génère : data/clean.csv + tous les modèles dans models/
"""

import csv
import pandas as pd
import numpy as np
import joblib
from pathlib import Path
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.metrics.pairwise import cosine_similarity

BASE       = Path(__file__).parent
CSV_PATH   = BASE / 'freelancer_job_postings.csv'
DATA_DIR   = BASE / 'data'
MODELS_DIR = BASE / 'models'
DATA_DIR.mkdir(exist_ok=True)
MODELS_DIR.mkdir(exist_ok=True)

# ── 1. CHARGEMENT ────────────────────────────────────────────────────────────
print('\n[1/5] Chargement du CSV...')

COLS = ['projectId','job_title','job_description','tags','client_state',
        'client_country','client_average_rating','client_review_count',
        'min_price','max_price','avg_price','currency','rate_type']

rows = []
with open(CSV_PATH, encoding='utf-8', errors='replace') as f:
    for i, raw in enumerate(f):
        if i == 0: continue
        line = raw.strip()
        while line.endswith(';'): line = line[:-1]
        if line.startswith('"') and line.endswith('"'):
            line = line[1:-1].replace('""', '"')
        parts = list(csv.reader([line]))[0]
        if len(parts) >= 13:
            rows.append(parts[:13])

df = pd.DataFrame(rows, columns=COLS)
print(f'   Chargé : {df.shape[0]} projets')

# ── 2. NETTOYAGE ─────────────────────────────────────────────────────────────
print('\n[2/5] Nettoyage...')

num_cols = ['client_average_rating','client_review_count','min_price','max_price','avg_price']
for col in num_cols:
    df[col] = pd.to_numeric(df[col], errors='coerce')

df = df.dropna(subset=['avg_price','min_price','max_price'])

Q1, Q3 = df['avg_price'].quantile(0.01), df['avg_price'].quantile(0.99)
df = df[(df['avg_price'] >= Q1) & (df['avg_price'] <= Q3)]

def clean_tags(raw):
    if pd.isna(raw): return ''
    s = str(raw).strip("[]").replace("'","").replace('"','')
    return ','.join(t.strip().lower() for t in s.split(',') if t.strip())

df['tags_clean'] = df['tags'].apply(clean_tags)
df['rate_type']  = df['rate_type'].str.strip().str.lower()
df = df[df['rate_type'].isin(['hourly','fixed'])]
df['client_average_rating'] = df['client_average_rating'].fillna(df['client_average_rating'].median())
df['client_review_count']   = df['client_review_count'].fillna(0).astype(int)
df['client_country']        = df['client_country'].fillna('Unknown')

df.to_csv(DATA_DIR / 'clean.csv', index=False)
print(f'   Après nettoyage : {df.shape[0]} projets → data/clean.csv')

# ── 3. SEGMENTATION K-MEANS ──────────────────────────────────────────────────
print('\n[3/5] Segmentation K-Means (K=4)...')

X_seg = df[['avg_price','client_average_rating','client_review_count']].fillna(0).values
scaler_seg = StandardScaler()
X_scaled   = scaler_seg.fit_transform(X_seg)

kmeans = KMeans(n_clusters=4, random_state=42, n_init=10)
df['segment'] = kmeans.fit_predict(X_scaled)

score = silhouette_score(X_scaled, df['segment'])
print(f'   Silhouette : {score:.3f}')

seg_budget = df.groupby('segment')['avg_price'].mean().sort_values()
LABELS = {seg_budget.index[0]:'Low-Budget', seg_budget.index[1]:'Mid-Budget',
          seg_budget.index[2]:'High-Budget', seg_budget.index[3]:'Premium'}
df['segment_label'] = df['segment'].map(LABELS)
print('  ', df['segment_label'].value_counts().to_dict())

joblib.dump(kmeans,     MODELS_DIR / 'kmeans.pkl')
joblib.dump(scaler_seg, MODELS_DIR / 'scaler_seg.pkl')
df.to_csv(DATA_DIR / 'segmented.csv', index=False)
print('   Sauvegardés : kmeans.pkl  scaler_seg.pkl')

# ── 4. PREDICTION RANDOM FOREST ──────────────────────────────────────────────
print('\n[4/5] Prédiction Random Forest...')

tfidf  = TfidfVectorizer(max_features=100, ngram_range=(1,2))
X_tags = tfidf.fit_transform(df['tags_clean'].fillna('')).toarray()
X_rate = (df['rate_type'] == 'hourly').astype(int).values.reshape(-1,1)
X      = np.hstack([X_tags, X_rate])

y_min, y_max, y_avg = df['min_price'].values, df['max_price'].values, df['avg_price'].values

X_tr, X_te, ymn_tr, ymn_te, ymx_tr, ymx_te, yav_tr, yav_te = train_test_split(
    X, y_min, y_max, y_avg, test_size=0.2, random_state=42)

RF = dict(n_estimators=200, max_depth=15, min_samples_leaf=5, n_jobs=-1, random_state=42)
rf_min = RandomForestRegressor(**RF).fit(X_tr, ymn_tr)
rf_max = RandomForestRegressor(**RF).fit(X_tr, ymx_tr)
rf_avg = RandomForestRegressor(**RF).fit(X_tr, yav_tr)

for name, m, yt in [('min',rf_min,ymn_te),('max',rf_max,ymx_te),('avg',rf_avg,yav_te)]:
    p = m.predict(X_te)
    print(f'   {name}_price → MAE={mean_absolute_error(yt,p):.1f}  R2={r2_score(yt,p):.3f}')

joblib.dump(rf_min, MODELS_DIR / 'rf_min.pkl')
joblib.dump(rf_max, MODELS_DIR / 'rf_max.pkl')
joblib.dump(rf_avg, MODELS_DIR / 'rf_avg.pkl')
joblib.dump(tfidf,  MODELS_DIR / 'tfidf.pkl')
print('   Sauvegardés : rf_min.pkl  rf_max.pkl  rf_avg.pkl  tfidf.pkl')

# ── 5. RECOMMANDATION ────────────────────────────────────────────────────────
print('\n[5/5] Recommandation (TF-IDF cosinus)...')

df['corpus'] = (df['job_title'].fillna('') + ' ' + df['tags_clean'].fillna('')).str.lower()
tfidf_rec      = TfidfVectorizer(max_features=200, ngram_range=(1,2), stop_words='english')
project_matrix = tfidf_rec.fit_transform(df['corpus'])
print(f'   Matrice projets : {project_matrix.shape}')

# Test rapide
q   = tfidf_rec.transform(['web development javascript react'])
sim = cosine_similarity(q, project_matrix).flatten()
top = np.argsort(sim)[::-1][:3]
print('   Top 3 projets web :')
for i in top:
    print(f'     • {df.iloc[i]["job_title"][:60]}  score={sim[i]:.3f}')

joblib.dump(tfidf_rec,      MODELS_DIR / 'tfidf_rec.pkl')
joblib.dump(project_matrix, MODELS_DIR / 'project_matrix.pkl')
print('   Sauvegardés : tfidf_rec.pkl  project_matrix.pkl')

# ── DONE ─────────────────────────────────────────────────────────────────────
print('\n✓ Pipeline complet. Modèles dans models/')
print('  Lance maintenant : uvicorn api.main:app --port 8085 --reload')
