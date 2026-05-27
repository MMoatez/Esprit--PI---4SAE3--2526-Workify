from __future__ import annotations

import io
import os
import re
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Optional

import fitz
import numpy as np
import pytesseract
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from PIL import Image

app = FastAPI(title="Workify Receipt AI Service", version="1.0.0")

SUPPORTED_IMAGE_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/webp"}
SUPPORTED_PDF_TYPES = {"application/pdf"}


def _configure_tesseract_cmd() -> None:
    env_cmd = os.getenv("TESSERACT_CMD")
    if env_cmd:
        pytesseract.pytesseract.tesseract_cmd = env_cmd
        return

    candidates = [
        Path("C:/Program Files/Tesseract-OCR/tesseract.exe"),
        Path("C:/Program Files (x86)/Tesseract-OCR/tesseract.exe"),
    ]
    for candidate in candidates:
        if candidate.exists():
            pytesseract.pytesseract.tesseract_cmd = str(candidate)
            return


_configure_tesseract_cmd()


@dataclass
class ExtractedData:
    amount: Optional[str] = None
    date: Optional[str] = None
    bank: Optional[str] = None
    transaction_id: Optional[str] = None


def _read_image_from_pdf(content: bytes) -> Image.Image:
    doc = fitz.open(stream=content, filetype="pdf")
    if doc.page_count == 0:
        raise ValueError("Empty PDF")

    page = doc[0]
    pix = page.get_pixmap(matrix=fitz.Matrix(1.6, 1.6), alpha=False)
    return Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB")


def _read_image(file: UploadFile, content: bytes) -> Image.Image:
    if file.content_type in SUPPORTED_PDF_TYPES:
        return _read_image_from_pdf(content)

    if file.content_type not in SUPPORTED_IMAGE_TYPES:
        raise ValueError(f"Unsupported content type: {file.content_type}")

    return Image.open(io.BytesIO(content)).convert("RGB")


def _ocr_text(image: Image.Image) -> str:
    # Upscale first to improve OCR on faint scans.
    upscale = image.convert("RGB").resize(
        (image.width * 2, image.height * 2),
        resample=Image.Resampling.LANCZOS,
    )
    gray = upscale.convert("L")
    arr = np.array(gray, dtype=np.uint8)

    # Gentle denoise + contrast boost for receipt text.
    arr = np.clip((arr.astype(np.int16) - 25) * 1.35, 0, 255).astype(np.uint8)
    bin_arr = np.where(arr > 175, 255, arr).astype(np.uint8)

    enhanced_gray = Image.fromarray(arr)
    enhanced_bin = Image.fromarray(bin_arr)

    # Two OCR passes balance quality and response time.
    texts: list[str] = []
    texts.append(pytesseract.image_to_string(enhanced_gray, lang="eng", config="--oem 3 --psm 6"))
    texts.append(pytesseract.image_to_string(enhanced_bin, lang="eng", config="--oem 3 --psm 6"))

    merged = "\n".join(t for t in texts if t and t.strip())
    return merged if merged.strip() else pytesseract.image_to_string(image, lang="eng")


def _extract_amount(text: str) -> Optional[str]:
    patterns = [
        # ex: "Montant versement(en chiffres): 30.000 TND"
        r"(?:montant\s+versement\s*\(?\s*en\s+chiffres\s*\)?|amount|total|montant)\s*[:=-]?\s*([0-9]{1,3}(?:[ .,][0-9]{3})*(?:[.,][0-9]{2,3})?|[0-9]+)",
        # ex: "30.000 TND" or "149,00 EUR"
        r"([0-9]{1,3}(?:[ .,][0-9]{3})*(?:[.,][0-9]{2,3})?|[0-9]+)\s*(?:tnd|eur|usd)",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match:
            raw = match.group(1).strip().replace(" ", "")
            # Keep decimal separator as dot for downstream numeric parsing.
            return raw.replace(",", ".")
    return None


def _extract_date(text: str) -> Optional[str]:
    patterns = [
        r"\b(\d{2}[/-]\d{2}[/-]\d{4})\b",
        r"\b(\d{4}[/-]\d{2}[/-]\d{2})\b",
        # ex: "Date operation : 10 APR 2019"
        r"\b(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})\b",
    ]
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            token = match.group(1).strip()
            normalized = _normalize_textual_date(token)
            return normalized if normalized else token
    return None


def _normalize_textual_date(token: str) -> Optional[str]:
    month_map = {
        "JAN": 1,
        "JANUARY": 1,
        "FEV": 2,
        "FEB": 2,
        "FEBRUARY": 2,
        "MARS": 3,
        "MAR": 3,
        "MARCH": 3,
        "AVR": 4,
        "APR": 4,
        "APRIL": 4,
        "MAI": 5,
        "MAY": 5,
        "JUIN": 6,
        "JUN": 6,
        "JUNE": 6,
        "JUIL": 7,
        "JUL": 7,
        "JULY": 7,
        "AOUT": 8,
        "AUG": 8,
        "AUGUST": 8,
        "SEPT": 9,
        "SEP": 9,
        "SEPTEMBER": 9,
        "OCT": 10,
        "OCTOBER": 10,
        "NOV": 11,
        "NOVEMBER": 11,
        "DEC": 12,
        "DECEMBER": 12,
        "DECEMBRE": 12,
    }

    m = re.match(r"^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})$", token.strip(), flags=re.IGNORECASE)
    if not m:
        return None

    day = int(m.group(1))
    month_key = m.group(2).upper()
    year = int(m.group(3))
    month = month_map.get(month_key)
    if not month:
        return None

    try:
        parsed = datetime(year, month, day)
        return parsed.strftime("%d/%m/%Y")
    except ValueError:
        return None


def _extract_transaction_id(text: str) -> Optional[str]:
    patterns = [
        r"(?:transaction\s*(?:id|ref(?:erence)?)|reference|ref)\s*[:#=-]?\s*([A-Z0-9-]{6,})",
        r"\b([A-Z]{2,}[0-9]{4,}[A-Z0-9-]*)\b",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match:
            return match.group(1).strip()
    return None


def _extract_bank(text: str) -> Optional[str]:
    text_upper = re.sub(r"\s+", " ", text.upper())

    bank_patterns: list[tuple[str, str]] = [
        ("BIAT", r"\bBIAT\b|BANQUE\s+INTERNATIONALE\s+ARABE\s+DE\s+TUNISIE"),
        ("BH BANK", r"\bBH\s*BANK\b|\bBANQUE\s+DE\s+L\'?HABITAT\b"),
        ("BNA", r"\bBNA\b"),
        ("AMEN BANK", r"\bAMEN\s*BANK\b"),
        ("ATB", r"\bATB\b"),
        ("STB", r"\bSTB\b"),
        ("UIB", r"\bUIB\b"),
        ("ZITOUNA", r"\bZITOUNA\b"),
        ("ATTIJARI", r"\bATTIJARI\b"),
        ("CITI", r"\bCITI\b"),
        ("HSBC", r"\bHSBC\b"),
        ("SOCIETE GENERALE", r"\bSOCIETE\s+GENERALE\b"),
        ("BNP", r"\bBNP\b"),
    ]

    for bank_name, pattern in bank_patterns:
        if re.search(pattern, text_upper, flags=re.IGNORECASE):
            return bank_name
    return None


def _looks_structured(text: str) -> bool:
    required_tokens = [
        "amount", "montant", "date", "operation", "banque", "bank",
        "transaction", "reference", "référence", "receipt", "transfer",
        "versement", "compte", "agence", "caisse", "dinars", "tnd",
    ]
    lowered = text.lower()
    token_hits = sum(1 for token in required_tokens if token in lowered)
    return token_hits >= 3


def _contains_suspicious_tokens(text: str) -> bool:
    lowered = text.lower()
    suspicious = ["lorem ipsum", "photoshop", "sample only", "fake receipt", "demo"]
    return any(token in lowered for token in suspicious)


def _is_unrelated_document(text: str) -> bool:
    lowered = text.lower()
    # Typical CV/job document terms that should not be classified as a payment receipt.
    unrelated_tokens = [
        "curriculum vitae", "cv", "resume", "employment", "job", "skills",
        "education", "experience", "linkedin", "portfolio", "certification",
        "emploi", "compétence", "formation", "expérience professionnelle",
        "lettre de motivation",
    ]
    hits = sum(1 for token in unrelated_tokens if token in lowered)
    return hits >= 2


def _looks_like_receipt_document(text: str, extracted: ExtractedData) -> bool:
    lowered = text.lower()
    receipt_tokens = [
        "reçu", "receipt", "banque", "bank", "versement", "transaction",
        "référence", "reference", "agence", "caisse", "compte", "montant",
        "tnd", "dinars", "operation",
    ]
    token_hits = sum(1 for token in receipt_tokens if token in lowered)
    extracted_hits = sum(1 for v in [extracted.amount, extracted.date, extracted.bank, extracted.transaction_id] if v)
    # Consider it receipt-like if either many receipt tokens are present,
    # or moderate tokens plus at least one extracted payment field.
    return token_hits >= 4 or (token_hits >= 2 and extracted_hits >= 1)


def _parse_amount(value: Optional[str]) -> Optional[float]:
    if not value:
        return None
    try:
        return float(value.replace(",", "."))
    except ValueError:
        return None


def _is_date_valid(value: Optional[str]) -> bool:
    if not value:
        return False
    normalized = _normalize_textual_date(value)
    if normalized:
        value = normalized
    fmts = ["%d/%m/%Y", "%d-%m-%Y", "%Y/%m/%d", "%Y-%m-%d"]
    for fmt in fmts:
        try:
            datetime.strptime(value, fmt)
            return True
        except ValueError:
            continue
    return False


def _compute_confidence(extracted: ExtractedData, text: str, expected_amount: Optional[float], expected_bank: Optional[str]) -> tuple[float, list[str]]:
    score = 20.0
    reasons: list[str] = []

    if _is_unrelated_document(text):
        score = 10.0
        reasons.append("Document appears unrelated to payment receipt")

    if extracted.amount:
        score += 20
        reasons.append("Amount detected")
    else:
        reasons.append("Amount not detected")

    if extracted.date and _is_date_valid(extracted.date):
        score += 15
        reasons.append("Valid date detected")
    else:
        reasons.append("Date missing or invalid")

    if extracted.bank:
        score += 15
        reasons.append("Bank name detected")
    else:
        reasons.append("Bank name not detected")

    if extracted.transaction_id:
        score += 15
        reasons.append("Transaction reference detected")
    else:
        reasons.append("Transaction reference missing")

    if _looks_structured(text):
        score += 10
        reasons.append("Receipt layout appears structured")
    else:
        reasons.append("Receipt structure looks weak")

    if _contains_suspicious_tokens(text):
        score -= 25
        reasons.append("Suspicious text pattern detected")

    detected_amount = _parse_amount(extracted.amount)
    if expected_amount is not None and detected_amount is not None:
        if abs(expected_amount - detected_amount) <= max(1.0, expected_amount * 0.05):
            score += 10
            reasons.append("Amount matches expected value")
        else:
            score -= 12
            reasons.append("Amount does not match expected value")

    if expected_bank and extracted.bank:
        if expected_bank.strip().upper() in extracted.bank.upper():
            score += 8
            reasons.append("Bank matches expected bank")
        else:
            score -= 8
            reasons.append("Bank does not match expected bank")

    # If OCR could not extract key fields but there is no explicit fraud signal,
    # route to manual validation instead of hard rejection.
    no_key_fields = not any([
        extracted.amount,
        extracted.date,
        extracted.bank,
        extracted.transaction_id,
    ])
    if no_key_fields and not _contains_suspicious_tokens(text) and _looks_like_receipt_document(text, extracted):
        score = max(score, 55.0)
        reasons.append("Low OCR signal detected, sent to manual validation")

    # If the content does not look like a receipt at all, keep it rejected.
    if not _looks_like_receipt_document(text, extracted):
        score = min(score, 35.0)
        reasons.append("Document does not match receipt patterns")

    score = max(0.0, min(100.0, score))
    return score, reasons


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/verify-receipt")
async def verify_receipt(
    file: UploadFile = File(...),
    filename: Optional[str] = Form(None),
    expected_amount: Optional[float] = Form(None),
    expected_bank: Optional[str] = Form(None),
):
    try:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Empty file")

        image = _read_image(file, content)
        text = _ocr_text(image)

        extracted = ExtractedData(
            amount=_extract_amount(text),
            date=_extract_date(text),
            bank=_extract_bank(text),
            transaction_id=_extract_transaction_id(text),
        )

        confidence, reasons = _compute_confidence(extracted, text, expected_amount, expected_bank)

        if confidence > 80:
            status = "VALID"
        elif confidence >= 50:
            status = "SUSPICIOUS"
        else:
            status = "INVALID"

        return {
            "confidence": round(confidence, 2),
            "status": status,
            "extracted_data": {
                "amount": extracted.amount,
                "date": extracted.date,
                "bank": extracted.bank,
                "transaction_id": extracted.transaction_id,
            },
            "reasons": reasons,
            "filename": filename or file.filename,
        }
    except HTTPException:
        raise
    except Exception as ex:
        raise HTTPException(status_code=422, detail=f"Receipt analysis failed: {ex}") from ex
