import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";

// 🔐 Secret configurado via:
// firebase functions:secrets:set DEEPSEEK_API_KEY
const DEEPSEEK_API_KEY = defineSecret("DEEPSEEK_API_KEY");

export const testarDeepSeekAPI = onRequest(
  {
    region: "us-central1",
    secrets: [DEEPSEEK_API_KEY],
  },
  async (req, res) => {

    // ✅ CORS (OBRIGATÓRIO PARA HTML)
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    // Pré-flight (navegador)
    if (req.method === "OPTIONS") {
      return res.status(204).send("");
    }

    // Aceita apenas POST
    if (req.method !== "POST") {
      return res.status(405).json({
        sucesso: false,
        erro: "Método não permitido. Use POST."
      });
    }

    try {
      const apiKey = DEEPSEEK_API_KEY.value();

      if (!apiKey) {
        throw new Error("API Key DeepSeek não encontrada");
      }

      const prompt =
        req.body?.prompt ||
        "Explique em uma frase o que é inteligência artificial.";

      const response = await fetch(
        "https://api.deepseek.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: "deepseek-chat",
            messages: [
              { role: "user", content: prompt }
            ],
            temperature: 0.2
          })
        }
      );

      if (!response.ok) {
        const erroTexto = await response.text();
        throw new Error(`Erro DeepSeek: ${erroTexto}`);
      }

      const data = await response.json();

      const resultado =
        data?.choices?.[0]?.message?.content ||
        data?.choices?.[0]?.text ||
        "Sem resposta do modelo";

      return res.json({
        sucesso: true,
        resultado
      });

    } catch (erro) {
      console.error("Erro:", erro);

      return res.status(500).json({
        sucesso: false,
        erro: erro.message
      });
    }
  }
);
