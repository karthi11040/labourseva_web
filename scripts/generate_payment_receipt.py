#!/usr/bin/env python3
"""Generate a restrained, print-friendly A4 payment receipt PDF matching the official Jey Jen Nath letterhead.

Dependencies:
    reportlab, pillow

Usage:
    python scripts/generate_payment_receipt.py
    python scripts/generate_payment_receipt.py --data payment.json --output receipt.pdf
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from datetime import datetime
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from pathlib import Path
from typing import Any, Mapping

from PIL import Image
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader, simpleSplit
from reportlab.pdfgen import canvas

BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_LOGO = BASE_DIR / "images" / "Logo.png"
DEFAULT_BANNER = BASE_DIR / "images" / "Receipt_head.png"
DEFAULT_OUTPUT = BASE_DIR / "public" / "payment_receipt_sample.pdf"

# Minimal palette sampled from the supplied letterhead artwork.
INK = colors.HexColor("#263F3D")
TEAL = colors.HexColor("#355553")
MID = colors.HexColor("#545E5D")
RULE = colors.HexColor("#9FAEAB")
LIGHT_RULE = colors.HexColor("#D5DCDA")
TABLE_HEAD = colors.HexColor("#F0F2F1")
WHITE = colors.white

PAGE_W, PAGE_H = A4
MARGIN = 42
CONTENT_W = PAGE_W - 2 * MARGIN


def money(value: Any) -> Decimal:
    try:
        return Decimal(str(value if value is not None else "0")).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
    except (InvalidOperation, ValueError, TypeError) as exc:
        raise ValueError(f"Invalid monetary value: {value!r}") from exc


def fmt_money(value: Any, currency: str = "INR") -> str:
    return f"{currency.upper()} {money(value):,.2f}"


def clean(value: Any, default: str = "-", max_chars: int = 120) -> str:
    text = re.sub(r"\s+", " ", str(value if value is not None else default)).strip()
    if not text:
        return default
    if len(text) > max_chars:
        return text[: max_chars - 3].rstrip() + "..."
    return text


def amount_words_under_1000(n: int) -> str:
    ones = [
        "Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight",
        "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen",
        "Sixteen", "Seventeen", "Eighteen", "Nineteen",
    ]
    tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]
    parts: list[str] = []
    if n >= 100:
        parts.extend([ones[n // 100], "Hundred"])
        n %= 100
    if n >= 20:
        parts.append(tens[n // 10])
        if n % 10:
            parts.append(ones[n % 10])
    elif n > 0 or not parts:
        parts.append(ones[n])
    return " ".join(parts)


def amount_in_words(value: Any) -> str:
    amount = abs(money(value))
    rupees = int(amount)
    paise = int((amount - Decimal(rupees)) * 100)
    remaining = rupees
    parts: list[str] = []
    for divisor, label in ((10_000_000, "Crore"), (100_000, "Lakh"), (1_000, "Thousand")):
        if remaining >= divisor:
            parts.append(f"{amount_words_under_1000(remaining // divisor)} {label}")
            remaining %= divisor
    if remaining or not parts:
        parts.append(amount_words_under_1000(remaining))
    result = " ".join(parts) + " Rupees"
    if paise:
        result += f" and {amount_words_under_1000(paise)} Paise"
    return ("Minus " if money(value) < 0 else "") + result + " Only"


def date_text(value: Any) -> str:
    if value in (None, ""):
        return "-"
    if isinstance(value, datetime):
        return value.astimezone().strftime("%d %b %Y, %I:%M %p %Z") if value.tzinfo else value.strftime("%d %b %Y, %I:%M %p")
    return clean(value, max_chars=55)


def label_value(c: canvas.Canvas, x: float, y: float, label: str, value: Any,
                max_width: float, *, value_size: float = 9.0, label_size: float = 7.2) -> None:
    """Draw a compact, conventional label/value pair; y is the value baseline."""
    c.setFillColor(MID)
    c.setFont("Helvetica", label_size)
    c.drawString(x, y + 12, clean(label.upper(), max_chars=45))
    value_text = clean(value, max_chars=150)
    c.setFont("Helvetica-Bold", value_size)
    while value_text and c.stringWidth(value_text, "Helvetica-Bold", value_size) > max_width:
        value_text = value_text[:-4].rstrip() + "..."
        if len(value_text) < 4:
            break
    c.setFillColor(INK)
    c.drawString(x, y, value_text or "-")


def section_title(c: canvas.Canvas, title: str, y: float) -> None:
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 9.2)
    c.drawString(MARGIN, y, title.upper())
    c.setStrokeColor(RULE)
    c.setLineWidth(0.55)
    c.line(MARGIN, y - 5, PAGE_W - MARGIN, y - 5)


def draw_wrapped(c: canvas.Canvas, text: str, x: float, y: float, width: float,
                 *, font: str = "Helvetica", size: float = 8.5,
                 leading: float = 11, max_lines: int = 3,
                 color: colors.Color = INK) -> float:
    c.setFillColor(color)
    c.setFont(font, size)
    lines = simpleSplit(clean(text, max_chars=500), font, size, width)
    if len(lines) > max_lines:
        lines = lines[:max_lines]
        if lines:
            lines[-1] = clean(lines[-1], max_chars=max(10, int(width / (size * 0.5))))
    for i, line in enumerate(lines):
        c.drawString(x, y - (i * leading), line)
    return y - max(0, len(lines) - 1) * leading


def generate_receipt(
    payment: Mapping[str, Any],
    logo_path: str | os.PathLike[str] = DEFAULT_LOGO,
    banner_path: str | os.PathLike[str] = DEFAULT_BANNER,
    output_path: str | os.PathLike[str] = DEFAULT_OUTPUT,
    *,
    sample: bool = False,
) -> str:
    """Create an A4 PDF receipt and return the output path."""
    for file_path, description in ((logo_path, "emblem"), (banner_path, "banner")):
        if not Path(file_path).is_file():
            # Fallback to webp if png not found
            alt = Path(str(file_path).replace(".png", ".webp"))
            if alt.is_file():
                file_path = alt
            else:
                raise FileNotFoundError(f"Organization {description} image not found: {file_path}")

    status = clean(payment.get("payment_status", "PAID"), max_chars=40).upper()
    successful = {"PAID", "SUCCESS", "SUCCESSFUL", "CAPTURED", "COMPLETED", "CONFIRMED"}
    if not sample and status not in successful:
        raise ValueError(f"Generate a payment receipt only for a verified successful payment, not {status!r}.")

    currency = clean(payment.get("currency", "INR"), max_chars=8).upper()
    subtotal = money(payment.get("subtotal", payment.get("amount", 0)))
    tax = money(payment.get("tax_amount", 0))
    discount = money(payment.get("discount_amount", 0))
    computed_total = (subtotal + tax - discount).quantize(Decimal("0.01"))
    total = money(payment.get("total_amount", computed_total))
    if min(subtotal, tax, discount, total) < 0:
        raise ValueError("Amounts cannot be negative. Pass discounts as positive values in discount_amount.")

    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(output), pagesize=A4, pageCompression=1)
    c.setTitle(f"Payment Receipt - {clean(payment.get('receipt_number', 'Receipt'), max_chars=80)}")
    c.setAuthor(clean(payment.get("organization_name", "Jey Jen Nath"), max_chars=120))
    c.setSubject("Payment acknowledgement")
    c.setFillColor(WHITE)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)

    # Organization's existing artwork is used as letterhead banner
    with Image.open(str(banner_path)) as im:
        bw, bh = im.size
    banner_h = CONTENT_W * bh / bw
    banner_y = PAGE_H - 28 - banner_h
    c.drawImage(ImageReader(str(banner_path)), MARGIN, banner_y,
                width=CONTENT_W, height=banner_h, preserveAspectRatio=True, mask="auto")

    # Receipt title row: square geometry, normal type, no badges or rounded cards.
    title_y = banner_y - 29
    emblem_size = 33
    c.drawImage(ImageReader(str(logo_path)), MARGIN, title_y - 14,
                width=emblem_size, height=emblem_size, preserveAspectRatio=True, mask="auto")
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 17)
    c.drawString(MARGIN + emblem_size + 10, title_y + 1, "PAYMENT RECEIPT")
    c.setFillColor(MID)
    c.setFont("Helvetica", 8.2)
    c.drawString(MARGIN + emblem_size + 11, title_y - 14, "Payment acknowledgement")

    meta_x = PAGE_W - MARGIN - 174
    label_value(c, meta_x, title_y + 1, "Receipt No.", payment.get("receipt_number", "-"), 174, value_size=8.5)
    label_value(c, meta_x, title_y - 23, "Receipt Date", date_text(payment.get("receipt_date")), 174, value_size=8.3)
    c.setStrokeColor(TEAL)
    c.setLineWidth(1.0)
    rule_y = title_y - 28
    c.line(MARGIN, rule_y, PAGE_W - MARGIN, rule_y)

    # Customer information.
    section_title(c, "Received From", rule_y - 19)
    half = CONTENT_W / 2
    row1 = rule_y - 52
    row2 = rule_y - 80
    label_value(c, MARGIN, row1, "Customer Name", payment.get("customer_name"), half - 20)
    label_value(c, MARGIN + half, row1, "Email Address", payment.get("customer_email"), half - 20)
    label_value(c, MARGIN, row2, "Phone Number", payment.get("customer_phone"), half - 20)
    label_value(c, MARGIN + half, row2, "Customer / User ID", payment.get("customer_id"), half - 20)
    customer_bottom = row2 - 12
    c.setStrokeColor(LIGHT_RULE)
    c.setLineWidth(0.55)
    c.line(MARGIN, customer_bottom, PAGE_W - MARGIN, customer_bottom)

    # Service particulars in a conventional square-corner table.
    service_title_y = customer_bottom - 21
    section_title(c, "Payment For", service_title_y)
    table_top = service_title_y - 14
    header_h = 20
    detail_h = 47
    table_bottom = table_top - header_h - detail_h
    col_x = [MARGIN, MARGIN + CONTENT_W * 0.68,
             MARGIN + CONTENT_W * 0.80, PAGE_W - MARGIN]
    c.setFillColor(TABLE_HEAD)
    c.rect(MARGIN, table_top - header_h, CONTENT_W, header_h, fill=1, stroke=0)
    c.setStrokeColor(RULE)
    c.setLineWidth(0.55)
    c.rect(MARGIN, table_bottom, CONTENT_W, header_h + detail_h, fill=0, stroke=1)
    for x in col_x[1:-1]:
        c.line(x, table_bottom, x, table_top)
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 7.5)
    c.drawString(col_x[0] + 8, table_top - 13, "PARTICULARS")
    c.drawCentredString((col_x[1] + col_x[2]) / 2, table_top - 13, "QTY")
    c.drawRightString(col_x[3] - 8, table_top - 13, "AMOUNT")

    service_name = clean(payment.get("service_name", "Service Payment"), max_chars=140)
    service_type = clean(payment.get("service_type", "Service"), max_chars=45)
    category_name = clean(payment.get("category_name"), max_chars=80)
    desc_x = MARGIN + 8
    draw_wrapped(c, service_name, desc_x, table_top - header_h - 15,
                 col_x[1] - desc_x - 8, font="Helvetica-Bold", size=8.7, leading=10, max_lines=2)
    app_ref = clean(payment.get("application_reference"), max_chars=45)
    draw_wrapped(c, f"{service_type} | Category: {category_name} | Application: {app_ref}", desc_x,
                 table_top - header_h - 33, col_x[1] - desc_x - 8,
                 font="Helvetica", size=7.0, leading=9, max_lines=1, color=MID)
    c.setFillColor(INK)
    c.setFont("Helvetica", 8.5)
    c.drawCentredString((col_x[1] + col_x[2]) / 2, table_top - header_h - 25,
                        clean(payment.get("quantity", 1), max_chars=8))
    c.drawRightString(col_x[3] - 8, table_top - header_h - 25, fmt_money(subtotal, currency))

    # Amount in words at left, arithmetic summary at right.
    summary_top = table_bottom - 15
    words_w = CONTENT_W * 0.56
    c.setFillColor(MID)
    c.setFont("Helvetica-Bold", 7.4)
    c.drawString(MARGIN, summary_top, "AMOUNT IN WORDS")
    draw_wrapped(c, amount_in_words(total), MARGIN, summary_top - 17,
                 words_w, font="Helvetica", size=8.2, leading=10, max_lines=3)

    sum_x = MARGIN + CONTENT_W * 0.64
    right_x = PAGE_W - MARGIN
    y = summary_top
    c.setFont("Helvetica", 8.2)
    for label, value in (("Subtotal", subtotal), ("Tax", tax), ("Discount", discount)):
        c.setFillColor(MID)
        c.drawString(sum_x, y, label)
        c.setFillColor(INK)
        shown = f"- {fmt_money(value, currency)}" if label == "Discount" and value else fmt_money(value, currency)
        c.drawRightString(right_x, y, shown)
        y -= 14
    total_y = y - 2
    c.setStrokeColor(RULE)
    c.line(sum_x, total_y + 8, right_x, total_y + 8)
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 9.3)
    c.drawString(sum_x, total_y - 7, "TOTAL PAID")
    c.drawRightString(right_x, total_y - 7, fmt_money(total, currency))

    # Transaction identifiers in a plain two-row grid.
    trans_title_y = total_y - 34
    section_title(c, "Payment Details", trans_title_y)
    trans_top = trans_title_y - 30
    gap = 27
    col3 = CONTENT_W / 3
    trans_fields = [
        ("Payment Reference", payment.get("payment_reference")),
        ("Payment Provider", payment.get("payment_provider", "Razorpay")),
        ("Payment Method", payment.get("payment_method")),
        ("Payment Date", date_text(payment.get("payment_date"))),
        ("Razorpay Order ID", payment.get("razorpay_order_id")),
        ("Razorpay Payment ID", payment.get("razorpay_payment_id")),
    ]
    for idx, (label, value) in enumerate(trans_fields):
        row, col = divmod(idx, 3)
        x = MARGIN + col * col3 + 2
        yy = trans_top - row * gap
        label_value(c, x, yy, label, value, col3 - 14, value_size=7.5, label_size=6.8)
    trans_bottom = trans_top - gap - 11
    c.setStrokeColor(LIGHT_RULE)
    c.line(MARGIN, trans_bottom, PAGE_W - MARGIN, trans_bottom)

    # Status is plain text, not a decorative badge.
    status_line_y = trans_bottom - 21
    c.setFillColor(MID)
    c.setFont("Helvetica", 8.1)
    c.drawString(MARGIN, status_line_y, "Payment status:")
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 8.1)
    status_label = "SUCCESSFUL / VERIFIED" if status in successful else status.replace("_", " ")
    c.drawString(MARGIN + 75, status_line_y, status_label)
    c.setFillColor(MID)
    c.setFont("Helvetica", 7.4)
    note = clean(payment.get(
        "receipt_note",
        "This receipt records the payment details shown above. Please retain it for your records."
    ), max_chars=200)
    draw_wrapped(c, note, MARGIN, status_line_y - 19, CONTENT_W - 8,
                 font="Helvetica", size=7.4, leading=9, max_lines=2, color=MID)

    # Plain issuer note; no fabricated signature or decorative seal.
    issuer_y = 108
    c.setStrokeColor(LIGHT_RULE)
    c.line(MARGIN, issuer_y + 22, PAGE_W - MARGIN, issuer_y + 22)
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 8.4)
    c.drawString(MARGIN, issuer_y + 5,
                 clean(payment.get("organization_name", "JEY JEN NATH"), max_chars=80).upper())
    c.setFillColor(MID)
    c.setFont("Helvetica", 7.2)
    c.drawString(MARGIN, issuer_y - 8, "Computer-generated receipt; no signature is required.")
    c.setFillColor(MID)
    c.setFont("Helvetica", 7.1)
    c.drawRightString(PAGE_W - MARGIN, issuer_y + 5, "Keep this receipt for reference")

    footer_y = 49
    c.setStrokeColor(RULE)
    c.setLineWidth(0.55)
    c.line(MARGIN, footer_y + 12, PAGE_W - MARGIN, footer_y + 12)
    c.setFillColor(MID)
    c.setFont("Helvetica", 7.0)
    c.drawString(MARGIN, footer_y, "Receipt generated from the recorded payment transaction.")
    if sample:
        c.setFillColor(TEAL)
        c.setFont("Helvetica-Bold", 7.2)
        c.drawRightString(PAGE_W - MARGIN, footer_y, "SAMPLE - NOT VALID AS PROOF OF PAYMENT")

    c.showPage()
    c.save()
    return str(output)


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate a print-friendly A4 payment receipt PDF.")
    parser.add_argument("--data", help="JSON file containing a server-verified payment record (or JSON string).")
    parser.add_argument("--logo", default=str(DEFAULT_LOGO), help="Path to the square emblem PNG/WebP.")
    parser.add_argument("--banner", default=str(DEFAULT_BANNER), help="Path to the wide letterhead PNG/WebP.")
    parser.add_argument("--output", help="Output PDF path.")
    parser.add_argument("--sample", action="store_true", help="Mark output as sample data.")
    args = parser.parse_args()

    if args.data:
        try:
            # Try reading as file first, then as raw JSON string
            if Path(args.data).is_file():
                with open(args.data, "r", encoding="utf-8") as f:
                    payment = json.load(f)
            else:
                payment = json.loads(args.data)
        except Exception:
            payment = json.loads(args.data)
        is_sample = bool(args.sample)
        out_path = args.output or "payment_receipt.pdf"
    else:
        # Default sample payment record
        payment = {
            "receipt_number": "JJN/2026/000123",
            "application_reference": "APP-2026-000123",
            "payment_reference": "PAY-2026-000123",
            "customer_name": "Sample Customer",
            "customer_email": "customer@example.com",
            "customer_phone": "+91 98765 43210",
            "customer_id": "USR-000123",
            "service_type": "E-Service",
            "category_name": "Certificates",
            "service_name": "Income Certificate Application",
            "quantity": 1,
            "subtotal": "499.00",
            "tax_amount": "0.00",
            "discount_amount": "0.00",
            "total_amount": "499.00",
            "currency": "INR",
            "payment_status": "PAID",
            "payment_provider": "Razorpay",
            "payment_method": "UPI",
            "payment_date": "14 Oct 2026, 10:30 AM IST",
            "receipt_date": "14 Oct 2026, 10:31 AM IST",
            "razorpay_order_id": "order_SAMPLE123456",
            "razorpay_payment_id": "pay_SAMPLE123456",
            "organization_name": "Jey Jen Nath",
        }
        is_sample = True
        out_path = args.output or str(DEFAULT_OUTPUT)

    result = generate_receipt(payment, args.logo, args.banner, out_path, sample=is_sample)
    print(result)


if __name__ == "__main__":
    main()
