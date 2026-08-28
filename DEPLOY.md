# Deploy - AutoMecanico Pro

Este projeto utiliza **TanStack Start** (React 19 + TanStack Router) integrado nativamente com o **Cloudflare Workers** (Workers with Assets).

---

## Opção 1: Cloudflare Workers (Recomendado)

O projeto já possui integração nativa com o Cloudflare via `@cloudflare/vite-plugin` e `wrangler.jsonc`.

### Pré-requisitos

1. **Conta na Cloudflare** (gratuita).
2. **Node.js** >= 20 (no ambiente Windows com `nvm-windows`, execute `nvm use 24.14.1`).
3. **Wrangler CLI** (já incluído como dependência do projeto).

### Passo a Passo para Deploy Direto via CLI

#### 1. Faça Login na Cloudflare (primeira vez)

No terminal, faça login na sua conta Cloudflare:

```bash
npx wrangler login
```

Uma janela do navegador será aberta para você autorizar o acesso do Wrangler à sua conta.

#### 2. Configurar Variáveis de Ambiente no Cloudflare

No Cloudflare Workers, as variáveis públicas (`VITE_*`) são embutidas no build do cliente. No entanto, se precisar definir variáveis de servidor ou segredos:

```bash
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_PUBLISHABLE_KEY
```

Ou configure diretamente pelo painel da Cloudflare em **Workers & Pages > automecanico-pro > Settings > Variables**.

#### 3. Executar o Deploy

Basta rodar o comando:

```bash
npm run deploy
```

Este comando irá:
1. Compilar a aplicação (`vite build`).
2. Publicar o Worker e os assets estáticos no Cloudflare (`wrangler deploy`).

Ao final do deploy, a Cloudflare informará o endereço do seu app (ex: `https://automecanico-pro.<seu-subdominio>.workers.dev`).

---

## Opção 2: Implantação Contínua via GitHub (CI/CD)

Para configurar o deploy automático a cada `git push` no repositório GitHub:

1. Acesse o painel da **Cloudflare** -> **Workers & Pages** -> **Create application** -> **Pages / Workers**.
2. Conecte sua conta do **GitHub** e selecione o repositório `automecanico-pro`.
3. Defina as configurações do build:
   - **Framework preset**: `None` / `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist/client` (ou configuração padrão de Workers)
4. Em **Environment variables**, adicione suas variáveis:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_AI_GATEWAY_URL`
5. Clique em **Save and Deploy**.

---

## Opção 3: Hostinger FTP Compartilhado (Legado)

Se ainda precisar realizar build estático para servidores Apache/FTP convencionais:

```bash
bash build-ftp.sh
```

Upload do conteúdo da pasta `dist/client/` para a pasta `public_html/` via FTP.
- O login com Supabase funciona
- O PWA pode ser instalado

### Atualizacoes futuras

```bash
cd automecanico-pro
git pull origin main
npm install
bash build-ftp.sh
# Faca upload dos arquivos de dist/client/ novamente via FTP
```

---

## Opcao 2: VPS com Node.js (Linux)

Se voce tiver um VPS (nao FTP compartilhado), use o servidor Node.js:

```bash
git clone https://github.com/Amorimadriano/automecanico-pro.git
cd automecanico-pro
npm install
npm run build
npm install -g pm2
pm2 start server.js --name automecanico
pm2 save
pm2 startup systemd
```

Configure o Nginx como reverse proxy para a porta 3000.

---

## Estrutura do build

- `dist/client/` - Assets estaticos prontos para upload FTP
  - `index.html` - Pagina principal (gerada via SSR)
  - `.htaccess` - Regras de rewrite para SPA
  - `assets/` - JS, CSS e fontes
  - `manifest.json`, `sw.js` - PWA
  - `icon-*.svg` - Icones do app
- `server.js` - Servidor Node.js (uso em VPS apenas)

## Troubleshooting

**Pagina em branco ou 404 nas rotas**
- Verifique se o `.htaccess` foi enviado via FTP
- Verifique se o `mod_rewrite` esta habilitado no Apache
- Acesse o painel da Hostinger e confirme que o `.htaccess` esta na raiz

**Assets nao carregam (404 em JS/CSS)**
- Confirme que a pasta `assets/` foi enviada completamente
- Verifique se os arquivos estao na mesma pasta que `index.html`

**Erro de CORS no Supabase**
- No painel do Supabase, va em Authentication > URL Configuration
- Adicione seu dominio (`https://seudominio.com`) em Redirect URLs

**Atualizacao nao aparece**
- Limpe o cache do navegador (Ctrl+F5)
- Verifique se o service worker foi atualizado
- Acesse `chrome://serviceworker-internals` e force update
