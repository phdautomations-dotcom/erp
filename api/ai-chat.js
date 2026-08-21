// Vercel serverless function — proxies chat requests to Google Gemini's
// free tier so the API key never reaches the browser. GEMINI_API_KEY must
// be set as a server-side environment variable in the Vercel project
// (NOT prefixed with VITE_, or it would get bundled into client JS).
const MODEL = "gemini-2.0-flash";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "AI is not configured (missing GEMINI_API_KEY)." });
    return;
  }

  const { messages } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "messages array is required" });
    return;
  }

  const systemMsg = messages.find((m) => m.role === "system");
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: String(m.content || "") }] }));

  try {
    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents,
          ...(systemMsg ? { systemInstruction: { parts: [{ text: systemMsg.content }] } } : {}),
          generationConfig: { maxOutputTokens: 400, temperature: 0.4 },
        }),
      },
    );

    const data = await upstream.json();
    if (!upstream.ok) {
      res.status(upstream.status).json({ error: data?.error?.message || "Upstream AI request failed" });
      return;
    }

    const reply = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
    res.status(200).json({ reply: reply.trim() });
  } catch (err) {
    res.status(502).json({ error: `Could not reach AI provider: ${err?.message || err}` });
  }
}
