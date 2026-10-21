"""
LabourSeva — Python SMS Service
Dispatches transactional SMS via My Dreams Technology gateway with secure HTTPS/HTTP requests.
"""
import os
import urllib.parse
import urllib.request
import json
import re

def sanitize_mobile(mobile: str) -> str:
    digits = re.sub(r"\D", "", str(mobile))
    if len(digits) == 12 and digits.startswith("91"):
        return digits[2:]
    return digits

def send_sms(mobile: str, message: str, api_url: str = None, api_key: str = None, sender_id: str = None):
    api_url = api_url or os.getenv("SMS_API_URL", "http://app.mydreamstechnology.in/vb/apikey.php")
    api_key = api_key or os.getenv("SMS_API_KEY", "pdtPO9aL4m8RSQTV")
    sender_id = sender_id or os.getenv("SMS_SENDER_ID", "MDTDMO")

    clean_num = sanitize_mobile(mobile)
    if len(clean_num) != 10:
        return {"success": False, "error": f"Invalid 10-digit mobile number: {mobile}"}

    params = {
        "apikey": api_key,
        "senderid": sender_id,
        "number": clean_num,
        "message": message
    }
    query_string = urllib.parse.urlencode(params)
    req_url = f"{api_url}?{query_string}"

    req = urllib.request.Request(req_url, headers={"User-Agent": "LabourSeva-Python/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            body = response.read().decode("utf-8")
            status = response.getcode()
            return {"success": status == 200, "status": status, "body": body}
    except Exception as e:
        return {"success": False, "error": str(e)}

def send_otp_sms(mobile: str, otp: str, app_name: str = "labourseva.com"):
    template = os.getenv(
        "SMS_TEMPLATE",
        "Dear {otp}, Your OTP for login to {app_name}. Valid for 30 minutes. Please do not share this OTP. Regards, My Dreams Technology Team"
    )
    message = template.replace("{otp}", str(otp)).replace("{app_name}", app_name)
    return send_sms(mobile, message)
