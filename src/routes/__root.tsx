import { useEffect } from "react";
import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-display text-primary">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A página que você procura não existe.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" },
      { name: "theme-color", content: "#EA580C" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "AutoMec" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "application-name", content: "AutoMecanico Pro" },
      { name: "msapplication-TileColor", content: "#EA580C" },
      { name: "msapplication-TileImage", content: "/icon-192x192.svg" },
      { title: "Oficina ERP — Gestão para Mecânicos" },
      { name: "description", content: "Sistema ERP completo para oficinas mecânicas: ordens de serviço, financeiro, agenda, estoque e clientes." },
      { property: "og:title", content: "Oficina ERP — Gestão para Mecânicos" },
      { name: "twitter:title", content: "Oficina ERP — Gestão para Mecânicos" },
      { property: "og:description", content: "Sistema ERP completo para oficinas mecânicas: ordens de serviço, financeiro, agenda, estoque e clientes." },
      { name: "twitter:description", content: "Sistema ERP completo para oficinas mecânicas: ordens de serviço, financeiro, agenda, estoque e clientes." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/d4e42869-1a31-4b5d-9e4f-5943cdbe95b1/id-preview-d3efc614--5d332943-dc40-4771-aaeb-8c83907b8777.lovable.app-1777670085406.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/d4e42869-1a31-4b5d-9e4f-5943cdbe95b1/id-preview-d3efc614--5d332943-dc40-4771-aaeb-8c83907b8777.lovable.app-1777670085406.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "manifest", href: "/manifest.json" },
      { rel: "apple-touch-icon", sizes: "192x192", href: "/icon-192x192.svg" },
      { rel: "apple-touch-icon", sizes: "512x512", href: "/icon-512x512.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Toaster richColors position="top-right" />
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js", { scope: "/" })
          .then((reg) => {
            console.log("[PWA] Service Worker registrado:", reg.scope);
            reg.addEventListener("updatefound", () => {
              const newWorker = reg.installing;
              if (newWorker) {
                newWorker.addEventListener("statechange", () => {
                  if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                    console.log("[PWA] Nova versão disponível — recarregando...");
                    window.location.reload();
                  }
                });
              }
            });
          })
          .catch((err) => {
            console.error("[PWA] Falha ao registrar Service Worker:", err);
          });
      });
    }
  }, []);

  return <Outlet />;
}
