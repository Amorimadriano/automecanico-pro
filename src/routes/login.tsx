import { createFileRoute, useNavigate, Navigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Wrench, BookOpen, ArrowLeft, Lock, Mail, KeyRound } from "lucide-react";
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

  // Recovery OTP flow
  const [recoveryStep, setRecoveryStep] = useState<"idle" | "email" | "otp" | "password" | "done">("idle");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

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

  const startRecovery = () => {
    if (!email) {
      return toast.error("Digite seu email acima primeiro.");
    }
    setRecoveryStep("email");
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    const { limited, remainingSeconds } = checkRateLimit(email);
    if (limited) {
      setRateLimitUntil(Date.now() + remainingSeconds * 1000);
      toast.error(`Muitas tentativas. Tente novamente em ${formatCountdown(remainingSeconds)}.`);
      return;
    }
    setBusy(true);
    const redirectTo = `${window.location.origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    setBusy(false);
    if (error) {
      recordFailedAttempt(email);
      return toast.error(error.message);
    }
    recordSuccess(email);
    setRecoveryStep("otp");
    toast.success("Email enviado! Verifique seu email para obter o código ou link.");
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length < 6) {
      return toast.error("Digite o código de 6 dígitos.");
    }
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otpCode.trim(),
      type: "recovery",
    });
    setBusy(false);
    if (error) {
      return toast.error(error.message);
    }
    setRecoveryStep("password");
    toast.success("Código confirmado! Agora defina sua nova senha.");
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      return toast.error("A senha deve ter pelo menos 6 caracteres.");
    }
    if (newPassword !== confirmNewPassword) {
      return toast.error("As senhas não conferem.");
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setBusy(false);
    if (error) {
      return toast.error(error.message);
    }
    setRecoveryStep("done");
    toast.success("Senha redefinida com sucesso!");
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
          {recoveryStep !== "idle" ? (
            <div className="space-y-4">
              {/* Recovery Header */}
              <div className="flex items-center gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setRecoveryStep("idle")}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <h2 className="text-lg font-semibold">Recuperar senha</h2>
              </div>

              {recoveryStep === "email" && (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div className="text-center space-y-2">
                    <Mail className="h-8 w-8 text-primary mx-auto" />
                    <p className="text-sm text-muted-foreground">
                      Enviaremos um código de verificação para <strong>{email}</strong>.
                    </p>
                  </div>
                  {rateLimitRemaining > 0 && (
                    <div className="text-sm text-destructive font-medium text-center">
                      Aguarde {formatCountdown(rateLimitRemaining)} para reenviar.
                    </div>
                  )}
                  <Button
                    type="submit"
                    disabled={busy || rateLimitRemaining > 0}
                    className="w-full bg-gradient-primary text-primary-foreground shadow-glow font-semibold"
                  >
                    {busy ? "Enviando..." : "Enviar código"}
                  </Button>
                </form>
              )}

              {recoveryStep === "otp" && (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="text-center space-y-2">
                    <KeyRound className="h-8 w-8 text-primary mx-auto" />
                    <p className="text-sm text-muted-foreground">
                      Digite o código de 6 dígitos enviado para <strong>{email}</strong>.
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="otp">Código</Label>
                    <Input
                      id="otp"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      required
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="123456"
                      className="text-center text-lg tracking-widest"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={busy || otpCode.length < 6}
                    className="w-full bg-gradient-primary text-primary-foreground shadow-glow font-semibold"
                  >
                    {busy ? "Verificando..." : "Verificar código"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setRecoveryStep("email")}
                    className="w-full text-xs text-primary hover:underline"
                  >
                    Reenviar código
                  </button>
                </form>
              )}

              {recoveryStep === "password" && (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="text-center space-y-2">
                    <Lock className="h-8 w-8 text-primary mx-auto" />
                    <p className="text-sm text-muted-foreground">Defina sua nova senha.</p>
                  </div>
                  <div>
                    <Label htmlFor="np">Nova senha (mín. 6)</Label>
                    <Input
                      id="np"
                      type="password"
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cp">Confirmar senha</Label>
                    <Input
                      id="cp"
                      type="password"
                      required
                      minLength={6}
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={busy}
                    className="w-full bg-gradient-primary text-primary-foreground shadow-glow font-semibold"
                  >
                    {busy ? "Salvando..." : "Salvar nova senha"}
                  </Button>
                </form>
              )}

              {recoveryStep === "done" && (
                <div className="text-center space-y-4">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                    <Lock className="h-6 w-6 text-green-500" />
                  </div>
                  <h3 className="text-lg font-semibold">Senha redefinida!</h3>
                  <p className="text-sm text-muted-foreground">
                    Sua senha foi atualizada com sucesso.
                  </p>
                  <Button
                    onClick={() => setRecoveryStep("idle")}
                    className="w-full bg-gradient-primary text-primary-foreground shadow-glow font-semibold"
                  >
                    Voltar para o login
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Criar conta</TabsTrigger>
              </TabsList>

              <div className="mb-4 text-center">
                <Link
                  to="/manual"
                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  Acessar Manual do Usuário
                </Link>
              </div>

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
                      onClick={startRecovery}
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
          )}
        </div>
      </div>
    </div>
  );
}
