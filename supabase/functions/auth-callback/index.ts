// Edge Function: auth-callback
// Recebe o token de recuperação do Supabase e redireciona para o domínio correto
// Isso resolve o problema de múltiplos domínios compartilhando o mesmo projeto Supabase

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Domínios autorizados (whitelist)
const ALLOWED_DOMAINS = [
  "https://mecanicopro.9ninebusinesscontrol.com.br",
  "https://9ninebusinesscontrol.com.br",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:5173",
];

serve(async (req) => {
  const url = new URL(req.url);

  // Pega o domínio final para onde devemos redirecionar
  const finalRedirect = url.searchParams.get("final_redirect");
  const finalRedirectUrl = finalRedirect ? new URL(finalRedirect) : null;

  // Valida se o domínio está na whitelist
  const isAllowed = finalRedirectUrl && ALLOWED_DOMAINS.some((domain) =>
    finalRedirectUrl.origin === domain || finalRedirectUrl.href.startsWith(domain)
  );

  if (!isAllowed) {
    return new Response(
      `Domínio não autorizado: ${finalRedirectUrl?.origin || "não informado"}. ` +
      `Domínios permitidos: ${ALLOWED_DOMAINS.join(", ")}`,
      { status: 400, headers: { "content-type": "text/plain; charset=utf-8" } }
    );
  }

  // O Supabase envia os tokens no hash (#access_token=...) ou query (?code=...)
  // Quando o Supabase redireciona para esta função, ele mantém a hash na URL
  // Precisamos repassar tudo para o domínio final

  const target = new URL(finalRedirectUrl.href);
  target.search = url.search;
  target.hash = url.hash;

  return new Response(null, {
    status: 302,
    headers: {
      "Location": target.href,
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
});
