import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthRetailer } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const retailer = await getAuthRetailer(request);
    if (!retailer) {
      return NextResponse.json({ ok: false, error: "Unauthorized Kendra session" }, { status: 401 });
    }

    // Load available services
    const statutoryServices = await prisma.$queryRawUnsafe<any[]>(
      "SELECT id, name, description, payment_amount, retailer_amount FROM services WHERE status = 'active' ORDER BY id ASC"
    ).catch(() => []);

    const citizenEServices = await prisma.$queryRawUnsafe<any[]>(
      "SELECT id, service_name, service_cost, main_category_id, sub_category_id, details FROM es_services WHERE status = 'active' ORDER BY id ASC"
    ).catch(() => []);

    // Load active main categories for e-services
    const categories = await prisma.$queryRawUnsafe<any[]>(
      "SELECT id, category_name FROM es_main_categories WHERE status = 'active' OR status IS NULL ORDER BY id ASC"
    ).catch(() => []);

    // Load dynamic questionnaire fields for all e-services
    const esIds = citizenEServices.map(e => e.id);
    let fieldsByService: Record<number, any[]> = {};
    if (esIds.length > 0) {
      const fieldsList = await prisma.$queryRawUnsafe<any[]>(`
        SELECT id, service_id, field_name, field_type, is_required, field_options, sort_order
        FROM es_service_fields
        WHERE service_id IN (${esIds.join(",")})
        ORDER BY sort_order ASC, id ASC
      `).catch(() => []);

      for (const f of fieldsList) {
        if (!fieldsByService[f.service_id]) fieldsByService[f.service_id] = [];
        let parsedConfig: any = {};
        if (f.field_options) {
          if (typeof f.field_options === "string") {
            try {
              parsedConfig = JSON.parse(f.field_options);
            } catch {
              parsedConfig = { options: f.field_options };
            }
          } else if (typeof f.field_options === "object") {
            parsedConfig = f.field_options;
          }
        }

        const rawOptions = parsedConfig.options || parsedConfig.formats || (typeof f.field_options === "string" ? f.field_options : "");

        fieldsByService[f.service_id].push({
          id: f.id,
          key: `field_${f.id}`,
          name: f.field_name,
          type: f.field_type,
          required: Boolean(f.is_required),
          options: rawOptions,
          placeholder: parsedConfig.placeholder || "",
          helpText: parsedConfig.helpText || "",
          validation: parsedConfig.validation || "",
          width: parsedConfig.width || "full",
          section: parsedConfig.section || "General Information",
          sortOrder: f.sort_order,
        });
      }
    }

    // Load districts
    const districts = await prisma.$queryRawUnsafe<any[]>(
      "SELECT id, name, nameTa, district_code FROM districts WHERE active = 1 OR status = 'active' ORDER BY name ASC"
    ).catch(() => []);

    return NextResponse.json({
      ok: true,
      retailerId: Number(retailer.id),
      walletBalance: Number(retailer.wallet_balance || 0),
      statutoryServices: statutoryServices.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        fee: Number(s.payment_amount || 50),
        retailerFee: Number(s.retailer_amount || s.payment_amount || 50),
        type: "STATUTORY",
      })),
      esServices: citizenEServices.map(e => ({
        id: e.id,
        name: e.service_name,
        description: e.details,
        fee: Number(e.service_cost || 60),
        retailerFee: Number(e.service_cost || 60),
        type: "E_SERVICE",
        mainCategoryId: e.main_category_id,
        fields: fieldsByService[e.id] || [],
      })),
      categories: categories.map(c => ({ id: c.id, name: c.category_name })),
      districts,
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const retailer = await getAuthRetailer(request);
    if (!retailer) {
      return NextResponse.json({ ok: false, error: "Unauthorized Kendra session" }, { status: 401 });
    }

    const approvalRows = await prisma.$queryRawUnsafe<any[]>(
      "SELECT status, is_approved FROM retail_users WHERE id = ? LIMIT 1", retailer.id
    );
    if (!approvalRows.length || Number(approvalRows[0].is_approved) !== 1 || String(approvalRows[0].status || "").toLowerCase() !== "approved") {
      return NextResponse.json({ ok: false, error: "Your retailer account must be verified by staff before submitting service applications." }, { status: 403 });
    }

    const body = await request.json();
    const {
      citizenName,
      citizenPhone,
      citizenAadhaar,
      citizenEmail,
      serviceType, // "STATUTORY" | "E_SERVICE"
      serviceId,
      districtId,
      talukId,
      panchayatId,
      address,
      notes,
      formData,
      serviceFieldValues,
      documents,
    } = body;

    const applicantData = formData && typeof formData === "object" ? formData : {};
    const name = String(applicantData.applicantName || citizenName || "").trim();
    const rawPhone = String(applicantData.mobileNumber || citizenPhone || "");
    const cleanPhone = rawPhone.replace(/\D/g, "");
    const rawAadhaar = String(applicantData.aadhaar || citizenAadhaar || "").replace(/\D/g, "");
    const email = String(applicantData.emailId || citizenEmail || "").trim();

    if (!name || cleanPhone.length !== 10 || !serviceId) {
      return NextResponse.json(
        { ok: false, error: "Please enter the citizen name, a valid 10-digit mobile number, and select a service." },
        { status: 400 }
      );
    }
    if (rawAadhaar && rawAadhaar.length !== 4 && rawAadhaar.length !== 12) {
      return NextResponse.json({ ok: false, error: "Enter a valid 12-digit Aadhaar number or 4-digit last characters." }, { status: 400 });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ ok: false, error: "Enter a valid email address." }, { status: 400 });
    }

    // 1. Fetch service details to determine exact fee
    let serviceName = "Welfare Service";
    let fee = 50;

    if (serviceType === "E_SERVICE") {
      const es = await prisma.$queryRawUnsafe<any[]>(
        "SELECT id, service_name, service_cost FROM es_services WHERE id = ? LIMIT 1",
        Number(serviceId)
      );
      if (es && es.length > 0) {
        serviceName = es[0].service_name;
        fee = Number(es[0].service_cost || 60);
      }
    } else {
      const s = await prisma.$queryRawUnsafe<any[]>(
        "SELECT id, name, payment_amount, retailer_amount FROM services WHERE id = ? LIMIT 1",
        Number(serviceId)
      );
      if (s && s.length > 0) {
        serviceName = s[0].name;
        fee = Number(s[0].retailer_amount || s[0].payment_amount || 50);
      }
    }

    // 2. Fetch fresh retailer wallet balance
    const retRows = await prisma.$queryRawUnsafe<any[]>(
      "SELECT id, wallet_balance, shop_name, registration_no, distributor_id FROM retail_users WHERE id = ? LIMIT 1",
      retailer.id
    );
    const freshRet = retRows[0] || retailer;
    const currentBalance = Number(freshRet.wallet_balance || 0);

    if (currentBalance < fee) {
      return NextResponse.json(
        {
          ok: false,
          error: `Insufficient Kendra wallet balance (Available: ₹${currentBalance.toFixed(2)}, Required: ₹${fee.toFixed(2)}). Please top up your wallet.`,
        },
        { status: 400 }
      );
    }

    // 3. Check commission rules for retailer profit
    const commRules = await prisma.$queryRawUnsafe<any[]>(
      "SELECT retailer_profit, distributor_value FROM commission_rules WHERE service_id = ? LIMIT 1",
      Number(serviceId)
    ).catch(() => []);
    const retailerProfit = commRules.length > 0 ? Number(commRules[0].retailer_profit || 0) : 10;
    const distributorOverride = commRules.length > 0 ? Number(commRules[0].distributor_value || 0) : 5;

    // 4. Generate references
    const orderTimestamp = Date.now();
    const appRef = `LS-KENDRA-${String(retailer.id).padStart(4, "0")}-${orderTimestamp.toString().slice(-6)}`;
    const receiptNo = `RCP-KND-${orderTimestamp}`;

    // Full structured submitted data object
    const finalAddress = applicantData.currentStreet
      ? `${applicantData.currentDoorNo ? applicantData.currentDoorNo + ", " : ""}${applicantData.currentStreet}, ${applicantData.currentVillage || ""}${applicantData.currentTaluk ? ", " + applicantData.currentTaluk : ""}, Pin - ${applicantData.currentPinCode || ""}`
      : String(address || "").trim();

    const submittedDataPayload = {
      fullName: name,
      phone: cleanPhone,
      aadhaar: rawAadhaar,
      aadhaarLast4: rawAadhaar.slice(-4),
      email,
      address: finalAddress,
      districtId,
      talukId,
      panchayatId,
      assistedByKendra: freshRet.shop_name,
      kendraRegNo: freshRet.registration_no,
      kendraId: retailer.id,
      notes,
      demographics: {
        appellation: applicantData.appellation || "",
        applicantName: name,
        applicantNameTa: applicantData.applicantNameTa || "",
        gender: applicantData.gender || "",
        maritalStatus: applicantData.maritalStatus || "",
        dob: applicantData.dob || "",
        relationship: applicantData.relationship || "",
        fatherName: applicantData.fatherName || "",
        fatherNameTa: applicantData.fatherNameTa || "",
        motherName: applicantData.motherName || "",
        motherNameTa: applicantData.motherNameTa || "",
        husbandName: applicantData.husbandName || "",
        husbandNameTa: applicantData.husbandNameTa || "",
        religion: applicantData.religion || "",
        community: applicantData.community || "",
        occupation: applicantData.occupation || "",
        education: applicantData.education || "",
      },
      currentAddress: {
        doorNo: applicantData.currentDoorNo || "",
        street: applicantData.currentStreet || "",
        ward: applicantData.currentWard || "",
        village: applicantData.currentVillage || "",
        taluk: applicantData.currentTaluk || "",
        district: applicantData.currentDistrict || "",
        pinCode: applicantData.currentPinCode || "",
      },
      permanentAddress: {
        sameAsCurrent: Boolean(applicantData.sameAsCurrent),
        doorNo: applicantData.permanentDoorNo || applicantData.currentDoorNo || "",
        street: applicantData.permanentStreet || applicantData.currentStreet || "",
        ward: applicantData.permanentWard || applicantData.currentWard || "",
        village: applicantData.permanentVillage || applicantData.currentVillage || "",
        taluk: applicantData.permanentTaluk || applicantData.currentTaluk || "",
        district: applicantData.permanentDistrict || applicantData.currentDistrict || "",
        pinCode: applicantData.permanentPinCode || applicantData.currentPinCode || "",
      },
      serviceFieldValues: serviceFieldValues || {},
      serviceName,
      serviceFee: fee,
      appRef,
      receiptNo,
    };

    const uploadedFilesPayload = Array.isArray(documents)
      ? documents
          .filter((d: any) => d && d.uploaded && d.fileUrl)
          .map((d: any) => ({
            id: d.id,
            key: d.key,
            label: d.label,
            fileName: d.fileName,
            fileUrl: d.fileUrl,
            fileSize: d.fileSize || 0,
          }))
      : [];

    // 5. Execute DB updates
    const newBalance = currentBalance - fee;

    // 5a. Deduct fee from Kendra wallet
    await prisma.$executeRawUnsafe(
      "UPDATE retail_users SET wallet_balance = wallet_balance - ? WHERE id = ?",
      fee,
      retailer.id
    );

    // 5b. Record debit in retail_wallet_transactions
    await prisma.$executeRawUnsafe(
      `INSERT INTO retail_wallet_transactions (retailer_id, type, amount, source_type, source_id, description, created_at)
       VALUES (?, 'debit', ?, 'service_order', ?, ?, NOW())`,
      retailer.id,
      fee,
      Number(serviceId),
      `Assisted Application: ${serviceName} for ${name} (${cleanPhone})`
    );

    // 5c. Record in retail_orders
    await prisma.$executeRawUnsafe(
      `INSERT INTO retail_orders (user_id, service_id, district_id, amount, payment_status, status, transaction_id, payment_response, created_at)
       VALUES (?, ?, ?, ?, 'success', 'pending', ?, ?, NOW())`,
      retailer.id,
      Number(serviceId),
      districtId ? Number(districtId) : null,
      fee,
      receiptNo,
      JSON.stringify(submittedDataPayload)
    );

    // 5d. Also insert into service_requests or es_service_requests so Verification employee can process it!
    if (serviceType === "E_SERVICE") {
      await prisma.$executeRawUnsafe(
        `INSERT INTO es_service_requests (application_number, retailer_id, service_id, creator_type, submitted_data, submitted_files, amount, payment_status, status, created_at, updated_at)
         VALUES (?, ?, ?, 'retailer', ?, ?, ?, 'Success', 'pending', NOW(), NOW())`,
        appRef,
        retailer.id,
        Number(serviceId),
        JSON.stringify(submittedDataPayload),
        JSON.stringify(uploadedFilesPayload),
        fee
      ).catch(() => {});
    } else {
      await prisma.$executeRawUnsafe(
        `INSERT INTO service_requests (service_id, amount, status, payment_date, gateway_provider, gateway_order_id, district_id, taluk_id, panchayat_id, purchase_notes, created_at)
         VALUES (?, ?, 'paid', NOW(), 'KENDRA_WALLET', ?, ?, ?, ?, ?, NOW())`,
        Number(serviceId),
        fee,
        receiptNo,
        districtId ? Number(districtId) : null,
        talukId ? Number(talukId) : null,
        panchayatId ? Number(panchayatId) : null,
        JSON.stringify({
          ...submittedDataPayload,
          documents: uploadedFilesPayload,
        })
      ).catch(() => {});
    }

    // 5e. If retailer has commission profit, record credit to Kendra ledger
    if (retailerProfit > 0) {
      await prisma.$executeRawUnsafe(
        "UPDATE retail_users SET wallet_balance = wallet_balance + ? WHERE id = ?",
        retailerProfit,
        retailer.id
      );

      await prisma.$executeRawUnsafe(
        `INSERT INTO retail_wallet_transactions (retailer_id, type, amount, source_type, description, created_at)
         VALUES (?, 'credit', ?, 'commission', ?, NOW())`,
        retailer.id,
        retailerProfit,
        `Commission profit for application ${appRef} (${serviceName})`
      );
    }

    // 5f. If Kendra is affiliated with a distributor, record distributor commission
    if (freshRet.distributor_id && distributorOverride > 0) {
      await prisma.$executeRawUnsafe(
        "UPDATE distributors SET wallet_balance = wallet_balance + ?, total_commission_earned = total_commission_earned + ? WHERE id = ?",
        distributorOverride,
        distributorOverride,
        freshRet.distributor_id
      ).catch(() => {});

      await prisma.$executeRawUnsafe(
        `INSERT INTO distributor_transactions (distributor_id, amount, type, description, reference_id, created_at)
         VALUES (?, ?, 'credit', ?, ?, NOW())`,
        String(freshRet.distributor_id),
        distributorOverride,
        `Override commission from Kendra ${freshRet.shop_name} for ${appRef}`,
        receiptNo
      ).catch(() => {});
    }

    return NextResponse.json({
      ok: true,
      message: "Assisted application submitted successfully via Kendra Wallet deduction",
      applicationNumber: appRef,
      receiptNo,
      deductedAmount: fee,
      commissionEarned: retailerProfit,
      closingBalance: newBalance + retailerProfit,
      citizen: {
        name: citizenName,
        phone: citizenPhone,
      },
      serviceName,
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
