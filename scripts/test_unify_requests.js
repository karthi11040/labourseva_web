const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fetchAllUnifiedRequests() {
  const records = [];
  const seenTxns = new Set();
  const seenRefs = new Set();

  // 1. Fetch from service_requests
  const srRows = await prisma.$queryRawUnsafe(`
    SELECT sr.*, s.name as service_name, s.type as service_type
    FROM service_requests sr
    LEFT JOIN services s ON sr.service_id = s.id
    ORDER BY sr.id DESC
  `);

  // Pre-fetch districts map
  const districts = await prisma.$queryRawUnsafe(`SELECT id, name, name_en FROM districts`);
  const distMap = new Map();
  districts.forEach(d => distMap.set(d.id, d.name_en || d.name));

  // Pre-fetch guests map
  const guests = await prisma.$queryRawUnsafe(`SELECT id, name, phone, email, address, district_id FROM guests`);
  const guestMap = new Map();
  guests.forEach(g => guestMap.set(g.id, g));

  for (const sr of srRows) {
    let pNotes = {};
    try {
      pNotes = typeof sr.purchase_notes === 'string' ? JSON.parse(sr.purchase_notes) : (sr.purchase_notes || {});
    } catch (e) {
      pNotes = {};
    }

    if (sr.transaction_id) seenTxns.add(sr.transaction_id);
    if (pNotes.receiptNo) seenTxns.add(pNotes.receiptNo);
    if (pNotes.appRef) seenRefs.add(pNotes.appRef);

    // Determine requestor type
    let requestorType = 'CUSTOMER';
    let requestorLabel = 'Citizen Beneficiary';
    if (sr.gateway_provider === 'KENDRA_WALLET' || pNotes.assistedKendraId || pNotes.assistedKendraShop) {
      requestorType = 'RETAILER';
      requestorLabel = `Retailer: ${pNotes.assistedKendraShop || 'Kendra Desk'}`;
    } else if (sr.guest_id) {
      requestorType = 'GUEST';
      requestorLabel = 'Walk-in Guest';
    }

    // Applicant demographics
    let applicantName = pNotes.applicantName || '';
    let applicantPhone = pNotes.applicantPhone || '';
    let district = pNotes.district || distMap.get(sr.district_id) || '';
    let taluk = pNotes.taluk || '';
    let panchayat = pNotes.panchayat || '';
    let address = pNotes.address || '';

    if (sr.guest_id && guestMap.has(sr.guest_id)) {
      const g = guestMap.get(sr.guest_id);
      if (!applicantName) applicantName = g.name || '';
      if (!applicantPhone) applicantPhone = g.phone || '';
      if (!address) address = g.address || '';
      if (!district && g.district_id) district = distMap.get(g.district_id) || '';
    }

    if (!applicantName) {
      applicantName = requestorType === 'GUEST' ? `Guest #${sr.guest_id || sr.id}` : `Citizen User #${sr.user_id || sr.customer_id || sr.id}`;
    }

    // Normalize status
    let status = 'PENDING';
    const rawSt = String(sr.status || '').toLowerCase();
    if (rawSt === 'confirmed' || rawSt === 'approved' || rawSt === 'completed' || rawSt === 'paid') {
      status = 'APPROVED';
    } else if (rawSt === 'rejected' || rawSt === 'cancelled') {
      status = 'REJECTED';
    } else if (rawSt === 'returned') {
      status = 'RETURNED';
    }

    records.push({
      id: `SR-${sr.id}`,
      sourceTable: 'service_requests',
      sourceId: sr.id,
      referenceNo: pNotes.appRef || `TN-DOC-2026-${String(sr.id).padStart(6, '0')}`,
      requestorType,
      requestorLabel,
      serviceCategory: 'STATUTORY',
      serviceCategoryLabel: 'Statutory Board Service',
      serviceId: sr.service_id,
      serviceName: sr.service_name ? `${sr.service_name} (${sr.service_type || 'Scheme'})` : (pNotes.serviceName || `Statutory Scheme #${sr.service_id}`),
      amount: Number(sr.amount || 0),
      paymentStatus: (rawSt === 'paid' || rawSt === 'confirmed' || rawSt === 'completed') ? 'PAID' : 'PENDING',
      paymentMethod: sr.gateway_provider || sr.payment_method || 'Online Payment',
      status,
      statusDisplay: sr.status || status,
      applicantName,
      applicantPhone,
      district,
      taluk,
      panchayat,
      address,
      submittedData: pNotes,
      submittedFiles: sr.uploaded_doc_path ? [{ name: 'Applicant Proof', url: sr.uploaded_doc_path }] : [],
      officerRemarks: sr.rejection_reason || '',
      createdAt: sr.created_at ? new Date(sr.created_at).toISOString() : new Date().toISOString(),
      updatedAt: sr.signed_at ? new Date(sr.signed_at).toISOString() : (sr.created_at ? new Date(sr.created_at).toISOString() : new Date().toISOString()),
    });
  }

  // 2. Fetch from es_service_requests
  const esRows = await prisma.$queryRawUnsafe(`
    SELECT esr.*, es.service_name
    FROM es_service_requests esr
    LEFT JOIN es_services es ON esr.service_id = es.id
    ORDER BY esr.id DESC
  `);

  for (const es of esRows) {
    let sData = {};
    let sFiles = [];
    try {
      sData = typeof es.submitted_data === 'string' ? JSON.parse(es.submitted_data) : (es.submitted_data || {});
    } catch(e) { sData = {}; }
    try {
      sFiles = typeof es.submitted_files === 'string' ? JSON.parse(es.submitted_files) : (es.submitted_files || []);
      if (!Array.isArray(sFiles) && typeof sFiles === 'object') {
        sFiles = Object.entries(sFiles).map(([k, v]) => ({ name: k, url: v }));
      }
    } catch(e) { sFiles = []; }

    let reqType = 'CUSTOMER';
    let reqLabel = 'Citizen Direct (Customer)';
    const ct = String(es.creator_type || '').toLowerCase();
    if (ct === 'retailer') {
      reqType = 'RETAILER';
      reqLabel = 'Assisted Retail CSC Agent';
    } else if (ct === 'guest') {
      reqType = 'GUEST';
      reqLabel = 'Walk-in Guest Form';
    } else if (ct === 'distributor') {
      reqType = 'DISTRIBUTOR';
      reqLabel = 'Zonal Distributor';
    }

    const appName = sData.applicantName || sData._applicantName || sData.name || `E-Citizen #${es.id}`;
    const appPhone = sData.applicantPhone || sData._applicantPhone || sData.phone || sData.mobile || '';
    const dist = sData.district || '';
    const tlk = sData.taluk || '';
    const pch = sData.panchayat || '';
    const addr = sData.address || '';

    let status = 'PENDING';
    const rawSt = String(es.status || '').toLowerCase();
    if (rawSt === 'accepted' || rawSt === 'approved') status = 'APPROVED';
    else if (rawSt === 'rejected') status = 'REJECTED';
    else if (rawSt === 'returned') status = 'RETURNED';

    records.push({
      id: `ES-${es.id}`,
      sourceTable: 'es_service_requests',
      sourceId: es.id,
      referenceNo: es.application_number || `TN-ES-2026-${String(es.id).padStart(6, '0')}`,
      requestorType: reqType,
      requestorLabel: reqLabel,
      serviceCategory: 'E_SERVICE',
      serviceCategoryLabel: 'Citizen E-Service',
      serviceId: es.service_id,
      serviceName: es.service_name || `E-Service #${es.service_id}`,
      amount: Number(es.amount || 0),
      paymentStatus: (String(es.payment_status).toLowerCase() === 'success' || String(es.payment_status).toLowerCase() === 'paid') ? 'PAID' : 'PENDING',
      paymentMethod: es.razorpay_order_id ? 'Razorpay' : 'Direct Portal',
      status,
      statusDisplay: es.status || status,
      applicantName: appName,
      applicantPhone: appPhone,
      district: dist,
      taluk: tlk,
      panchayat: pch,
      address: addr,
      submittedData: sData,
      submittedFiles: sFiles,
      officerRemarks: es.admin_remark || '',
      createdAt: es.created_at ? new Date(es.created_at).toISOString() : new Date().toISOString(),
      updatedAt: es.updated_at ? new Date(es.updated_at).toISOString() : new Date().toISOString(),
    });
  }

  // 3. Fetch from guest_service_orders
  const gsoRows = await prisma.$queryRawUnsafe(`
    SELECT gso.*, s.name as service_name, s.type as service_type
    FROM guest_service_orders gso
    LEFT JOIN services s ON gso.service_id = s.id
    ORDER BY gso.id DESC
  `);

  for (const gso of gsoRows) {
    if (gso.transaction_id && seenTxns.has(gso.transaction_id)) continue;
    if (gso.razorpay_order_id && seenTxns.has(gso.razorpay_order_id)) continue;

    let appName = '';
    let appPhone = '';
    let addr = '';
    if (gso.guest_id && guestMap.has(gso.guest_id)) {
      const g = guestMap.get(gso.guest_id);
      appName = g.name || '';
      appPhone = g.phone || '';
      addr = g.address || '';
    }
    if (!appName) appName = `Guest Applicant #${gso.guest_id || gso.id}`;

    let status = 'PENDING';
    const rawSt = String(gso.payment_status || '').toLowerCase();
    if (rawSt === 'paid' || rawSt === 'success') status = 'APPROVED';

    records.push({
      id: `GSO-${gso.id}`,
      sourceTable: 'guest_service_orders',
      sourceId: gso.id,
      referenceNo: `TN-GUEST-${String(gso.id).padStart(6, '0')}`,
      requestorType: 'GUEST',
      requestorLabel: 'Walk-in Guest Order',
      serviceCategory: 'STATUTORY',
      serviceCategoryLabel: 'Statutory Board Service',
      serviceId: gso.service_id,
      serviceName: gso.service_name ? `${gso.service_name} (${gso.service_type || 'Scheme'})` : `Statutory Service #${gso.service_id}`,
      amount: Number(gso.amount || 0),
      paymentStatus: (rawSt === 'paid' || rawSt === 'success') ? 'PAID' : 'PENDING',
      paymentMethod: gso.razorpay_order_id ? 'Razorpay' : (gso.payu_payment_mode || 'Payment Gateway'),
      status,
      statusDisplay: gso.payment_status || status,
      applicantName: appName,
      applicantPhone: appPhone,
      district: gso.district || (gso.district_id ? distMap.get(gso.district_id) : '') || '',
      taluk: gso.taluk || '',
      panchayat: gso.panchayat || '',
      address: addr,
      submittedData: {
        transactionId: gso.transaction_id,
        orderId: gso.razorpay_order_id,
        district: gso.district,
        taluk: gso.taluk,
        panchayat: gso.panchayat,
      },
      submittedFiles: [],
      officerRemarks: gso.remarks || '',
      createdAt: gso.created_at ? new Date(gso.created_at).toISOString() : new Date().toISOString(),
      updatedAt: gso.updated_at ? new Date(gso.updated_at).toISOString() : new Date().toISOString(),
    });
  }

  // 4. Fetch from retail_orders
  const roRows = await prisma.$queryRawUnsafe(`
    SELECT ro.*, s.name as service_name, s.type as service_type, u.full_name as retailer_name
    FROM retail_orders ro
    LEFT JOIN services s ON ro.service_id = s.id
    LEFT JOIN users u ON ro.user_id = u.id
    ORDER BY ro.id DESC
  `);

  for (const ro of roRows) {
    if (ro.transaction_id && seenTxns.has(ro.transaction_id)) continue;

    let pResp = {};
    try {
      pResp = typeof ro.payment_response === 'string' ? JSON.parse(ro.payment_response) : (ro.payment_response || {});
    } catch(e) { pResp = {}; }

    if (pResp.appRef && seenRefs.has(pResp.appRef)) continue;

    const appName = pResp.applicantName || `Kendra Applicant (Desk #${ro.user_id})`;
    const appPhone = pResp.applicantPhone || '';

    let status = 'PENDING';
    const rawSt = String(ro.status || '').toLowerCase();
    if (rawSt === 'approved' || rawSt === 'completed') status = 'APPROVED';
    else if (rawSt === 'rejected') status = 'REJECTED';

    records.push({
      id: `RO-${ro.id}`,
      sourceTable: 'retail_orders',
      sourceId: ro.id,
      referenceNo: pResp.appRef || `RO-KND-${String(ro.id).padStart(6, '0')}`,
      requestorType: 'RETAILER',
      requestorLabel: ro.retailer_name ? `Retailer: ${ro.retailer_name}` : `Retail Kendra #${ro.user_id}`,
      serviceCategory: 'STATUTORY',
      serviceCategoryLabel: 'Statutory Board Service',
      serviceId: ro.service_id,
      serviceName: ro.service_name ? `${ro.service_name} (${ro.service_type || 'Scheme'})` : (pResp.serviceName || `Statutory Scheme #${ro.service_id}`),
      amount: Number(ro.amount || 0),
      paymentStatus: String(ro.payment_status).toLowerCase() === 'success' ? 'PAID' : 'PENDING',
      paymentMethod: 'Kendra Wallet Account',
      status,
      statusDisplay: ro.status || status,
      applicantName: appName,
      applicantPhone: appPhone,
      district: ro.district_id ? (distMap.get(ro.district_id) || '') : '',
      taluk: '',
      panchayat: '',
      address: '',
      submittedData: pResp,
      submittedFiles: ro.document_path ? [{ name: 'Application Document', url: ro.document_path }] : [],
      officerRemarks: ro.rejection_reason || '',
      createdAt: ro.created_at ? new Date(ro.created_at).toISOString() : new Date().toISOString(),
      updatedAt: ro.updated_at ? new Date(ro.updated_at).toISOString() : new Date().toISOString(),
    });
  }

  // Sort by createdAt desc
  records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return records;
}

fetchAllUnifiedRequests().then(records => {
  console.log(`Successfully unified ${records.length} total request records from live MySQL!`);
  const byReq = { CUSTOMER: 0, RETAILER: 0, GUEST: 0, DISTRIBUTOR: 0 };
  const byCat = { STATUTORY: 0, E_SERVICE: 0 };
  records.forEach(r => {
    byReq[r.requestorType] = (byReq[r.requestorType] || 0) + 1;
    byCat[r.serviceCategory] = (byCat[r.serviceCategory] || 0) + 1;
  });
  console.log('Breakdown by Requestor Role:', byReq);
  console.log('Breakdown by Service Category:', byCat);
  console.log('\nSample unified record #1:');
  console.log(records[0]);
  console.log('\nSample unified record #2:');
  console.log(records[1]);
}).catch(console.error).finally(() => prisma.$disconnect());
