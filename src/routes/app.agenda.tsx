import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Calendar as CalIcon, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import { fmtDateTime } from "@/lib/format";

export const Route = createFileRoute("/app/agenda")({ component: Page, head: () => ({ meta: [{ title: "Agenda" }] }) });

function Page() {
  const [list, setList] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [veiculos, setVeiculos] = useState<any[]>([]);
  const [funcs, setFuncs] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [clienteId, setClienteId] = useState("");
  const [veiculoId, setVeiculoId] = useState("");
  const [funcId, setFuncId] = useState("");

  useEffect(() => { load(); }, []);
  async function load() {
    const [a, c, v, f] = await Promise.all([
      supabase.from("agendamentos").select("*, clientes(nome), veiculos(placa), funcionarios(nome)").order("data_hora"),
      supabase.from("clientes").select("id,nome").order("nome"),
      supabase.from("veiculos").select("id,placa,marca,modelo,cliente_id").order("placa"),
      supabase.from("funcionarios").select("id,nome").eq("ativo", true),
    ]);
    setList(a.data ?? []); setClientes(c.data ?? []); setVeiculos(v.data ?? []); setFuncs(f.data ?? []);
  }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload: any = Object.fromEntries(fd);
    payload.cliente_id = clienteId || null;
    payload.veiculo_id = veiculoId || null;
    payload.funcionario_id = funcId || null;
    payload.duracao_min = Number(payload.duracao_min || 60);
    const { data: { user } } = await supabase.auth.getUser();
    payload.user_id = user!.id;
    const { error } = await supabase.from("agendamentos").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Agendado"); setOpen(false); setClienteId(""); setVeiculoId(""); setFuncId(""); load();
  }
  async function concluir(id: string) {
    await supabase.from("agendamentos").update({ status: "concluido" }).eq("id", id);
    load();
  }
  async function remove(id: string) {
    if (!confirm("Excluir agendamento?")) return;
    await supabase.from("agendamentos").delete().eq("id", id);
    load();
  }

  const veiculosCliente = clienteId ? veiculos.filter(v => v.cliente_id === clienteId) : veiculos;
  const futuros = list.filter(a => a.status === "agendado");
  const passados = list.filter(a => a.status !== "agendado");

  return (
    <>
      <PageHeader title="Agenda" subtitle={`${futuros.length} agendamentos ativos`}
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="bg-gradient-primary text-primary-foreground shadow-glow"><Plus className="h-4 w-4 mr-2" />Agendar</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-display">Novo agendamento</DialogTitle></DialogHeader>
              <form onSubmit={save} className="space-y-3">
                <div><Label>Título*</Label><Input name="titulo" required placeholder="Troca de óleo, Revisão..." /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Data e hora*</Label><Input name="data_hora" type="datetime-local" required /></div>
                  <div><Label>Duração (min)</Label><Input name="duracao_min" type="number" defaultValue={60} /></div>
                </div>
                <div>
                  <Label>Cliente</Label>
                  <Select value={clienteId} onValueChange={(v) => { setClienteId(v); setVeiculoId(""); }}>
                    <SelectTrigger><SelectValue placeholder="(opcional)" /></SelectTrigger>
                    <SelectContent>{clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Veículo</Label>
                  <Select value={veiculoId} onValueChange={setVeiculoId}>
                    <SelectTrigger><SelectValue placeholder="(opcional)" /></SelectTrigger>
                    <SelectContent>{veiculosCliente.map(v => <SelectItem key={v.id} value={v.id}>{v.placa} — {v.marca} {v.modelo}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Mecânico</Label>
                  <Select value={funcId} onValueChange={setFuncId}>
                    <SelectTrigger><SelectValue placeholder="(opcional)" /></SelectTrigger>
                    <SelectContent>{funcs.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Descrição</Label><Textarea name="descricao" /></div>
                <DialogFooter><Button type="submit" className="bg-gradient-primary text-primary-foreground">Agendar</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        } />

      {list.length === 0 ? <EmptyState icon={CalIcon} title="Agenda vazia" hint="Crie o primeiro agendamento." /> : (
        <div className="space-y-6">
          <section>
            <h2 className="font-display text-xl mb-3">Próximos</h2>
            <div className="space-y-2">
              {futuros.map(a => (
                <div key={a.id} className="bg-card border rounded-lg p-4 flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="font-medium">{a.titulo}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      🕐 {fmtDateTime(a.data_hora)} • {a.duracao_min}min
                      {a.clientes?.nome && ` • 👤 ${a.clientes.nome}`}
                      {a.veiculos?.placa && ` • 🚗 ${a.veiculos.placa}`}
                      {a.funcionarios?.nome && ` • 🔧 ${a.funcionarios.nome}`}
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => concluir(a.id)} title="Concluir"><Check className="h-4 w-4 text-success" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(a.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              ))}
              {futuros.length === 0 && <p className="text-sm text-muted-foreground">Nenhum agendamento futuro.</p>}
            </div>
          </section>
          {passados.length > 0 && (
            <section>
              <h2 className="font-display text-xl mb-3 text-muted-foreground">Histórico</h2>
              <div className="space-y-2">
                {passados.slice(0, 10).map(a => (
                  <div key={a.id} className="bg-card/50 border rounded-lg p-3 text-sm flex items-center justify-between">
                    <div>
                      <span className="font-medium">{a.titulo}</span>
                      <span className="text-xs text-muted-foreground ml-2">{fmtDateTime(a.data_hora)}</span>
                    </div>
                    <span className="text-xs text-success">{a.status}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </>
  );
}
