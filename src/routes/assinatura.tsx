import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Lock, Calendar, CreditCard, AlertTriangle, CheckCircle, ArrowLeft } from "lucide-react";
import { BRL } from "@/lib/format";

export const Route = createFileRoute("/assinatura")({
  component: AssinaturaPage,
});

function AssinaturaPage() {
  const { user } = useAuth();
  const [assinatura, setAssinatura] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadAssinatura();
  }, [user]);

  async function loadAssinatura() {
    const { data } = await supabase
      .from("assinaturas_mecanico")
      .select("*")
      .eq("user_id", user!.id)
      .single();
    setAssinatura(data);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Carregando...
      </div>
    );
  }

  const trial = assinatura?.status === "trial";
  const vencido = assinatura?.status === "vencido" || assinatura?.status === "cancelado";
  const ativo = assinatura?.status === "ativo";

  const diasRestantes = trial
    ? Math.max(0, Math.ceil((new Date(assinatura.trial_fim).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : ativo
      ? Math.max(0, Math.ceil((new Date(assinatura.assinatura_vencimento).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : 0;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <h1 className="font-display text-2xl mb-2">
            {trial ? "Periodo de Teste" : vencido ? "Acesso Bloqueado" : "Assinatura Ativa"}
          </h1>
          <p className="text-muted-foreground">
            {trial
              ? `Voce esta no periodo de teste gratuito. Aproveite todos os recursos do AutoMecanico Pro.`
              : vencido
                ? `Sua assinatura expirou. Renove agora para continuar usando o sistema.`
                : `Sua assinatura esta ativa. Aproveite o AutoMecanico Pro.`}
          </p>
        </div>

        <div className="bg-card border rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-muted-foreground">Status</span>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
              trial ? "bg-amber-500/10 text-amber-500" : ativo ? "bg-green-500/10 text-green-500" : "bg-destructive/10 text-destructive"
            }`}>
              {trial ? <AlertTriangle className="h-3 w-3" /> : ativo ? <CheckCircle className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
              {trial ? "Trial" : ativo ? "Ativo" : "Bloqueado"}
            </span>
          </div>

          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {trial ? "Dias restantes no trial" : ativo ? "Dias restantes" : "Assinatura vencida"}
            </span>
            <span className={`font-display text-lg ${diasRestantes <= 2 ? "text-destructive" : "text-primary"}`}>
              {diasRestantes} {diasRestantes === 1 ? "dia" : "dias"}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Valor mensal
            </span>
            <span className="font-display text-lg">{BRL(79.90)}/mes</span>
          </div>
        </div>

        {vencido && (
          <div className="space-y-4">
            <a
              href="https://mpago.la/2uQVSaf"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground py-3 rounded-xl font-medium hover:bg-primary/90 transition"
            >
              <CreditCard className="h-5 w-5" />
              Pagar Assinatura - R$ 79,90/mes
            </a>
            <p className="text-xs text-muted-foreground text-center">
              Pagamento seguro via Mercado Pago. Apos a confirmacao, seu acesso sera liberado automaticamente.
            </p>
          </div>
        )}

        {trial && (
          <div className="space-y-4">
            <a
              href="https://mpago.la/2uQVSaf"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground py-3 rounded-xl font-medium hover:bg-primary/90 transition"
            >
              <CreditCard className="h-5 w-5" />
              Assinar Agora - R$ 79,90/mes
            </a>
            <Link
              to="/app"
              className="flex items-center justify-center gap-2 w-full bg-muted text-foreground py-3 rounded-xl font-medium hover:bg-muted/80 transition"
            >
              <ArrowLeft className="h-5 w-5" />
              Voltar para o Sistema
            </Link>
            <p className="text-xs text-muted-foreground text-center">
              Voce tem {diasRestantes} dias gratuitos para testar. Aproveite todos os recursos!
            </p>
          </div>
        )}

        {ativo && (
          <Link
            to="/app"
            className="flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground py-3 rounded-xl font-medium hover:bg-primary/90 transition"
          >
            <ArrowLeft className="h-5 w-5" />
            Voltar para o Sistema
          </Link>
        )}
      </div>
    </div>
  );
}
