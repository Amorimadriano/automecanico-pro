import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FileText } from "lucide-react";
import { toast } from "sonner";
import { BRL, fmtDate, STATUS_ORCAMENTO } from "@/lib/format";

export const Route = createFileRoute("/app/orcamentos")({ component: Page, head: () => ({ meta: [{ title: "Orçamentos" }] }) });

function Page() {
  const [list, setList] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [veiculos, setVeiculos] = useState<any[]>([]);
  const [funcs, setFuncs] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [clienteId, setClienteId] = useState("");
  const [veiculoId, setVeiculoId] = useState("");
  const [funcId, setFuncId] = useState("");
  const [filtro, setFiltro] = useState("todos");

  useEffect(() => { load(); }, []);
  async function load() {
    const [o, c, v, f] = await Promise.all([
      supabase.from("orcamentos_mecanico").select("*, clientes_mecanico(nome), veiculos_mecanico(placa,marca,modelo)").order("created_at", { ascending: false }),
      supabase.from("clientes_mecanico").select("id,nome").order("nome"),
      supabase.from("veiculos_mecanico").select("id,placa,marca,modelo,cliente_id"),
      supabase.from("funcionarios_mecanico").select("id,nome").eq("ativo", true),
    ]);
    setList(o.data ?? []); setClientes(c.data ?? []); setVeiculos(v.data ?? []); setFuncs(f.data ?? []);
  }

  async function criar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!clienteId || !veiculoId) return toast.error("Selecione cliente e veículo");
    const fd = new FormData(e.currentTarget);
    const payload: any = Object.fromEntries(fd);
    payload.cliente_id = clienteId;
    payload.veiculo_id = veiculoId;
    payload.funcionario_id = funcId || null;
    payload.km_entrada = payload.km_entrada ? Number(payload.km_entrada) : null;
    if (!payload.data_validade) delete payload.data_validade;
    const { data: { user } } = await supabase.auth.getUser();
    payload.user_id = user!.id;
    const { data, error } = await supabase.from("orcamentos_mecanico").insert(payload).select().single();
    if (error) return toast.error(error.message);
    toast.success(`Orçamento #${data.numero} criado`);
    setOpen(false); setClienteId(""); setVeiculoId(""); setFuncId(""); load();
  }

  const veiculosCliente = clienteId ? veiculos.filter(v => v.cliente_id === clienteId) : [];
  const filtered = filtro === "todos" ? list : list.filter(o => o.status === filtro);

  return (
    <>
      <PageHeader title="Orçamentos" subtitle={`${list.length} orçamentos no total`}
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="bg-gradient-primary text-primary-foreground shadow-glow"><Plus className="h-4 w-4 mr-2" />Novo Orçamento</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-display">Novo Orçamento</DialogTitle></DialogHeader>
              <form onSubmit={criar} className="space-y-3">
                <div>
                  <Label>Cliente*</Label>
                  <Select value={clienteId} onValueChange={(v) => { setClienteId(v); setVeiculoId(""); }}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Veículo*</Label>
                  <Select value={veiculoId} onValueChange={setVeiculoId} disabled={!clienteId}>
                    <SelectTrigger><SelectValue placeholder={clienteId ? "Selecione" : "Escolha cliente primeiro"} /></SelectTrigger>
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
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>KM entrada</Label><Input name="km_entrada" type="number" /></div>
                  <div><Label>Validade</Label><Input name="data_validade" type="date" /></div>
                </div>
                <div><Label>Problema relatado</Label><Textarea name="descricao_problema" placeholder="O que o cliente relatou?" /></div>
                <DialogFooter><Button type="submit" className="bg-gradient-primary text-primary-foreground">Criar Orçamento</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        } />

      <div className="flex gap-2 flex-wrap mb-4">
        {["todos", "pendente", "aprovado", "rejeitado", "convertido"].map(s => (
          <button key={s} onClick={() => setFiltro(s)}
            className={`px-3 py-1.5 rounded-md text-xs uppercase tracking-wider border ${filtro === s ? "bg-gradient-primary text-primary-foreground border-transparent" : "border-border text-muted-foreground hover:text-foreground"}`}>
            {s === "todos" ? "Todos" : STATUS_ORCAMENTO[s]?.label ?? s}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? <EmptyState icon={FileText} title="Nenhum orçamento" hint="Crie o primeiro orçamento." /> : (
        <div className="bg-card border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted text-xs uppercase text-muted-foreground">
              <tr><th className="text-left px-4 py-3">Nº</th><th className="text-left px-4 py-3">Cliente / Veículo</th><th className="text-left px-4 py-3">Status</th><th className="text-left px-4 py-3 hidden md:table-cell">Criado</th><th className="text-right px-4 py-3">Total</th></tr>
            </thead>
            <tbody>
              {filtered.map(o => {
                const st = STATUS_ORCAMENTO[o.status] ?? { label: o.status, cls: "" };
                return (
                  <tr key={o.id} className="border-t border-border hover:bg-muted/30 cursor-pointer" onClick={() => window.location.assign(`/app/orcamentos/${o.id}`)}>
                    <td className="px-4 py-3 font-mono text-primary">#{o.numero}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{o.clientes_mecanico?.nome}</div>
                      <div className="text-xs text-muted-foreground">{o.veiculos_mecanico?.placa} • {o.veiculos_mecanico?.marca} {o.veiculos_mecanico?.modelo}</div>
                    </td>
                    <td className="px-4 py-3"><span className={`inline-block px-2 py-0.5 rounded border text-xs ${st.cls}`}>{st.label}</span></td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{fmtDate(o.data_criacao)}</td>
                    <td className="px-4 py-3 text-right font-display text-base">{BRL(o.total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
