const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Mude aqui para pegar a chave do ambiente (agora usando params)
const { params } = require('firebase-functions');
const API_KEY = params.GEMINI_API_KEY;  // Chave de ambiente

exports.testarGeminiAPI = onRequest(
  { region: "us-central1" },
  async (req, res) => {
    // 🔥 CORS MANUAL (obrigatório para GitHub Pages)
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    // 🔁 Preflight
    if (req.method === "OPTIONS") {
      return res.status(204).send("");
    }

    if (req.method !== "POST") {
      return res.status(405).json({ erro: "Método não permitido" });
    }

    try {
      const prompt =
        req.body?.prompt || "Diga apenas: Backend online.";

      if (!API_KEY) {
        throw new Error("API Key Gemini não encontrada");
      }

      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({
        model: "gemini-pro"
      });

      const result = await model.generateContent(prompt);
      const text = result.response.text();

      res.json({ resultado: text });

    } catch (erro) {
      logger.error("Erro Gemini:", erro);
      res.status(500).json({ erro: erro.message });
    }
  }
);
