import { createFileRoute, Outlet, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { AppSidebar, MobileBar } from "@/components/AppSidebar";
import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/app")({
  component: AppLayout,
  middleware: [requireSupabaseAuth],
});

function AppLayout() {
  const { user, loading } = useAuth();
  const [assinaturaStatus, setAssinaturaStatus] = useState<"loading" | "active" | "blocked">("loading");

  useEffect(() => {
    if (!user) return;
    async function check() {
      const { data } = await supabase
        .from("assinaturas_mecanico")
        .select("status, trial_fim, assinatura_vencimento, proxima_cobranca")
        .eq("user_id", user.id)
        .single();

      if (!data) {
        setAssinaturaStatus("blocked");
        return;
      }

      const now = new Date();
      const trialEnd = data.trial_fim ? new Date(data.trial_fim) : null;
      const subsEnd = data.assinatura_vencimento ? new Date(data.assinatura_vencimento) : null;

      // Ativo se houver qualquer periodo valido (trial ou assinatura)
      const isActive = (trialEnd && trialEnd > now) || (subsEnd && subsEnd > now);

      if (isActive) {
        setAssinaturaStatus("active");
      } else {
        setAssinaturaStatus("blocked");
      }
    }
    check();
  }, [user]);

  if (loading || assinaturaStatus === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Carregando...
      </div>
    );
  }

  if (!user) return <Navigate to="/login" />;

  if (assinaturaStatus === "blocked") {
    return <Navigate to="/assinatura" />;
  }

  return (
    <div className="min-h-screen flex w-full">
      <AppSidebar />
      <main className="flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
        <div className="max-w-[1400px] mx-auto p-4 md:p-8">
          <Outlet />
        </div>
      </main>
      <MobileBar />
      <PwaInstallPrompt />
    </div>
  );
}
