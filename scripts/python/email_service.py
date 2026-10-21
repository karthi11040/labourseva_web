"""
LabourSeva — Email Service
Dispatches emails via Gmail SMTP with secure TLS encryption.
"""
import os
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

def send_email(to_email: str, subject: str, html_content: str, text_content: str = None):
    smtp_host = os.getenv("EMAIL_SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("EMAIL_SMTP_PORT", "587"))
    smtp_user = os.getenv("EMAIL_SMTP_USER", "c2bs.in@gmail.com")
    smtp_pass = os.getenv("EMAIL_SMTP_PASS", "qhfi wcfd cyrb avln")
    from_name = os.getenv("EMAIL_FROM_NAME", "LabourSeva")
    from_email = os.getenv("EMAIL_FROM", "c2bs.in@gmail.com")

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{from_name} <{from_email}>"
    msg["To"] = to_email

    if text_content:
        msg.attach(MIMEText(text_content, "plain", "utf-8"))
    if html_content:
        msg.attach(MIMEText(html_content, "html", "utf-8"))

    context = ssl.create_default_context()
    try:
        with smtplib.SMTP(smtp_host, smtp_port, timeout=15) as server:
            server.ehlo()
            server.starttls(context=context)  # Secure TLS connection
            server.ehlo()
            server.login(smtp_user, smtp_pass)
            server.sendmail(from_email, [to_email], msg.as_string())
        return {"success": True, "to": to_email}
    except Exception as e:
        return {"success": False, "error": str(e)}

def send_otp_email(to_email: str, otp: str, applicant_name: str = "Beneficiary"):
    subject = f"{otp} is your LabourSeva Verification Code"
    html = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 20px;">
      <div style="max-width: 580px; margin: auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background: #1e3a8a; padding: 18px 24px; border-bottom: 4px solid #ea580c; color: white;">
          <h2 style="margin: 0;">LabourSeva</h2>
          <p style="margin: 4px 0 0; font-size: 11px; color: #fdba74;">Tamil Nadu Labour Welfare Board (Secured)</p>
        </div>
        <div style="padding: 24px; color: #1e293b;">
          <p>Dear {applicant_name},</p>
          <p>Your one-time authentication code for LabourSeva portal login is:</p>
          <div style="background: #eff6ff; border: 2px dashed #3b82f6; text-align: center; padding: 16px; margin: 20px 0; border-radius: 8px;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #1e3a8a;">{otp}</span>
          </div>
          <p style="font-size: 12px; color: #64748b;">This OTP is valid for 30 minutes. Never share this code with anyone.</p>
        </div>
      </div>
    </body>
    </html>
    """
    return send_email(to_email, subject, html, text_content=f"Your LabourSeva OTP is {otp}")
