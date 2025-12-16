/**
 * Firebase Cloud Function - Gemini API (HTTP direto)
 * Compatível com:
 * - Firebase Functions v2
 * - Node.js 24
 * - Secret Manager
 * - GitHub Pages
 */

const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const fetch = require("node-fetch");
const { defineSecret } = require("firebase-functions/params");

// 🔐 Secret
const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

exports.testarGeminiAPI = onRequest(
  {
    region: "us-central1",
    secrets: [GEMINI_API_KEY],
  },
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
      const prompt =
        req.body?.prompt || "Responda apenas: backend online.";

const response = await fetch(
  `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
    }),
  }
);


      if (!response.ok) {
        const erroTexto = await response.text();
        throw new Error(erroTexto);
      }

      const data = await response.json();
      const texto =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        "Sem resposta";

      res.json({
        sucesso: true,
        resultado: texto,
      });

    } catch (erro) {
      logger.error("Erro Gemini:", erro);
      res.status(500).json({
        sucesso: false,
        erro: erro.message,
      });
    }
  }
);
