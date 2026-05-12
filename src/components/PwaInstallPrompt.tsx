import { useEffect, useState } from "react";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

export function PwaInstallPrompt() {
  const { canShow, promptInstall, dismiss } = usePwaInstall();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!canShow) {
      setVisible(false);
      return;
    }
    const dismissedAt = localStorage.getItem("pwa-install-dismissed");
    if (dismissedAt) {
      const elapsed = Date.now() - parseInt(dismissedAt, 10);
      if (elapsed < DISMISS_DURATION_MS) {
        setVisible(false);
        return;
      }
    }
    setVisible(true);
  }, [canShow]);

  if (!visible) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-50 p-3">
      <div className="mx-auto max-w-md bg-card border rounded-xl shadow-lg p-4 animate-in slide-in-from-top-4 fade-in duration-300">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <p className="text-sm font-medium">Instale o AutoMecanico Pro</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Adicione à tela inicial para acesso rápido e experiência de app nativo.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Button size="sm" className="gap-1.5 bg-gradient-primary text-primary-foreground shadow-glow" onClick={promptInstall}>
                <Download className="h-3.5 w-3.5" />
                Instalar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { dismiss(); setVisible(false); }}>
                Agora não
              </Button>
            </div>
          </div>
          <button
            onClick={() => { dismiss(); setVisible(false); }}
            className="shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
