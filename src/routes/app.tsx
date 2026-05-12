import { createFileRoute, Outlet, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { AppSidebar, MobileBar } from "@/components/AppSidebar";
import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const Route = createFileRoute("/app")({
  component: AppLayout,
  middleware: [requireSupabaseAuth],
});

function AppLayout() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  if (!user) return <Navigate to="/login" />;

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
