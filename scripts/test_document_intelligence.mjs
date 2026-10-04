import { performance } from "perf_hooks";

const BASE_URL = "http://localhost:3000";

// Helper to create a basic test SVG / base64 image or text
function makeSvgBase64(svgText) {
  return Buffer.from(svgText).toString("base64");
}

const TEST_SCENARIOS = [
  // 1. Building floor plan image
  {
    id: "TEST_1_FLOOR_PLAN_IMAGE",
    name: "Building Floor Plan Image (2-Bedroom Flat)",
    filename: "Architectural_Floor_Plan_2Bed.png",
    mimeType: "image/png",
    generateData: () => makeSvgBase64(`
      <svg xmlns="http://www.w3.org/2000/svg" width="900" height="600">
        <rect width="900" height="600" fill="#0f172a"/>
        <text x="50" y="50" fill="#38bdf8" font-size="20">PROPOSED 2-BEDROOM FLAT - LEKKI, LAGOS</text>
        <text x="50" y="80" fill="#94a3b8" font-size="14">SCALE 1:100 • DRAWING NO: AR-2026-004 • REV A</text>
        <rect x="70" y="120" width="360" height="260" fill="none" stroke="#38bdf8" stroke-width="2"/>
        <text x="170" y="240" fill="#fff" font-size="16">LIVING ROOM: 5.2m x 4.2m (21.84m²)</text>
        <rect x="450" y="120" width="280" height="170" fill="none" stroke="#38bdf8" stroke-width="2"/>
        <text x="490" y="200" fill="#fff" font-size="14">BEDROOM 1: 4.0m x 3.6m (14.4m²)</text>
        <rect x="450" y="310" width="280" height="170" fill="none" stroke="#38bdf8" stroke-width="2"/>
        <text x="510" y="390" fill="#fff" font-size="14">BEDROOM 2: 3.6m x 3.6m (12.96m²)</text>
        <text x="50" y="570" fill="#f59e0b" font-size="14">SPEC: 16mm TMT RAFT FOUNDATION, 9-INCH VIBRATED HOLLOW SANDCRETE WALLS</text>
      </svg>
    `),
    expectedOutcome: "SUCCESS",
    expectFields: ["document_overview", "what_i_found", "construction_components", "missing_information"]
  },

  // 2. Building plan PDF (simulated with PDF mime header)
  {
    id: "TEST_2_BUILDING_PLAN_PDF",
    name: "Building Plan PDF",
    filename: "Structural_Engineering_Plan.pdf",
    mimeType: "application/pdf",
    generateData: () => {
      // Valid minimal PDF containing text
      const pdfString = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 260 >> stream
BT
/F1 14 Tf
50 720 Td
(SHUREFIRE STRUCTURAL DRAWING: DUPLEX FOUNDATION PLAN) Tj
/F1 11 Tf
0 -30 Td
(Location: Ikeja, Lagos. Foundation Type: Strip Footing with 16mm Rebars.) Tj
0 -20 Td
(Ground Floor Slab: 150mm thick with BRC Mesh A142. Concrete Grade C25.) Tj
0 -20 Td
(Wall Type: 225mm vibrated sandcrete hollow blocks.) Tj
ET
endstream
endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000557 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
634
%%EOF`;
      return Buffer.from(pdfString).toString("base64");
    },
    expectedOutcome: "SUCCESS",
    expectFields: ["document_overview", "material_requirements"]
  },

  // 3. BOQ (Bill of Quantities)
  {
    id: "TEST_3_BOQ_SCHEDULE",
    name: "Bill of Quantities (BOQ) Schedule",
    filename: "Substructure_BOQ_Schedule.png",
    mimeType: "image/png",
    generateData: () => makeSvgBase64(`
      <svg xmlns="http://www.w3.org/2000/svg" width="900" height="600">
        <rect width="900" height="600" fill="#ffffff"/>
        <text x="50" y="50" fill="#0f172a" font-size="20" font-weight="bold">BILL OF QUANTITIES (BOQ): 3-BEDROOM BUNGALOW</text>
        <text x="50" y="80" fill="#64748b" font-size="14">CONTRACTOR: SOVEREIGN STRUCTURAL NIG LTD</text>
        <rect x="50" y="100" width="800" height="40" fill="#f1f5f9"/>
        <text x="60" y="125" fill="#000" font-weight="bold">ITEM | DESCRIPTION | QTY | UNIT | RATE (NGN) | AMOUNT (NGN)</text>
        <text x="60" y="160" fill="#333">1. Dangote 42.5R Portland Cement | 350 | Bags | ₦8,100 | ₦2,835,000</text>
        <text x="60" y="195" fill="#333">2. 16mm High-Yield TMT Steel Rods | 110 | Lengths | ₦13,800 | ₦1,518,000</text>
        <text x="60" y="230" fill="#333">3. 12mm High-Yield TMT Steel Rods | 160 | Lengths | ₦8,400 | ₦1,344,000</text>
        <text x="60" y="265" fill="#333">4. 9-Inch Vibrated Sandcrete Blocks | 2,800 | Pcs | ₦820 | ₦2,296,000</text>
        <text x="60" y="300" fill="#333">5. Sharp River Sand (20-ton Tipper) | 3 | Trips | ₦135,000 | ₦405,000</text>
        <text x="60" y="335" fill="#333">6. 3/4-Inch Blue Granite (20-ton) | 3 | Trips | ₦275,000 | ₦825,000</text>
        <text x="60" y="380" fill="#ae2424" font-weight="bold">ESTIMATED SUBSTRUCTURE SUB-TOTAL: ₦9,223,000</text>
      </svg>
    `),
    expectedOutcome: "SUCCESS",
    expectFields: ["material_requirements", "building_cost_analysis"]
  },

  // 4. Construction Quotation
  {
    id: "TEST_4_CONSTRUCTION_QUOTATION",
    name: "Supplier Formal Quotation",
    filename: "Dangote_Cement_Alaba_Quotation.png",
    mimeType: "image/png",
    generateData: () => makeSvgBase64(`
      <svg xmlns="http://www.w3.org/2000/svg" width="900" height="600">
        <rect width="900" height="600" fill="#f8fafc"/>
        <text x="50" y="60" fill="#0f172a" font-size="22" font-weight="bold">ALABA INTERNATIONAL TRADE DEPOT — FORMAL QUOTE</text>
        <text x="50" y="90" fill="#475569" font-size="14">CUSTOMER: SHUREFIRE BUILDER • DATE: OCT 2026 • VALID: 7 DAYS</text>
        <text x="60" y="160" fill="#0f172a">PRODUCT: Dangote Falcon Grade 32.5 / 3X 42.5R</text>
        <text x="60" y="190" fill="#0f172a">ORDER QUANTITY: 600 Bags (Full 30-Ton Trailer Load)</text>
        <text x="60" y="220" fill="#0f172a">UNIT FACTORY-GATE RATE: ₦7,900 per bag</text>
        <text x="60" y="250" fill="#0f172a">HAULAGE TO IBEJU-LEKKI: ₦220,000 flat</text>
        <text x="60" y="280" fill="#ae2424" font-weight="bold">TOTAL INVOICE VALUE: ₦4,960,000 (VAT inclusive)</text>
      </svg>
    `),
    expectedOutcome: "SUCCESS",
    expectFields: ["material_requirements"]
  },

  // 5. Normal construction-related photograph
  {
    id: "TEST_5_CONSTRUCTION_PHOTO",
    name: "Site Foundation Concrete Pour Photograph",
    filename: "Site_Foundation_Rebar_Inspection.png",
    mimeType: "image/png",
    generateData: () => makeSvgBase64(`
      <svg xmlns="http://www.w3.org/2000/svg" width="800" height="500">
        <rect width="800" height="500" fill="#334155"/>
        <text x="50" y="50" fill="#f8fafc" font-size="20" font-weight="bold">SITE CAMERA #4: RAFT TRENCH CONCRETE POURING</text>
        <text x="50" y="80" fill="#cbd5e1" font-size="14">LEKKI COASTAL PLAIN ALLUVIAL ZONE • HIGH WATER TABLE</text>
        <rect x="80" y="120" width="640" height="280" fill="#475569" stroke="#fbbf24" stroke-width="2"/>
        <text x="120" y="260" fill="#fef08a" font-size="18">VISUAL: 16mm TMT BOTTOM MAT &amp; POLYTHENE DAMP-PROOF MEMBRANE</text>
        <text x="120" y="300" fill="#ffffff" font-size="14">CONCRETE BATCHING MIX: 1:2:4 PUMPED VIA READY-MIX TRUCK</text>
      </svg>
    `),
    expectedOutcome: "SUCCESS",
    expectFields: ["construction_components", "potential_issues_to_verify"]
  },

  // 6. Low-resolution / ambiguous document
  {
    id: "TEST_6_LOW_RES_AMBIGUOUS",
    name: "Low-Resolution / Blurry Sketch",
    filename: "Blurry_Hand_Drawn_Sketch.png",
    mimeType: "image/png",
    generateData: () => makeSvgBase64(`
      <svg xmlns="http://www.w3.org/2000/svg" width="300" height="200">
        <rect width="300" height="200" fill="#e2e8f0"/>
        <path d="M 20 20 L 280 20 L 280 180 L 20 180 Z" fill="none" stroke="#94a3b8" stroke-width="1"/>
        <text x="40" y="60" fill="#94a3b8" font-size="8">unclear text ???</text>
        <text x="40" y="100" fill="#94a3b8" font-size="7">dim ?x?</text>
      </svg>
    `),
    expectedOutcome: "SUCCESS", // Should gracefully extract with "Requires verification" and identify missing info
    expectFields: ["missing_information", "potential_issues_to_verify"]
  },

  // 7. Unsupported file type (rejection test)
  {
    id: "TEST_7_UNSUPPORTED_FILE_TYPE",
    name: "Unsupported File Type (.exe executable)",
    filename: "malicious_script.exe",
    mimeType: "application/x-msdownload",
    generateData: () => Buffer.from("MZ9000fakeExecutablePayload").toString("base64"),
    expectedOutcome: "REJECTED_400"
  }
];

async function runTest(testCase) {
  const start = performance.now();
  console.log(`\n==================================================================`);
  console.log(`RUNNING: [${testCase.id}] ${testCase.name}`);
  console.log(`Filename: ${testCase.filename} (${testCase.mimeType})`);

  const fileData = testCase.generateData();

  // Step 1: Upload
  const uploadRes = await fetch(`${BASE_URL}/api/documents/upload`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: testCase.filename,
      mimeType: testCase.mimeType,
      fileSize: Buffer.byteLength(fileData, "base64"),
      fileData,
      sessionId: "test_session_harness"
    })
  });

  const uploadJson = await uploadRes.json();

  if (testCase.expectedOutcome === "REJECTED_400") {
    const isRejected = uploadRes.status === 400 && uploadJson.error?.includes("Unsupported file type");
    console.log(`  Upload Status: ${uploadRes.status}`);
    console.log(`  Validation Error: "${uploadJson.error}"`);
    console.log(`  Rejection Protection: ${isRejected ? "PASS" : "FAIL"}`);
    return { passed: isRejected, details: uploadJson.error };
  }

  if (!uploadRes.ok) {
    console.error(`  Upload failed with status ${uploadRes.status}:`, uploadJson);
    return { passed: false, details: uploadJson.error };
  }

  console.log(`  Upload Status: 201 Created | Doc ID: ${uploadJson.id}`);

  // Step 2: Analyze
  const analyzeRes = await fetch(`${BASE_URL}/api/documents/${uploadJson.id}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" }
  });

  const analyzeJson = await analyzeRes.json();
  const elapsed = Math.round(performance.now() - start);

  if (!analyzeRes.ok) {
    console.error(`  Analysis failed with status ${analyzeRes.status}:`, analyzeJson);
    return { passed: false, details: analyzeJson.error };
  }

  const analysis = analyzeJson.analysis;
  console.log(`  Analysis Status: 200 OK | Latency: ${elapsed}ms`);
  console.log(`  Document Type: ${analysis.document_overview?.document_type}`);
  console.log(`  Project Type: ${analysis.document_overview?.project_type}`);
  console.log(`  Rooms Found: ${analysis.what_i_found?.rooms?.length || 0}`);
  console.log(`  Material Items: ${analysis.material_requirements?.length || 0}`);
  console.log(`  Missing Critical Items: ${analysis.missing_information?.missing_critical_items?.length || 0}`);
  console.log(`  Cost Status: ${analysis.building_cost_analysis?.cost_status}`);

  // Step 3: Interactive chat test
  const chatRes = await fetch(`${BASE_URL}/api/documents/${uploadJson.id}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "What is the primary material required for this project and what are the current Lagos price benchmarks?",
      sessionId: "test_session_harness"
    })
  });

  const chatJson = await chatRes.json();
  console.log(`  Chat Response: "${chatJson.reply?.slice(0, 140)}..."`);
  console.log(`  Chat Evidence Level: ${chatJson.evidenceLevel} | Citations: ${chatJson.citations?.join(", ")}`);

  // Check expected fields
  let fieldsOk = true;
  for (const f of testCase.expectFields || []) {
    if (!analysis[f]) {
      console.warn(`  Missing expected analysis section: ${f}`);
      fieldsOk = false;
    }
  }

  const passed = uploadRes.ok && analyzeRes.ok && fieldsOk && Boolean(chatJson.reply);
  console.log(`  Test Result: ${passed ? "PASS" : "FAIL"}`);

  return { passed, analysis, chatReply: chatJson.reply };
}

async function runRegressionSuite() {
  console.log("\n==================================================================");
  console.log("RUNNING REGRESSION CHECK: SEARCH PIPELINE (PHASES 4 & 5)");
  console.log("==================================================================");

  const res = await fetch(`${BASE_URL}/api/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: "How much is Dangote cement in Lagos?", forceRefresh: true })
  });

  const data = await res.json();
  const searchOk = res.status === 200 && data.vectorRetrieval === true && data.searchResults?.length > 0;
  console.log(`  Search API Status: ${res.status}`);
  console.log(`  Vector Retrieval Active: ${data.vectorRetrieval}`);
  console.log(`  Results Count: ${data.searchResults?.length}`);
  console.log(`  Top Result: "${data.searchResults?.[0]?.title}"`);
  console.log(`  Regression Check: ${searchOk ? "PASS" : "FAIL"}`);
  return searchOk;
}

async function main() {
  console.log("==================================================================");
  console.log("SHUREFIRE DOCUMENT & BUILDING PLAN INTELLIGENCE TEST SUITE");
  console.log("==================================================================");

  let allPassed = true;
  for (const t of TEST_SCENARIOS) {
    const res = await runTest(t);
    if (!res.passed) allPassed = false;
  }

  const regOk = await runRegressionSuite();
  if (!regOk) allPassed = false;

  console.log("\n==================================================================");
  console.log(`FINAL SUITE OUTCOME: ${allPassed ? "ALL TESTS PASSED" : "SOME TESTS FAILED"}`);
  console.log("==================================================================");
}

main().catch(console.error);
