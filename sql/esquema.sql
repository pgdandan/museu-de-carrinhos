-- Museu de Carrinhos — esquema do acervo (PostgreSQL / Neon / Supabase)
-- O site cria esta tabela sozinho no primeiro acesso; use este arquivo
-- se preferir criar à mão ou versionar as mudanças.

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
  foto                  text,          -- imagem em base64 (data:image/jpeg;base64,...)
  criado_em             date not null default current_date,
  atualizado_em         timestamptz not null default now()
);

create index if not exists idx_carrinhos_categoria on carrinhos (categoria);
create index if not exists idx_carrinhos_modelo    on carrinhos (lower(modelo));

-- resumo por linhagem (o mesmo painel da área "Banco de dados")
create or replace view resumo_por_categoria as
select categoria,
       count(*)                              as total,
       sum(nullif(potencia_cv,'')::numeric)  as cv_somados,
       min(nullif(ano,''))                   as mais_antigo,
       max(nullif(ano,''))                   as mais_novo
from carrinhos
group by categoria
order by total desc;

-- as dez mais potentes
-- select modelo, ano, potencia_cv from carrinhos
-- order by nullif(potencia_cv,'')::numeric desc nulls last limit 10;

-- espaço ocupado pelas fotos
-- select pg_size_pretty(sum(octet_length(coalesce(foto,'')))::bigint) from carrinhos;
