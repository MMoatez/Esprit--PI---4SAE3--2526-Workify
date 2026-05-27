"""
Workify ML Service — FastAPI
Port : 8085

Modules :
  /segment     → K-Means : segment projet/client
  /predict     → Random Forest : budget optimal
  /recommend   → Top-N projets pour un freelancer
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import pandas as pd
import numpy as np
import joblib
import os

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(title="Workify ML Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # restreindre en prod
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")
DATA_PATH  = os.path.join(BASE_DIR, "freelancer_job_postings.csv")

# ---------------------------------------------------------------------------
# Chargement des modèles (lazy — chargés au premier appel)
# ---------------------------------------------------------------------------
_models = {}

def load_model(name: str):
    if name not in _models:
        path = os.path.join(MODELS_DIR, f"{name}.pkl")
        if not os.path.exists(path):
            raise HTTPException(
                status_code=503,
                detail=f"Modèle '{name}' introuvable. Lancez d'abord les notebooks."
            )
        _models[name] = joblib.load(path)
    return _models[name]

def load_data() -> pd.DataFrame:
    if "df" not in _models:
        _models["df"] = pd.read_csv(DATA_PATH, on_bad_lines='skip', engine='python')
    return _models["df"]

# ---------------------------------------------------------------------------
# Schémas
# ---------------------------------------------------------------------------

class SegmentRequest(BaseModel):
    budget: float                      # budget moyen du projet/client
    client_rating: float               # note moyenne (0–5)
    client_review_count: int           # nb d'avis

class SegmentResponse(BaseModel):
    segment: int                       # 0..3
    label: str                         # ex. "High-Budget"

class PredictRequest(BaseModel):
    job_title: str
    tags: List[str]
    rate_type: str                     # "hourly" | "fixed"
    client_country: Optional[str] = None

class PredictResponse(BaseModel):
    predicted_min: float
    predicted_max: float
    predicted_avg: float
    currency: str

class RecommendRequest(BaseModel):
    category: str                      # ex. "Web Development"
    target_budget: float               # budget cible du freelancer
    top_n: int = 5

class ProjectSummary(BaseModel):
    projectId: str
    job_title: str
    tags: List[str]
    avg_price: float
    rate_type: str
    client_country: Optional[str]
    score: float                       # score de pertinence (0–1)

class RecommendResponse(BaseModel):
    recommendations: List[ProjectSummary]

# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "service": "Workify ML Service", "version": "1.0.0"}

@app.get("/health", tags=["Health"])
def health():
    return {"status": "healthy"}


@app.post("/segment", response_model=SegmentResponse, tags=["Segmentation"])
def segment(req: SegmentRequest):
    """
    Classe un projet/client dans l'un des 4 segments K-Means.
    Labels : Low-Budget · Mid-Budget · High-Budget · Premium
    """
    kmeans    = load_model("kmeans")
    scaler    = load_model("scaler_seg")
    label_map = {0: "Low-Budget", 1: "Mid-Budget", 2: "High-Budget", 3: "Premium"}

    features = np.array([[req.budget, req.client_rating, req.client_review_count]])
    features_scaled = scaler.transform(features)
    cluster = int(kmeans.predict(features_scaled)[0])

    return SegmentResponse(segment=cluster, label=label_map.get(cluster, "Unknown"))


@app.post("/predict", response_model=PredictResponse, tags=["Prediction"])
def predict(req: PredictRequest):
    """
    Prédit le budget optimal (min / max / avg) d'un nouveau projet.
    """
    rf_avg     = load_model("rf_avg")
    vectorizer = load_model("tfidf")

    tags_str = " ".join(req.tags)
    tags_vec = vectorizer.transform([tags_str]).toarray()

    rate_hourly = 1 if req.rate_type == "hourly" else 0
    # segment=1 (Mid-Budget) par défaut
    meta = np.array([[rate_hourly, 1]])

    X = np.hstack([tags_vec, meta])

    # Ajuster si le modèle attend un nombre différent de features
    expected = rf_avg.n_features_in_
    current  = X.shape[1]
    if current < expected:
        pad = np.zeros((1, expected - current))
        X = np.hstack([X, pad])
    elif current > expected:
        X = X[:, :expected]

    pred_avg = float(rf_avg.predict(X)[0])
    pred_avg = max(pred_avg, 0)

    return PredictResponse(
        predicted_min=round(pred_avg * 0.75, 2),
        predicted_max=round(pred_avg * 1.35, 2),
        predicted_avg=round(pred_avg, 2),
        currency="USD"
    )


@app.post("/recommend", tags=["Recommendation"])
def recommend(req: RecommendRequest):
    """
    Retourne les top-N projets les plus pertinents pour un freelancer
    selon sa catégorie et son budget cible.
    """
    try:
        df = load_data()

        # Colonnes disponibles (debug)
        cols = list(df.columns)

        # Trouver la colonne prix
        price_col = next((c for c in ["avg_price", "avgPrice", "price", "budget"] if c in cols), None)
        title_col = next((c for c in ["job_title", "jobTitle", "title"] if c in cols), None)
        tags_col  = next((c for c in ["tags", "tag", "skills"] if c in cols), None)
        rate_col  = next((c for c in ["rate_type", "rateType", "type"] if c in cols), None)
        country_col = next((c for c in ["client_country", "clientCountry", "country"] if c in cols), None)

        if not price_col or not title_col:
            return {"error": f"Colonnes manquantes. Disponibles: {cols}"}

        # Filtrage
        mask = df[title_col].str.contains(req.category, case=False, na=False)
        subset = df[mask].copy()
        if subset.empty:
            subset = df.copy()

        # Score budget
        subset["_diff"] = (pd.to_numeric(subset[price_col], errors="coerce").fillna(0) - req.target_budget).abs()
        max_diff = subset["_diff"].max() or 1
        subset["score"] = 1 - (subset["_diff"] / max_diff)
        subset = subset.sort_values("score", ascending=False).head(req.top_n)

        results = []
        for _, row in subset.iterrows():
            raw_tags = str(row.get(tags_col, "") if tags_col else "")
            # Nettoyer le format liste Python ["tag1", "tag2"] ou ['tag1']
            raw_tags = raw_tags.strip("[]").replace("'", "").replace('"', "")
            tags = [t.strip() for t in raw_tags.split(",") if t.strip()]
            results.append({
                "projectId": str(row.get("projectId", "")),
                "job_title": str(row.get(title_col, "")),
                "tags": tags,
                "avg_price": float(pd.to_numeric(row.get(price_col, 0), errors="coerce") or 0),
                "rate_type": str(row.get(rate_col, "") if rate_col else ""),
                "client_country": str(row.get(country_col, "") if country_col else "") or None,
                "score": round(float(row["score"]), 4)
            })

        return {"recommendations": results}

    except Exception as e:
        import traceback
        return {"error": str(e), "type": type(e).__name__, "trace": traceback.format_exc()}
