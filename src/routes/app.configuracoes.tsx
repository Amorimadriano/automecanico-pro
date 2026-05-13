import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Users,
  Shield,
  CheckCircle,
  Lock,
  Unlock,
  RefreshCw,
  AlertTriangle,
  Search,
  Calendar,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/configuracoes")({
  component: ConfiguracoesPage,
});

function ConfiguracoesPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    if (isAdmin) carregarUsuarios();
  }, [isAdmin]);

  async function carregarUsuarios() {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_listar_usuarios");
    if (error) {
      toast.error("Erro ao carregar usuários: " + error.message);
    } else {
      setUsuarios(data || []);
    }
    setLoading(false);
  }

  async function ativarAssinatura(targetUserId: string) {
    const { error } = await supabase.rpc("admin_ativar_assinatura", {
      p_target_user_id: targetUserId,
      p_dias: 30,
    });
    if (error) {
      toast.error("Erro ao ativar: " + error.message);
      return;
    }
    toast.success("Assinatura ativada por 30 dias!");
    carregarUsuarios();
  }

  async function bloquearAssinatura(targetUserId: string) {
    const { error } = await supabase.rpc("admin_bloquear_assinatura", {
      p_target_user_id: targetUserId,
    });
    if (error) {
      toast.error("Erro ao bloquear: " + error.message);
      return;
    }
    toast.success("Assinatura bloqueada!");
    carregarUsuarios();
  }

  async function renovarTrial(targetUserId: string) {
    const { error } = await supabase.rpc("admin_renovar_trial", {
      p_target_user_id: targetUserId,
      p_dias: 5,
    });
    if (error) {
      toast.error("Erro ao renovar trial: " + error.message);
      return;
    }
    toast.success("Trial renovado por 5 dias!");
    carregarUsuarios();
  }

  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-muted-foreground">
        Carregando...
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/app" />;
  }

  const filtrados = usuarios.filter((u) =>
    (u.email || "").toLowerCase().includes(busca.toLowerCase()) ||
    (u.nome || "").toLowerCase().includes(busca.toLowerCase())
  );

  const stats = {
    total: usuarios.length,
    ativos: usuarios.filter((u) => u.status === "ativo").length,
    trial: usuarios.filter((u) => u.status === "trial").length,
    bloqueados: usuarios.filter((u) => ["vencido", "cancelado"].includes(u.status)).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl">Administração de Assinaturas</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerenciamento de usuários e controle de acesso
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-primary">
          <Shield className="h-4 w-4" />
          Administrador
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border rounded-xl p-4">
          <div className="text-muted-foreground text-xs mb-1">Total Usuários</div>
          <div className="font-display text-2xl">{stats.total}</div>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <div className="text-muted-foreground text-xs mb-1">Assinaturas Ativas</div>
          <div className="font-display text-2xl text-green-600">{stats.ativos}</div>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <div className="text-muted-foreground text-xs mb-1">Em Trial</div>
          <div className="font-display text-2xl text-amber-500">{stats.trial}</div>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <div className="text-muted-foreground text-xs mb-1">Bloqueados</div>
          <div className="font-display text-2xl text-destructive">{stats.bloqueados}</div>
        </div>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar por e-mail ou nome..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {/* Lista de usuários */}
      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Usuário</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Dias</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Próx. Cobrança</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-muted-foreground">
                    Carregando usuários...
                  </td>
                </tr>
              ) : filtrados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              ) : (
                filtrados.map((u) => {
                  const isTrial = u.status === "trial";
                  const isAtivo = u.status === "ativo";
                  const isBloqueado = ["vencido", "cancelado"].includes(u.status);

                  return (
                    <tr key={u.user_id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium">{u.nome || "Sem nome"}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                        {u.role === "admin" && (
                          <span className="inline-flex items-center gap-1 mt-1 text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                            <Shield className="h-3 w-3" />
                            Admin
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                            isTrial
                              ? "bg-amber-500/10 text-amber-600"
                              : isAtivo
                                ? "bg-green-500/10 text-green-600"
                                : "bg-destructive/10 text-destructive"
                          }`}
                        >
                          {isTrial ? (
                            <AlertTriangle className="h-3 w-3" />
                          ) : isAtivo ? (
                            <CheckCircle className="h-3 w-3" />
                          ) : (
                            <Lock className="h-3 w-3" />
                          )}
                          {isTrial ? "Trial" : isAtivo ? "Ativo" : "Bloqueado"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`font-medium ${
                            (u.dias_restantes || 0) <= 2 ? "text-destructive" : "text-foreground"
                          }`}
                        >
                          {Math.max(0, Math.floor(u.dias_restantes || 0))} dias
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-muted-foreground">
                          {u.proxima_cobranca
                            ? new Date(u.proxima_cobranca).toLocaleDateString("pt-BR")
                            : isTrial
                              ? new Date(u.trial_fim).toLocaleDateString("pt-BR")
                              : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {isBloqueado && (
                            <button
                              onClick={() => ativarAssinatura(u.user_id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-green-500/10 text-green-600 hover:bg-green-500/20 transition"
                              title="Ativar assinatura por 30 dias"
                            >
                              <Unlock className="h-3 w-3" />
                              Ativar
                            </button>
                          )}
                          {isAtivo && (
                            <button
                              onClick={() => bloquearAssinatura(u.user_id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 transition"
                              title="Bloquear assinatura"
                            >
                              <Lock className="h-3 w-3" />
                              Bloquear
                            </button>
                          )}
                          {isTrial && (
                            <button
                              onClick={() => ativarAssinatura(u.user_id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition"
                              title="Converter trial para ativo"
                            >
                              <CreditCard className="h-3 w-3" />
                              Ativar
                            </button>
                          )}
                          <button
                            onClick={() => renovarTrial(u.user_id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition"
                            title="Renovar trial por 5 dias"
                          >
                            <RefreshCw className="h-3 w-3" />
                            +Trial
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
