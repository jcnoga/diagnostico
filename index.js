const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const { VertexAI } = require("@google-cloud/vertexai");

exports.testarGeminiAPI = onRequest(
  { region: "us-central1" },
  async (req, res) => {

    // CORS
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      return res.status(204).send("");
    }

    if (req.method !== "POST") {
      return res.status(405).json({ erro: "Método não permitido" });
    }

    try {
      const prompt = req.body?.prompt || "Responda apenas: conexão OK";

      const vertexAI = new VertexAI({
        project: process.env.GCLOUD_PROJECT,
        location: "us-central1",
      });

      const model = vertexAI.getGenerativeModel({
        model: "gemini-1.0-pro",
      });

      const result = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
      });

      const text =
        result.response.candidates?.[0]?.content?.parts?.[0]?.text ||
        "Sem resposta";

      res.json({
        sucesso: true,
        resultado: text,
      });

    } catch (erro) {
      logger.error("Erro Gemini Vertex:", erro);
      res.status(500).json({
        sucesso: false,
        erro: erro.message,
      });
    }
  }
);
