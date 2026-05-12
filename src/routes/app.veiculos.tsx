import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Plus, Car, Pencil, Trash2, AlertTriangle, History, Wrench, Package, Calendar, Gauge, ScanLine } from "lucide-react";
import { toast } from "sonner";
import { fmtDate, BRL } from "@/lib/format";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

export const Route = createFileRoute("/app/veiculos")({ component: Page, head: () => ({ meta: [{ title: "Veículos" }] }) });

interface HistoricoItem {
  veiculo_id: string;
  placa: string;
  os_id: string;
  numero: number;
  data_entrada: string;
  km_entrada: number | null;
  status: string;
  itens: any[];
  total: number;
}

function Page() {
  const [list, setList] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [clienteId, setClienteId] = useState("");

  const [histOpen, setHistOpen] = useState(false);
  const [histVeiculo, setHistVeiculo] = useState<any>(null);
  const [histData, setHistData] = useState<HistoricoItem[]>([]);
  const [histLoading, setHistLoading] = useState(false);

  useEffect(() => { load(); }, []);
  async function load() {
    const [{ data: v }, { data: c }] = await Promise.all([
      supabase.from("veiculos_mecanico").select("*, clientes_mecanico(nome)").order("created_at", { ascending: false }),
      supabase.from("clientes_mecanico").select("id,nome").order("nome"),
    ]);
    setList(v ?? []); setClientes(c ?? []);
  }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload: any = Object.fromEntries(fd);
    payload.cliente_id = clienteId || editing?.cliente_id;
    if (!payload.cliente_id) return toast.error("Selecione um cliente");
    payload.ano = payload.ano ? Number(payload.ano) : null;
    payload.km_atual = payload.km_atual ? Number(payload.km_atual) : 0;
    payload.km_proxima_revisao = payload.km_proxima_revisao ? Number(payload.km_proxima_revisao) : null;
    if (!payload.data_proxima_revisao) delete payload.data_proxima_revisao;
    const { data: { user } } = await supabase.auth.getUser();
    payload.user_id = user!.id;
    let err;
    if (editing) ({ error: err } = await supabase.from("veiculos_mecanico").update(payload).eq("id", editing.id));
    else ({ error: err } = await supabase.from("veiculos_mecanico").insert(payload));
    if (err) return toast.error(err.message);
    toast.success("Veículo salvo");
    setOpen(false); setEditing(null); setClienteId(""); load();
  }
  async function remove(id: string) {
    if (!confirm("Excluir veículo?")) return;
    const { error } = await supabase.from("veiculos_mecanico").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }

  async function openHistorico(v: any) {
    setHistVeiculo(v);
    setHistOpen(true);
    setHistLoading(true);
    const { data, error } = await supabase.rpc("historico_veiculo", { p_veiculo_id: v.id });
    setHistLoading(false);
    if (error) {
      toast.error(error.message);
      setHistData([]);
    } else {
      setHistData((data ?? []).map((d: any) => ({ ...d, itens: Array.isArray(d.itens) ? d.itens : [] })));
    }
  }

  const hoje = new Date();
  const precisaRevisao = (v: any) => v.data_proxima_revisao && new Date(v.data_proxima_revisao) <= hoje;

  const kmChartData = histData
    .filter((h) => h.km_entrada != null)
    .sort((a, b) => new Date(a.data_entrada).getTime() - new Date(b.data_entrada).getTime())
    .map((h) => ({
      data: fmtDate(h.data_entrada),
      km: h.km_entrada,
    }));

  return (
    <>
      <PageHeader title="Veículos" subtitle={`${list.length} cadastrados`}
        action={
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditing(null); setClienteId(""); } }}>
            <DialogTrigger asChild><Button className="bg-gradient-primary text-primary-foreground shadow-glow"><Plus className="h-4 w-4 mr-2" />Novo veículo</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-display">{editing ? "Editar" : "Novo"} veículo</DialogTitle></DialogHeader>
              <form onSubmit={save} className="space-y-3">
                <div>
                  <Label>Cliente*</Label>
                  <Select value={clienteId || editing?.cliente_id || ""} onValueChange={setClienteId}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Placa*</Label><Input name="placa" required defaultValue={editing?.placa} /></div>
                  <div><Label>Ano</Label><Input name="ano" type="number" defaultValue={editing?.ano} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Marca</Label><Input name="marca" defaultValue={editing?.marca} /></div>
                  <div><Label>Modelo</Label><Input name="modelo" defaultValue={editing?.modelo} /></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Cor</Label><Input name="cor" defaultValue={editing?.cor} /></div>
                  <div><Label>KM atual</Label><Input name="km_atual" type="number" defaultValue={editing?.km_atual} /></div>
                  <div><Label>KM próx. rev.</Label><Input name="km_proxima_revisao" type="number" defaultValue={editing?.km_proxima_revisao} /></div>
                </div>
                <div><Label>Data próxima revisão</Label><Input name="data_proxima_revisao" type="date" defaultValue={editing?.data_proxima_revisao} /></div>
                <DialogFooter><Button type="submit" className="bg-gradient-primary text-primary-foreground">Salvar</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        } />

      {list.length === 0 ? <EmptyState icon={Car} title="Nenhum veículo" hint="Cadastre o veículo de um cliente." /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map(v => (
            <div key={v.id} className="bg-card border rounded-xl p-4 hover:border-primary/50 transition">
              <div className="flex items-center justify-between mb-2">
                <div className="font-mono text-primary text-lg">{v.placa}</div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openHistorico(v)} title="Histórico"><History className="h-4 w-4" /></Button>
                  <Link to="/app/veiculos/$id/diagnostico" params={{ id: v.id }} title="Diagnóstico OBD2">
                    <Button size="icon" variant="ghost"><ScanLine className="h-4 w-4 text-primary" /></Button>
                  </Link>
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(v); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(v.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
              <div className="font-display text-lg">{[v.marca, v.modelo].filter(Boolean).join(" ")}</div>
              <div className="text-sm text-muted-foreground">{v.ano} • {v.cor ?? "—"} • {v.km_atual?.toLocaleString("pt-BR")} km</div>
              <div className="text-xs mt-2 text-muted-foreground">Cliente: <span className="text-foreground">{v.clientes_mecanico?.nome}</span></div>
              {v.data_proxima_revisao && (
                <div className={`text-xs mt-2 flex items-center gap-1 ${precisaRevisao(v) ? "text-destructive" : "text-muted-foreground"}`}>
                  {precisaRevisao(v) && <AlertTriangle className="h-3 w-3" />} Revisão: {fmtDate(v.data_proxima_revisao)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Sheet de Histórico */}
      <Sheet open={histOpen} onOpenChange={setHistOpen}>
        <SheetContent className="sm:max-w-xl w-full overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-display flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Histórico de Manutenção
            </SheetTitle>
          </SheetHeader>

          {histVeiculo && (
            <div className="mt-4 space-y-6">
              {/* Dados do veículo */}
              <div className="bg-muted rounded-lg p-4 space-y-1">
                <div className="font-mono text-primary text-xl">{histVeiculo.placa}</div>
                <div className="font-display">{[histVeiculo.marca, histVeiculo.modelo].filter(Boolean).join(" ")}</div>
                <div className="text-sm text-muted-foreground">{histVeiculo.ano} • {histVeiculo.cor ?? "—"} • {histVeiculo.km_atual?.toLocaleString("pt-BR")} km</div>
                <div className="text-xs text-muted-foreground">Cliente: <span className="text-foreground">{histVeiculo.clientes_mecanico?.nome}</span></div>
                {histVeiculo.km_proxima_revisao && (
                  <div className="text-xs flex items-center gap-1 text-muted-foreground mt-1">
                    <Gauge className="h-3 w-3" /> Próx. revisão em {histVeiculo.km_proxima_revisao.toLocaleString("pt-BR")} km
                  </div>
                )}
                {histVeiculo.data_proxima_revisao && (
                  <div className="text-xs flex items-center gap-1 text-muted-foreground">
                    <Calendar className="h-3 w-3" /> Próx. revisão em {fmtDate(histVeiculo.data_proxima_revisao)}
                  </div>
                )}
              </div>

              {/* Gráfico de KM */}
              {kmChartData.length > 1 && (
                <div>
                  <h4 className="font-display text-sm mb-2 flex items-center gap-2">
                    <Gauge className="h-4 w-4 text-primary" /> Evolução do KM
                  </h4>
                  <div className="bg-card border rounded-lg p-3">
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={kmChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.01 60)" />
                        <XAxis dataKey="data" stroke="oklch(0.7 0.015 70)" fontSize={11} />
                        <YAxis stroke="oklch(0.7 0.015 70)" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                        <Tooltip
                          contentStyle={{ background: "oklch(0.21 0.012 60)", border: "1px solid oklch(0.3 0.01 60)", borderRadius: 8 }}
                          formatter={(v: number) => [`${v.toLocaleString("pt-BR")} km`, "KM"]}
                        />
                        <Line type="monotone" dataKey="km" stroke="oklch(0.72 0.19 49)" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Timeline de OS */}
              <div>
                <h4 className="font-display text-sm mb-3 flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-primary" /> Ordens de Serviço
                </h4>
                {histLoading ? (
                  <p className="text-sm text-muted-foreground">Carregando histórico...</p>
                ) : histData.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma OS encontrada para este veículo.</p>
                ) : (
                  <ScrollArea className="h-auto max-h-[500px]">
                    <div className="space-y-4">
                      {histData.map((os) => (
                        <div key={os.os_id} className="relative pl-4 border-l-2 border-primary/40">
                          <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-primary" />
                          <div className="bg-muted rounded-lg p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="font-mono text-sm text-primary">OS #{os.numero}</div>
                              <div className="font-display">{BRL(os.total)}</div>
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                              <Calendar className="h-3 w-3" /> {fmtDate(os.data_entrada)}
                              {os.km_entrada != null && (
                                <span className="flex items-center gap-1"><Gauge className="h-3 w-3" /> {os.km_entrada.toLocaleString("pt-BR")} km</span>
                              )}
                            </div>
                            <Badge variant="secondary" className="text-[10px]">{os.status}</Badge>
                            {os.itens.length > 0 && (
                              <div className="space-y-1">
                                {os.itens.map((item: any, idx: number) => (
                                  <div key={idx} className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-1">
                                      {item.tipo === "peca" ? <Package className="h-3 w-3 text-muted-foreground" /> : <Wrench className="h-3 w-3 text-muted-foreground" />}
                                      <span className="text-muted-foreground">{item.descricao}</span>
                                    </div>
                                    <span className="text-muted-foreground">{BRL(item.subtotal)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
