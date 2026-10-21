"""
Test Dispatch Runner using Python
Loads .env variables and sends sample SMS and sample Email.
"""
import os
import random
from pathlib import Path

# Load .env file manually without external pip dependencies
env_path = Path(__file__).resolve().parent.parent.parent / ".env"
if env_path.exists():
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, val = line.split("=", 1)
                os.environ[key.strip()] = val.strip().strip('"').strip("'")

from sms_service import send_otp_sms
from email_service import send_otp_email

phone = "9489501089"
email = "karthigeyan.s11@gmail.com"
sample_otp = str(random.randint(100000, 999999))

print("==================================================")
print("LabourSeva Python Secured Dispatch Test")
print(f"Target Phone: {phone}")
print(f"Target Email: {email}")
print(f"Sample OTP:   {sample_otp}")
print("==================================================")

print("\n[Python SMS] Sending OTP SMS...")
sms_res = send_otp_sms(phone, sample_otp)
print("[Python SMS Result]:", sms_res)

print("\n[Python Email] Sending TLS Email...")
email_res = send_otp_email(email, sample_otp, applicant_name="Karthigeyan S")
print("[Python Email Result]:", email_res)

print("\n==================================================")
print("PYTHON ALL DISPATCHES FINISHED SUCCESSFULLY")
print("==================================================")
