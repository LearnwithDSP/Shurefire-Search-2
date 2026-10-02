import { performance } from "perf_hooks";

const BASE_URL = "http://localhost:3000";

const TEST_QUERIES = [
  // CATEGORY A — MATERIAL SEARCH
  {
    category: "CATEGORY A — MATERIAL SEARCH",
    id: "A1",
    query: "current price of Dangote cement in Nigeria",
    expectedTopTitleKeywords: ["cement"],
    expectedHasPriceData: true
  },
  {
    category: "CATEGORY A — MATERIAL SEARCH",
    id: "A2",
    query: "how much is a 50kg bag of cement",
    expectedTopTitleKeywords: ["cement"],
    expectedHasPriceData: true
  },
  {
    category: "CATEGORY A — MATERIAL SEARCH",
    id: "A3",
    query: "cement prices in Nigeria",
    expectedTopTitleKeywords: ["cement"],
    expectedHasPriceData: true
  },

  // CATEGORY B — SEMANTIC MATERIAL SEARCH
  {
    category: "CATEGORY B — SEMANTIC MATERIAL SEARCH",
    id: "B1",
    query: "what does one bag of cement cost",
    expectedTopTitleKeywords: ["cement"],
    expectedHasPriceData: true
  },
  {
    category: "CATEGORY B — SEMANTIC MATERIAL SEARCH",
    id: "B2",
    query: "how expensive is cement right now",
    expectedTopTitleKeywords: ["cement"],
    expectedHasPriceData: true
  },

  // CATEGORY C — BUILDING COST
  {
    category: "CATEGORY C — BUILDING COST",
    id: "C1",
    query: "How much does it cost to build a 2-bedroom flat in Nigeria?",
    expectedTopTitleKeywords: ["flat", "2-bedroom"],
    expectedMustContain: ["foundation", "block work", "roofing", "electrical", "plumbing", "finishes"],
    expectedForbiddenPhrases: ["42,000,000 to 54,500,000", "42M to 54.5M", "42m to 54m"]
  },

  // CATEGORY D — TECHNICAL CONSTRUCTION
  {
    category: "CATEGORY D — TECHNICAL CONSTRUCTION",
    id: "D1",
    query: "what is the concrete mix ratio 1:2:4",
    expectedTopTitleKeywords: ["building", "cost", "flat"],
    checkContentKeywords: ["1:2:4", "mix"]
  },
  {
    category: "CATEGORY D — TECHNICAL CONSTRUCTION",
    id: "D2",
    query: "how much cement sand and granite are needed for one cubic metre of concrete",
    expectedTopTitleKeywords: ["building", "cost", "flat"],
    checkContentKeywords: ["cement", "sand", "granite"]
  },

  // CATEGORY E — PROCUREMENT
  {
    category: "CATEGORY E — PROCUREMENT",
    id: "E1",
    query: "where can I buy building materials in Nigeria",
    allowInsufficientOrProcurement: true
  },

  // CATEGORY F — LOCATION
  {
    category: "CATEGORY F — LOCATION",
    id: "F1",
    query: "cement price in Lagos",
    expectedTopTitleKeywords: ["cement"],
    expectedHasPriceData: true
  },

  // CATEGORY G — NATURAL LANGUAGE
  {
    category: "CATEGORY G — NATURAL LANGUAGE",
    id: "G1",
    query: "I want to build a small house in Nigeria. What should I budget for materials?",
    expectedTopTitleKeywords: ["house", "building", "flat", "cost"]
  },

  // CATEGORY H — UNKNOWN / UNINDEXED QUERY
  {
    category: "CATEGORY H — UNKNOWN / UNINDEXED QUERY",
    id: "H1",
    query: "What is the average cost of installing a swimming pool in a residential building in Nigeria?",
    expectedRefusal: true
  }
];

const VARIATION_QUERIES = [
  "cement price",
  "price of cement",
  "how much is cement",
  "cost of a bag of cement",
  "50kg cement price"
];

async function runSearch(query, forceRefresh = true) {
  const start = performance.now();
  const res = await fetch(`${BASE_URL}/api/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, forceRefresh })
  });
  const elapsed = Math.round(performance.now() - start);
  const data = await res.json();
  return { status: res.status, data, elapsed };
}

async function executeHarness() {
  console.log("==================================================================");
  console.log("SHUREFIRE PHASE 5 — SEMANTIC SEARCH QUALITY TEST HARNESS");
  console.log("==================================================================\n");

  const resultsSummary = {
    retrieval: {},
    searchTests: {},
    grounding: {},
    regression: {},
    technical: {},
    latencies: []
  };

  const capturedResults = [];

  for (const testCase of TEST_QUERIES) {
    console.log(`[TEST ${testCase.id}] ${testCase.query}`);
    const { status, data, elapsed } = await runSearch(testCase.query);
    resultsSummary.latencies.push({ id: testCase.id, elapsed });

    const results = data.searchResults || [];
    const aiOverview = data.aiOverview;
    const topResult = results[0];

    // Capture raw results
    const captured = {
      id: testCase.id,
      category: testCase.category,
      query: testCase.query,
      elapsed,
      embeddingDimensions: data.embeddingDimensions || 768,
      vectorRetrieval: data.vectorRetrieval,
      resultsCount: results.length,
      topDoc: topResult ? {
        id: topResult.id,
        title: topResult.title,
        url: topResult.url,
        domain: topResult.domain,
        similarity: topResult.similarity,
        relevanceLabel: topResult.relevanceLabel,
        hasPriceData: topResult.has_price_data,
        cleanedContentLength: topResult.cleanedContentLength,
        contentLength: topResult.contentLength
      } : null,
      aiSummarySnippet: aiOverview?.summaryParagraphs?.[0]?.slice(0, 150) || "",
      citationsCount: aiOverview?.supportingCitations?.length || 0
    };
    capturedResults.push(captured);

    console.log(`  Elapsed: ${elapsed}ms | Results: ${results.length} | VectorDim: ${captured.embeddingDimensions}`);
    if (topResult) {
      console.log(`  Top Result: "${topResult.title}" | Sim: ${topResult.similarity?.toFixed(4)} | Rel: ${topResult.relevanceLabel} | Domain: ${topResult.domain}`);
    }

    // Check ranking order: sim[0] >= sim[1] >= sim[2]
    let rankingMonotonic = true;
    for (let i = 0; i < results.length - 1; i++) {
      if (results[i].similarity < results[i + 1].similarity) {
        rankingMonotonic = false;
        break;
      }
    }
    console.log(`  Ranking Monotonic (Sim descending): ${rankingMonotonic ? "PASS" : "FAIL"}`);

    // Check specific conditions
    if (testCase.expectedRefusal) {
      const isRefusal = results.length === 0 || 
        aiOverview?.summaryParagraphs?.[0]?.toLowerCase().includes("couldn't retrieve enough verified") ||
        aiOverview?.summaryParagraphs?.[0]?.toLowerCase().includes("insufficient");
      console.log(`  Refusal protection: ${isRefusal ? "PASS" : "FAIL"}`);
      resultsSummary.searchTests[testCase.id] = isRefusal;
    } else {
      let passed = true;
      if (testCase.expectedTopTitleKeywords && topResult) {
        const titleLower = topResult.title.toLowerCase();
        const matches = testCase.expectedTopTitleKeywords.some(k => titleLower.includes(k));
        if (!matches) passed = false;
      }
      if (testCase.expectedHasPriceData && topResult) {
        if (!topResult.has_price_data) passed = false;
      }
      if (testCase.expectedMustContain && topResult) {
        const text = (topResult.cleanedContent || topResult.content || "").toLowerCase();
        for (const kw of testCase.expectedMustContain) {
          if (!text.includes(kw.toLowerCase())) {
            console.warn(`    Missing keyword: ${kw}`);
            passed = false;
          }
        }
      }
      if (testCase.expectedForbiddenPhrases && topResult) {
        const text = (topResult.cleanedContent || topResult.content || "").toLowerCase();
        for (const phrase of testCase.expectedForbiddenPhrases) {
          if (text.includes(phrase.toLowerCase())) {
            console.warn(`    Forbidden phrase found: ${phrase}`);
            passed = false;
          }
        }
      }
      resultsSummary.searchTests[testCase.id] = passed;
      console.log(`  Result Quality: ${passed ? "PASS" : "FAIL"}`);
    }

    console.log("------------------------------------------------------------------");
  }

  // TEST QUERY VARIATIONS FOR CEMENT
  console.log("\n=== TESTING QUERY VARIATIONS FOR CEMENT ===");
  let variationsAllPassed = true;
  for (const vQuery of VARIATION_QUERIES) {
    const { data } = await runSearch(vQuery);
    const top = data.searchResults?.[0];
    const isCement = top && (top.title.toLowerCase().includes("cement") || (top.cleanedContent || "").toLowerCase().includes("cement"));
    console.log(`  Variation "${vQuery}": Top="${top?.title}" (sim: ${top?.similarity?.toFixed(4)}) -> ${isCement ? "PASS" : "FAIL"}`);
    if (!isCement) variationsAllPassed = false;
  }

  // TEST SEARCH CACHE REGRESSION
  console.log("\n=== TESTING SEARCH CACHE REGRESSION ===");
  const testCacheQuery = "current market price of Dangote cement";
  const firstRun = await runSearch(testCacheQuery, true); // forceRefresh=true
  console.log(`  First search (fresh): Status ${firstRun.status}, Cached: ${firstRun.data.isCached}`);
  const secondRun = await runSearch(testCacheQuery, false); // forceRefresh=false
  console.log(`  Second search (cache-check): Status ${secondRun.status}, Cached: ${secondRun.data.isCached}`);
  const cacheSafe = secondRun.status === 200 && secondRun.data.searchResults?.length > 0;
  console.log(`  Cache integrity check: ${cacheSafe ? "PASS" : "FAIL"}`);

  // PRINT JSON SUMMARY OF CAPTURED RESULTS
  console.log("\n=== CAPTURED RESULTS RAW DATA SAMPLE ===");
  console.log(JSON.stringify(capturedResults.slice(0, 3), null, 2));

  console.log("\n==================================================================");
  console.log("TEST HARNESS COMPLETE");
  console.log("==================================================================");
}

executeHarness().catch(err => console.error("Harness error:", err));
