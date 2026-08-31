// Função serverless (Vercel). Transforma a foto da miniatura numa foto
// de produto profissional (fundo preto, reflexo) usando a API de imagem
// da OpenAI. A chave fica só no servidor.

const PROMPT =
  "Fotografia de produto profissional desta miniatura de carro em escala (die-cast). " +
  "Coloque-a sozinha sobre um fundo preto puro, com uma superfície espelhada refletindo a " +
  "miniatura, iluminação de estúdio dramática vinda de cima, foco nítido em toda a lataria, " +
  "sem texto, sem marca d'água, sem cenário colorido. Mantenha exatamente o mesmo carro, cor, " +
  "rodas e proporções da foto original — troque só o cenário para o fundo preto de estúdio.";

export const config = { api: { bodyParser: { sizeLimit: "8mb" } } };

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ erro: "Use POST." });
  }

  const chave = process.env.OPENAI_API_KEY;
  if (!chave) {
    return res.status(500).json({ erro: "OPENAI_API_KEY não configurada." });
  }

  try {
    const { imagem } = req.body || {};
    if (!imagem || typeof imagem !== "string") {
      return res.status(400).json({ erro: "Nenhuma imagem recebida." });
    }
    if (imagem.length > 3_000_000) {
      return res.status(413).json({ erro: "Imagem grande demais." });
    }

    const bytes = Buffer.from(imagem, "base64");
    const forma = new FormData();
    forma.append("model", "gpt-image-1");
    forma.append("prompt", PROMPT);
    forma.append("size", "1024x1024");
    forma.append("image", new Blob([bytes], { type: "image/jpeg" }), "miniatura.jpg");

    const resposta = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { authorization: "Bearer " + chave },
      body: forma,
    });

    if (!resposta.ok) {
      const detalhe = await resposta.text();
      console.error("OpenAI:", resposta.status, detalhe);
      return res.status(502).json({ erro: "A geração da foto falhou." });
    }

    const dados = await resposta.json();
    const b64 = dados.data && dados.data[0] && dados.data[0].b64_json;
    if (!b64) {
      return res.status(502).json({ erro: "A OpenAI não retornou uma imagem." });
    }

    return res.status(200).json({ imagem: b64 });
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: "Erro inesperado." });
  }
}
