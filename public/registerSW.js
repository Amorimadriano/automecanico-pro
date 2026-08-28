// Força registro do Service Worker com versionamento para bypassar cache do navegador
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    const swUrl = "/sw.js?v=3";
    navigator.serviceWorker
      .register(swUrl, { scope: "/" })
      .then((registration) => {
        // Se houver um SW waiting, força skipWaiting e recarrega a página
        const onUpdateFound = () => {
          const waiting = registration.waiting;
          if (waiting) {
            waiting.addEventListener("statechange", () => {
              if (waiting.state === "activated") {
                window.location.reload();
              }
            });
            waiting.postMessage({ type: "SKIP_WAITING" });
          }
        };
        registration.addEventListener("updatefound", onUpdateFound);

        // Verifica se já existe um SW waiting no momento do registro
        if (registration.waiting) {
          onUpdateFound();
        }
      })
      .catch((err) => {
        console.error("[PWA] Falha ao registrar Service Worker:", err);
      });
  });
}
