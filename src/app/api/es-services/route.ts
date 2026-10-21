import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "node:crypto";
import { getCitizenIdentity } from "@/lib/auth-helpers";
import { getRazorpayCredentials, verifyRazorpaySignature } from "@/lib/razorpay";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");
    const serviceId = searchParams.get("serviceId");
    const type = searchParams.get("type");

    // If requesting user's past applications
    if (type === "my-applications") {
      const citizen = await getCitizenIdentity(request);
      if (!citizen?.customerId) {
        return NextResponse.json({ ok: false, error: "Please sign in to view your applications.", applications: [] }, { status: 401 });
      }
      const applications = await prisma.$queryRawUnsafe<any[]>(`
        SELECT 
          er.id,
          er.application_number,
          er.service_id,
          er.creator_type,
          er.submitted_data,
          er.submitted_files,
          er.amount,
          er.payment_status,
          er.status,
          er.admin_remark,
          er.created_at,
          er.updated_at,
          es.service_name,
          m.category_name
        FROM es_service_requests er
        LEFT JOIN es_services es ON er.service_id = es.id
        LEFT JOIN es_main_categories m ON es.main_category_id = m.id
        WHERE er.user_id = ? AND er.creator_type = 'user'
        ORDER BY er.id DESC
        LIMIT 50
      `, citizen.customerId).catch(() => []);

      const formatted = applications.map((app) => {
        let parsedData: any = {};
        let parsedFiles: any = {};
        try {
          parsedData = typeof app.submitted_data === "string" ? JSON.parse(app.submitted_data) : (app.submitted_data || {});
        } catch {}
        try {
          parsedFiles = typeof app.submitted_files === "string" ? JSON.parse(app.submitted_files) : (app.submitted_files || {});
        } catch {}

        return {
          id: app.id,
          applicationNumber: app.application_number,
          serviceName: app.service_name || parsedData.serviceName || "E-CSC Application",
          categoryName: app.category_name || parsedData.categoryName || "General",
          amount: Number(app.amount || 0),
          paymentStatus: app.payment_status || "Pending",
          status: app.status || "pending",
          adminRemark: app.admin_remark || "",
          createdAt: app.created_at,
          updatedAt: app.updated_at,
          receiptNo: parsedData._receiptNo || `TN-RCP-ECSC-${app.id}`,
          applicantName: parsedData.applicantName || parsedData._applicantName || "Citizen",
          applicantPhone: parsedData.mobileNumber || parsedData.applicantPhone || "",
          district: parsedData.district || "",
          taluk: parsedData.taluk || "",
          village: parsedData.revenueVillage || parsedData.village || "",
          documentsCount: Object.keys(parsedFiles).length,
          documents: parsedFiles,
        };
      });

      return NextResponse.json({ ok: true, applications: formatted });
    }

    // 1. Fetch active Main Categories
    const mainCategories = await prisma.$queryRawUnsafe<any[]>(`
      SELECT id, category_name, category_image, status, created_at
      FROM es_main_categories
      WHERE status = 'active' OR status IS NULL
      ORDER BY id ASC
    `).catch(() => []);

    // 2. Fetch active Subcategories
    const subCategories = await prisma.$queryRawUnsafe<any[]>(`
      SELECT id, main_category_id, sub_category_name, status, created_at
      FROM es_sub_categories
      WHERE status = 'active' OR status IS NULL
      ORDER BY id ASC
    `).catch(() => []);

    // 3. Fetch active E-Services
    let serviceQuery = `
      SELECT 
        s.id,
        s.service_name,
        s.service_cost,
        s.main_category_id,
        s.sub_category_id,
        s.details,
        s.service_image,
        s.status,
        s.created_at,
        m.category_name,
        sub.sub_category_name
      FROM es_services s
      LEFT JOIN es_main_categories m ON s.main_category_id = m.id
      LEFT JOIN es_sub_categories sub ON s.sub_category_id = sub.id
      WHERE (s.status = 'active' OR s.status IS NULL)
    `;

    if (serviceId) {
      serviceQuery += ` AND s.id = ${Number(serviceId)}`;
    }
    if (categoryId) {
      serviceQuery += ` AND s.main_category_id = ${Number(categoryId)}`;
    }

    serviceQuery += ` ORDER BY s.id ASC`;

    const services = await prisma.$queryRawUnsafe<any[]>(serviceQuery).catch(() => []);

    // 4. Fetch dynamic form fields for all services
    const serviceIds = services.map((s) => s.id);
    let fieldsByService: Record<number, any[]> = {};

    if (serviceIds.length > 0) {
      const fieldsList = await prisma.$queryRawUnsafe<any[]>(`
        SELECT 
          id,
          service_id,
          field_name,
          field_type,
          is_required,
          field_options,
          sort_order
        FROM es_service_fields
        WHERE service_id IN (${serviceIds.join(",")})
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

    // Combine into structured tree
    const enrichedCategories = mainCategories.map((mc) => {
      const subs = subCategories.filter((sc) => sc.main_category_id === mc.id);
      const categoryServices = services.filter((s) => s.main_category_id === mc.id);

      return {
        id: mc.id,
        name: mc.category_name,
        logo: mc.category_image || "FolderTree",
        description: `Official citizen e-services catalog for ${mc.category_name}`,
        subcategories: subs.map((sc) => ({
          id: sc.id,
          name: sc.sub_category_name,
          services: categoryServices
            .filter((s) => s.sub_category_id === sc.id)
            .map((s) => ({
              id: s.id,
              name: s.service_name,
              fee: Number(s.service_cost || 0),
              details: s.details || "Official statutory online application.",
              image: s.service_image || null,
              fields: fieldsByService[s.id] || [],
            })),
        })),
        servicesCount: categoryServices.length,
      };
    });

    const formattedServices = services.map((s) => ({
      id: s.id,
      name: s.service_name,
      fee: Number(s.service_cost || 0),
      mainCategoryId: s.main_category_id,
      mainCategoryName: s.category_name || "General Category",
      subCategoryId: s.sub_category_id,
      subCategoryName: s.sub_category_name || "General Services",
      details: s.details || "Official statutory online application.",
      image: s.service_image || null,
      fields: fieldsByService[s.id] || [],
      estimatedDays: "3-5 Working Days",
    }));

    return NextResponse.json({
      ok: true,
      categories: enrichedCategories,
      services: formattedServices,
    });
  } catch (error: any) {
    console.error("GET /api/es-services error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to load e-services" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const citizen = await getCitizenIdentity(request);
    if (!citizen?.customerId) {
      return NextResponse.json({ ok: false, error: "Please sign in to apply." }, { status: 401 });
    }
    const accountRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT verification_status FROM customers WHERE id = ? LIMIT 1`, citizen.customerId
    );
    if (String(accountRows?.[0]?.verification_status || "").toLowerCase() !== "approved") {
      return NextResponse.json({ ok: false, error: "Your account must be verified by staff before applying for services." }, { status: 403 });
    }
    const body = await request.json();
    const {
      serviceIds,
      servicesDetails,
      district,
      taluk,
      village,
      aadhaar,
      aadhaarName,
      aadhaarConsent,
      formData,
      serviceFieldValues,
      documents,
      paymentMode = "PENDING",
      paymentStatus = "Pending",
      razorpayOrderId = null,
      razorpayPaymentId = null,
      razorpaySignature = null,
    } = body;

    const applicantData = formData && typeof formData === "object" && !Array.isArray(formData) ? formData : {};
    const aadhaarDigits = String(aadhaar || "").replace(/\D/g, "");
    if (aadhaarDigits.length !== 12 || !/^\d{12}$/.test(aadhaarDigits) || aadhaarConsent !== true || !String(aadhaarName || "").trim()) {
      return NextResponse.json({ ok: false, error: "Provide a valid Aadhaar number, the name printed on it, and your consent." }, { status: 400 });
    }
    const requiredApplicantFields = ["applicantName", "appellation", "gender", "maritalStatus", "dob", "relationship", "religion", "community", "occupation", "currentDoorNo", "currentStreet", "currentPinCode", "mobileNumber"];
    const missingApplicantFields = requiredApplicantFields.filter((key) => !String(applicantData[key] || "").trim());
    if (applicantData.relationship !== "Husband" && !String(applicantData.motherName || "").trim()) missingApplicantFields.push("motherName");
    if (applicantData.relationship === "Husband" && !String(applicantData.husbandName || "").trim()) missingApplicantFields.push("husbandName");
    if (applicantData.relationship !== "Husband" && applicantData.relationship !== "Mother" && !String(applicantData.fatherName || "").trim()) missingApplicantFields.push("fatherName");
    if (missingApplicantFields.length || !/^\d{10}$/.test(String(applicantData.mobileNumber || "").replace(/\D/g, "")) || !/^\d{6}$/.test(String(applicantData.currentPinCode || "")) || !district || !taluk || !village || !Number.isFinite(Date.parse(String(applicantData.dob || "")))) {
      return NextResponse.json({ ok: false, error: "Complete all required applicant, contact, address, and jurisdiction details." }, { status: 400 });
    }

    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const appRef = `TN-ECSC-2026-${randomSuffix}`;
    const receiptNo = `TN-RCP-ECSC-${randomSuffix}`;

    // Ensure primaryServiceId is a valid ID from es_services to honor foreign key constraint
    let primaryServiceId = Array.isArray(serviceIds) && serviceIds.length > 0 ? Number(serviceIds[0]) : 2;
    const checkExists = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id FROM es_services WHERE id = ? LIMIT 1`,
      primaryServiceId
    ).catch(() => []);
    if (!checkExists || checkExists.length === 0) {
      const fallbackSvc = await prisma.$queryRawUnsafe<any[]>(
        `SELECT id FROM es_services ORDER BY id ASC LIMIT 1`
      ).catch(() => []);
      primaryServiceId = fallbackSvc?.[0]?.id || 2;
    }

    const serviceIdList = Array.isArray(serviceIds) ? serviceIds.map(Number).filter((id: number) => Number.isInteger(id) && id > 0) : [];
    const feeRows = serviceIdList.length ? await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, service_cost FROM es_services WHERE id IN (${serviceIdList.map(() => "?").join(",")})`,
      ...serviceIdList
    ) : [];
    if (serviceIdList.length === 0 || feeRows.length !== new Set(serviceIdList).size) {
      return NextResponse.json({ ok: false, error: "Select valid services before submitting." }, { status: 400 });
    }
    const fieldRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, field_name, field_type, is_required FROM es_service_fields WHERE service_id IN (${serviceIdList.map(() => "?").join(",")})`,
      ...serviceIdList
    ).catch(() => []);
    const submittedFields = serviceFieldValues && typeof serviceFieldValues === "object" && !Array.isArray(serviceFieldValues) ? serviceFieldValues : {};
    const allowedFieldIds = new Set(fieldRows.map((field) => String(field.id)));
    const safeServiceFields = Object.fromEntries(Object.entries(submittedFields).filter(([key, value]) => allowedFieldIds.has(key.replace(/^field_/, "")) && ["string", "number", "boolean"].includes(typeof value) && String(value).length <= 5000));
    const missingFields = fieldRows.filter((field) => Boolean(field.is_required) && !String(safeServiceFields[`field_${field.id}`] || "").trim());
    if (missingFields.length) {
      return NextResponse.json({ ok: false, error: `Complete required service details: ${missingFields.map((field) => field.field_name).join(", ")}.` }, { status: 400 });
    }
    const documentPayload = documents && typeof documents === "object" && !Array.isArray(documents) ? documents : {};
    const requiredDocumentTypes: Record<string, string> = {
      passportPhoto: "es-passport-photo", aadhaarFront: "es-aadhaar-front", aadhaarBack: "es-aadhaar-back",
      rationCard: "es-ration-card", signature: "es-signature", houseTaxReceipt: "es-house-tax-receipt",
    };
    if (Object.keys(requiredDocumentTypes).some((key) => typeof documentPayload[key] !== "string" || !documentPayload[key])) {
      return NextResponse.json({ ok: false, error: "Upload all required supporting documents before submitting." }, { status: 400 });
    }
    const uploadedFiles = [...Object.values(documentPayload), ...fieldRows.filter((field) => String(field.field_type).toLowerCase() === "file").map((field) => safeServiceFields[`field_${field.id}`]).filter(Boolean)];
    const filenames = uploadedFiles.map((value) => {
      const match = typeof value === "string" ? value.match(/^\/api\/verification\/document\?file=([0-9a-z-]+\.(?:pdf|jpg|png))$/i) : null;
      return match?.[1] || "";
    });
    if (filenames.some((filename) => !filename)) {
      return NextResponse.json({ ok: false, error: "One or more uploaded document references are invalid. Please upload them again." }, { status: 400 });
    }
    const artifactRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT storage_key, doc_type FROM verification_document_artifacts WHERE owner_type = 'customer' AND owner_id = ? AND storage_key IN (${filenames.map(() => "?").join(",")})`,
      String(citizen.customerId),
      ...filenames
    );
    if (artifactRows.length !== new Set(filenames).size) {
      return NextResponse.json({ ok: false, error: "One or more documents are missing or do not belong to your account. Please upload them again." }, { status: 400 });
    }
    const uploadedTypes = new Map(artifactRows.map((artifact) => [String(artifact.storage_key), String(artifact.doc_type)]));
    if (Object.entries(requiredDocumentTypes).some(([key, type]) => {
      const filename = String(documentPayload[key]).match(/^\/api\/verification\/document\?file=([0-9a-z-]+\.(?:pdf|jpg|png))$/i)?.[1];
      return !filename || uploadedTypes.get(filename) !== type;
    })) {
      return NextResponse.json({ ok: false, error: "Each required document must be uploaded in its matching document field." }, { status: 400 });
    }
    const serverFee = feeRows.reduce((sum, service) => sum + Number(service.service_cost || 0), 0);
    const paidOnline = paymentMode === "ONLINE" && paymentStatus === "Success" && serverFee > 0;
    if (paidOnline) {
      const orderId = String(razorpayOrderId || "");
      const paymentId = String(razorpayPaymentId || "");
      const signature = String(razorpaySignature || "");
      const creds = getRazorpayCredentials();
      if (!orderId || !paymentId || !signature || !creds?.keySecret || !verifyRazorpaySignature(creds.keySecret, orderId, paymentId, signature)) {
        return NextResponse.json({ ok: false, error: "Payment could not be verified. Please retry payment." }, { status: 400 });
      }
      const paymentRows = await prisma.$queryRawUnsafe<any[]>(
        "SELECT amount, status FROM paymentlog WHERE orderId = ? LIMIT 1", orderId
      );
      if (!paymentRows.length || Number(paymentRows[0].amount) !== serverFee || String(paymentRows[0].status).toUpperCase() !== "PENDING") {
        return NextResponse.json({ ok: false, error: "Payment order is missing, already used, or does not match the service fees." }, { status: 400 });
      }
    } else if (paymentStatus === "Success" && serverFee > 0) {
      return NextResponse.json({ ok: false, error: "A paid application must include a verified online payment." }, { status: 400 });
    }

    const realUserId = citizen.customerId;

    const enrichedFormData = {
      ...(typeof formData === "object" ? formData : {}),
      aadhaar: aadhaar || formData?.aadhaar || "",
      district: district || formData?.district || "",
      taluk: taluk || formData?.taluk || "",
      village: village || formData?.village || formData?.revenueVillage || "",
      selectedServices: servicesDetails || [],
      serviceFieldValues: safeServiceFields,
      _receiptNo: receiptNo,
      _applicantName: formData?.applicantName || "Citizen Beneficiary",
      _applicantPhone: formData?.mobileNumber || formData?.applicantPhone || "",
      _husbandName: formData?.husbandName || "",
      _fatherName: formData?.fatherName || "",
      _relationship: formData?.relationship || "Father",
      _paymentMode: paymentMode,
      _paymentStatus: paidOnline || serverFee === 0 ? "Success" : "Pending",
      _totalAmount: serverFee,
      _submittedAt: new Date().toISOString(),
    };

    const documentsPayload = documentPayload;

    // Insert into es_service_requests using safe parameterized query
    await prisma.$executeRawUnsafe(
      `INSERT INTO es_service_requests (
        application_number, user_id, service_id, creator_type,
        submitted_data, submitted_files, amount,
        payment_status, razorpay_order_id, razorpay_payment_id,
        status, admin_remark, created_at, updated_at
      ) VALUES (?, ?, ?, 'user', ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      appRef,
      realUserId,
      primaryServiceId,
      JSON.stringify(enrichedFormData),
      JSON.stringify(documentsPayload),
      serverFee,
      paidOnline || serverFee === 0 ? "Success" : "Pending",
      paidOnline ? razorpayOrderId : null,
      paidOnline ? razorpayPaymentId : null,
      paidOnline || serverFee === 0 ? "accepted" : "pending",
      paidOnline ? "Verified via Online Payment" : serverFee === 0 ? "No fee required" : "Application Submitted - Payment Pending at CSC Desk"
    );

    // Fetch inserted record
    const inserted = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id FROM es_service_requests WHERE application_number = ? LIMIT 1`,
      appRef
    ).catch(() => []);

    const insertedId = inserted?.[0]?.id || 1;

    if (paidOnline) {
      await prisma.$executeRawUnsafe(
        "UPDATE paymentlog SET status = 'SUCCESS', paymentId = ?, signature = ? WHERE orderId = ? AND status = 'PENDING'",
        razorpayPaymentId,
        razorpaySignature,
        razorpayOrderId
      );
    }

    // Trigger In-App & Multi-Channel Notifications via modular trigger service
    try {
      const { NotificationTriggerService } = await import("@/modules/notifications/services/notification-trigger.service");
      await NotificationTriggerService.triggerApplicationSubmitted({
        userId: String(realUserId),
        applicationId: `ES-${insertedId}`,
        applicationNumber: appRef,
        serviceName: servicesDetails?.[0]?.name || "Online E-Service",
        type: "ESERVICE",
        phone: formData?.mobileNumber || formData?.applicantPhone,
        email: formData?.email || formData?.applicantEmail,
      });

      if (paidOnline) {
        await NotificationTriggerService.triggerEServicePaymentSuccess({
          userId: String(realUserId),
          applicationId: `ES-${insertedId}`,
          applicationNumber: appRef,
          receiptNo,
        amount: serverFee,
          paymentId: razorpayPaymentId || undefined,
          phone: formData?.mobileNumber || formData?.applicantPhone,
          email: formData?.email || formData?.applicantEmail,
        });
      }
    } catch (e) {
      console.warn("Notification dispatch notice:", e);
    }

    return NextResponse.json({
      ok: true,
      applicationId: appRef,
      receiptNo,
      status: paidOnline || serverFee === 0 ? "accepted" : "pending",
      paymentStatus: paidOnline || serverFee === 0 ? "Success" : "Pending",
      amount: serverFee,
      servicesCount: Array.isArray(serviceIds) ? serviceIds.length : 1,
      createdAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("POST /api/es-services error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to process e-service application" },
      { status: 500 }
    );
  }
}
