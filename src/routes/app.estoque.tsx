import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Package, Pencil, Trash2, AlertTriangle, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { BRL } from "@/lib/format";

export const Route = createFileRoute("/app/estoque")({ component: Page, head: () => ({ meta: [{ title: "Estoque" }] }) });

function Page() {
  const [list, setList] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [tab, setTab] = useState("estoque");

  // Relatório state
  const [abc, setAbc] = useState<any[]>([]);
  const [loadingAbc, setLoadingAbc] = useState(false);

  useEffect(() => { load(); }, []);
  async function load() {
    const { data } = await supabase.from("pecas_mecanico").select("*").order("nome");
    setList(data ?? []);
  }

  async function loadAbc() {
    setLoadingAbc(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase.rpc("relatorio_estoque_abc", { p_user_id: user.id });
      if (error) toast.error(error.message);
      setAbc(data ?? []);
    } finally {
      setLoadingAbc(false);
    }
  }

  useEffect(() => { if (tab === "relatorio") loadAbc(); }, [tab]);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload: any = Object.fromEntries(fd);
    payload.preco_custo = Number(payload.preco_custo || 0);
    payload.preco_venda = Number(payload.preco_venda || 0);
    payload.quantidade = Number(payload.quantidade || 0);
    payload.estoque_minimo = Number(payload.estoque_minimo || 1);
    const { data: { user } } = await supabase.auth.getUser();
    payload.user_id = user!.id;
    let err;
    if (editing) ({ error: err } = await supabase.from("pecas_mecanico").update(payload).eq("id", editing.id));
    else ({ error: err } = await supabase.from("pecas_mecanico").insert(payload));
    if (err) return toast.error(err.message);
    toast.success("Peça salva"); setOpen(false); setEditing(null); load();
  }
  async function remove(id: string) {
    if (!confirm("Excluir peça?")) return;
    await supabase.from("pecas_mecanico").delete().eq("id", id);
    load();
  }

  const baixos = list.filter(p => p.quantidade <= p.estoque_minimo);

  const classeBadge = (classe: string) => {
    if (classe === "A") return "bg-success/20 text-success border-success/40";
    if (classe === "B") return "bg-warning/20 text-warning border-warning/40";
    return "bg-muted text-muted-foreground border-border";
  };

  return (
    <>
      <PageHeader title="Estoque" subtitle={`${list.length} peças • ${baixos.length} em estoque baixo`}
        action={
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
            <DialogTrigger asChild><Button className="bg-gradient-primary text-primary-foreground shadow-glow"><Plus className="h-4 w-4 mr-2" />Nova peça</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-display">{editing ? "Editar" : "Nova"} peça</DialogTitle></DialogHeader>
              <form onSubmit={save} className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2"><Label>Nome*</Label><Input name="nome" required defaultValue={editing?.nome} /></div>
                  <div><Label>Código</Label><Input name="codigo" defaultValue={editing?.codigo} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Preço custo</Label><Input name="preco_custo" type="number" step="0.01" defaultValue={editing?.preco_custo} /></div>
                  <div><Label>Preço venda*</Label><Input name="preco_venda" type="number" step="0.01" required defaultValue={editing?.preco_venda} /></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Quantidade</Label><Input name="quantidade" type="number" defaultValue={editing?.quantidade ?? 0} /></div>
                  <div><Label>Mínimo</Label><Input name="estoque_minimo" type="number" defaultValue={editing?.estoque_minimo ?? 1} /></div>
                  <div><Label>Unidade</Label><Input name="unidade" defaultValue={editing?.unidade ?? "un"} /></div>
                </div>
                <DialogFooter><Button type="submit" className="bg-gradient-primary text-primary-foreground">Salvar</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        } />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="estoque">Estoque</TabsTrigger>
          <TabsTrigger value="relatorio">Relatório (Curva ABC)</TabsTrigger>
        </TabsList>

        <TabsContent value="estoque">
          {list.length === 0 ? <EmptyState icon={Package} title="Estoque vazio" hint="Cadastre as peças que você usa." /> : (
            <div className="bg-card border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted text-xs uppercase text-muted-foreground">
                  <tr><th className="text-left px-4 py-3">Peça</th><th className="text-left px-4 py-3">Código</th><th className="text-right px-4 py-3">Estoque</th><th className="text-right px-4 py-3">Preço venda</th><th></th></tr>
                </thead>
                <tbody>
                  {list.map(p => {
                    const baixo = p.quantidade <= p.estoque_minimo;
                    return (
                      <tr key={p.id} className="border-t border-border hover:bg-muted/50">
                        <td className="px-4 py-3 font-medium">{p.nome}</td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.codigo ?? "—"}</td>
                        <td className={`px-4 py-3 text-right font-mono ${baixo ? "text-destructive font-bold" : ""}`}>
                          {baixo && <AlertTriangle className="h-3 w-3 inline mr-1" />}{p.quantidade} {p.unidade}
                        </td>
                        <td className="px-4 py-3 text-right">{BRL(p.preco_venda)}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <Button size="icon" variant="ghost" onClick={() => { setEditing(p); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="relatorio">
          {baixos.length > 0 && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 mb-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div className="text-sm">
                <span className="font-medium">{baixos.length} peça(s) em estoque crítico.</span>
              </div>
            </div>
          )}

          {loadingAbc ? (
            <p className="text-sm text-muted-foreground">Carregando Curva ABC...</p>
          ) : abc.length === 0 ? (
            <EmptyState icon={BarChart3} title="Sem dados" hint="Cadastre peças e movimente o estoque para gerar a Curva ABC." />
          ) : (
            <div className="bg-card border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-3">Classe</th>
                    <th className="text-left px-4 py-3">Peça</th>
                    <th className="text-left px-4 py-3">Código</th>
                    <th className="text-right px-4 py-3">Qtd</th>
                    <th className="text-right px-4 py-3">Preço Venda</th>
                    <th className="text-right px-4 py-3">Valor Total</th>
                    <th className="text-right px-4 py-3">%</th>
                  </tr>
                </thead>
                <tbody>
                  {abc.map((p: any) => (
                    <tr key={p.peca_id} className="border-t border-border hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded border text-xs font-bold ${classeBadge(p.classe)}`}>{p.classe}</span>
                      </td>
                      <td className="px-4 py-3 font-medium">{p.nome}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.codigo ?? "—"}</td>
                      <td className="px-4 py-3 text-right font-mono">{p.quantidade}</td>
                      <td className="px-4 py-3 text-right font-mono">{BRL(p.preco_venda)}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold">{BRL(p.valor_total)}</td>
                      <td className="px-4 py-3 text-right font-mono text-muted-foreground">{Number(p.percentual).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}
