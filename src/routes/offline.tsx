import { createFileRoute } from "@tanstack/react-router";
import { WifiOff, RotateCcw, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/offline")({
  component: OfflinePage,
  head: () => ({ meta: [{ title: "Offline — AutoMecanico Pro" }] }),
});

function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="max-w-sm w-full text-center space-y-6">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-primary shadow-glow mx-auto">
          <Wrench className="h-8 w-8 text-primary-foreground" />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2 text-primary">
            <WifiOff className="h-5 w-5" />
            <h1 className="text-xl font-semibold">Você está offline</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Alguns recursos podem não estar disponíveis enquanto você não tiver conexão com a internet.
          </p>
        </div>

        <Button
          onClick={() => window.location.reload()}
          className="w-full bg-gradient-primary text-primary-foreground shadow-glow font-semibold gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Tentar reconectar
        </Button>

        <p className="text-xs text-muted-foreground">
          Se o problema persistir, verifique sua conexão Wi-Fi ou dados móveis.
        </p>
      </div>
    </div>
  );
}
