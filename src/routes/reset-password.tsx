import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Wrench, Lock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  head: () => ({ meta: [{ title: "Redefinir Senha — Oficina ERP" }] }),
});

function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);

    // Fluxo PKCE: Supabase envia ?code=xxx&type=recovery
    const code = url.searchParams.get("code");
    const type = url.searchParams.get("type");
    if (code && type === "recovery") {
      supabase.auth
        .exchangeCodeForSession(code)
        .then(({ error }) => {
          if (error) {
            toast.error("Link de recuperação inválido ou expirado.");
          } else {
            setReady(true);
          }
        });
      return;
    }

    // Fluxo implícito: Supabase envia #access_token=...&refresh_token=...
    const hash = window.location.hash.substring(1);
    const hashParams = new URLSearchParams(hash);
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");
    const hashType = hashParams.get("type");

    if (accessToken && refreshToken) {
      supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error }) => {
          if (error) {
            toast.error("Link de recuperação inválido ou expirado.");
          } else {
            setReady(true);
          }
        });
      return;
    }

    // Fallback: sessão já estabelecida
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setReady(true);
      } else {
        toast.error("Link de recuperação inválido ou expirado.");
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      return toast.error("A senha deve ter pelo menos 6 caracteres.");
    }
    if (password !== confirmPassword) {
      return toast.error("As senhas não conferem.");
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      return toast.error(error.message);
    }
    toast.success("Senha atualizada com sucesso!");
    setDone(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 stripes-bg">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-xl bg-gradient-primary shadow-glow mb-4">
            <Wrench className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-display text-primary">Oficina ERP</h1>
          <p className="text-muted-foreground mt-2 text-sm">Gestão completa para mecânicos</p>
        </div>

        <div className="bg-card border rounded-xl p-6 shadow-card space-y-4">
          {done ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                <Lock className="h-6 w-6 text-green-500" />
              </div>
              <h2 className="text-lg font-semibold">Senha redefinida!</h2>
              <p className="text-sm text-muted-foreground">
                Sua senha foi atualizada com sucesso. Agora você pode entrar com a nova senha.
              </p>
              <Button asChild className="w-full bg-gradient-primary text-primary-foreground shadow-glow font-semibold">
                <Link to="/login">Entrar na Oficina</Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="text-center mb-2">
                <h2 className="text-lg font-semibold">Redefinir senha</h2>
                <p className="text-sm text-muted-foreground">Digite sua nova senha abaixo.</p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="np">Nova senha (mín. 6)</Label>
                  <Input
                    id="np"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="cp">Confirmar senha</Label>
                  <Input
                    id="cp"
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={busy || !ready}
                  className="w-full bg-gradient-primary text-primary-foreground shadow-glow font-semibold"
                >
                  {busy ? "Salvando..." : "Salvar nova senha"}
                </Button>
              </form>
              <div className="text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Voltar para o login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
