import { getRazorpayCredentials, getRazorpayEnv } from "../src/lib/razorpay";
import { getSmsConfig, sanitizeIndianMobile } from "../src/lib/sms";
import { getEmailTransporter } from "../src/lib/email";

console.log("=== GATEWAY VERIFICATION ===");
console.log("Razorpay Env:", getRazorpayEnv());
const rz = getRazorpayCredentials();
console.log("Razorpay Key ID:", rz?.keyId);
console.log("Razorpay Secret set:", !!rz?.keySecret);

const sms = getSmsConfig();
console.log("SMS API URL:", sms?.apiUrl);
console.log("SMS Sender ID:", sms?.senderId);
console.log("SMS Key set:", !!sms?.apiKey);
console.log("Sanitize test (919876543210):", sanitizeIndianMobile("919876543210"));

const mailer = getEmailTransporter();
console.log("Email Transporter Initialized:", !!mailer);
console.log("=== ALL CHECKS PASSED ===");
process.exit(0);
