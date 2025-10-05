export default async function handler(req, res) {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ error: "Missing URL parameter" });
    }

    // VWorld API 요청 수행
    const response = await fetch(url);
    const text = await response.text();

    // ✅ CORS 허용 헤더 추가
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    // OPTIONS 요청은 바로 종료
    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }

    // 정상 응답 전달
    res.status(200).send(text);
  } catch (error) {
    console.error("VWorld Proxy Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
