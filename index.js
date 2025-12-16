import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";

// 1. Mudamos a definição da Secret para o Gemini
const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

// 2. Renomeamos a função para testarGeminiAPI (para coincidir com seu HTML)
export const testarGeminiAPI = onRequest(
  {
    region: "us-central1",
    secrets: [GEMINI_API_KEY], // Injeta a chave do Google
  },
  async (req, res) => {

    // ✅ CORS (Mantido igual)
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      return res.status(204).send("");
    }

    if (req.method !== "POST") {
      return res.status(405).json({
        sucesso: false,
        erro: "Método não permitido. Use POST."
      });
    }

    try {
      const apiKey = GEMINI_API_KEY.value();

      if (!apiKey) {
        throw new Error("API Key do Gemini não encontrada nas Secrets");
      }

      const prompt = req.body?.prompt || "Diga olá";

      // 3. Endpoint do Gemini 1.5 Flash
      // Nota: A API Key é passada na URL via ?key=
	  // Substitua a linha do 'const url' por esta:
           const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
      //const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        // 4. Payload específico do Gemini
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }]
        })
      });

      if (!response.ok) {
        const erroTexto = await response.text();
        throw new Error(`Erro Gemini (${response.status}): ${erroTexto}`);
      }

      const data = await response.json();

      // 5. Tratamento da resposta do Gemini
      // Estrutura: data.candidates[0].content.parts[0].text
      const resultado =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        "Sem resposta do modelo";

      return res.json({
        sucesso: true,
        resultado
      });

    } catch (erro) {
      console.error("Erro no Backend:", erro);
      return res.status(500).json({
        sucesso: false,
        erro: erro.message
      });
    }
  }
);