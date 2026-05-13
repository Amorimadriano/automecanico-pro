// Edge Function: auth-callback
// Recebe o token de recuperação do Supabase e redireciona para o domínio correto
// Resolve o problema de múltiplos domínios compartilhando o mesmo projeto Supabase.
//
// IMPORTANTE: O Supabase Auth envia os tokens no hash (#access_token=...).
// Hash NÃO é enviada ao servidor, então esta função retorna HTML que lê
// window.location.hash no navegador e faz redirect client-side.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ALLOWED_DOMAINS = [
  "https://mecanicopro.9ninebusinesscontrol.com.br",
  "https://9ninebusinesscontrol.com.br",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:5173",
];

serve(async (req) => {
  const url = new URL(req.url);
  const finalRedirect = url.searchParams.get("final_redirect");
  const finalRedirectUrl = finalRedirect ? new URL(finalRedirect) : null;

  const isAllowed =
    finalRedirectUrl &&
    ALLOWED_DOMAINS.some(
      (domain) =>
        finalRedirectUrl.origin === domain ||
        finalRedirectUrl.href.startsWith(domain)
    );

  if (!isAllowed) {
    return new Response(
      `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><title>Erro</title></head>
<body>
  <h1>Domínio não autorizado</h1>
  <p>${finalRedirectUrl?.origin || "não informado"}</p>
  <p>Domínios permitidos: ${ALLOWED_DOMAINS.join(", ")}</p>
</body>
</html>`,
      { status: 400, headers: { "content-type": "text/html; charset=utf-8" } }
    );
  }

  // Retorna HTML que faz redirect client-side preservando a hash (#access_token=...)
  const target = finalRedirectUrl.href;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Redirecionando...</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #0a0a0a; color: #e5e5e5; }
    .box { text-align: center; }
    .spinner { width: 40px; height: 40px; border: 3px solid #333; border-top-color: #EA580C; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 16px; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="box">
    <div class="spinner"></div>
    <p>Redirecionando...</p>
  </div>
  <script>
    (function() {
      var target = ${JSON.stringify(target)};
      var hash = window.location.hash;
      var dest = target + hash;
      window.location.replace(dest);
    })();
  </script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store, no-cache, must-revalidate",
    },
  });
});
