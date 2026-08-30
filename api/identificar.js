// Função serverless (Vercel). Guarda a chave da API no servidor —
// ela nunca chega ao navegador de quem visita o site.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ erro: "Use POST." });
  }

  const chave = process.env.ANTHROPIC_API_KEY;
  if (!chave) {
    return res.status(500).json({ erro: "ANTHROPIC_API_KEY não configurada." });
  }

  try {
    const { imagens = [], temBase = false, categorias = [] } = req.body || {};

    if (!imagens.length) {
      return res.status(400).json({ erro: "Nenhuma imagem recebida." });
    }
    if (imagens.length > 2) {
      return res.status(400).json({ erro: "No máximo duas imagens." });
    }
    // limite de tamanho: ~2 MB por imagem em base64
    if (imagens.some((b64) => typeof b64 !== "string" || b64.length > 2_800_000)) {
      return res.status(413).json({ erro: "Imagem grande demais." });
    }

    const lista = categorias.length
      ? categorias.join(" | ")
      : "Fórmula 1 | Superesportivos | Muscle cars | Clássicos | Rally e off-road | Picapes e 4x4 | Nacionais | Trabalho e resgate | Fantasia e custom | Motos";

    const conteudo = imagens.map((data) => ({
      type: "image",
      source: { type: "base64", media_type: "image/jpeg", data },
    }));

    conteudo.push({
      type: "text",
      text:
        "Estas fotos mostram uma miniatura de carro de brinquedo em escala 1:64 (tipo Hot Wheels, Matchbox, Majorette). " +
        (temBase
          ? "A segunda foto e a base da miniatura: se houver nome gravado, use exatamente esse nome como referencia. "
          : "") +
        "Identifique o CARRO REAL representado e preencha a ficha tecnica dele (nao da miniatura).\n\n" +
        "Responda SOMENTE com um objeto JSON, sem markdown, sem crases, sem texto antes ou depois, com estas chaves:\n" +
        '{"modelo":"nome comercial do carro real","categoria":"uma destas exatamente: ' + lista + '",' +
        '"ano":"ano do modelo, so numeros","pais":"pais de origem da marca","motor":"descricao curta do motor",' +
        '"potencia_cv":numero,"velocidade_kmh":numero,"zero_cem":"tempo com virgula, ex 6,2 s",' +
        '"tracao":"Dianteira, Traseira ou Integral",' +
        '"descricao":"duas frases sobre o carro real: o que ele representa e um fato marcante",' +
        '"confianca":"alta, media ou baixa"}\n\n' +
        "Se nao reconhecer o modelo exato, escolha o mais provavel e marque a confianca como baixa. " +
        "Use portugues do Brasil. Numeros sem unidade nos campos numericos.",
    });

    const resposta = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": chave,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        messages: [{ role: "user", content: conteudo }],
      }),
    });

    if (!resposta.ok) {
      const detalhe = await resposta.text();
      console.error("Anthropic:", resposta.status, detalhe);
      return res.status(502).json({ erro: "A identificação falhou." });
    }

    const dados = await resposta.json();
    const texto = (dados.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    return res.status(200).json({ texto });
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: "Erro inesperado." });
  }
}
