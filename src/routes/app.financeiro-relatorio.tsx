import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DollarSign, TrendingUp, TrendingDown, FileText } from "lucide-react";
import { toast } from "sonner";
import { BRL } from "@/lib/format";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

export const Route = createFileRoute("/app/financeiro-relatorio")({ component: Page, head: () => ({ meta: [{ title: "Relatório Financeiro" }] }) });

function Page() {
  const [ano, setAno] = useState<string>(new Date().getFullYear().toString());
  const [mes, setMes] = useState<string>("todos");
  const [mensal, setMensal] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const anos = useMemo(() => {
    const atual = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => (atual - i).toString());
  }, []);

  useEffect(() => { load(); }, [ano, mes]);

  async function load() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const anoNum = parseInt(ano);
      const mesNum = mes === "todos" ? null : parseInt(mes);

      const { data: dMensal, error: eMensal } = await supabase.rpc("relatorio_financeiro_mensal", {
        p_user_id: user.id,
        p_ano: anoNum,
      });
      if (eMensal) toast.error(eMensal.message);
      setMensal(dMensal ?? []);

      const { data: dCat, error: eCat } = await supabase.rpc("relatorio_financeiro_categorias", {
        p_user_id: user.id,
        p_ano: anoNum,
        p_mes: mesNum,
      });
      if (eCat) toast.error(eCat.message);
      setCategorias(dCat ?? []);
    } finally {
      setLoading(false);
    }
  }

  const receitasAno = mensal.reduce((s, m) => s + Number(m.total_receitas ?? 0), 0);
  const despesasAno = mensal.reduce((s, m) => s + Number(m.total_despesas ?? 0), 0);
  const saldoAno = receitasAno - despesasAno;

  const receitasMes = mensal.find(m => m.mes === parseInt(mes))?.total_receitas ?? 0;
  const despesasMes = mensal.find(m => m.mes === parseInt(mes))?.total_despesas ?? 0;
  const saldoMes = receitasMes - despesasMes;

  const receitas = mes === "todos" ? receitasAno : receitasMes;
  const despesas = mes === "todos" ? despesasAno : despesasMes;
  const saldo = mes === "todos" ? saldoAno : saldoMes;

  const chartData = mensal.map(m => ({
    nome_mes: m.nome_mes,
    Receitas: Number(m.total_receitas ?? 0),
    Despesas: Number(m.total_despesas ?? 0),
    Saldo: Number(m.saldo ?? 0),
  }));

  const receitasCat = categorias.filter(c => c.tipo === "receita");
  const despesasCat = categorias.filter(c => c.tipo === "despesa");

  return (
    <>
      <PageHeader title="Relatório Financeiro" subtitle="Análise mensal e anual de receitas e despesas" />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="w-full sm:w-40">
          <Select value={ano} onValueChange={setAno}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {anos.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full sm:w-40">
          <Select value={mes} onValueChange={setMes}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Ano inteiro</SelectItem>
              {Array.from({ length: 12 }, (_, i) => (
                <SelectItem key={i + 1} value={(i + 1).toString()}>
                  {new Date(2000, i, 1).toLocaleDateString("pt-BR", { month: "long" })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={load} className="w-full sm:w-auto">Atualizar</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-card border rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground uppercase">Total Receitas</span>
            <TrendingUp className="h-5 w-5 text-success" />
          </div>
          <div className="text-2xl font-display text-success mt-2">{BRL(receitas)}</div>
        </div>
        <div className="bg-card border rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground uppercase">Total Despesas</span>
            <TrendingDown className="h-5 w-5 text-destructive" />
          </div>
          <div className="text-2xl font-display text-destructive mt-2">{BRL(despesas)}</div>
        </div>
        <div className="bg-card border rounded-xl p-5 col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground uppercase">Saldo</span>
            <DollarSign className="h-5 w-5 text-primary" />
          </div>
          <div className={`text-2xl font-display mt-2 ${saldo >= 0 ? "text-primary" : "text-destructive"}`}>{BRL(saldo)}</div>
        </div>
      </div>

      <Tabs defaultValue="evolucao">
        <TabsList>
          <TabsTrigger value="evolucao">Evolução Mensal</TabsTrigger>
          <TabsTrigger value="categorias">Detalhamento por Categoria</TabsTrigger>
        </TabsList>

        <TabsContent value="evolucao">
          <div className="bg-card border rounded-xl p-5 mt-4">
            {chartData.length === 0 || loading ? (
              <p className="text-sm text-muted-foreground">Carregando dados...</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.01 60)" />
                  <XAxis dataKey="nome_mes" stroke="oklch(0.7 0.015 70)" fontSize={12} />
                  <YAxis stroke="oklch(0.7 0.015 70)" fontSize={12} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ background: "oklch(0.21 0.012 60)", border: "1px solid oklch(0.3 0.01 60)", borderRadius: 8 }}
                    formatter={(v: number) => BRL(v)}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="Receitas" stroke="oklch(0.65 0.2 145)" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="Despesas" stroke="oklch(0.55 0.2 25)" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="Saldo" stroke="oklch(0.72 0.19 49)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </TabsContent>

        <TabsContent value="categorias">
          <div className="grid lg:grid-cols-2 gap-6 mt-4">
            <div className="bg-card border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border font-display text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-success" /> Receitas por Categoria
              </div>
              {receitasCat.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4">Nenhuma receita no período.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-muted text-xs uppercase text-muted-foreground">
                    <tr><th className="text-left px-4 py-3">Categoria</th><th className="text-right px-4 py-3">Qtd</th><th className="text-right px-4 py-3">Total</th></tr>
                  </thead>
                  <tbody>
                    {receitasCat.map((c, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="px-4 py-3">{c.categoria}</td>
                        <td className="px-4 py-3 text-right">{c.quantidade}</td>
                        <td className="px-4 py-3 text-right font-mono text-success">{BRL(c.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="bg-card border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border font-display text-sm flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-destructive" /> Despesas por Categoria
              </div>
              {despesasCat.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4">Nenhuma despesa no período.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-muted text-xs uppercase text-muted-foreground">
                    <tr><th className="text-left px-4 py-3">Categoria</th><th className="text-right px-4 py-3">Qtd</th><th className="text-right px-4 py-3">Total</th></tr>
                  </thead>
                  <tbody>
                    {despesasCat.map((c, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="px-4 py-3">{c.categoria}</td>
                        <td className="px-4 py-3 text-right">{c.quantidade}</td>
                        <td className="px-4 py-3 text-right font-mono text-destructive">{BRL(c.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {mensal.length === 0 && !loading && <EmptyState icon={FileText} title="Sem dados" hint="Registre lançamentos financeiros para gerar relatórios." />}
    </>
  );
}
