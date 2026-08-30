// Acervo compartilhado em Postgres.
// GET    /api/pecas            → lista tudo (público)
// POST   /api/pecas            → grava uma ou várias peças (exige chave do curador)
// DELETE /api/pecas?id=xxx     → apaga uma peça       (exige chave do curador)
// DELETE /api/pecas?tudo=1     → apaga o acervo todo  (exige chave do curador)

import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 3,
});

let tabelaPronta = false;

async function garanteTabela() {
  if (tabelaPronta) return;
  await pool.query(`
    create table if not exists carrinhos (
      id                    text primary key,
      modelo                text not null,
      categoria             text not null default 'custom',
      ano                   text,
      pais                  text,
      motor                 text,
      potencia_cv           text,
      velocidade_maxima_kmh text,
      zero_a_cem            text,
      tracao                text,
      escala                text default '1:64',
      descricao             text,
      nota_do_curador       text,
      foto                  text,
      criado_em             date not null default current_date,
      atualizado_em         timestamptz not null default now()
    );
    create index if not exists idx_carrinhos_categoria on carrinhos (categoria);
    create index if not exists idx_carrinhos_modelo on carrinhos (lower(modelo));
  `);
  tabelaPronta = true;
}

// nomes curtos usados pelo site  ⇄  colunas do banco
function paraSite(l) {
  return {
    id: l.id,
    nome: l.modelo,
    cat: l.categoria,
    ano: l.ano || "",
    pais: l.pais || "",
    motor: l.motor || "",
    cv: l.potencia_cv || "",
    vel: l.velocidade_maxima_kmh || "",
    zc: l.zero_a_cem || "",
    tracao: l.tracao || "",
    escala: l.escala || "1:64",
    curio: l.descricao || "",
    nota: l.nota_do_curador || "",
    foto: l.foto || null,
    criadoEm: l.criado_em ? new Date(l.criado_em).toISOString().slice(0, 10) : null,
  };
}

function texto(v, limite) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  if (!s) return null;
  return limite && s.length > limite ? s.slice(0, limite) : s;
}

function autorizado(req) {
  const esperada = process.env.CHAVE_CURADOR;
  if (!esperada) return false;
  const recebida = req.headers["x-curador"];
  return typeof recebida === "string" && recebida === esperada;
}

export const config = { api: { bodyParser: { sizeLimit: "12mb" } } };

export default async function handler(req, res) {
  try {
    await garanteTabela();

    if (req.method === "GET") {
      const { rows } = await pool.query(
        "select * from carrinhos order by criado_em desc, atualizado_em desc"
      );
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).json({ pecas: rows.map(paraSite) });
    }

    if (req.method === "POST" || req.method === "DELETE") {
      if (!autorizado(req)) {
        return res.status(401).json({ erro: "Chave do curador não confere." });
      }
    }

    if (req.method === "POST") {
      const corpo = req.body || {};
      const lista = Array.isArray(corpo.pecas) ? corpo.pecas : corpo.peca ? [corpo.peca] : [];
      if (!lista.length) return res.status(400).json({ erro: "Nenhuma peça recebida." });
      if (lista.length > 200) return res.status(413).json({ erro: "Envie no máximo 200 por vez." });

      const cliente = await pool.connect();
      try {
        await cliente.query("begin");
        for (const p of lista) {
          const nome = texto(p.nome, 160);
          if (!nome) continue;
          await cliente.query(
            `insert into carrinhos
               (id, modelo, categoria, ano, pais, motor, potencia_cv, velocidade_maxima_kmh,
                zero_a_cem, tracao, escala, descricao, nota_do_curador, foto, criado_em)
             values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,coalesce($15::date, current_date))
             on conflict (id) do update set
               modelo = excluded.modelo,
               categoria = excluded.categoria,
               ano = excluded.ano,
               pais = excluded.pais,
               motor = excluded.motor,
               potencia_cv = excluded.potencia_cv,
               velocidade_maxima_kmh = excluded.velocidade_maxima_kmh,
               zero_a_cem = excluded.zero_a_cem,
               tracao = excluded.tracao,
               escala = excluded.escala,
               descricao = excluded.descricao,
               nota_do_curador = excluded.nota_do_curador,
               foto = coalesce(excluded.foto, carrinhos.foto),
               atualizado_em = now()`,
            [
              texto(p.id, 60) || "c" + Date.now() + Math.floor(Math.random() * 999),
              nome,
              texto(p.cat, 30) || "custom",
              texto(p.ano, 10),
              texto(p.pais, 60),
              texto(p.motor, 160),
              texto(p.cv, 10),
              texto(p.vel, 10),
              texto(p.zc, 20),
              texto(p.tracao, 30),
              texto(p.escala, 12) || "1:64",
              texto(p.curio, 1200),
              texto(p.nota, 600),
              texto(p.foto, 4_000_000),
              texto(p.criadoEm, 10),
            ]
          );
        }
        await cliente.query("commit");
      } catch (erro) {
        await cliente.query("rollback");
        throw erro;
      } finally {
        cliente.release();
      }
      return res.status(200).json({ ok: true, gravadas: lista.length });
    }

    if (req.method === "DELETE") {
      const { id, tudo } = req.query || {};
      if (tudo === "1") {
        await pool.query("delete from carrinhos");
        return res.status(200).json({ ok: true });
      }
      if (!id) return res.status(400).json({ erro: "Informe o id." });
      await pool.query("delete from carrinhos where id = $1", [id]);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ erro: "Método não suportado." });
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: "O acervo não respondeu. Tente de novo." });
  }
}
