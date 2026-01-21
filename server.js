import express from "express";
import { HttpsProxyAgent } from "https-proxy-agent";

const app = express();
app.use(express.json({ limit: "5mb" }));

// health check
app.get("/health", (req, res) => {
  res.status(200).send("ok");
});

app.post("/proxy", async (req, res) => {
  try {
    // simple auth (prevents random people from using your relay)
    if (req.headers["x-proxy-key"] !== process.env.PROXY_KEY) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { endpoint, method, headers, body } = req.body || {};
    if (!endpoint) return res.status(400).json({ error: "Missing endpoint" });

    const proxyUrl =
      `http://${process.env.PROXY_USERNAME}:${process.env.PROXY_PASSWORD}` +
      `@${process.env.PROXY_HOST}:${process.env.PROXY_PORT}`;

    const agent = new HttpsProxyAgent(proxyUrl);

    const response = await fetch(endpoint, {
      method: method || "GET",
      headers: headers || {},
      body: body ? JSON.stringify(body) : undefined,
      agent
    });

    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }

    res.json({ status: response.status, ok: response.ok, data });
  } catch (err) {
    res.status(500).json({ error: "Relay error", message: err?.message || String(err) });
  }
});

const port = process.env.PORT || 10000;
app.listen(port, () => console.log("Relay running on port", port));
