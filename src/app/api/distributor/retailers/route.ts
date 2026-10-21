import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthDistributor } from "@/lib/auth-helpers";
import { hashPassword } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const distributor = await getAuthDistributor(request);
    if (!distributor) {
      return NextResponse.json({ ok: false, error: "Unauthorized Distributor session" }, { status: 401 });
    }

    const retailers = await prisma.$queryRawUnsafe<any[]>(
      `SELECT 
         ru.id,
         ru.registration_no,
         ru.name,
         ru.shop_name,
         ru.business_type,
         ru.phone,
         ru.email,
         ru.wallet_balance,
         ru.status,
         ru.district_id,
         ru.created_at,
         dist.name AS district_name,
         (SELECT COUNT(*) FROM retail_orders ro WHERE ro.user_id = ru.id) AS order_count
       FROM retail_users ru
       LEFT JOIN districts dist ON ru.district_id = dist.id
       WHERE ru.distributor_id = ? OR ru.distributor_id = ?
       ORDER BY ru.id DESC`,
      distributor.id,
      String(distributor.id)
    ).catch(() => []);

    return NextResponse.json({
      ok: true,
      distributorWalletBalance: Number(distributor.wallet_balance || 0),
      retailers: retailers.map(r => ({
        id: r.id,
        registrationNo: r.registration_no || `RET-${r.id}`,
        name: r.name,
        shopName: r.shop_name || "Kendra Service Counter",
        businessType: r.business_type || "Common Service Kendra",
        phone: r.phone,
        email: r.email,
        walletBalance: Number(r.wallet_balance || 0),
        status: r.status || "Pending",
        district: r.district_name || "Tamil Nadu",
        orderCount: Number(r.order_count || 0),
        joinedDate: r.created_at,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const distributor = await getAuthDistributor(request);
    if (!distributor) {
      return NextResponse.json({ ok: false, error: "Unauthorized Distributor session" }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    // Action 1: Fund Retailer Wallet (Prepaid Balance Transfer)
    if (action === "fund_retailer" || action === "transfer_funds") {
      const { retailerId, amount, note } = body;
      const numAmount = Number(amount);

      if (!retailerId || !numAmount || numAmount <= 0) {
        return NextResponse.json(
          { ok: false, error: "Please specify a valid Kendra and transfer amount." },
          { status: 400 }
        );
      }

      // Check distributor wallet balance
      const distRows = await prisma.$queryRawUnsafe<any[]>(
        "SELECT id, wallet_balance, name FROM distributors WHERE id = ? LIMIT 1",
        distributor.id
      );
      const currentDistBalance = Number(distRows[0]?.wallet_balance || 0);

      if (currentDistBalance < numAmount) {
        return NextResponse.json(
          {
            ok: false,
            error: `Insufficient distributor balance (Available: ₹${currentDistBalance.toFixed(2)}, Requested: ₹${numAmount.toFixed(2)}). Please top up your distributor wallet first.`,
          },
          { status: 400 }
        );
      }

      // Check retailer exists
      const retRows = await prisma.$queryRawUnsafe<any[]>(
        "SELECT id, shop_name, name, registration_no, wallet_balance FROM retail_users WHERE id = ? LIMIT 1",
        Number(retailerId)
      );

      if (!retRows || retRows.length === 0) {
        return NextResponse.json({ ok: false, error: "Target Kendra not found" }, { status: 404 });
      }

      const ret = retRows[0];
      const transferRef = `TRF-DIST-${distributor.id}-RET-${ret.id}-${Date.now()}`;

      // 1. Deduct from distributor
      await prisma.$executeRawUnsafe(
        "UPDATE distributors SET wallet_balance = wallet_balance - ? WHERE id = ?",
        numAmount,
        distributor.id
      );

      // 2. Record debit in distributor_transactions
      await prisma.$executeRawUnsafe(
        `INSERT INTO distributor_transactions (distributor_id, amount, type, description, reference_id, created_at)
         VALUES (?, ?, 'debit', ?, ?, NOW())`,
        String(distributor.id),
        numAmount,
        `Wallet balance transfer to Kendra: ${ret.shop_name || ret.name} (${ret.registration_no || ret.id}). Note: ${note || "Prepaid Kendra Funding"}`,
        transferRef
      );

      // 3. Credit retailer wallet
      await prisma.$executeRawUnsafe(
        "UPDATE retail_users SET wallet_balance = wallet_balance + ? WHERE id = ?",
        numAmount,
        ret.id
      );

      // 4. Record credit in retail_wallet_transactions
      await prisma.$executeRawUnsafe(
        `INSERT INTO retail_wallet_transactions (retailer_id, type, amount, source_type, description, created_at)
         VALUES (?, 'credit', ?, 'distributor_transfer', ?, NOW())`,
        ret.id,
        numAmount,
        `Prepaid wallet funded by Distributor: ${distributor.name}. Ref: ${transferRef}`
      );

      return NextResponse.json({
        ok: true,
        message: `Successfully transferred ₹${numAmount.toFixed(2)} to ${ret.shop_name || ret.name}.`,
        newDistributorBalance: currentDistBalance - numAmount,
        newRetailerBalance: Number(ret.wallet_balance || 0) + numAmount,
        transferRef,
      });
    }

    // Action 2: Onboard New Kendra Retailer
    if (action === "onboard_retailer") {
      const { name, shopName, phone, email, password, address, panNo, aadhaarNo, districtId } = body;

      if (!name || !shopName || !phone || !password) {
        return NextResponse.json(
          { ok: false, error: "Please fill in Operator Name, Shop Name, Phone, and Password." },
          { status: 400 }
        );
      }

      // Check existing phone / email
      const existing = await prisma.$queryRawUnsafe<any[]>(
        "SELECT id FROM retail_users WHERE phone = ? OR email = ? LIMIT 1",
        phone,
        email || ""
      );

      if (existing && existing.length > 0) {
        return NextResponse.json(
          { ok: false, error: "A Kendra operator with this phone number or email is already registered." },
          { status: 400 }
        );
      }

      const regNo = `LS/RET/2026/${Math.floor(10000 + Math.random() * 90000)}`;
      const pwdHash = hashPassword(password);

      await prisma.$executeRawUnsafe(
        `INSERT INTO retail_users (
           registration_no, name, shop_name, business_type, phone, email, 
           password, plain_password, address, pan_no, aadhaar_no, district_id, 
           distributor_id, status, wallet_balance, created_at
         ) VALUES (?, ?, ?, 'Common Service Kendra', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Approved', 0.00, NOW())`,
        regNo,
        name,
        shopName,
        phone,
        email || null,
        pwdHash,
        password,
        address || null,
        panNo || null,
        aadhaarNo || null,
        districtId ? Number(districtId) : null,
        String(distributor.id)
      );

      return NextResponse.json({
        ok: true,
        message: `Kendra operator "${shopName}" onboarded successfully with Registration ID ${regNo}.`,
        registrationNo: regNo,
      });
    }

    return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
