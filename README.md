# Museu de Carrinhos — site publicável

Uma página só, sem build. O acervo fica num banco **Postgres**, então é
único: o que você cataloga pelo celular aparece no computador e para
quem abrir o site.

```
index.html          o site inteiro
api/pecas.js        acervo — ler, gravar e apagar peças no Postgres
api/identificar.js  identificação por IA (a chave fica no servidor)
sql/esquema.sql     as tabelas, caso queira criar à mão
vercel.json         configuração mínima
```

## Quem pode fazer o quê

| Ação | Quem |
| --- | --- |
| Ver o acervo, filtrar, abrir fichas, exportar CSV | qualquer pessoa com o link |
| Catalogar, remover, importar, zerar | só quem tem a **chave do curador** |

Na primeira vez que você gravar algo, o site pede a chave e guarda no
navegador. Quem não tem só olha.

## Publicar na Vercel

1. Suba esta pasta para um repositório no GitHub.
2. Em vercel.com: **Add New → Project**, escolha o repositório.
   Framework Preset: **Other**. Sem comando de build.
3. Crie o banco: na aba **Storage** do projeto, **Create Database → Postgres**
   (é o Neon). A Vercel já preenche a variável `DATABASE_URL` sozinha.
4. Em **Settings → Environment Variables**, adicione as outras duas:

   | Nome | Valor |
   | --- | --- |
   | `CHAVE_CURADOR` | uma senha longa que só você sabe |
   | `ANTHROPIC_API_KEY` | sua chave da console.anthropic.com |

5. **Deploy**. A tabela é criada sozinha no primeiro acesso.
6. Domínio próprio: **Settings → Domains**, adicione o subdomínio e
   aponte o CNAME no seu DNS. Certificado é automático.

Se preferir criar as tabelas à mão antes, rode `sql/esquema.sql` no banco.

## Levar o que já existe

O acervo começa vazio. Duas formas de encher:

- Na tela vazia, **Gravar peças de exemplo** manda as peças que já estavam
  catalogadas, com foto.
- **Banco de dados → Importar** aceita o backup JSON ou o CSV.

## As fotos

Ficam no banco, em base64, junto da ficha. Cada foto tratada tem uns 50 KB,
então dá para catalogar alguns milhares de peças com folga no plano gratuito.
Se um dia a coleção crescer muito, o caminho é mover as fotos para um bucket
de arquivos e guardar só a URL na coluna `foto`.

## Backup

**Banco de dados → Backup completo** baixa tudo, fichas e fotos, num JSON.
Vale fazer de vez em quando: banco na nuvem também merece cópia.

## Custo

Hospedagem e Postgres têm plano gratuito que atende com sobra nesse tamanho.
A API da Anthropic é por uso — cada peça identificada custa frações de centavo.
