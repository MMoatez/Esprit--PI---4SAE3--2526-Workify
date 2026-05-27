import csv
import pandas as pd
import numpy as np
from pathlib import Path

BASE     = Path('d:/Smart-Free_GestionMess+Feedback/Smart-Free_GestionMess/ml-service')
CSV_PATH = BASE / 'freelancer_job_postings.csv'
DATA_DIR = BASE / 'data'
DATA_DIR.mkdir(exist_ok=True)

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
print('Shape brut :', df.shape)
print(df.head(2))
