import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth-redirect")({
  component: AuthRedirectPage,
});

function AuthRedirectPage() {
  const [error, setError] = useState("");

  useEffect(() => {
    const url = new URL(window.location.href);
    const finalRedirect = url.searchParams.get("final_redirect");

    if (!finalRedirect) {
      setError("Parâmetro final_redirect não informado.");
      return;
    }

    // Valida domínios permitidos
    const allowedDomains = [
      "https://mecanicopro.9ninebusinesscontrol.com.br",
      "https://9ninebusinesscontrol.com.br",
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:5173",
    ];
    const destUrl = new URL(finalRedirect);
    const isAllowed = allowedDomains.some(
      (d) => destUrl.origin === d || destUrl.href.startsWith(d)
    );

    if (!isAllowed) {
      setError(`Domínio não autorizado: ${destUrl.origin}`);
      return;
    }

    const code = url.searchParams.get("code");
    const type = url.searchParams.get("type");

    // Se Supabase enviou PKCE code, tenta trocar por sessão no domínio atual (mecanicopro).
    // Se funcionar, redireciona para o destino com tokens na hash.
    // Se falhar (code verifier não disponível), repassa o code como query param.
    if (code && type === "recovery") {
      supabase.auth
        .exchangeCodeForSession(code)
        .then(({ data, error: exchangeErr }) => {
          if (exchangeErr || !data.session) {
            console.error("[auth-redirect] exchangeCodeForSession failed:", exchangeErr);
            // Repassa o code para o destino tentar trocar lá
            destUrl.searchParams.set("code", code);
            destUrl.searchParams.set("type", type);
            window.location.replace(destUrl.toString());
            return;
          }
          // Troca ok: redireciona com tokens na hash
          const hash =
            `#access_token=${encodeURIComponent(data.session.access_token)}` +
            `&refresh_token=${encodeURIComponent(data.session.refresh_token)}` +
            `&type=recovery`;
          window.location.replace(finalRedirect + hash);
        });
      return;
    }

    // Fluxo implícito: repassa hash com tokens (access_token, refresh_token)
    const hash = window.location.hash;
    window.location.replace(finalRedirect + hash);
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">Erro</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <p className="text-muted-foreground">Redirecionando...</p>
      </div>
    </div>
  );
}
