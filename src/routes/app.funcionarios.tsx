import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, UserCog, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/funcionarios")({ component: Page, head: () => ({ meta: [{ title: "Funcionários" }] }) });

function Page() {
  const [list, setList] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  useEffect(() => { load(); }, []);
  async function load() {
    const { data } = await supabase.from("funcionarios").select("*").order("nome");
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
    if (editing) ({ error: err } = await supabase.from("funcionarios").update(payload).eq("id", editing.id));
    else ({ error: err } = await supabase.from("funcionarios").insert(payload));
    if (err) return toast.error(err.message);
    toast.success("Funcionário salvo"); setOpen(false); setEditing(null); load();
  }
  async function remove(id: string) {
    if (!confirm("Excluir?")) return;
    await supabase.from("funcionarios").delete().eq("id", id);
    load();
  }

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
    </>
  );
}
