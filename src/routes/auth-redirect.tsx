import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

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
    const targetUrl = new URL(finalRedirect);
    const isAllowed = allowedDomains.some(
      (d) => targetUrl.origin === d || targetUrl.href.startsWith(d)
    );

    if (!isAllowed) {
      setError(`Domínio não autorizado: ${targetUrl.origin}`);
      return;
    }

    // Preserva a hash (#access_token=...) que o Supabase envia
    const hash = window.location.hash;
    const dest = finalRedirect + hash;

    // Redireciona imediatamente
    window.location.replace(dest);
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
