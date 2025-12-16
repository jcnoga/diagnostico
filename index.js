import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";

const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

export const testarGeminiAPI = onRequest(
  {
    region: "us-central1",
    secrets: [GEMINI_API_KEY],
  },
  async (req, res) => {

    // Permite chamadas do seu HTML (CORS) e navegador direto
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      return res.status(204).send("");
    }

    try {
      const apiKey = GEMINI_API_KEY.value();
      if (!apiKey) throw new Error("API Key não configurada");

      // Pega o texto enviado ou usa um padrão
      const prompt = req.body?.prompt || req.query?.prompt || "Teste de conexão Gemini: Tudo ok?";

      // --- CORREÇÃO AQUI ---
      // Usando o modelo estável 'gemini-1.5-flash'
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (!response.ok) {
        const erroTexto = await response.text();
        throw new Error(`Erro Gemini (${response.status}): ${erroTexto}`);
      }

      const data = await response.json();
      const resultado = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Sem resposta";

      return res.json({ sucesso: true, resultado });

    } catch (erro) {
      console.error("Erro:", erro);
      return res.status(500).json({ sucesso: false, erro: erro.message });
    }
  }
);