const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.testarGeminiAPI = onRequest(
  { region: "us-central1" },
  async (req, res) => {
    try {
      if (req.method !== "POST") {
        return res.status(405).json({ erro: "Método não permitido" });
      }

      const prompt =
        req.body?.prompt ||
        "Diga apenas: O backend está online.";

      const API_KEY =
        process.env.GEMINI_API_KEY ||
        require("firebase-functions").config().gemini.key;

      if (!API_KEY) {
        throw new Error("API Key Gemini não encontrada");
      }

      const genAI = new GoogleGenerativeAI(API_KEY);

      // ✅ MODELO CORRETO E SUPORTADO
      const model = genAI.getGenerativeModel({
        model: "gemini-pro"
      });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const texto = response.text();

      res.json({
        sucesso: true,
        resultado: texto
      });

    } catch (erro) {
      logger.error("Erro Gemini:", erro);
      res.status(500).json({
        sucesso: false,
        erro: erro.message
      });
    }
  }
);
