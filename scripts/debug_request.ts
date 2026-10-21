import { POST as handleVerificationRequest } from "../src/app/api/verification/request/route";

async function run() {
  const payload = {
    userType: "customer",
    userId: 8881,
    applicantName: "A. Muthu Kumar",
    phone: "9876543210",
    email: "muthu@citizen.local",
    idType: "Aadhaar Card",
    idNumber: "1234-5678-9012",
    documentUrl: "/uploads/proofs/aadhaar_muthu.pdf",
    roleSpecificData: {
      rationNo: "05/W/882103",
      district: "Madurai",
    },
  };

  const req = new Request("http://localhost:3000/api/verification/request", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-role": "CUSTOMER",
      "x-user-id": "8881",
    },
    body: JSON.stringify(payload),
  });

  try {
    const res = await handleVerificationRequest(req);
    console.log("Status:", res.status);
    const body = await res.json();
    console.log("Response Body:", body);
  } catch (err: any) {
    console.error("Direct catch error:", err);
  } finally {
    process.exit();
  }
}

run();
