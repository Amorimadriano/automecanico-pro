import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Store, RefreshCw, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { buscarCatalogoMock } from "@/lib/fornecedor";

export const Route = createFileRoute("/app/fornecedores")({ component: Page, head: () => ({ meta: [{ title: "Fornecedores" }] }) });

function Page() {
  const [list, setList] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  useEffect(() => { load(); }, []);
  async function load() {
    const { data } = await supabase.from("fornecedores_mecanico").select("*").order("nome");
    setList(data ?? []);
  }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload: any = {
      nome: fd.get("nome"),
      cnpj: fd.get("cnpj") || null,
      telefone: fd.get("telefone") || null,
      email: fd.get("email") || null,
      website: fd.get("website") || null,
      api_endpoint: fd.get("api_endpoint") || null,
      api_key: fd.get("api_key") || null,
      ativo: fd.get("ativo") === "on",
    };
    const { data: { user } } = await supabase.auth.getUser();
    payload.user_id = user!.id;
    let err;
    if (editing) ({ error: err } = await supabase.from("fornecedores_mecanico").update(payload).eq("id", editing.id));
    else ({ error: err } = await supabase.from("fornecedores_mecanico").insert(payload));
    if (err) return toast.error(err.message);
    toast.success("Fornecedor salvo"); setOpen(false); setEditing(null); load();
  }

  async function remove(id: string) {
    if (!confirm("Excluir fornecedor? Isso também remove o catálogo cache.")) return;
    await supabase.from("fornecedores_mecanico").delete().eq("id", id);
    load();
  }

  async function sincronizarCatalogo(fornecedor: any) {
    setSyncingId(fornecedor.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const mock = await buscarCatalogoMock("");
      const rows = mock.map((m) => ({
        user_id: user.id,
        fornecedor_id: fornecedor.id,
        codigo: m.codigo,
        nome: m.nome,
        descricao: m.descricao || null,
        preco: m.preco,
        marca: m.marca,
        categoria: m.categoria || null,
        ultima_atualizacao: new Date().toISOString(),
      }));
      // Limpa cache antigo
      await supabase.from("fornecedor_catalogo_mecanico").delete().eq("fornecedor_id", fornecedor.id);
      const { error } = await supabase.from("fornecedor_catalogo_mecanico").insert(rows);
      if (error) toast.error(error.message);
      else toast.success(`Catálogo sincronizado: ${rows.length} itens`);
    } finally {
      setSyncingId(null);
    }
  }

  return (
    <>
      <PageHeader title="Fornecedores" subtitle={`${list.length} cadastrados`}
        action={
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
            <DialogTrigger asChild><Button className="bg-gradient-primary text-primary-foreground shadow-glow"><Plus className="h-4 w-4 mr-2" />Novo fornecedor</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-display">{editing ? "Editar" : "Novo"} fornecedor</DialogTitle></DialogHeader>
              <form onSubmit={save} className="space-y-3">
                <div><Label>Nome*</Label><Input name="nome" required defaultValue={editing?.nome} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>CNPJ</Label><Input name="cnpj" defaultValue={editing?.cnpj} /></div>
                  <div><Label>Telefone</Label><Input name="telefone" defaultValue={editing?.telefone} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Email</Label><Input name="email" type="email" defaultValue={editing?.email} /></div>
                  <div><Label>Website</Label><Input name="website" defaultValue={editing?.website} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>API Endpoint</Label><Input name="api_endpoint" placeholder="https://..." defaultValue={editing?.api_endpoint} /></div>
                  <div><Label>API Key</Label><Input name="api_key" defaultValue={editing?.api_key} /></div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Switch id="ativo" name="ativo" defaultChecked={editing ? editing.ativo : true} />
                  <Label htmlFor="ativo" className="cursor-pointer">Ativo</Label>
                </div>
                <DialogFooter><Button type="submit" className="bg-gradient-primary text-primary-foreground">Salvar</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        } />

      {list.length === 0 ? <EmptyState icon={Store} title="Nenhum fornecedor" hint="Cadastre fornecedores de peças." /> : (
        <div className="bg-card border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted text-xs uppercase text-muted-foreground">
              <tr><th className="text-left px-4 py-3">Fornecedor</th><th className="text-left px-4 py-3">Contato</th><th className="text-left px-4 py-3">API</th><th className="text-center px-4 py-3">Ativo</th><th className="text-right px-4 py-3"></th></tr>
            </thead>
            <tbody>
              {list.map(f => (
                <tr key={f.id} className="border-t border-border hover:bg-muted/50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{f.nome}</div>
                    <div className="text-xs text-muted-foreground font-mono">{f.cnpj ?? "—"}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    <div>{f.telefone ?? "—"}</div>
                    <div>{f.email ?? "—"}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {f.api_endpoint ? (
                      <a href={f.api_endpoint} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                        <ExternalLink className="h-3 w-3" /> API
                      </a>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded border text-xs ${f.ativo ? "bg-success/20 text-success border-success/40" : "bg-muted text-muted-foreground border-border"}`}>
                      {f.ativo ? "Sim" : "Não"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Button size="sm" variant="outline" className="mr-1" disabled={syncingId === f.id} onClick={() => sincronizarCatalogo(f)}>
                      <RefreshCw className={`h-4 w-4 mr-1 ${syncingId === f.id ? "animate-spin" : ""}`} />Sincronizar
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(f); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(f.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <Link to="/app/fornecedores/catalogo">
          <Button variant="outline"><Store className="h-4 w-4 mr-2" />Buscar no catálogo</Button>
        </Link>
      </div>
    </>
  );
}
