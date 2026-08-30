# Como colocar no ar

O repositório já vem iniciado, com o primeiro commit feito.
Descompacte a pasta `site` e siga um dos dois caminhos.

## Caminho A — sem GitHub (mais rápido)

No terminal, dentro da pasta:

```bash
npx vercel
```

Ele pergunta o nome do projeto e sobe tudo, inclusive as funções da pasta `api`.
Depois:

```bash
npx vercel env add DATABASE_URL       # cole a URL do Postgres
npx vercel env add CHAVE_CURADOR      # a senha que só você sabe
npx vercel env add ANTHROPIC_API_KEY  # sua chave da API
npx vercel --prod
```

Para criar o Postgres: no painel do projeto, aba **Storage → Create Database →
Postgres**. A Vercel preenche a `DATABASE_URL` sozinha e aí você pula esse
primeiro comando.

## Caminho B — com GitHub

1. Crie um repositório vazio em https://github.com/new
   (sem README, sem .gitignore — este pacote já tem os dois).
2. No terminal, dentro da pasta:

```bash
git remote add origin https://github.com/SEU-USUARIO/museu-de-carrinhos.git
git push -u origin main
```

3. Em vercel.com: **Add New → Project**, escolha o repositório,
   Framework Preset **Other**, sem comando de build.
4. Aba **Storage → Create Database → Postgres**.
5. **Settings → Environment Variables**: `CHAVE_CURADOR` e `ANTHROPIC_API_KEY`.
6. **Deploy**.

A partir daí, todo `git push` publica uma versão nova.

## Só pelo celular

Dá para fazer o Caminho B inteiro pelo navegador:
em https://github.com/new, crie o repositório e use
**uploading an existing file** para enviar os arquivos.
Mande `index.html`, `package.json`, `vercel.json`, `README.md`
e, dentro de pastas com o mesmo nome, `api/pecas.js`,
`api/identificar.js` e `sql/esquema.sql`.
O resto (Vercel, banco, variáveis) é tudo por painel.
