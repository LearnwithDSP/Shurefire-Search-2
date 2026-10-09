import { performance } from "perf_hooks";

const BASE_URL = "http://localhost:3000";

function makeSvgBase64(svgText) {
  return Buffer.from(svgText).toString("base64");
}

async function runTests() {
  console.log("==================================================================");
  console.log("SHUREFIRE — PHASE 5A: CONSTRUCTION INTELLIGENCE MASTER TEST SUITE");
  console.log("==================================================================");

  let passedTests = 0;
  let totalTests = 16;

  // -------------------------------------------------------------------------
  // TEST 1: Upload valid architectural PDF
  // -------------------------------------------------------------------------
  console.log("\n[TEST 1] Upload valid architectural PDF");
  const validPdf = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 200 >> stream
BT
/F1 12 Tf
50 720 Td
(PROPOSED 3-BEDROOM BUNGALOW - ARCHITECTURAL WORKING DRAWING) Tj
0 -25 Td
(Location: Ikeja, Lagos. Total Floor Area: 185 sq metres.) Tj
0 -25 Td
(Living Room 6.0m x 4.5m, Master Bedroom 4.5m x 4.0m, 2 Bedrooms 3.6m x 3.6m.) Tj
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
0000000497 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
574
%%EOF`;

  const pdfRes = await fetch(`${BASE_URL}/api/construction/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: "Architectural_Bungalow_Plan.pdf",
      mimeType: "application/pdf",
      fileSize: validPdf.length,
      fileData: Buffer.from(validPdf).toString("base64")
    })
  });
  const pdfJson = await pdfRes.json();
  const test1Pass = pdfRes.status === 200 && pdfJson.profile?.projectType === "Residential" && Boolean(pdfJson.projectId);
  console.log(`  Result: ${test1Pass ? "PASS" : "FAIL"} | Project ID: ${pdfJson.projectId} | Type: ${pdfJson.profile?.buildingType}`);
  if (test1Pass) passedTests++;

  const archProjectId = pdfJson.projectId;

  // -------------------------------------------------------------------------
  // TEST 2: Upload building plan image
  // -------------------------------------------------------------------------
  console.log("\n[TEST 2] Upload building plan image");
  const planImgBase64 = makeSvgBase64(`
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
      <rect width="800" height="600" fill="#0f172a"/>
      <text x="50" y="50" fill="#38bdf8" font-size="20">PROPOSED 4-BEDROOM DUPLEX - LEKKI, LAGOS</text>
      <text x="50" y="80" fill="#94a3b8" font-size="14">FLOOR AREA: 240 m² • 2 FLOORS</text>
      <rect x="70" y="120" width="300" height="200" fill="none" stroke="#38bdf8" stroke-width="2"/>
      <text x="100" y="200" fill="#fff">LIVING ROOM: 6.0m x 5.0m (30m²)</text>
      <rect x="400" y="120" width="250" height="200" fill="none" stroke="#38bdf8" stroke-width="2"/>
      <text x="430" y="200" fill="#fff">ANTE-ROOM &amp; DINING</text>
    </svg>
  `);
  const imgRes = await fetch(`${BASE_URL}/api/construction/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: "Duplex_Architectural_FloorPlan.png",
      mimeType: "image/png",
      fileSize: planImgBase64.length,
      fileData: planImgBase64
    })
  });
  const imgJson = await imgRes.json();
  const test2Pass = imgRes.status === 200 && Boolean(imgJson.projectId) && imgJson.profile?.floors >= 1;
  console.log(`  Result: ${test2Pass ? "PASS" : "FAIL"} | Floors: ${imgJson.profile?.floors} | Area: ${imgJson.profile?.floorArea}m²`);
  if (test2Pass) passedTests++;

  // -------------------------------------------------------------------------
  // TEST 3: Upload invalid file
  // -------------------------------------------------------------------------
  console.log("\n[TEST 3] Upload invalid file (.exe rejection)");
  const invalidRes = await fetch(`${BASE_URL}/api/construction/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: "malicious_script.exe",
      mimeType: "application/x-msdownload",
      fileSize: 120,
      fileData: Buffer.from("MZFAKE").toString("base64")
    })
  });
  const invalidJson = await invalidRes.json();
  const test3Pass = invalidRes.status === 400 && invalidJson.error?.includes("Unsupported file type");
  console.log(`  Result: ${test3Pass ? "PASS" : "FAIL"} | Status: ${invalidRes.status} | Rejection: "${invalidJson.error?.slice(0, 50)}..."`);
  if (test3Pass) passedTests++;

  // -------------------------------------------------------------------------
  // TEST 4: Upload poor-quality image (insufficient clarity)
  // -------------------------------------------------------------------------
  console.log("\n[TEST 4] Upload poor-quality / ambiguous sketch");
  const blurrySvg = makeSvgBase64(`
    <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
      <rect width="100" height="100" fill="#ccc"/>
      <circle cx="50" cy="50" r="10" fill="#999"/>
    </svg>
  `);
  const poorRes = await fetch(`${BASE_URL}/api/construction/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: "Blurry_Thumbnail.png",
      mimeType: "image/png",
      fileSize: blurrySvg.length,
      fileData: blurrySvg
    })
  });
  const poorJson = await poorRes.json();
  const test4Pass = poorRes.status === 200 && (poorJson.profile?.confidence?.overall === "LOW" || poorJson.profile?.analysisWarnings?.length > 0 || poorJson.profile?.missingInformation?.length > 0);
  console.log(`  Result: ${test4Pass ? "PASS" : "FAIL"} | Handled Gracefully with Confidence: ${poorJson.profile?.confidence?.overall}`);
  if (test4Pass) passedTests++;

  // -------------------------------------------------------------------------
  // TEST 5: Cement Action (How much cement will I need?)
  // -------------------------------------------------------------------------
  console.log("\n[TEST 5] Action #1: cement_requirement");
  const cementRes = await fetch(`${BASE_URL}/api/construction/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectId: archProjectId,
      action: "cement_requirement"
    })
  });
  const cementJson = await cementRes.json();
  const test5Pass = cementRes.status === 200 && cementJson.result?.result?.averageBags > 0 && cementJson.result?.breakdown?.length >= 3;
  console.log(`  Result: ${test5Pass ? "PASS" : "FAIL"} | Average Bags: ${cementJson.result?.result?.averageBags} | Breakdown Items: ${cementJson.result?.breakdown?.length}`);
  if (test5Pass) passedTests++;

  // -------------------------------------------------------------------------
  // TEST 6: Lagos Cost Action (Estimate cost in Lagos)
  // -------------------------------------------------------------------------
  console.log("\n[TEST 6] Action #2: cost_estimate");
  const costRes = await fetch(`${BASE_URL}/api/construction/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectId: archProjectId,
      action: "cost_estimate"
    })
  });
  const costJson = await costRes.json();
  const test6Pass = costRes.status === 200 && costJson.result?.result?.medianNaira > 1000000 && costJson.result?.breakdown?.length >= 5;
  console.log(`  Result: ${test6Pass ? "PASS" : "FAIL"} | Range: ₦${(costJson.result?.result?.lowTotalNaira / 1e6).toFixed(1)}M - ₦${(costJson.result?.result?.highTotalNaira / 1e6).toFixed(1)}M`);
  if (test6Pass) passedTests++;

  // -------------------------------------------------------------------------
  // TEST 7: Procurement Action (What materials to buy first?)
  // -------------------------------------------------------------------------
  console.log("\n[TEST 7] Action #3: procurement_priority");
  const procRes = await fetch(`${BASE_URL}/api/construction/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectId: archProjectId,
      action: "procurement_priority"
    })
  });
  const procJson = await procRes.json();
  const groups = procJson.result?.result?.groups || [];
  const test7Pass = procRes.status === 200 && groups.length === 4 && groups.some(g => g.group === "BUY NOW") && groups.some(g => g.group === "DO NOT BUY YET");
  console.log(`  Result: ${test7Pass ? "PASS" : "FAIL"} | Groups Found: ${groups.map(g => g.group).join(", ")}`);
  if (test7Pass) passedTests++;

  // -------------------------------------------------------------------------
  // TEST 8: Preliminary BOQ Action (Create preliminary BOQ)
  // -------------------------------------------------------------------------
  console.log("\n[TEST 8] Action #4: preliminary_boq");
  const boqRes = await fetch(`${BASE_URL}/api/construction/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectId: archProjectId,
      action: "preliminary_boq"
    })
  });
  const boqJson = await boqRes.json();
  const boqItems = boqJson.result?.result?.items || [];
  const test8Pass = boqRes.status === 200 && boqItems.length >= 8 && boqJson.result?.result?.grandTotalNaira > 0;
  console.log(`  Result: ${test8Pass ? "PASS" : "FAIL"} | BOQ Line Items: ${boqItems.length} | Grand Total: ₦${(boqJson.result?.result?.grandTotalNaira / 1e6).toFixed(2)}M`);
  if (test8Pass) passedTests++;

  // -------------------------------------------------------------------------
  // TEST 9: Missing Information Action (What info is missing?)
  // -------------------------------------------------------------------------
  console.log("\n[TEST 9] Action #5: missing_information");
  const missingRes = await fetch(`${BASE_URL}/api/construction/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectId: archProjectId,
      action: "missing_information"
    })
  });
  const missingJson = await missingRes.json();
  const audit = missingJson.result?.result;
  const test9Pass = missingRes.status === 200 && typeof audit?.completenessPercent === "number" && audit?.missingItems?.length >= 3 && Boolean(audit?.mostImportantNextDocument);
  console.log(`  Result: ${test9Pass ? "PASS" : "FAIL"} | Completeness: ${audit?.completenessPercent}% | Next Doc: "${audit?.mostImportantNextDocument}"`);
  if (test9Pass) passedTests++;

  // -------------------------------------------------------------------------
  // TEST 10: Rebar action on ARCHITECTURAL-ONLY plan (Safety Refusal)
  // -------------------------------------------------------------------------
  console.log("\n[TEST 10] Action #6: rebar_requirement on Architectural-Only Plan (Safety Guardrail)");
  const rebarArchRes = await fetch(`${BASE_URL}/api/construction/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectId: archProjectId,
      action: "rebar_requirement"
    })
  });
  const rebarArchJson = await rebarArchRes.json();
  const refusesFabrication = rebarArchJson.result?.result?.status === "STRUCTURAL_DATA_REQUIRED" && (
    rebarArchJson.result?.shortAnswer?.includes("cannot safely determine") ||
    rebarArchJson.result?.shortAnswer?.includes("does not contain enough structural information") ||
    rebarArchJson.result?.directAnswer?.includes("cannot safely determine")
  );
  const test10Pass = rebarArchRes.status === 200 && Boolean(refusesFabrication);
  console.log(`  Result: ${test10Pass ? "PASS" : "FAIL"} | Safety Refusal Status: ${rebarArchJson.result?.result?.status} | Zero Fabrication Policy Enforced`);
  if (test10Pass) passedTests++;

  // -------------------------------------------------------------------------
  // TEST 11: Rebar action on STRUCTURAL DRAWING
  // -------------------------------------------------------------------------
  console.log("\n[TEST 11] Action #6: rebar_requirement on Structural Drawing Sheet");
  const structSvg = makeSvgBase64(`
    <svg xmlns="http://www.w3.org/2000/svg" width="900" height="600">
      <rect width="900" height="600" fill="#1e293b"/>
      <text x="50" y="50" fill="#fbbf24" font-size="20">STRUCTURAL RAFT FOUNDATION &amp; REINFORCEMENT SCHEDULE</text>
      <text x="50" y="80" fill="#cbd5e1" font-size="14">DRAWING S-01 • ENGINEER: COREN 19822 • BAR BENDING SCHEDULE</text>
      <rect x="70" y="120" width="760" height="380" fill="none" stroke="#fbbf24" stroke-width="2"/>
      <text x="100" y="180" fill="#fff">FOUNDATION: 250mm RAFT SLAB (T16 @ 150mm C/C TOP &amp; BOTTOM BARS)</text>
      <text x="100" y="230" fill="#fff">COLUMNS (C1-C12): 225x225mm (4Y16mm MAIN BARS, Y10mm LINKS @ 200mm C/C)</text>
      <text x="100" y="280" fill="#fff">BEAMS (RB1): 450x225mm (3Y16 BOTTOM, 2Y16 TOP, Y10 STIRRUPS @ 175mm C/C)</text>
    </svg>
  `);
  const structUploadRes = await fetch(`${BASE_URL}/api/construction/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: "Structural_Reinforcement_Schedule.png",
      mimeType: "image/png",
      fileSize: structSvg.length,
      fileData: structSvg
    })
  });
  const structUploadJson = await structUploadRes.json();
  const structProjectId = structUploadJson.projectId;

  const rebarStructRes = await fetch(`${BASE_URL}/api/construction/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectId: structProjectId,
      action: "rebar_requirement"
    })
  });
  const rebarStructJson = await rebarStructRes.json();
  const test11Pass = rebarStructRes.status === 200 && (Boolean(rebarStructJson.result?.result?.totalTonnageTonnes) || Boolean(rebarStructJson.result?.result?.rebar16mmLengths));
  console.log(`  Result: ${test11Pass ? "PASS" : "FAIL"} | Calculated Rebar Tonnage: ${rebarStructJson.result?.result?.totalTonnageTonnes || "Extracted"} Tonnes`);
  if (test11Pass) passedTests++;

  // -------------------------------------------------------------------------
  // TEST 12: Unknown / Invalid Action Rejection
  // -------------------------------------------------------------------------
  console.log("\n[TEST 12] Unknown / Invalid construction action rejection");
  const badActionRes = await fetch(`${BASE_URL}/api/construction/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectId: archProjectId,
      action: "unsupported_crypto_speculation"
    })
  });
  const badActionJson = await badActionRes.json();
  const test12Pass = badActionRes.status === 400 && badActionJson.error?.includes("Invalid action");
  console.log(`  Result: ${test12Pass ? "PASS" : "FAIL"} | Status: ${badActionRes.status} | Error: "${badActionJson.error}"`);
  if (test12Pass) passedTests++;

  // -------------------------------------------------------------------------
  // TEST 13: Regression - Existing Search (/api/search)
  // -------------------------------------------------------------------------
  console.log("\n[TEST 13] Regression Check: Existing Search (/api/search)");
  const searchRes = await fetch(`${BASE_URL}/api/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: "How much is Dangote cement in Lagos today?",
      forceRefresh: true
    })
  });
  const searchJson = await searchRes.json();
  const test13Pass = searchRes.status === 200 && searchJson.vectorRetrieval === true && searchJson.searchResults?.length > 0;
  console.log(`  Result: ${test13Pass ? "PASS" : "FAIL"} | Vector Retrieval: ${searchJson.vectorRetrieval} | Results: ${searchJson.searchResults?.length}`);
  if (test13Pass) passedTests++;

  // -------------------------------------------------------------------------
  // TEST 14: Regression - Existing AI Overview & Knowledge Grounding
  // -------------------------------------------------------------------------
  console.log("\n[TEST 14] Regression Check: Grounded AI Overview");
  const test14Pass = searchRes.status === 200 && typeof searchJson.featuredAnswer === "string" && searchJson.featuredAnswer.length > 50 && searchJson.groundingSources?.length > 0;
  console.log(`  Result: ${test14Pass ? "PASS" : "FAIL"} | AI Overview length: ${searchJson.featuredAnswer?.length || 0} chars | Sources: ${searchJson.groundingSources?.length || 0}`);
  if (test14Pass) passedTests++;

  // -------------------------------------------------------------------------
  // TEST 15: Regression - Admin Auth (/api/admin/auth/login)
  // -------------------------------------------------------------------------
  console.log("\n[TEST 15] Regression Check: Admin Auth (/api/admin/auth/login)");
  const adminRes = await fetch(`${BASE_URL}/api/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "ramonbisola1@gmail.com",
      password: "wrong_password_test"
    })
  });
  const adminJson = await adminRes.json();
  // Expect 401 Unauthorized for invalid credentials, verifying Supabase Auth pipeline is alive and secure
  const test15Pass = adminRes.status === 401 && (adminJson.error?.includes("Invalid") || adminJson.error?.includes("credentials"));
  console.log(`  Result: ${test15Pass ? "PASS" : "FAIL"} | Status: ${adminRes.status} | Auth Guard: Active`);
  if (test15Pass) passedTests++;

  // -------------------------------------------------------------------------
  // TEST 16: Regression - Existing Crawler & Phase 4A Quality Gate
  // -------------------------------------------------------------------------
  console.log("\n[TEST 16] Regression Check: Crawler Ingest & Phase 4A Quality Gate");
  // Part A: Crawler Quality Gate rejection on substandard page (< 25 words)
  const qualityGateShortRes = await fetch(`${BASE_URL}/api/admin/crawl-ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: "https://example.com/test-article"
    })
  });
  const shortJson = await qualityGateShortRes.json();
  const shortGateOk = qualityGateShortRes.status === 422 && /Quality Gate Rejected/i.test(shortJson.error || "");

  // Part B: Quality Gate rejection on Cloudflare / bot challenge pages
  const gateRes = await fetch(`${BASE_URL}/api/admin/knowledge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Just a moment...",
      content: "Checking your browser before accessing the website. Cloudflare Ray ID: 8888",
      url: "https://example.com/cloudflare-block"
    })
  });
  const gateJson = await gateRes.json();
  const botGateOk = gateRes.status === 422 && /Quality Gate Rejected/i.test(gateJson.error || "");

  const test16Pass = shortGateOk && botGateOk;
  console.log(`  Result: ${test16Pass ? "PASS" : "FAIL"} | Substandard Page Blocked (422): ${shortGateOk ? "YES" : "NO"} | Bot Challenge Blocked (422): ${botGateOk ? "YES" : "NO"}`);
  if (test16Pass) passedTests++;

  console.log("\n==================================================================");
  console.log(`FINAL OUTCOME: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log("==================================================================");

  if (passedTests === totalTests) {
    console.log("ALL 16 TEST SCENARIOS PASSED CONCURRENTLY WITH ZERO REGRESSIONS.");
    process.exit(0);
  } else {
    console.error("SOME TESTS FAILED.");
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error("Test Suite Unhandled Exception:", err);
  process.exit(1);
});
