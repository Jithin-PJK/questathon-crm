// Integration and verification test for Questathon Customer Success CRM
const http = require("http");

function get(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:3000${path}`, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    }).on("error", reject);
  });
}

function post(path, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = http.request(`http://localhost:3000${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload)
      }
    }, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

async function runTests() {
  console.log("=== STARTING CRM SYSTEM TESTS ===");

  // 1. Health check
  console.log("\n1. Testing GET /api/health...");
  const health = await get("/api/health");
  console.log(`Status: ${health.status}, Result:`, health.data);
  if (health.status !== 200 || !health.data.ok || !health.data.tokenConfigured) {
    throw new Error("Health check failed!");
  }
  console.log("✓ Health check PASSED");

  // 2. Status check
  console.log("\n2. Testing GET /api/status...");
  const status = await get("/api/status");
  console.log(`Status: ${status.status}, Result:`, status.data);
  if (status.status !== 200 || !status.data.ok) {
    throw new Error("Status check failed!");
  }
  console.log("✓ Status check PASSED");

  // 3. Dashboard data check
  console.log("\n3. Testing GET /api/dashboard...");
  const dash = await get("/api/dashboard");
  console.log(`Status: ${dash.status}`);
  if (dash.status !== 200 || !dash.data.data || !dash.data.data.accounts) {
    throw new Error("Dashboard data check failed!");
  }
  const accounts = dash.data.data.accounts;
  console.log(`Found ${accounts.length} accounts:`, accounts.map(a => a.name));
  
  // Verify Account A
  const accA = accounts.find(a => a.id === "A");
  console.log(`Account A (${accA.name}): ${accA.opportunities.length} opps, ${accA.facts.length} facts, ${accA.stakeholders.length} stakeholders`);
  const totalA = accA.opportunities.reduce((s, o) => s + (o.worth_up_to || 0), 0);
  console.log(`Account A Opportunity Ceiling Total: $${totalA.toLocaleString()} (Expected $2,300,000)`);
  if (totalA !== 2300000) throw new Error(`Expected $2,300,000 ceiling for Account A, got $${totalA}`);

  // Verify Account B
  const accB = accounts.find(a => a.id === "B");
  console.log(`Account B (${accB.name}): ${accB.opportunities.length} opps, ${accB.facts.length} facts, ${accB.stakeholders.length} stakeholders`);
  const totalB = accB.opportunities.reduce((s, o) => s + (o.worth_up_to || 0), 0);
  console.log(`Account B Opportunity Ceiling Total: $${totalB.toLocaleString()} (Expected $320,000)`);
  if (totalB !== 320000) throw new Error(`Expected $320,000 ceiling for Account B, got $${totalB}`);
  console.log("✓ Dashboard data integrity PASSED");

  // 4. Rate-limit cooldown protection check
  console.log("\n4. Testing MCP rate limit enforcement...");
  const refreshRes = await post("/api/refresh", {});
  console.log(`Refresh Status: ${refreshRes.status}, Response:`, refreshRes.data);
  if (refreshRes.status === 429) {
    console.log(`✓ Cooldown active: ${refreshRes.data.error} (Retry after: ${refreshRes.data.retryAfter}s)`);
  } else if (refreshRes.status === 200) {
    console.log("✓ Live signals refreshed via MCP:", refreshRes.data.signals.length, "signals");
  } else {
    throw new Error(`Unexpected refresh response: ${refreshRes.status}`);
  }
  console.log("✓ MCP Cooldown handling PASSED");

  // 5. Test Frontend HTML serving
  console.log("\n5. Testing GET / (Frontend HTML)...");
  const html = await get("/");
  console.log(`Status: ${html.status}, Length: ${html.raw.length} bytes`);
  if (html.status !== 200 || !html.raw.includes("Questathon CRM") || !html.raw.includes("Eastern Counties Police Alliance")) {
    throw new Error("Frontend HTML serving failed!");
  }
  console.log("✓ Frontend HTML delivery PASSED");

  console.log("\n=== ALL SYSTEM TESTS PASSED SUCCESSFULLY! ===");
}

runTests().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
