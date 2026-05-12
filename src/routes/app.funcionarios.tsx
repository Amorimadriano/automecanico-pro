import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, UserCog, Pencil, Trash2, TrendingUp, ClipboardList, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { BRL, fmtDate } from "@/lib/format";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/app/funcionarios")({ component: Page, head: () => ({ meta: [{ title: "Funcionários" }] }) });

function Page() {
  const [list, setList] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [tab, setTab] = useState("funcionarios");

  // Dashboard state
  const [funcSel, setFuncSel] = useState<string>("");
  const [osRecentes, setOsRecentes] = useState<any[]>([]);
  const [metricas, setMetricas] = useState<any>(null);
  const [grafico, setGrafico] = useState<any[]>([]);

  useEffect(() => { loadFuncionarios(); }, []);

  async function loadFuncionarios() {
    const { data } = await supabase.from("funcionarios_mecanico").select("*").order("nome");
    setList(data ?? []);
  }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload: any = Object.fromEntries(fd);
    payload.comissao_percent = Number(payload.comissao_percent || 0);
    payload.ativo = true;
    const { data: { user } } = await supabase.auth.getUser();
    payload.user_id = user!.id;
    let err;
    if (editing) ({ error: err } = await supabase.from("funcionarios_mecanico").update(payload).eq("id", editing.id));
    else ({ error: err } = await supabase.from("funcionarios_mecanico").insert(payload));
    if (err) return toast.error(err.message);
    toast.success("Funcionário salvo"); setOpen(false); setEditing(null); loadFuncionarios();
  }
  async function remove(id: string) {
    if (!confirm("Excluir?")) return;
    await supabase.from("funcionarios_mecanico").delete().eq("id", id);
    loadFuncionarios();
  }

  async function loadDashboard(funcId: string) {
    if (!funcId) { setMetricas(null); setGrafico([]); setOsRecentes([]); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: mData } = await supabase.rpc("dashboard_funcionario_mecanico", {
      p_user_id: user.id,
      p_funcionario_id: funcId,
    });

    const metrics: any = {};
    (mData ?? []).forEach((row: any) => { metrics[row.metric] = row.valor; });
    setMetricas(metrics);

    const { data: gData } = await supabase.rpc("dashboard_funcionario_os_por_mes", {
      p_user_id: user.id,
      p_funcionario_id: funcId,
      p_meses: 6,
    });
    setGrafico((gData ?? []).map((r: any) => ({ mes: `${r.mes} ${r.ano}`, total: r.total_os, concluidas: r.concluidas })));

    const { data: osData } = await supabase
      .from("ordens_servico_mecanico")
      .select("numero, status, total, data_entrada, data_conclusao, clientes_mecanico(nome)")
      .eq("user_id", user.id)
      .eq("funcionario_id", funcId)
      .order("created_at", { ascending: false })
      .limit(10);
    setOsRecentes(osData ?? []);
  }

  useEffect(() => { if (tab === "dashboard" && funcSel) loadDashboard(funcSel); }, [tab, funcSel]);

  return (
    <>
      <PageHeader title="Funcionários" subtitle={`${list.length} cadastrados`}
        action={
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
            <DialogTrigger asChild><Button className="bg-gradient-primary text-primary-foreground shadow-glow"><Plus className="h-4 w-4 mr-2" />Novo funcionário</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-display">{editing ? "Editar" : "Novo"} funcionário</DialogTitle></DialogHeader>
              <form onSubmit={save} className="space-y-3">
                <div><Label>Nome*</Label><Input name="nome" required defaultValue={editing?.nome} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Cargo</Label><Input name="cargo" defaultValue={editing?.cargo} placeholder="Mecânico, Atendente..." /></div>
                  <div><Label>Comissão %</Label><Input name="comissao_percent" type="number" step="0.01" defaultValue={editing?.comissao_percent ?? 0} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Telefone</Label><Input name="telefone" defaultValue={editing?.telefone} /></div>
                  <div><Label>Email</Label><Input name="email" type="email" defaultValue={editing?.email} /></div>
                </div>
                <DialogFooter><Button type="submit" className="bg-gradient-primary text-primary-foreground">Salvar</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        } />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="funcionarios">Funcionários</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
        </TabsList>

        <TabsContent value="funcionarios">
          {list.length === 0 ? <EmptyState icon={UserCog} title="Sem funcionários" hint="Cadastre os mecânicos da oficina." /> : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {list.map(f => (
                <div key={f.id} className="bg-card border rounded-xl p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-display text-lg">{f.nome}</div>
                      <div className="text-sm text-muted-foreground">{f.cargo ?? "—"}</div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(f); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(f.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-3 space-y-1">
                    {f.telefone && <div>📞 {f.telefone}</div>}
                    {f.email && <div>✉️ {f.email}</div>}
                    <div className="text-primary">Comissão: {f.comissao_percent}%</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="dashboard">
          <div className="mb-4 max-w-sm">
            <Select value={funcSel} onValueChange={setFuncSel}>
              <SelectTrigger><SelectValue placeholder="Selecione um funcionário" /></SelectTrigger>
              <SelectContent>
                {list.filter(f => f.ativo).map(f => (
                  <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!funcSel ? (
            <EmptyState icon={UserCog} title="Selecione um funcionário" hint="Escolha um funcionário no filtro acima para visualizar o dashboard." />
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-card border rounded-xl p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground uppercase">OS no mês</span>
                    <ClipboardList className="h-5 w-5 text-warning" />
                  </div>
                  <div className="text-2xl font-display mt-2">{metricas?.os_mes ?? 0}</div>
                </div>
                <div className="bg-card border rounded-xl p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground uppercase">OS Concluídas</span>
                    <TrendingUp className="h-5 w-5 text-success" />
                  </div>
                  <div className="text-2xl font-display mt-2">{metricas?.os_concluidas ?? 0}</div>
                </div>
                <div className="bg-card border rounded-xl p-5 col-span-2 lg:col-span-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground uppercase">Comissão Acumulada</span>
                    <DollarSign className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-2xl font-display mt-2 text-primary">{BRL(metricas?.comissao_acumulada)}</div>
                </div>
              </div>

              <div className="bg-card border rounded-xl p-5">
                <h3 className="font-display text-lg mb-4">OS por mês (últimos 6 meses)</h3>
                {grafico.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem dados para o período.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={grafico}>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.01 60)" />
                      <XAxis dataKey="mes" stroke="oklch(0.7 0.015 70)" fontSize={12} />
                      <YAxis stroke="oklch(0.7 0.015 70)" fontSize={12} />
                      <Tooltip
                        contentStyle={{ background: "oklch(0.21 0.012 60)", border: "1px solid oklch(0.3 0.01 60)", borderRadius: 8 }}
                      />
                      <Bar dataKey="total" fill="oklch(0.72 0.19 49)" radius={[6, 6, 0, 0]} name="Total OS" />
                      <Bar dataKey="concluidas" fill="oklch(0.65 0.2 145)" radius={[6, 6, 0, 0]} name="Concluídas" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="bg-card border rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-border font-display text-sm">OS Recentes</div>
                {osRecentes.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-4">Nenhuma OS atribuída.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-muted text-xs uppercase text-muted-foreground">
                      <tr><th className="text-left px-4 py-3">OS</th><th className="text-left px-4 py-3">Cliente</th><th className="text-left px-4 py-3">Status</th><th className="text-right px-4 py-3">Total</th></tr>
                    </thead>
                    <tbody>
                      {osRecentes.map((o: any) => (
                        <tr key={o.id} className="border-t border-border">
                          <td className="px-4 py-3 font-mono text-primary">#{o.numero}</td>
                          <td className="px-4 py-3">{o.clientes_mecanico?.nome ?? "—"}</td>
                          <td className="px-4 py-3">{o.status}</td>
                          <td className="px-4 py-3 text-right font-display">{BRL(o.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}
