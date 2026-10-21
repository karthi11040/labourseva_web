import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthRetailer } from "@/lib/auth-helpers";
import { generateReceiptPdf, ReceiptData } from "@/lib/generateReceiptPdf";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const retailer = await getAuthRetailer(request);
    if (!retailer) {
      return NextResponse.json(
        { ok: false, error: "Authentication required to download receipt." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const txnIdParam = searchParams.get("id");
    const paymentIdParam = searchParams.get("paymentId") || searchParams.get("payment_id");

    if (!txnIdParam && !paymentIdParam) {
      return NextResponse.json(
        { ok: false, error: "Transaction ID or Payment ID is required." },
        { status: 400 }
      );
    }

    let tx: any = null;

    if (txnIdParam) {
      const numId = Number(txnIdParam);
      const rows = await prisma.$queryRawUnsafe<any[]>(
        `SELECT id, retailer_id, type, amount, source_type, description, created_at 
         FROM retail_wallet_transactions 
         WHERE id = ? AND retailer_id = ? 
         LIMIT 1`,
        numId,
        retailer.id
      ).catch(() => []);
      if (rows && rows.length > 0) tx = rows[0];
    }

    if (!tx && paymentIdParam) {
      const rows = await prisma.$queryRawUnsafe<any[]>(
        `SELECT id, retailer_id, type, amount, source_type, description, created_at 
         FROM retail_wallet_transactions 
         WHERE description LIKE ? AND retailer_id = ? 
         LIMIT 1`,
        `%${paymentIdParam}%`,
        retailer.id
      ).catch(() => []);
      if (rows && rows.length > 0) tx = rows[0];
    }

    if (!tx) {
      return NextResponse.json(
        { ok: false, error: "Payment transaction record not found in ledger." },
        { status: 404 }
      );
    }

    // Extract Razorpay payment ID and Order ID from ledger description if present
    const payIdMatch = tx.description?.match(/Payment ID:\s*([a-zA-Z0-9_]+)/i);
    const orderIdMatch = tx.description?.match(/Order:\s*([a-zA-Z0-9_]+)/i);
    const paymentId = payIdMatch ? payIdMatch[1] : (paymentIdParam || `TXN-${tx.id}`);
    const orderId = orderIdMatch ? orderIdMatch[1] : `ORDER-WALLET-${tx.id}`;

    const receiptNo = `RCT-RET-${String(tx.id).padStart(6, "0")}`;

    const receiptData: ReceiptData = {
      receiptNo,
      paymentReference: paymentId,
      applicationReference: `KENDRA-TOPUP-${tx.id}`,
      serviceType: "DOCUMENT_SERVICE",
      categoryName: "Kendra Prepaid Account",
      serviceName: "Kendra Wallet Balance Recharge",
      customerName: `${retailer.shop_name || retailer.name || "Kendra Operator"} (${retailer.registration_no || `RET-${retailer.id}`})`,
      customerPhone: retailer.phone || "",
      customerEmail: retailer.email || "",
      customerId: retailer.registration_no || `RET-${retailer.id}`,
      amount: Number(tx.amount || 0),
      subtotal: Number(tx.amount || 0),
      totalAmount: Number(tx.amount || 0),
      currency: "INR",
      paymentProvider: "RAZORPAY",
      paymentMethod: "UPI / Instant Gateway",
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      paymentStatus: "SUCCESS",
      paymentDate: tx.created_at ? new Date(tx.created_at).toISOString() : new Date().toISOString(),
      receiptDate: tx.created_at ? new Date(tx.created_at).toLocaleDateString("en-IN") : new Date().toLocaleDateString("en-IN"),
      organizationName: "Labour Welfare Department · Govt of Tamil Nadu",
    };

    const pdfBytes = await generateReceiptPdf(receiptData);

    return new Response(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Receipt_${receiptNo}.pdf"`,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (error: any) {
    console.error("Retailer receipt generation error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to generate receipt PDF: " + (error?.message || "Internal error") },
      { status: 500 }
    );
  }
}
