export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "Missing URL parameter" });
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Vercel-Proxy)",
        "Accept": "application/json",
      },
    });

    const body = await response.text();

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") return res.status(200).end();

    res.status(200).send(body);
  } catch (error) {
    console.error("VWorld proxy error:", error);
    res
      .status(500)
      .json({ error: "Proxy request failed", details: error.message });
  }
}
