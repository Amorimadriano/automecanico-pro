import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Users, Car, ClipboardList, Package, Calendar, DollarSign, UserCog, LogOut, Wrench, Percent, ShieldCheck, FileText, TrendingUp, Store, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const items = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/app/orcamentos", label: "Orçamentos", icon: FileText },
  { to: "/app/os", label: "Ordens de Serviço", icon: ClipboardList },
  { to: "/app/clientes", label: "Clientes", icon: Users },
  { to: "/app/veiculos", label: "Veículos", icon: Car },
  { to: "/app/estoque", label: "Estoque", icon: Package },
  { to: "/app/fornecedores", label: "Fornecedores", icon: Store },
  { to: "/app/agenda", label: "Agenda", icon: Calendar },
  { to: "/app/funcionarios", label: "Funcionários", icon: UserCog },
  { to: "/app/comissoes", label: "Comissões", icon: Percent },
  { to: "/app/garantias", label: "Garantias", icon: ShieldCheck },
  { to: "/app/financeiro", label: "Financeiro", icon: DollarSign },
  { to: "/app/financeiro-relatorio", label: "Relatório Financeiro", icon: TrendingUp },
];

export function AppSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { isAdmin } = useAuth();

  return (
    <aside className="hidden md:flex md:w-64 flex-col bg-sidebar border-r border-sidebar-border min-h-screen sticky top-0">
      <div className="px-5 py-5 border-b border-sidebar-border flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
          <Wrench className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <div className="font-display text-lg leading-none text-primary">OFICINA ERP</div>
          <div className="text-[10px] text-muted-foreground tracking-widest">GESTÃO TOTAL</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {items.map((it) => {
          const active = it.exact ? path === it.to : path.startsWith(it.to);
          return (
            <Link
              key={it.to}
              to={it.to}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all",
                active
                  ? "bg-gradient-primary text-primary-foreground shadow-glow"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              )}
            >
              <it.icon className="h-4 w-4" />
              {it.label}
            </Link>
          );
        })}
        {isAdmin && (
          <Link
            to="/app/configuracoes"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all",
              path.startsWith("/app/configuracoes")
                ? "bg-gradient-primary text-primary-foreground shadow-glow"
                : "text-sidebar-foreground hover:bg-sidebar-accent"
            )}
          >
            <Settings className="h-4 w-4" />
            Configurações
          </Link>
        )}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <button
          onClick={() => supabase.auth.signOut()}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-sidebar-foreground hover:bg-destructive/20 hover:text-destructive transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </aside>
  );
}

export function MobileBar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { isAdmin } = useAuth();
  const mobileItems = [...items.slice(0, 4), ...(isAdmin ? [{ to: "/app/configuracoes", label: "Config", icon: Settings }] : [{ to: "/app/financeiro", label: "Financeiro", icon: DollarSign }])];

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 bg-sidebar border-t border-sidebar-border z-40"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="grid grid-cols-5">
        {mobileItems.map((it) => {
          const active = (it as any).exact ? path === it.to : path.startsWith(it.to);
          return (
            <Link key={it.to} to={it.to} className={cn("flex flex-col items-center gap-1 py-2 text-[10px]", active ? "text-primary" : "text-muted-foreground")}>
              <it.icon className="h-5 w-5" />
              {it.label.split(" ")[0]}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
