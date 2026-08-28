import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  component: () => {
    const { user, loading } = useAuth();
    if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
    return <Navigate to={user ? "/app" : "/login"} />;
  },
});
// cache-bust-v2
