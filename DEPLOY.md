# Deploy - AutoMecanico Pro

## Requisitos do VPS (Hostinger)

- **Node.js** >= 20 (recomendado 22 LTS)
- **npm** >= 10
- **Git**
- **PM2** (gerenciador de processos) - `npm install -g pm2`
- **Nginx** (reverse proxy)

## Passo a passo

### 1. Clone o repositorio no VPS

```bash
git clone https://github.com/Amorimadriano/automecanico-pro.git
cd automecanico-pro
```

### 2. Instale as dependencias

```bash
npm install
```

### 3. Configure as variaveis de ambiente

Crie o arquivo `.env` na raiz com:

```
SUPABASE_URL=https://rjcruiwlurqdwooarrpa.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_dSvNshTQiRJYBq3kMb2MQg_K2rvrpoG
VITE_SUPABASE_URL=https://rjcruiwlurqdwooarrpa.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_dSvNshTQiRJYBq3kMb2MQg_K2rvrpoG
VITE_AI_GATEWAY_URL=https://ai.gateway.lovable.dev/v1/chat/completions
```

> **IMPORTANTE**: Nunca commite o arquivo `.env` com secrets reais.

### 4. Faca o build

```bash
npm run build
```

### 5. Inicie com PM2

```bash
pm2 start server.js --name automecanico
pm2 save
pm2 startup
```

O servidor rodara na porta **3000** por padrao.

### 6. Configure o Nginx como reverse proxy

```nginx
server {
    listen 80;
    server_name seu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Se estiver usando SSL (HTTPS):

```bash
sudo certbot --nginx -d seu-dominio.com
```

### 7. Atualizacoes futuras

```bash
cd automecanico-pro
git pull origin main
npm install
npm run build
pm2 restart automecanico
```

## Estrutura do build

- `dist/client/` - Assets estaticos (JS, CSS, imagens)
- `dist/server/` - Codigo SSR do servidor
- `server.js` - Servidor Node.js standalone

## Troubleshooting

- Se ocorrer erro `PORT already in use`, defina outra porta:
  ```bash
  PORT=3001 npm start
  ```
- Para logs em tempo real:
  ```bash
  pm2 logs automecanico
  ```
- Para reiniciar:
  ```bash
  pm2 restart automecanico
  ```
