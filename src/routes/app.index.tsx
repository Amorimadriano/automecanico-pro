import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { BRL, fmtDate } from "@/lib/format";
import { ClipboardList, DollarSign, AlertTriangle, Calendar, TrendingUp, Wrench, Car, ShieldAlert } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/app/")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard — Oficina ERP" }] }),
});

function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [revisoes, setRevisoes] = useState<any[]>([]);

  useEffect(() => { load(); }, []);

  async function load() {
    const hoje = new Date().toISOString().slice(0, 10);
    const daqui15 = new Date(); daqui15.setDate(daqui15.getDate() + 15);
    const dataLimite = daqui15.toISOString().slice(0, 10);

    const [os, fin, pecas, agenda, rev, gar] = await Promise.all([
      supabase.from("ordens_servico_mecanico").select("*").order("created_at", { ascending: false }),
      supabase.from("financeiro_mecanico").select("*"),
      supabase.from("pecas_mecanico").select("*"),
      supabase.from("agendamentos_mecanico").select("*, clientes_mecanico(nome), veiculos_mecanico(placa)").gte("data_hora", new Date().toISOString()).order("data_hora").limit(5),
      supabase.rpc("veiculos_revisao_proxima"),
      supabase.from("v_garantias_ativas_mecanico").select("*")
        .gte("garantia_data_vencimento", hoje)
        .lte("garantia_data_vencimento", dataLimite)
        .order("garantia_data_vencimento", { ascending: true })
        .limit(5),
    ]);

    const now = new Date();
    const thisMonth = (d: string) => {
      const dt = new Date(d);
      return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
    };

    const osList = os.data ?? [];
    const finList = fin.data ?? [];
    const pecasList = pecas.data ?? [];

    const abertas = osList.filter((o) => !["concluida", "cancelada"].includes(o.status)).length;
    const concluidasMes = osList.filter((o) => o.status === "concluida" && o.data_conclusao && thisMonth(o.data_conclusao));
    const faturamentoMes = concluidasMes.reduce((s, o) => s + Number(o.total ?? 0), 0);
    const ticketMedio = concluidasMes.length ? faturamentoMes / concluidasMes.length : 0;
    const aReceber = finList.filter((f) => f.tipo === "receita" && !f.pago).reduce((s, f) => s + Number(f.valor), 0);
    const aPagar = finList.filter((f) => f.tipo === "despesa" && !f.pago).reduce((s, f) => s + Number(f.valor), 0);
    const estoqueBaixo = pecasList.filter((p) => p.quantidade <= p.estoque_minimo);

    // Faturamento últimos 6 meses
    const series: { mes: string; valor: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const total = osList
        .filter((o) => o.status === "concluida" && o.data_conclusao &&
          new Date(o.data_conclusao).getMonth() === d.getMonth() &&
          new Date(o.data_conclusao).getFullYear() === d.getFullYear())
        .reduce((s, o) => s + Number(o.total ?? 0), 0);
      series.push({ mes: d.toLocaleDateString("pt-BR", { month: "short" }), valor: total });
    }

    setData({ abertas, faturamentoMes, ticketMedio, aReceber, aPagar, estoqueBaixo, series, agenda: agenda.data ?? [], recentes: osList.slice(0, 5), garantias: gar.data ?? [] });
    setRevisoes(rev.data ?? []);
  }

  if (!data) return <div className="text-muted-foreground">Carregando dashboard...</div>;

  const kpis = [
    { label: "OS Abertas", value: data.abertas, icon: ClipboardList, color: "text-warning" },
    { label: "Faturamento (mês)", value: BRL(data.faturamentoMes), icon: TrendingUp, color: "text-success" },
    { label: "Ticket médio", value: BRL(data.ticketMedio), icon: DollarSign, color: "text-primary" },
    { label: "A receber", value: BRL(data.aReceber), icon: DollarSign, color: "text-chart-5" },
  ];

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Visão geral da oficina" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpis.map((k) => (
          <div key={k.label} className="bg-card border rounded-xl p-5 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">{k.label}</span>
              <k.icon className={`h-5 w-5 ${k.color}`} />
            </div>
            <div className="text-2xl font-display mt-2">{k.value}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card border rounded-xl p-5 shadow-card">
          <h3 className="font-display text-lg mb-4">Faturamento — últimos 6 meses</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.series}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.01 60)" />
              <XAxis dataKey="mes" stroke="oklch(0.7 0.015 70)" fontSize={12} />
              <YAxis stroke="oklch(0.7 0.015 70)" fontSize={12} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: "oklch(0.21 0.012 60)", border: "1px solid oklch(0.3 0.01 60)", borderRadius: 8 }}
                formatter={(v: number) => BRL(v)}
              />
              <Bar dataKey="valor" fill="oklch(0.72 0.19 49)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-6">
          {revisoes.length > 0 && (
            <div className="bg-card border border-warning/40 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Car className="h-5 w-5 text-warning" />
                <h3 className="font-display text-base">Revisões próximas</h3>
              </div>
              <ul className="space-y-2 text-sm">
                {revisoes.slice(0, 5).map((r: any) => (
                  <li key={r.id} className="flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="font-medium">{r.placa} — {[r.marca, r.modelo].filter(Boolean).join(" ")}</span>
                      <span className="text-xs text-muted-foreground">{r.cliente_nome}</span>
                    </div>
                    <div className="text-right">
                      {r.alerta === 'revisao_data' && r.data_proxima_revisao && (
                        <span className="text-xs text-warning">{fmtDate(r.data_proxima_revisao)}</span>
                      )}
                      {r.alerta === 'revisao_km' && r.km_proxima_revisao != null && (
                        <span className="text-xs text-warning">{r.km_atual?.toLocaleString("pt-BR")} / {r.km_proxima_revisao.toLocaleString("pt-BR")} km</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              {revisoes.length > 5 && (
                <p className="text-xs text-muted-foreground mt-2">+{revisoes.length - 5} veículo(s)</p>
              )}
            </div>
          )}

          {data.estoqueBaixo.length > 0 && (
            <div className="bg-card border border-destructive/40 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <h3 className="font-display text-base">Estoque crítico</h3>
              </div>
              <ul className="space-y-2 text-sm">
                {data.estoqueBaixo.slice(0, 5).map((p: any) => (
                  <li key={p.id} className="flex justify-between">
                    <span>{p.nome}</span>
                    <span className="text-destructive font-mono">{p.quantidade}/{p.estoque_minimo}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="bg-card border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-5 w-5 text-primary" />
              <h3 className="font-display text-base">Próximos agendamentos</h3>
            </div>
            {data.agenda.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum agendamento próximo.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {data.agenda.map((a: any) => (
                  <li key={a.id} className="border-l-2 border-primary pl-3">
                    <div className="font-medium">{a.titulo}</div>
                    <div className="text-xs text-muted-foreground">
                      {fmtDate(a.data_hora)} • {a.clientes_mecanico?.nome ?? "—"} {a.veiculos_mecanico?.placa && `• ${a.veiculos_mecanico.placa}`}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {data.garantias.length > 0 && (
            <div className="bg-card border border-amber-500/30 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <ShieldAlert className="h-5 w-5 text-amber-400" />
                <h3 className="font-display text-base">Garantias próximas do vencimento</h3>
              </div>
              <ul className="space-y-2 text-sm">
                {data.garantias.map((g: any) => (
                  <li key={g.item_id} className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">{g.descricao}</div>
                      <div className="text-xs text-muted-foreground">OS #{g.os_numero}</div>
                    </div>
                    <span className="text-amber-400 font-mono text-xs">{fmtDate(g.garantia_data_vencimento)}</span>
                  </li>
                ))}
              </ul>
              <Link to="/app/garantias" className="text-xs text-primary hover:underline mt-3 inline-block">Ver todas →</Link>
            </div>
          )}
        </div>
      </div>

      <div className="bg-card border rounded-xl p-5 mt-6 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg flex items-center gap-2"><Wrench className="h-5 w-5 text-primary" />OS recentes</h3>
          <Link to="/app/os" className="text-sm text-primary hover:underline">Ver todas →</Link>
        </div>
        {data.recentes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma OS ainda. Crie a primeira em "Ordens de Serviço".</p>
        ) : (
          <div className="space-y-2">
            {data.recentes.map((o: any) => (
              <Link key={o.id} to="/app/os/$id" params={{ id: o.id }} className="flex items-center justify-between p-3 rounded-lg bg-muted hover:bg-secondary transition">
                <div>
                  <div className="font-mono text-primary">OS #{o.numero}</div>
                  <div className="text-xs text-muted-foreground">{o.status}</div>
                </div>
                <div className="font-display text-lg">{BRL(o.total)}</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
