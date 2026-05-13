import { createFileRoute, useNavigate, Navigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

interface RateLimitData {
  attempts: number;
  windowStart: number;
}

function storageKey(email: string) {
  return `login_rate_limit:${email.toLowerCase().trim()}`;
}

function getRateLimitData(email: string): RateLimitData | null {
  try {
    const raw = localStorage.getItem(storageKey(email));
    if (!raw) return null;
    return JSON.parse(raw) as RateLimitData;
  } catch {
    return null;
  }
}

function setRateLimitData(email: string, data: RateLimitData) {
  localStorage.setItem(storageKey(email), JSON.stringify(data));
}

function clearRateLimitData(email: string) {
  localStorage.removeItem(storageKey(email));
}

function checkRateLimit(email: string): { limited: boolean; remainingSeconds: number } {
  const data = getRateLimitData(email);
  if (!data) return { limited: false, remainingSeconds: 0 };
  const now = Date.now();
  if (now - data.windowStart > RATE_LIMIT_WINDOW_MS) {
    clearRateLimitData(email);
    return { limited: false, remainingSeconds: 0 };
  }
  if (data.attempts >= MAX_ATTEMPTS) {
    const remaining = Math.ceil((data.windowStart + RATE_LIMIT_WINDOW_MS - now) / 1000);
    return { limited: true, remainingSeconds: Math.max(0, remaining) };
  }
  return { limited: false, remainingSeconds: 0 };
}

function recordFailedAttempt(email: string) {
  const now = Date.now();
  const data = getRateLimitData(email);
  if (!data || now - data.windowStart > RATE_LIMIT_WINDOW_MS) {
    setRateLimitData(email, { attempts: 1, windowStart: now });
  } else {
    setRateLimitData(email, { attempts: data.attempts + 1, windowStart: data.windowStart });
  }
}

function recordSuccess(email: string) {
  clearRateLimitData(email);
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({ meta: [{ title: "Entrar — Oficina ERP" }] }),
});

function LoginPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [rateLimitUntil, setRateLimitUntil] = useState(0);

  const rateLimitRemaining = Math.max(0, Math.ceil((rateLimitUntil - Date.now()) / 1000));

  useEffect(() => {
    if (!email) return;
    const { limited, remainingSeconds } = checkRateLimit(email);
    if (limited) {
      setRateLimitUntil(Date.now() + remainingSeconds * 1000);
    } else {
      setRateLimitUntil(0);
    }
  }, [email]);

  useEffect(() => {
    if (rateLimitUntil <= Date.now()) return;
    const interval = setInterval(() => {
      if (Date.now() >= rateLimitUntil) {
        setRateLimitUntil(0);
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [rateLimitUntil]);

  if (loading) return null;
  if (user) return <Navigate to="/app" />;

  const handleResetPassword = async () => {
    if (!email) {
      return toast.error("Digite seu email acima para redefinir a senha.");
    }
    setBusy(true);

    const redirectTo = window.location.origin + "/reset-password";
    const edgeUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-recovery-email`;

    try {
      const res = await fetch(edgeUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, redirectTo }),
      });
      const result = await res.json();

      if (!res.ok || result.error) {
        toast.error(result.error || "Erro ao enviar email de recuperação.");
      } else {
        toast.success("Email de redefinição enviado! Verifique sua caixa de entrada.");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro de rede.");
    }

    setBusy(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const { limited, remainingSeconds } = checkRateLimit(email);
    if (limited) {
      setRateLimitUntil(Date.now() + remainingSeconds * 1000);
      toast.error(`Muitas tentativas. Tente novamente em ${formatCountdown(remainingSeconds)}.`);
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      recordFailedAttempt(email);
      const updated = checkRateLimit(email);
      if (updated.limited) {
        setRateLimitUntil(Date.now() + updated.remainingSeconds * 1000);
      }
      if (error.message.toLowerCase().includes("email not confirmed")) {
        return toast.error("Email ainda não confirmado. Verifique sua caixa de entrada.");
      }
      return toast.error(error.message);
    }
    recordSuccess(email);
    toast.success("Bem-vindo!");
    navigate({ to: "/app" });
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const { limited, remainingSeconds } = checkRateLimit(email);
    if (limited) {
      setRateLimitUntil(Date.now() + remainingSeconds * 1000);
      toast.error(`Muitas tentativas. Tente novamente em ${formatCountdown(remainingSeconds)}.`);
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin + "/app" },
    });
    setBusy(false);
    if (error) {
      recordFailedAttempt(email);
      const updated = checkRateLimit(email);
      if (updated.limited) {
        setRateLimitUntil(Date.now() + updated.remainingSeconds * 1000);
      }
      return toast.error(error.message);
    }
    recordSuccess(email);
    if (!data.session) {
      setEmailSent(true);
      return toast.success("Conta criada! Verifique seu email para continuar.");
    }
    toast.success("Conta criada! Você já pode entrar.");
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

        <div className="bg-card border rounded-xl p-6 shadow-card">
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar conta</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="le">Email</Label>
                  <Input
                    id="le"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="lp">Senha</Label>
                  <Input
                    id="lp"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    className="text-xs text-primary hover:underline mt-1"
                  >
                    Esqueci minha senha
                  </button>
                </div>
                {rateLimitRemaining > 0 && (
                  <div className="text-sm text-destructive font-medium">
                    Muitas tentativas falhas. Aguarde {formatCountdown(rateLimitRemaining)}.
                  </div>
                )}
                <Button
                  type="submit"
                  disabled={busy || rateLimitRemaining > 0}
                  className="w-full bg-gradient-primary text-primary-foreground shadow-glow font-semibold"
                >
                  {busy ? "Entrando..." : "Entrar na Oficina"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              {emailSent ? (
                <div className="space-y-4 text-center">
                  <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">
                      Verifique seu email para continuar
                    </p>
                    <p className="mt-1">
                      Enviamos um link de confirmação para <strong>{email}</strong>. Clique no link
                      antes de fazer login.
                    </p>
                  </div>
                  <Button variant="outline" className="w-full" onClick={() => setEmailSent(false)}>
                    Voltar para criar conta
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSignup} className="space-y-4">
                  <div>
                    <Label htmlFor="se">Email</Label>
                    <Input
                      id="se"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="sp">Senha (mín. 6)</Label>
                    <Input
                      id="sp"
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  {rateLimitRemaining > 0 && (
                    <div className="text-sm text-destructive font-medium">
                      Muitas tentativas falhas. Aguarde {formatCountdown(rateLimitRemaining)}.
                    </div>
                  )}
                  <Button
                    type="submit"
                    disabled={busy || rateLimitRemaining > 0}
                    className="w-full bg-gradient-primary text-primary-foreground shadow-glow font-semibold"
                  >
                    {busy ? "Criando..." : "Criar conta grátis"}
                  </Button>
                </form>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
