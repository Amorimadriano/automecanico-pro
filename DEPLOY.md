# Deploy - AutoMecanico Pro

## Opcao 1: Hostinger FTP Compartilhado (Apache)

Este projeto usa **SPA (Single Page Application)** com React + TanStack Router. O build gera arquivos estaticos que podem ser hospedados em qualquer servidor Apache com suporte a `.htaccess`.

### Requisitos

- **Node.js** >= 20 no seu computador local (para build)
- **npm** >= 10
- Acesso **FTP** ao servidor da Hostinger
- Servidor **Apache** com `mod_rewrite` habilitado (padrao na Hostinger)

### Passo a passo

#### 1. Clone e instale dependencias (localmente)

```bash
git clone https://github.com/Amorimadriano/automecanico-pro.git
cd automecanico-pro
npm install
```

#### 2. Configure as variaveis de ambiente

Crie o arquivo `.env` na raiz com suas credenciais do Supabase:

```env
SUPABASE_URL=https://rjcruiwlurqdwooarrpa.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_dSvNshTQiRJYBq3kMb2MQg_K2rvrpoG
VITE_SUPABASE_URL=https://rjcruiwlurqdwooarrpa.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_dSvNshTQiRJYBq3kMb2MQg_K2rvrpoG
VITE_AI_GATEWAY_URL=https://ai.gateway.lovable.dev/v1/chat/completions
```

> **IMPORTANTE**: Nunca commite o arquivo `.env`.

#### 3. Execute o build para FTP

```bash
# Windows (Git Bash / WSL)
bash build-ftp.sh

# Linux/Mac
chmod +x build-ftp.sh
./build-ftp.sh
```

Ou manualmente:

```bash
npm run build
PORT=3001 node server.js &
curl -s http://localhost:3001/ > dist/client/index.html
kill %1
```

#### 4. Upload via FTP

Conecte-se ao seu servidor Hostinger via FTP (FileZilla, WinSCP, etc.) e **faça upload de TODO o conteudo da pasta `dist/client/` para a raiz do seu dominio** (`public_html/` ou `www/`).

Arquivos que devem estar no servidor:

```
public_html/
├── .htaccess
├── index.html
├── manifest.json
├── registerSW.js
├── sw.js
├── icon-192x192.svg
├── icon-512x512.svg
└── assets/
    ├── styles-XXXX.css
    ├── index-XXXX.js
    ├── client-XXXX.js
    └── ... (demais arquivos JS)
```

#### 5. Verifique o .htaccess

O arquivo `.htaccess` ja esta incluido no build. Ele redireciona todas as rotas para `index.html` para o React Router funcionar corretamente.

Se precisar criar manualmente, o conteudo e:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

#### 6. Teste

Acesse `https://seudominio.com` e verifique se:
- A pagina carrega corretamente
- As rotas funcionam (ex: `/login`, `/app`, `/app/os`)
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
