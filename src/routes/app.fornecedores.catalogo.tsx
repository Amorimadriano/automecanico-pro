import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Search, Package, Plus, Store } from "lucide-react";
import { toast } from "sonner";
import { BRL } from "@/lib/format";
import { buscarCatalogoMock, type CatalogoItem } from "@/lib/fornecedor";

export const Route = createFileRoute("/app/fornecedores/catalogo")({ component: Page, head: () => ({ meta: [{ title: "Catálogo de Fornecedores" }] }) });

function Page() {
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [fornecedorId, setFornecedorId] = useState<string>("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importItem, setImportItem] = useState<any>(null);
  const [precoVenda, setPrecoVenda] = useState<string>("");
  const [quantidade, setQuantidade] = useState<string>("1");

  useEffect(() => { loadFornecedores(); }, []);
  async function loadFornecedores() {
    const { data } = await supabase.from("fornecedores_mecanico").select("*").eq("ativo", true).order("nome");
    setFornecedores(data ?? []);
  }

  async function buscar() {
    setLoading(true);
    try {
      if (!fornecedorId) {
        // Busca local no cache
        let q = supabase.from("fornecedor_catalogo_mecanico").select("*, fornecedores_mecanico(nome)").order("nome");
        if (query.trim()) q = q.ilike("nome", `%${query}%`);
        const { data, error } = await q;
        if (error) toast.error(error.message);
        setResults(data ?? []);
      } else {
        // Busca mock
        const mock = await buscarCatalogoMock(query);
        const f = fornecedores.find((x) => x.id === fornecedorId);
        const enriched = mock.map((m) => ({ ...m, fornecedor_id: fornecedorId, fornecedores_mecanico: { nome: f?.nome ?? "Mock" } }));
        setResults(enriched);
      }
    } finally { setLoading(false); }
  }

  function abrirImportar(item: any) {
    setImportItem(item);
    setPrecoVenda(String(item.preco ? Math.round(item.preco * 1.4 * 100) / 100 : ""));
    setQuantidade("1");
    setImportOpen(true);
  }

  async function confirmarImportar() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const preco = Number(precoVenda || 0);
    const qtd = Number(quantidade || 1);
    const payload = {
      user_id: user.id,
      codigo: importItem.codigo,
      nome: importItem.nome,
      descricao: importItem.descricao || null,
      preco_custo: importItem.preco || null,
      preco_venda: preco,
      quantidade: qtd,
      estoque_minimo: 1,
      unidade: "un",
    };
    const { error } = await supabase.from("pecas_mecanico").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Peça importada para o estoque");
    setImportOpen(false);
    setImportItem(null);
  }

  return (
    <>
      <PageHeader title="Catálogo de Fornecedores" subtitle="Busque peças nos fornecedores e importe para o estoque"
        action={
          <Link to="/app/fornecedores">
            <Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" />Voltar</Button>
          </Link>
        } />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="sm:w-64">
          <Select value={fornecedorId} onValueChange={setFornecedorId}>
            <SelectTrigger><SelectValue placeholder="Todos os fornecedores (cache)" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos (cache local)</SelectItem>
              {fornecedores.map(f => (
                <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 flex gap-2">
          <Input placeholder="Buscar peça..." value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && buscar()} />
          <Button onClick={buscar} disabled={loading} className="bg-gradient-primary text-primary-foreground">
            <Search className="h-4 w-4 mr-2" />{loading ? "Buscando..." : "Buscar"}
          </Button>
        </div>
      </div>

      {results.length === 0 && !loading && (
        <EmptyState icon={Store} title="Nenhum resultado" hint="Selecione um fornecedor ou use o cache local." />
      )}

      {results.length > 0 && (
        <div className="bg-card border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Código</th>
                <th className="text-left px-4 py-3">Peça</th>
                <th className="text-left px-4 py-3">Marca</th>
                <th className="text-right px-4 py-3">Preço custo</th>
                <th className="text-left px-4 py-3">Fornecedor</th>
                <th className="text-right px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, idx) => (
                <tr key={r.id ?? idx} className="border-t border-border hover:bg-muted/50">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.codigo}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.nome}</div>
                    <div className="text-xs text-muted-foreground">{r.descricao ?? "—"}</div>
                  </td>
                  <td className="px-4 py-3 text-xs">{r.marca ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-mono">{BRL(r.preco)}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{r.fornecedores_mecanico?.nome ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="outline" onClick={() => abrirImportar(r)}><Plus className="h-4 w-4 mr-1" />Importar</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Importar para estoque</DialogTitle></DialogHeader>
          {importItem && (
            <div className="space-y-3">
              <div className="text-sm"><span className="text-muted-foreground">Peça:</span> <span className="font-medium">{importItem.nome}</span></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Preço de venda (R$)</Label><Input type="number" step="0.01" value={precoVenda} onChange={(e) => setPrecoVenda(e.target.value)} /></div>
                <div><Label>Quantidade inicial</Label><Input type="number" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setImportOpen(false)}>Cancelar</Button>
                <Button onClick={confirmarImportar} className="bg-gradient-primary text-primary-foreground"><Package className="h-4 w-4 mr-2" />Importar</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
