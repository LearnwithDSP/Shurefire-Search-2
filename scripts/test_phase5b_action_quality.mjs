import { performance } from "perf_hooks";

const BASE_URL = "http://localhost:3000";

function makeSvgBase64(svgText) {
  return Buffer.from(svgText).toString("base64");
}

async function runPhase5BTests() {
  console.log("==================================================================");
  console.log("SHUREFIRE — PHASE 5B: ACTION EXPERIENCE & ANSWER QUALITY TEST SUITE");
  console.log("==================================================================");

  let passedTests = 0;
  let totalTests = 11;

  // Upload an architectural plan PDF
  const archPdf = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 200 >> stream
BT
/F1 12 Tf
50 720 Td
(PROPOSED 4-BEDROOM DUPLEX - LEKKI, LAGOS) Tj
0 -25 Td
(Total Floor Area: 260 sq metres. 2 Floors.) Tj
0 -25 Td
(Living Room 6.5m x 5.0m, Master Bedroom 5.0m x 4.5m, 3 En-Suite Bedrooms.) Tj
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

  const archUploadRes = await fetch(`${BASE_URL}/api/construction/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: "Duplex_Architectural_Working_Drawing.pdf",
      mimeType: "application/pdf",
      fileSize: archPdf.length,
      fileData: Buffer.from(archPdf).toString("base64")
    })
  });
  const archUploadJson = await archUploadRes.json();
  const archProjectId = archUploadJson.projectId;

  // -------------------------------------------------------------------------
  // TEST 1: Architectural PDF -> Cement Requirement (Part 1 & 2 Structure)
  // -------------------------------------------------------------------------
  console.log("\n[TEST 1] Cement Requirement: Direct Answer, What Shurefire Found & Evidence Tally");
  const cementRes = await fetch(`${BASE_URL}/api/construction/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectId: archProjectId,
      action: "cement_requirement"
    })
  });
  const cementJson = await cementRes.json();
  const cResult = cementJson.result;
  const test1Pass =
    cementRes.status === 200 &&
    cResult.directAnswer?.includes("Estimated cement requirement:") &&
    Array.isArray(cResult.whatShurefireFound) &&
    cResult.whatShurefireFound.length >= 8 &&
    cResult.evidenceSummary?.foundInDocument >= 1 &&
    cResult.evidenceSummary?.calculated >= 1 &&
    Array.isArray(cResult.materialBreakdownTable) &&
    cResult.materialBreakdownTable.length >= 3;

  console.log(`  Result: ${test1Pass ? "PASS" : "FAIL"} | Direct Answer: "${cResult.directAnswer}"`);
  console.log(`  What Shurefire Found: ${cResult.whatShurefireFound?.length} items | Evidence: Found=${cResult.evidenceSummary?.foundInDocument}, Calc=${cResult.evidenceSummary?.calculated}, Unk=${cResult.evidenceSummary?.unknown}`);
  if (test1Pass) passedTests++;

  // -------------------------------------------------------------------------
  // TEST 2: Architectural PDF -> Lagos Cost Estimate
  // -------------------------------------------------------------------------
  console.log("\n[TEST 2] Lagos Cost: Preliminary Range, Cost/m², Breakdown & Evidence");
  const costRes = await fetch(`${BASE_URL}/api/construction/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectId: archProjectId,
      action: "cost_estimate"
    })
  });
  const costJson = await costRes.json();
  const costResult = costJson.result;
  const test2Pass =
    costRes.status === 200 &&
    costResult.directAnswer?.includes("Preliminary Lagos construction estimate: ₦") &&
    costResult.result?.ratePerSquareMetre?.includes("₦") &&
    costResult.breakdown?.length >= 6 &&
    costResult.shurefireSources?.length > 0;

  console.log(`  Result: ${test2Pass ? "PASS" : "FAIL"} | Direct Answer: "${costResult.directAnswer}"`);
  console.log(`  Cost Intensity: ${costResult.result?.ratePerSquareMetre} | Sources: ${costResult.shurefireSources?.length}`);
  if (test2Pass) passedTests++;

  // -------------------------------------------------------------------------
  // TEST 3: Architectural PDF -> Procurement Priority
  // -------------------------------------------------------------------------
  console.log("\n[TEST 3] Procurement: Exactly 4 Chronological Groups (BUY NOW/NEXT/LATER/DO NOT BUY YET)");
  const procRes = await fetch(`${BASE_URL}/api/construction/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectId: archProjectId,
      action: "procurement_priority"
    })
  });
  const procJson = await procRes.json();
  const procResult = procJson.result;
  const groups = procResult.result?.groups || [];
  const has4Groups =
    groups.length === 4 &&
    groups[0].group === "BUY NOW" &&
    groups[1].group === "BUY NEXT" &&
    groups[2].group === "BUY LATER" &&
    groups[3].group === "DO NOT BUY YET";
  const test3Pass =
    procRes.status === 200 &&
    has4Groups &&
    procResult.directAnswer?.includes("Foundation materials should be purchased first.");

  console.log(`  Result: ${test3Pass ? "PASS" : "FAIL"} | Direct Answer: "${procResult.directAnswer}"`);
  console.log(`  Groups: ${groups.map(g => g.group).join(" -> ")}`);
  if (test3Pass) passedTests++;

  // -------------------------------------------------------------------------
  // TEST 4: Architectural PDF -> Preliminary BOQ
  // -------------------------------------------------------------------------
  console.log("\n[TEST 4] Preliminary BOQ: Line Items, Subtotal, 7.5% Contingency & Disclaimer");
  const boqRes = await fetch(`${BASE_URL}/api/construction/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectId: archProjectId,
      action: "preliminary_boq"
    })
  });
  const boqJson = await boqRes.json();
  const boqResult = boqJson.result;
  const test4Pass =
    boqRes.status === 200 &&
    boqResult.directAnswer?.includes("Preliminary BOQ total: ₦") &&
    boqResult.directAnswer?.includes("contingency") &&
    boqResult.result?.contingencyNaira > 0 &&
    boqResult.result?.disclaimer?.includes("PRELIMINARY BOQ — NOT A FINAL CONTRACT BOQ") &&
    boqResult.result?.items?.length >= 10;

  console.log(`  Result: ${test4Pass ? "PASS" : "FAIL"} | Direct Answer: "${boqResult.directAnswer}"`);
  console.log(`  Line Items: ${boqResult.result?.items?.length} | Subtotal: ₦${(boqResult.result?.subtotalNaira / 1e6).toFixed(2)}M | Contingency: ₦${(boqResult.result?.contingencyNaira / 1e6).toFixed(2)}M`);
  if (test4Pass) passedTests++;

  // -------------------------------------------------------------------------
  // TEST 5: Architectural PDF -> Missing Information Audit
  // -------------------------------------------------------------------------
  console.log("\n[TEST 5] Missing Info Audit: Completeness %, CRITICAL/IMPORTANT/OPTIONAL & Next Doc");
  const missingRes = await fetch(`${BASE_URL}/api/construction/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectId: archProjectId,
      action: "missing_information"
    })
  });
  const missingJson = await missingRes.json();
  const mResult = missingJson.result;
  const missingItems = mResult.result?.missingItems || [];
  const hasCritical = missingItems.some(i => i.category === "CRITICAL");
  const hasImportant = missingItems.some(i => i.category === "IMPORTANT");
  const hasOptional = missingItems.some(i => i.category === "OPTIONAL");
  const test5Pass =
    missingRes.status === 200 &&
    mResult.directAnswer?.includes("Project completeness:") &&
    hasCritical &&
    hasImportant &&
    hasOptional &&
    mResult.result?.mostImportantNextDocument?.includes("STRUCTURAL DRAWING");

  console.log(`  Result: ${test5Pass ? "PASS" : "FAIL"} | Direct Answer: "${mResult.directAnswer}"`);
  console.log(`  Categories: CRITICAL (${missingItems.filter(i => i.category === "CRITICAL").length}), IMPORTANT (${missingItems.filter(i => i.category === "IMPORTANT").length}), OPTIONAL (${missingItems.filter(i => i.category === "OPTIONAL").length})`);
  console.log(`  Next Document: "${mResult.result?.mostImportantNextDocument}"`);
  if (test5Pass) passedTests++;

  // -------------------------------------------------------------------------
  // TEST 6: Architectural-Only Plan -> Rebar Requirement (Safety Refusal)
  // -------------------------------------------------------------------------
  console.log("\n[TEST 6] Rebar on Architectural Plan: Strict Safety Refusal & Zero Fabrication");
  const rebarArchRes = await fetch(`${BASE_URL}/api/construction/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectId: archProjectId,
      action: "rebar_requirement"
    })
  });
  const rebarArchJson = await rebarArchRes.json();
  const rArchResult = rebarArchJson.result;
  const test6Pass =
    rebarArchRes.status === 200 &&
    rArchResult.directAnswer === "Structural reinforcement quantity cannot be safely determined from the uploaded architectural plan." &&
    rArchResult.result?.status === "STRUCTURAL_DATA_REQUIRED" &&
    rArchResult.result?.missingRequirements?.length >= 5;

  console.log(`  Result: ${test6Pass ? "PASS" : "FAIL"} | Safety Refusal: "${rArchResult.directAnswer}"`);
  console.log(`  Missing Structural Details: ${rArchResult.result?.missingRequirements?.slice(0, 3).join(", ")}...`);
  if (test6Pass) passedTests++;

  // -------------------------------------------------------------------------
  // TEST 7: Structural Drawing -> Rebar Requirement (Calculated Tonnage)
  // -------------------------------------------------------------------------
  console.log("\n[TEST 7] Rebar on Structural Drawing Sheet: Derived Tonnage & Bar Schedule");
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
      filename: "Structural_Engineering_Plan_S01.png",
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
  const rStructResult = rebarStructJson.result;
  const test7Pass =
    rebarStructRes.status === 200 &&
    rStructResult.directAnswer?.includes("Estimated reinforcement requirement: Approx") &&
    Boolean(rStructResult.result?.totalTonnageTonnes);

  console.log(`  Result: ${test7Pass ? "PASS" : "FAIL"} | Direct Answer: "${rStructResult.directAnswer}"`);
  console.log(`  Tonnage: ${rStructResult.result?.totalTonnageTonnes} Tonnes | Cost: ₦${(rStructResult.result?.totalCostNaira / 1e6).toFixed(2)}M`);
  if (test7Pass) passedTests++;

  // -------------------------------------------------------------------------
  // TEST 8: Incomplete / Poor-Quality Drawing Graceful Handling
  // -------------------------------------------------------------------------
  console.log("\n[TEST 8] Incomplete / Poor-Quality Drawing: LOW Confidence & Graceful Fallback");
  const blurrySvg = makeSvgBase64(`
    <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80">
      <rect width="80" height="80" fill="#eee"/>
      <circle cx="40" cy="40" r="10" fill="#ccc"/>
    </svg>
  `);
  const poorRes = await fetch(`${BASE_URL}/api/construction/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: "unreadable_sketch.png",
      mimeType: "image/png",
      fileSize: blurrySvg.length,
      fileData: blurrySvg
    })
  });
  const poorJson = await poorRes.json();
  const test8Pass =
    poorRes.status === 200 &&
    (poorJson.profile?.confidence?.overall === "LOW" || poorJson.profile?.confidence?.dimensions === "LOW");

  console.log(`  Result: ${test8Pass ? "PASS" : "FAIL"} | Handled Gracefully with Confidence: ${poorJson.profile?.confidence?.overall}`);
  if (test8Pass) passedTests++;

  // -------------------------------------------------------------------------
  // TEST 9: Existing Search Normal Operation
  // -------------------------------------------------------------------------
  console.log("\n[TEST 9] Regression: Normal Shurefire Search (/api/search)");
  const searchRes = await fetch(`${BASE_URL}/api/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: "current cement price in Ikeja Lagos",
      forceRefresh: false
    })
  });
  const searchJson = await searchRes.json();
  const test9Pass =
    searchRes.status === 200 &&
    searchJson.vectorRetrieval === true &&
    searchJson.searchResults?.length > 0 &&
    searchJson.featuredAnswer?.length > 50;

  console.log(`  Result: ${test9Pass ? "PASS" : "FAIL"} | Vector: ${searchJson.vectorRetrieval} | Results: ${searchJson.searchResults?.length} | Answer: ${searchJson.featuredAnswer?.slice(0, 70)}...`);
  if (test9Pass) passedTests++;

  // -------------------------------------------------------------------------
  // TEST 10: Unknown Construction Action Rejection
  // -------------------------------------------------------------------------
  console.log("\n[TEST 10] Unknown / Invalid Action: Safe Rejection with 400 (No Fabrication)");
  const badActionRes = await fetch(`${BASE_URL}/api/construction/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectId: archProjectId,
      action: "fake_nonexistent_action"
    })
  });
  const badActionJson = await badActionRes.json();
  const test10Pass = badActionRes.status === 400 && badActionJson.error?.includes("Invalid action");
  console.log(`  Result: ${test10Pass ? "PASS" : "FAIL"} | Status: ${badActionRes.status} | Error: "${badActionJson.error}"`);
  if (test10Pass) passedTests++;

  // -------------------------------------------------------------------------
  // TEST 11: Loading Text & Supabase Hint Verification in Frontend Code
  // -------------------------------------------------------------------------
  console.log("\n[TEST 11] Verification: Loading Text is 'Loading Search Result.' and No Supabase Hints on SERP");
  const fs = await import("fs");
  const serpContent = fs.readFileSync("./src/components/SearchResultsPage.tsx", "utf-8");
  const hasLoadingSearchResult = serpContent.includes("Loading Search Result.");
  const hasOldLoadingText = serpContent.includes("Querying Supabase & synthesizing with Gemini...");
  const hasSupabaseHintInHeader = serpContent.includes("<span>Supabase pgvector</span>");
  const test11Pass = hasLoadingSearchResult && !hasOldLoadingText && !hasSupabaseHintInHeader;

  console.log(`  Result: ${test11Pass ? "PASS" : "FAIL"} | "Loading Search Result." present: ${hasLoadingSearchResult} | Old text removed: ${!hasOldLoadingText} | Supabase hint removed: ${!hasSupabaseHintInHeader}`);
  if (test11Pass) passedTests++;

  console.log("\n==================================================================");
  console.log(`PHASE 5B MASTER OUTCOME: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log("==================================================================");

  if (passedTests === totalTests) {
    console.log("ALL 11 TEST SCENARIOS PASSED CONCURRENTLY WITH ZERO REGRESSIONS.");
    process.exit(0);
  } else {
    console.error("SOME TESTS FAILED.");
    process.exit(1);
  }
}

runPhase5BTests().catch(err => {
  console.error("Test Suite Unhandled Exception:", err);
  process.exit(1);
});
