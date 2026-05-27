# Workify Receipt AI Service

FastAPI microservice for OCR-based receipt validation.

## Features
- Handles `image/png`, `image/jpeg`, `image/jpg`, `image/webp`, and `application/pdf`
- Extracts fields: amount, date, bank, transaction_id
- Returns confidence score (0-100)
- Decision-ready statuses: `VALID`, `SUSPICIOUS`, `INVALID`

## Run Locally
1. Create virtualenv and install deps:
```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

2. Start service:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8001
```

3. Health check:
```bash
curl http://localhost:8001/health
```

## API
### POST /verify-receipt
Multipart form fields:
- `file` (required)
- `expected_amount` (optional)
- `expected_bank` (optional)
- `filename` (optional)

Example response:
```json
{
  "confidence": 87.2,
  "status": "VALID",
  "extracted_data": {
    "amount": "149.00",
    "date": "12/04/2026",
    "bank": "BIAT",
    "transaction_id": "TRX88A1D2"
  },
  "reasons": [
    "Amount detected",
    "Valid date detected"
  ],
  "filename": "receipt_123.pdf"
}
```

## Notes
- For production OCR quality, install native Tesseract and ensure it is available in PATH.
- This service is designed to be replaced or augmented with LayoutLM/Donut/TrOCR later.

### Windows OCR Setup
If Tesseract is not available, install it with:
```bash
winget install --id tesseract-ocr.tesseract -e --accept-source-agreements --accept-package-agreements
```

If your `tesseract.exe` is not on PATH, set:
```bash
set TESSERACT_CMD=C:\Program Files\Tesseract-OCR\tesseract.exe
```
