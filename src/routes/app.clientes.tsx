import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Users, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/clientes")({ component: Page, head: () => ({ meta: [{ title: "Clientes" }] }) });

function Page() {
  const [list, setList] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [q, setQ] = useState("");

  useEffect(() => { load(); }, []);
  async function load() {
    const { data } = await supabase.from("clientes").select("*").order("nome");
    setList(data ?? []);
  }
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload: any = Object.fromEntries(fd);
    const { data: { user } } = await supabase.auth.getUser();
    payload.user_id = user!.id;
    let err;
    if (editing) ({ error: err } = await supabase.from("clientes").update(payload).eq("id", editing.id));
    else ({ error: err } = await supabase.from("clientes").insert(payload));
    if (err) return toast.error(err.message);
    toast.success("Cliente salvo");
    setOpen(false); setEditing(null); load();
  }
  async function remove(id: string) {
    if (!confirm("Excluir cliente? Veículos vinculados também serão removidos.")) return;
    const { error } = await supabase.from("clientes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Excluído"); load();
  }

  const filtered = list.filter(c => c.nome.toLowerCase().includes(q.toLowerCase()) || (c.telefone ?? "").includes(q));

  return (
    <>
      <PageHeader title="Clientes" subtitle={`${list.length} cadastrados`}
        action={
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary text-primary-foreground shadow-glow"><Plus className="h-4 w-4 mr-2" />Novo cliente</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-display">{editing ? "Editar" : "Novo"} cliente</DialogTitle></DialogHeader>
              <form onSubmit={save} className="space-y-3">
                <div><Label>Nome*</Label><Input name="nome" required defaultValue={editing?.nome} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Telefone</Label><Input name="telefone" defaultValue={editing?.telefone} /></div>
                  <div><Label>CPF/CNPJ</Label><Input name="documento" defaultValue={editing?.documento} /></div>
                </div>
                <div><Label>Email</Label><Input name="email" type="email" defaultValue={editing?.email} /></div>
                <div><Label>Endereço</Label><Input name="endereco" defaultValue={editing?.endereco} /></div>
                <div><Label>Observações</Label><Textarea name="observacoes" defaultValue={editing?.observacoes} /></div>
                <DialogFooter><Button type="submit" className="bg-gradient-primary text-primary-foreground">Salvar</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        } />

      <div className="relative mb-4 max-w-md">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar por nome ou telefone" value={q} onChange={e => setQ(e.target.value)} className="pl-9" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Users} title="Nenhum cliente" hint="Cadastre seu primeiro cliente." />
      ) : (
        <div className="bg-card border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground text-xs uppercase">
              <tr><th className="text-left px-4 py-3">Nome</th><th className="text-left px-4 py-3">Telefone</th><th className="text-left px-4 py-3 hidden md:table-cell">Email</th><th className="text-left px-4 py-3 hidden md:table-cell">Documento</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-t border-border hover:bg-muted/50">
                  <td className="px-4 py-3 font-medium">{c.nome}</td>
                  <td className="px-4 py-3">{c.telefone ?? "—"}</td>
                  <td className="px-4 py-3 hidden md:table-cell">{c.email ?? "—"}</td>
                  <td className="px-4 py-3 hidden md:table-cell">{c.documento ?? "—"}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(c); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
