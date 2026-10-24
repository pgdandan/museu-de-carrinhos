// Função serverless (Vercel). Repassa os JSON públicos de resultados do
// TSE para o painel de eleições, com cache curto na borda: muitos painéis
// abertos ao mesmo tempo viram poucas consultas ao TSE, e o navegador não
// esbarra em CORS.

const BASE = "https://resultados.tse.jus.br/oficial/";

// só os arquivos de resultado e configuração — nada além disso passa
const PERMITIDO =
  /^(comum\/config\/ele-c\.json|ele\d{4}\/\d{1,6}\/(dados-simplificados|config)\/[a-z0-9\/_-]{1,80}\.json)$/;

export default async function handler(req, res) {
  const caminho = String(req.query.p || "");
  if (!PERMITIDO.test(caminho)) {
    return res.status(400).json({ erro: "Caminho não permitido." });
  }

  try {
    const r = await fetch(BASE + caminho, {
      headers: { "User-Agent": "painel-eleicoes", Accept: "application/json" },
    });
    if (!r.ok) {
      res.setHeader("Cache-Control", "s-maxage=10");
      return res.status(r.status).json({ erro: `TSE respondeu ${r.status}.` });
    }
    const texto = await r.text();
    // config muda pouco; resultado muda a cada poucos segundos
    const cache = caminho.includes("/config/") || caminho.startsWith("comum/")
      ? "s-maxage=300, stale-while-revalidate=600"
      : "s-maxage=15, stale-while-revalidate=30";
    res.setHeader("Cache-Control", cache);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.status(200).send(texto);
  } catch (e) {
    return res.status(502).json({ erro: "Falha ao consultar o TSE." });
  }
}
