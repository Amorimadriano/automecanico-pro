import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Car, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { fmtDate } from "@/lib/format";

export const Route = createFileRoute("/app/veiculos")({ component: Page, head: () => ({ meta: [{ title: "Veículos" }] }) });

function Page() {
  const [list, setList] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [clienteId, setClienteId] = useState("");

  useEffect(() => { load(); }, []);
  async function load() {
    const [{ data: v }, { data: c }] = await Promise.all([
      supabase.from("veiculos").select("*, clientes(nome)").order("created_at", { ascending: false }),
      supabase.from("clientes").select("id,nome").order("nome"),
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
    if (editing) ({ error: err } = await supabase.from("veiculos").update(payload).eq("id", editing.id));
    else ({ error: err } = await supabase.from("veiculos").insert(payload));
    if (err) return toast.error(err.message);
    toast.success("Veículo salvo");
    setOpen(false); setEditing(null); setClienteId(""); load();
  }
  async function remove(id: string) {
    if (!confirm("Excluir veículo?")) return;
    const { error } = await supabase.from("veiculos").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }

  const hoje = new Date();
  const precisaRevisao = (v: any) => v.data_proxima_revisao && new Date(v.data_proxima_revisao) <= hoje;

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
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(v); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(v.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
              <div className="font-display text-lg">{[v.marca, v.modelo].filter(Boolean).join(" ")}</div>
              <div className="text-sm text-muted-foreground">{v.ano} • {v.cor ?? "—"} • {v.km_atual?.toLocaleString("pt-BR")} km</div>
              <div className="text-xs mt-2 text-muted-foreground">Cliente: <span className="text-foreground">{v.clientes?.nome}</span></div>
              {v.data_proxima_revisao && (
                <div className={`text-xs mt-2 flex items-center gap-1 ${precisaRevisao(v) ? "text-destructive" : "text-muted-foreground"}`}>
                  {precisaRevisao(v) && <AlertTriangle className="h-3 w-3" />} Revisão: {fmtDate(v.data_proxima_revisao)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
