import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, DollarSign, Check, Trash2, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { toast } from "sonner";
import { BRL, fmtDate } from "@/lib/format";

export const Route = createFileRoute("/app/financeiro")({ component: Page, head: () => ({ meta: [{ title: "Financeiro" }] }) });

function Page() {
  const [list, setList] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState("receita");

  useEffect(() => { load(); }, []);
  async function load() {
    const { data } = await supabase.from("financeiro").select("*").order("data_vencimento", { ascending: false });
    setList(data ?? []);
  }
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload: any = Object.fromEntries(fd);
    payload.tipo = tipo;
    payload.valor = Number(payload.valor);
    payload.pago = false;
    const { data: { user } } = await supabase.auth.getUser();
    payload.user_id = user!.id;
    const { error } = await supabase.from("financeiro").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Lançamento criado"); setOpen(false); load();
  }
  async function pagar(item: any) {
    await supabase.from("financeiro").update({ pago: !item.pago, data_pagamento: !item.pago ? new Date().toISOString().slice(0, 10) : null }).eq("id", item.id);
    load();
  }
  async function remove(id: string) {
    if (!confirm("Excluir?")) return;
    await supabase.from("financeiro").delete().eq("id", id);
    load();
  }

  const receitas = list.filter(l => l.tipo === "receita");
  const despesas = list.filter(l => l.tipo === "despesa");
  const totalReceber = receitas.filter(r => !r.pago).reduce((s, r) => s + Number(r.valor), 0);
  const totalPagar = despesas.filter(d => !d.pago).reduce((s, d) => s + Number(d.valor), 0);
  const recebido = receitas.filter(r => r.pago).reduce((s, r) => s + Number(r.valor), 0);

  return (
    <>
      <PageHeader title="Financeiro" subtitle="Contas a pagar e receber"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="bg-gradient-primary text-primary-foreground shadow-glow"><Plus className="h-4 w-4 mr-2" />Novo lançamento</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-display">Novo lançamento</DialogTitle></DialogHeader>
              <form onSubmit={save} className="space-y-3">
                <div>
                  <Label>Tipo</Label>
                  <Select value={tipo} onValueChange={setTipo}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="receita">Receita (a receber)</SelectItem>
                      <SelectItem value="despesa">Despesa (a pagar)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Descrição*</Label><Input name="descricao" required /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Valor*</Label><Input name="valor" type="number" step="0.01" required /></div>
                  <div><Label>Vencimento*</Label><Input name="data_vencimento" type="date" required /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Categoria</Label><Input name="categoria" placeholder="Ex.: Aluguel, Energia" /></div>
                  <div><Label>Forma pagto</Label><Input name="forma_pagamento" placeholder="Pix, Dinheiro..." /></div>
                </div>
                <DialogFooter><Button type="submit" className="bg-gradient-primary text-primary-foreground">Salvar</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        } />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-card border rounded-xl p-5"><div className="text-xs text-muted-foreground uppercase">A receber</div><div className="text-2xl font-display text-success mt-1">{BRL(totalReceber)}</div></div>
        <div className="bg-card border rounded-xl p-5"><div className="text-xs text-muted-foreground uppercase">A pagar</div><div className="text-2xl font-display text-destructive mt-1">{BRL(totalPagar)}</div></div>
        <div className="bg-card border rounded-xl p-5 col-span-2 lg:col-span-1"><div className="text-xs text-muted-foreground uppercase">Recebido total</div><div className="text-2xl font-display text-primary mt-1">{BRL(recebido)}</div></div>
      </div>

      <Tabs defaultValue="receitas">
        <TabsList><TabsTrigger value="receitas">Receitas</TabsTrigger><TabsTrigger value="despesas">Despesas</TabsTrigger></TabsList>
        <TabsContent value="receitas"><Lista items={receitas} pagar={pagar} remove={remove} pos /></TabsContent>
        <TabsContent value="despesas"><Lista items={despesas} pagar={pagar} remove={remove} /></TabsContent>
      </Tabs>
      {list.length === 0 && <EmptyState icon={DollarSign} title="Sem lançamentos" hint="Comece registrando suas movimentações." />}
    </>
  );
}

function Lista({ items, pagar, remove, pos }: any) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground p-4">Nada por aqui.</p>;
  return (
    <div className="bg-card border rounded-xl overflow-hidden mt-4">
      <table className="w-full text-sm">
        <thead className="bg-muted text-xs uppercase text-muted-foreground">
          <tr><th className="text-left px-4 py-3">Descrição</th><th className="text-left px-4 py-3 hidden md:table-cell">Categoria</th><th className="text-left px-4 py-3">Vencimento</th><th className="text-right px-4 py-3">Valor</th><th></th></tr>
        </thead>
        <tbody>
          {items.map((l: any) => (
            <tr key={l.id} className="border-t border-border">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  {pos ? <ArrowUpRight className="h-4 w-4 text-success" /> : <ArrowDownRight className="h-4 w-4 text-destructive" />}
                  <span className={l.pago ? "line-through text-muted-foreground" : ""}>{l.descricao}</span>
                </div>
              </td>
              <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{l.categoria ?? "—"}</td>
              <td className="px-4 py-3">{fmtDate(l.data_vencimento)}</td>
              <td className={`px-4 py-3 text-right font-mono ${pos ? "text-success" : "text-destructive"}`}>{BRL(l.valor)}</td>
              <td className="px-4 py-3 text-right whitespace-nowrap">
                <Button size="sm" variant={l.pago ? "secondary" : "default"} onClick={() => pagar(l)} className={!l.pago ? "bg-gradient-primary text-primary-foreground" : ""}>
                  <Check className="h-3 w-3 mr-1" />{l.pago ? "Pago" : "Marcar pago"}
                </Button>
                <Button size="icon" variant="ghost" onClick={() => remove(l.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
