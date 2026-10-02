const BASE_URL = "http://localhost:3000";

const PHASE6_TESTS = [
  {
    id: 1,
    query: "How much is cement in Lagos?",
    validate: (qi) => {
      const intentOk = qi.search_intent === "price";
      const matOk = qi.material?.toLowerCase().includes("cement");
      const locOk = qi.location?.toLowerCase().includes("lagos");
      return {
        passed: intentOk && matOk && locOk,
        details: `intent: ${qi.search_intent} (expected: price), material: ${qi.material} (expected: cement), location: ${qi.location} (expected: Lagos)`
      };
    }
  },
  {
    id: 2,
    query: "How many bags of cement for one cubic metre of concrete?",
    validate: (qi) => {
      const intentOk = qi.search_intent === "quantity";
      const matOk = qi.material?.toLowerCase().includes("cement");
      const stageOk = qi.construction_stage?.toLowerCase().includes("concrete");
      const qtyOk = !!qi.quantity && (qi.quantity.toLowerCase().includes("1") || qi.quantity.toLowerCase().includes("cubic"));
      return {
        passed: intentOk && matOk && qtyOk,
        details: `intent: ${qi.search_intent} (expected: quantity), material: ${qi.material} (expected: cement), stage: ${qi.construction_stage} (expected: concrete works), quantity: ${qi.quantity} (expected: 1 cubic metre)`
      };
    }
  },
  {
    id: 3,
    query: "Best concrete mix ratio for foundation",
    validate: (qi) => {
      const intentOk = qi.search_intent === "specification";
      const matOk = qi.material?.toLowerCase().includes("concrete");
      const stageOk = qi.construction_stage?.toLowerCase().includes("foundation");
      return {
        passed: intentOk && matOk && stageOk,
        details: `intent: ${qi.search_intent} (expected: specification), material: ${qi.material} (expected: concrete), stage: ${qi.construction_stage} (expected: foundation)`
      };
    }
  },
  {
    id: 4,
    query: "How much does it cost to build a 2-bedroom flat in Nigeria?",
    validate: (qi) => {
      const intentOk = qi.search_intent === "price";
      const projOk = qi.project_type?.toLowerCase().includes("2-bedroom") || qi.project_type?.toLowerCase().includes("flat");
      const locOk = qi.location?.toLowerCase().includes("nigeria");
      return {
        passed: intentOk && projOk && locOk,
        details: `intent: ${qi.search_intent} (expected: price), project_type: ${qi.project_type} (expected: 2-bedroom flat), location: ${qi.location} (expected: Nigeria)`
      };
    }
  },
  {
    id: 5,
    query: "1:2:4 vs 1:3:6 concrete",
    validate: (qi) => {
      const intentOk = qi.search_intent === "comparison";
      const specOk = qi.specification?.toLowerCase().includes("mix") || qi.specification?.toLowerCase().includes("ratio");
      const compOk = qi.comparison_target?.includes("1:2:4") && qi.comparison_target?.includes("1:3:6");
      return {
        passed: intentOk && (specOk || compOk),
        details: `intent: ${qi.search_intent} (expected: comparison), spec: ${qi.specification} (expected: concrete mix ratio), comparison: ${qi.comparison_target} (expected: 1:2:4 vs 1:3:6)`
      };
    }
  },
  {
    id: 6,
    query: "What should I do next on my site?",
    validate: (qi) => {
      const noMat = qi.material === null;
      const noLoc = qi.location === null;
      const noPrice = qi.price_request === null;
      const noQty = qi.quantity === null;
      return {
        passed: noMat && noLoc && noPrice && noQty,
        details: `no hallucinated attributes: material=${qi.material}, location=${qi.location}, price=${qi.price_request}, quantity=${qi.quantity}`
      };
    }
  },
  {
    id: 7,
    query: "Who won the FIFA World Cup in 2022?",
    validate: (qi) => {
      const intentOk = qi.search_intent === "unknown" || qi.search_intent === "general_information";
      const noAttrs = qi.material === null && qi.location === null && qi.price_request === null && qi.quantity === null && qi.specification === null;
      return {
        passed: intentOk && noAttrs,
        details: `intent: ${qi.search_intent} (expected: unknown), no fabricated construction attributes: ${noAttrs}`
      };
    }
  },
  {
    id: 8,
    query: "Current price of Dangote cement in Lagos",
    forceFail: true,
    validate: (qi, data) => {
      const fallbackOk = qi.optimized_search_query === "Current price of Dangote cement in Lagos";
      const resultsOk = Array.isArray(data.searchResults) && data.searchResults.length > 0;
      const vectorOk = data.vectorRetrieval === true;
      return {
        passed: fallbackOk && resultsOk && vectorOk,
        details: `fallback triggered: ${fallbackOk}, vector retrieval active: ${vectorOk}, results returned: ${data.searchResults?.length}`
      };
    }
  }
];

async function runTest(t) {
  const body = {
    query: t.query,
    forceRefresh: true,
    testForceQiFailure: t.forceFail || false
  };

  const res = await fetch(`${BASE_URL}/api/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const data = await res.json();
  const qi = data.queryIntelligence || {};
  const validation = t.validate(qi, data);

  return {
    id: t.id,
    query: t.query,
    qi,
    optimized_search_query: data.optimized_search_query,
    preserved_query: data.query,
    topDoc: data.searchResults?.[0]?.title,
    sim: data.searchResults?.[0]?.similarity,
    validation
  };
}

async function main() {
  console.log("==================================================================");
  console.log("SHUREFIRE PHASE 6 — GEMINI QUERY INTELLIGENCE TEST SUITE");
  console.log("==================================================================\n");

  const results = [];
  let allPassed = true;

  for (const t of PHASE6_TESTS) {
    console.log(`[TEST ${t.id}] Query: "${t.query}" ${t.forceFail ? "(FORCED QI FAILURE)" : ""}`);
    const out = await runTest(t);
    results.push(out);

    console.log(`  Intent: ${out.qi.search_intent}`);
    console.log(`  Material: ${out.qi.material}`);
    console.log(`  Construction Stage: ${out.qi.construction_stage}`);
    console.log(`  Location: ${out.qi.location}`);
    console.log(`  Project Type: ${out.qi.project_type}`);
    console.log(`  Specification: ${out.qi.specification}`);
    console.log(`  Quantity: ${out.qi.quantity}`);
    console.log(`  Price Request: ${out.qi.price_request}`);
    console.log(`  Comparison Target: ${out.qi.comparison_target}`);
    console.log(`  Procurement Intent: ${out.qi.procurement_intent}`);
    console.log(`  Optimized Query: "${out.optimized_search_query}"`);
    console.log(`  Original Query Preserved: "${out.preserved_query}"`);
    console.log(`  Top Result: "${out.topDoc}" (sim: ${out.sim?.toFixed(4)})`);
    console.log(`  Evaluation: ${out.validation.details}`);
    console.log(`  Result: ${out.validation.passed ? "PASS" : "FAIL"}`);
    console.log("------------------------------------------------------------------");

    if (!out.validation.passed) allPassed = false;
  }

  console.log(`\nALL 8 TESTS RESULT: ${allPassed ? "PASS" : "FAIL"}`);
}

main().catch(console.error);
