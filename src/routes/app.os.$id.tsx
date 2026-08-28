import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, FileDown, Plus, Trash2, Wrench, Package, CheckCircle2, DollarSign, ShieldCheck, ScanLine, Search, Store } from "lucide-react";
import { toast } from "sonner";
import { BRL, fmtDate, STATUS_OS } from "@/lib/format";
import { gerarOSPdf } from "@/lib/pdf";
import { buscarCatalogoMock } from "@/lib/fornecedor";

export const Route = createFileRoute("/app/os/$id")({ component: Page });

function Page() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [os, setOs] = useState<any>(null);
  const [cliente, setCliente] = useState<any>(null);
  const [veiculo, setVeiculo] = useState<any>(null);
  const [funcionario, setFuncionario] = useState<any>(null);
  const [empresa, setEmpresa] = useState<any>(null);
  const [itens, setItens] = useState<any[]>([]);
  const [pecas, setPecas] = useState<any[]>([]);
  const [openItem, setOpenItem] = useState(false);
  const [tipoNovo, setTipoNovo] = useState("servico");
  const [pecaId, setPecaId] = useState("");
  const [garantiaDias, setGarantiaDias] = useState<number>(0);
  const [temGarantia, setTemGarantia] = useState(false);
  const [pecaAvulsa, setPecaAvulsa] = useState<{ nome: string; preco: number; codigo?: string } | null>(null);
  const [openCatalogo, setOpenCatalogo] = useState(false);
  const [catalogoQuery, setCatalogoQuery] = useState("");
  const [catalogoResults, setCatalogoResults] = useState<any[]>([]);
  const [catalogoLoading, setCatalogoLoading] = useState(false);
  const [catalogoFornecedorId, setCatalogoFornecedorId] = useState("");
  const [fornecedoresList, setFornecedoresList] = useState<any[]>([]);
  const [openImportarCatalogo, setOpenImportarCatalogo] = useState(false);
  const [importarItem, setImportarItem] = useState<any>(null);
  const [importarPreco, setImportarPreco] = useState("");
  const [importarQtd, setImportarQtd] = useState("1");

  useEffect(() => { load(); }, [id]);

  async function load() {
    const { data: o } = await supabase.from("ordens_servico_mecanico").select("*").eq("id", id).single();
    if (!o) return;
    setOs(o);
    const [{ data: c }, { data: v }, { data: it }, { data: p }] = await Promise.all([
      supabase.from("clientes_mecanico").select("*").eq("id", o.cliente_id).single(),
      supabase.from("veiculos_mecanico").select("*").eq("id", o.veiculo_id).single(),
      supabase.from("os_itens_mecanico").select("*").eq("os_id", id).order("created_at"),
      supabase.from("pecas_mecanico").select("*"),
    ]);
    setCliente(c); setVeiculo(v); setItens(it ?? []); setPecas(p ?? []);
    const { data: emp } = await supabase.from("empresas_mecanico").select("*").single();
    setEmpresa(emp);
    if (o.funcionario_id) {
      const { data: f } = await supabase.from("funcionarios_mecanico").select("*").eq("id", o.funcionario_id).single();
      setFuncionario(f);
    }
  }

  async function recalcular(novoDesconto?: number) {
    const totalPecas = itens.filter(i => i.tipo === "peca").reduce((s, i) => s + Number(i.subtotal), 0);
    const totalServ = itens.filter(i => i.tipo === "servico").reduce((s, i) => s + Number(i.subtotal), 0);
    const desc = novoDesconto ?? Number(os.desconto ?? 0);
    const total = Math.max(0, totalPecas + totalServ - desc);
    await supabase.from("ordens_servico_mecanico").update({
      total_pecas: totalPecas, total_servicos: totalServ, total, desconto: desc,
    }).eq("id", id);
    load();
  }

  async function adicionarItem(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const tipo = tipoNovo;
    const qtd = Number(fd.get("quantidade") || 1);
    let descricao = String(fd.get("descricao") || "");
    let preco = Number(fd.get("preco_unitario") || 0);
    let pecaIdFinal: string | null = null;

    if (tipo === "peca") {
      if (pecaAvulsa) {
        descricao = pecaAvulsa.nome;
        preco = pecaAvulsa.preco;
        pecaIdFinal = null;
      } else {
        const peca = pecas.find(p => p.id === pecaId);
        if (!peca) return toast.error("Selecione uma peça");
        if (peca.quantidade < qtd) return toast.error(`Estoque insuficiente (${peca.quantidade} disponível)`);
        descricao = peca.nome;
        preco = Number(peca.preco_venda);
        pecaIdFinal = peca.id;
      }
    }
    if (!descricao) return toast.error("Descrição obrigatória");

    const dias = temGarantia ? Number(garantiaDias || 0) : 0;
    const tem = temGarantia && dias > 0;
    const dataVenc = tem && os?.data_entrada
      ? new Date(new Date(os.data_entrada).getTime() + dias * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      : null;

    const subtotal = qtd * preco;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("os_itens_mecanico").insert({
      os_id: id, tipo, peca_id: pecaIdFinal, descricao, quantidade: qtd,
      preco_unitario: preco, subtotal, user_id: user!.id,
      garantia_dias: tem ? dias : null,
      tem_garantia: tem,
      garantia_data_vencimento: dataVenc,
    });
    if (error) return toast.error(error.message);

    if (tipo === "peca" && pecaIdFinal) {
      const peca = pecas.find(p => p.id === pecaIdFinal);
      await supabase.from("pecas_mecanico").update({ quantidade: peca.quantidade - qtd }).eq("id", pecaIdFinal);
    }

    toast.success("Item adicionado");
    setOpenItem(false); setPecaId(""); setTipoNovo("servico"); setTemGarantia(false); setGarantiaDias(0); setPecaAvulsa(null);
    const { data: it } = await supabase.from("os_itens_mecanico").select("*").eq("os_id", id).order("created_at");
    setItens(it ?? []);
    setTimeout(() => recalcular(), 100);
  }

  async function buscarCatalogo() {
    setCatalogoLoading(true);
    try {
      if (!catalogoFornecedorId) {
        let q = supabase.from("fornecedor_catalogo_mecanico").select("*, fornecedores_mecanico(nome)").order("nome");
        if (catalogoQuery.trim()) q = q.ilike("nome", `%${catalogoQuery}%`);
        const { data, error } = await q;
        if (error) toast.error(error.message);
        setCatalogoResults(data ?? []);
      } else {
        const mock = await buscarCatalogoMock(catalogoQuery);
        const f = fornecedoresList.find((x: any) => x.id === catalogoFornecedorId);
        const enriched = mock.map((m) => ({ ...m, fornecedor_id: catalogoFornecedorId, fornecedores_mecanico: { nome: f?.nome ?? "Mock" } }));
        setCatalogoResults(enriched);
      }
    } finally { setCatalogoLoading(false); }
  }

  async function abrirCatalogo() {
    setOpenCatalogo(true);
    setCatalogoQuery("");
    setCatalogoResults([]);
    setCatalogoFornecedorId("");
    const { data } = await supabase.from("fornecedores_mecanico").select("*").eq("ativo", true).order("nome");
    setFornecedoresList(data ?? []);
  }

  function usarNaOS(item: any) {
    setPecaAvulsa({ nome: item.nome, preco: Number(item.preco || 0), codigo: item.codigo });
    setTipoNovo("peca");
    setOpenCatalogo(false);
  }

  function abrirImportarDoCatalogo(item: any) {
    setImportarItem(item);
    setImportarPreco(String(item.preco ? Math.round(item.preco * 1.4 * 100) / 100 : ""));
    setImportarQtd("1");
    setOpenImportarCatalogo(true);
  }

  async function confirmarImportarDoCatalogo() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const preco = Number(importarPreco || 0);
    const qtd = Number(importarQtd || 1);
    const { error } = await supabase.from("pecas_mecanico").insert({
      user_id: user.id,
      codigo: importarItem?.codigo || null,
      nome: importarItem?.nome,
      descricao: importarItem?.descricao || null,
      preco_custo: importarItem?.preco || null,
      preco_venda: preco,
      quantidade: qtd,
      estoque_minimo: 1,
      unidade: "un",
    });
    if (error) return toast.error(error.message);
    toast.success("Peça importada para o estoque");
    setOpenImportarCatalogo(false);
    setImportarItem(null);
    load();
  }

  async function removerItem(item: any) {
    if (!confirm("Remover item?")) return;
    await supabase.from("os_itens_mecanico").delete().eq("id", item.id);
    if (item.tipo === "peca" && item.peca_id) {
      const peca = pecas.find(p => p.id === item.peca_id);
      if (peca) await supabase.from("pecas_mecanico").update({ quantidade: peca.quantidade + Number(item.quantidade) }).eq("id", peca.id);
    }
    const { data: it } = await supabase.from("os_itens_mecanico").select("*").eq("os_id", id).order("created_at");
    setItens(it ?? []);
    setTimeout(() => recalcular(), 100);
  }

  async function atualizarStatus(novo: string) {
    const upd: any = { status: novo };
    if (novo === "concluida") upd.data_conclusao = new Date().toISOString();
    await supabase.from("ordens_servico_mecanico").update(upd).eq("id", id);

    if (novo === "concluida" && !os.pago && Number(os.total) > 0) {
      // Cria conta a receber automaticamente
      const { data: existente } = await supabase.from("financeiro_mecanico").select("id").eq("os_id", id).maybeSingle();
      if (!existente) {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from("financeiro_mecanico").insert({
          tipo: "receita", descricao: `OS #${os.numero} — ${cliente?.nome}`,
          valor: os.total, data_vencimento: new Date().toISOString().slice(0, 10),
          os_id: id, categoria: "Serviços", user_id: user!.id,
        });
        toast.success("OS concluída e lançada no financeiro");
      } else toast.success("OS concluída");
    } else toast.success("Status atualizado");
    load();
  }

  async function marcarPago() {
    await supabase.from("ordens_servico_mecanico").update({ pago: true }).eq("id", id);
    await supabase.from("financeiro_mecanico").update({ pago: true, data_pagamento: new Date().toISOString().slice(0, 10) }).eq("os_id", id);
    toast.success("Pagamento registrado");
    load();
  }

  async function salvarDescricoes(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await supabase.from("ordens_servico_mecanico").update({
      descricao_problema: String(fd.get("descricao_problema") ?? ""),
      diagnostico: String(fd.get("diagnostico") ?? ""),
      desconto: Number(fd.get("desconto") || 0),
    }).eq("id", id);
    toast.success("OS atualizada");
    setTimeout(() => recalcular(Number(fd.get("desconto") || 0)), 100);
  }

  async function excluirOS() {
    if (!confirm(`Excluir OS #${os.numero}? Esta ação não pode ser desfeita.`)) return;
    await supabase.from("ordens_servico_mecanico").delete().eq("id", id);
    navigate({ to: "/app/os" });
  }

  if (!os) return <div className="text-muted-foreground">Carregando...</div>;
  const st = STATUS_OS[os.status];

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <Link to="/app/os" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" />Voltar
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" onClick={async () => { await gerarOSPdf(os, cliente, veiculo, itens, funcionario, empresa); }}>
            <FileDown className="h-4 w-4 mr-2" />PDF
          </Button>
          {!os.pago && os.status === "concluida" && (
            <Button onClick={marcarPago} className="bg-success text-success-foreground"><DollarSign className="h-4 w-4 mr-2" />Receber</Button>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 pb-4 border-b">
        <div>
          <div className="font-mono text-primary text-sm">ORDEM DE SERVIÇO</div>
          <h1 className="text-4xl md:text-5xl font-display">#{os.numero}</h1>
          <div className="text-sm text-muted-foreground mt-1">Aberta em {fmtDate(os.data_entrada)}</div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded border text-xs uppercase ${st.cls}`}>{st.label}</span>
          {os.pago && <span className="px-3 py-1 rounded bg-success/20 text-success border border-success/40 text-xs uppercase">Pago</span>}
          <Select value={os.status} onValueChange={atualizarStatus}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_OS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border rounded-xl p-5">
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs text-muted-foreground uppercase mb-1">Cliente</div>
                <div className="font-medium">{cliente?.nome}</div>
                <div className="text-muted-foreground text-xs">{cliente?.telefone} • {cliente?.documento ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase mb-1">Veículo</div>
                <div className="font-medium font-mono text-primary">{veiculo?.placa}</div>
                <div className="text-muted-foreground text-xs">{veiculo?.marca} {veiculo?.modelo} {veiculo?.ano && `• ${veiculo.ano}`} {os.km_entrada && `• KM ${os.km_entrada}`}</div>
              </div>
              {funcionario && (
                <div>
                  <div className="text-xs text-muted-foreground uppercase mb-1">Mecânico</div>
                  <div className="font-medium">{funcionario.nome}</div>
                </div>
              )}
              {os.data_prevista && (
                <div>
                  <div className="text-xs text-muted-foreground uppercase mb-1">Previsão</div>
                  <div className="font-medium">{fmtDate(os.data_prevista)}</div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-card border rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-lg">Itens da OS</h3>
              <Dialog open={openItem} onOpenChange={(o) => { setOpenItem(o); if (!o) { setPecaId(""); setTipoNovo("servico"); setTemGarantia(false); setGarantiaDias(0); setPecaAvulsa(null); } }}>
                <DialogTrigger asChild><Button size="sm" className="bg-gradient-primary text-primary-foreground"><Plus className="h-4 w-4 mr-1" />Adicionar</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle className="font-display">Adicionar item</DialogTitle></DialogHeader>
                  <form onSubmit={adicionarItem} className="space-y-3">
                    <div>
                      <Label>Tipo</Label>
                      <Select value={tipoNovo} onValueChange={(v) => { setTipoNovo(v); setPecaId(""); setTemGarantia(false); setGarantiaDias(0); setPecaAvulsa(null); }}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="servico">Serviço (mão de obra)</SelectItem>
                          <SelectItem value="peca">Peça do estoque / fornecedor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {tipoNovo === "peca" ? (
                      <div className="space-y-3">
                        {pecaAvulsa ? (
                          <div className="border rounded-md p-3 bg-muted/30">
                            <div className="text-xs text-muted-foreground">De fornecedor</div>
                            <div className="font-medium">{pecaAvulsa.nome}</div>
                            <div className="text-sm text-muted-foreground">{BRL(pecaAvulsa.preco)}</div>
                            <Button type="button" variant="ghost" size="sm" className="mt-1 h-7 text-xs" onClick={() => setPecaAvulsa(null)}>Trocar</Button>
                          </div>
                        ) : (
                          <>
                            <div>
                              <Label>Peça do estoque*</Label>
                              <Select value={pecaId} onValueChange={(v) => {
                                setPecaId(v);
                                const peca = pecas.find(p => p.id === v);
                                if (peca?.garantia_padrao_dias) {
                                  setTemGarantia(true);
                                  setGarantiaDias(Number(peca.garantia_padrao_dias));
                                } else {
                                  setTemGarantia(false);
                                  setGarantiaDias(0);
                                }
                              }}>
                                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                                <SelectContent>
                                  {pecas.map(p => (
                                    <SelectItem key={p.id} value={p.id} disabled={p.quantidade <= 0}>
                                      {p.nome} — {BRL(p.preco_venda)} ({p.quantidade} {p.unidade})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">ou</span>
                              <Button type="button" variant="outline" size="sm" onClick={abrirCatalogo}>
                                <Search className="h-4 w-4 mr-1" />Buscar em fornecedores
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <>
                        <div><Label>Descrição*</Label><Input name="descricao" required placeholder="Ex.: Troca de óleo" /></div>
                        <div><Label>Preço unitário*</Label><Input name="preco_unitario" type="number" step="0.01" required /></div>
                      </>
                    )}
                    <div><Label>Quantidade</Label><Input name="quantidade" type="number" step="0.01" defaultValue={1} required /></div>
                    <div className="flex items-center gap-2">
                      <input
                        id="tem_garantia"
                        type="checkbox"
                        checked={temGarantia}
                        onChange={(e) => { setTemGarantia(e.target.checked); if (!e.target.checked) setGarantiaDias(0); }}
                        className="h-4 w-4 rounded border-border"
                      />
                      <Label htmlFor="tem_garantia" className="cursor-pointer">Tem garantia?</Label>
                    </div>
                    {temGarantia && (
                      <div><Label>Garantia (dias)</Label>
                        <Input
                          type="number"
                          min={1}
                          value={garantiaDias}
                          onChange={(e) => setGarantiaDias(Number(e.target.value))}
                          placeholder="Ex.: 90"
                        />
                      </div>
                    )}
                    <DialogFooter><Button type="submit" className="bg-gradient-primary text-primary-foreground">Adicionar</Button></DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            {itens.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum item ainda. Adicione peças e serviços.</p>
            ) : (
              <table className="w-full text-sm">
                <tbody>
                  {itens.map(i => (
                    <tr key={i.id} className="border-t border-border first:border-t-0">
                      <td className="py-3 pr-2 w-6">
                        {i.tipo === "peca" ? <Package className="h-4 w-4 text-chart-5" /> : <Wrench className="h-4 w-4 text-primary" />}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{i.descricao}</span>
                          {i.tem_garantia && <ShieldCheck className="h-4 w-4 text-emerald-400" title={`Garantia: ${i.garantia_dias ?? 0} dias`} />}
                        </div>
                        <div className="text-xs text-muted-foreground">{i.quantidade} × {BRL(i.preco_unitario)}</div>
                      </td>
                      <td className="py-3 text-right font-mono">{BRL(i.subtotal)}</td>
                      <td className="py-3 pl-2"><Button size="icon" variant="ghost" onClick={() => removerItem(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <form onSubmit={salvarDescricoes} className="bg-card border rounded-xl p-5 space-y-3">
            <h3 className="font-display text-lg">Detalhes</h3>
            <div><Label>Problema relatado pelo cliente</Label><Textarea name="descricao_problema" defaultValue={os.descricao_problema ?? ""} rows={2} /></div>
            <div>
              <div className="flex items-center justify-between">
                <Label>Diagnóstico / Serviço executado</Label>
              </div>
              <Textarea name="diagnostico" defaultValue={os.diagnostico ?? ""} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3 items-end">
              <div><Label>Desconto (R$)</Label><Input name="desconto" type="number" step="0.01" defaultValue={os.desconto} /></div>
              <Button type="submit" className="bg-gradient-primary text-primary-foreground">Salvar</Button>
            </div>
          </form>
        </div>

        <aside className="space-y-4">
          <div className="bg-card border rounded-xl p-5 shadow-card">
            <h3 className="font-display text-lg mb-3">Total</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Peças</span><span className="font-mono">{BRL(os.total_pecas)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Serviços</span><span className="font-mono">{BRL(os.total_servicos)}</span></div>
              {Number(os.desconto) > 0 && <div className="flex justify-between text-destructive"><span>Desconto</span><span className="font-mono">-{BRL(os.desconto)}</span></div>}
              <div className="border-t border-border pt-3 mt-3 flex justify-between items-end">
                <span className="text-xs uppercase text-muted-foreground">Total</span>
                <span className="font-display text-3xl text-primary">{BRL(os.total)}</span>
              </div>
            </div>
          </div>

          <div className="bg-card border rounded-xl p-5">
            <h3 className="font-display text-base mb-3">Ações rápidas</h3>
            <div className="space-y-2">
              {os.status !== "concluida" && (
                <Button onClick={() => atualizarStatus("concluida")} className="w-full bg-success text-success-foreground">
                  <CheckCircle2 className="h-4 w-4 mr-2" />Concluir OS
                </Button>
              )}
              <Button variant="outline" className="w-full" onClick={async () => { await gerarOSPdf(os, cliente, veiculo, itens, funcionario, empresa); }}>
                <FileDown className="h-4 w-4 mr-2" />Baixar orçamento PDF
              </Button>
              <Button variant="ghost" className="w-full text-destructive hover:text-destructive" onClick={excluirOS}>
                <Trash2 className="h-4 w-4 mr-2" />Excluir OS
              </Button>
            </div>
          </div>
        </aside>
      </div>

      {/* Dialog Catálogo de Fornecedores */}
      <Dialog open={openCatalogo} onOpenChange={setOpenCatalogo}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle className="font-display">Buscar em fornecedores</DialogTitle></DialogHeader>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="sm:w-56">
              <Select value={catalogoFornecedorId} onValueChange={setCatalogoFornecedorId}>
                <SelectTrigger><SelectValue placeholder="Todos (cache local)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos (cache local)</SelectItem>
                  {fornecedoresList.map((f: any) => (
                    <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 flex gap-2">
              <Input placeholder="Buscar peça..." value={catalogoQuery} onChange={(e) => setCatalogoQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && buscarCatalogo()} />
              <Button onClick={buscarCatalogo} disabled={catalogoLoading} className="bg-gradient-primary text-primary-foreground">
                <Search className="h-4 w-4 mr-2" />{catalogoLoading ? "Buscando..." : "Buscar"}
              </Button>
            </div>
          </div>
          {catalogoResults.length > 0 && (
            <div className="border rounded-xl overflow-hidden max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted text-xs uppercase text-muted-foreground">
                  <tr><th className="text-left px-3 py-2">Código</th><th className="text-left px-3 py-2">Peça</th><th className="text-left px-3 py-2">Marca</th><th className="text-right px-3 py-2">Preço</th><th className="text-right px-3 py-2"></th></tr>
                </thead>
                <tbody>
                  {catalogoResults.map((r: any, idx: number) => (
                    <tr key={r.id ?? idx} className="border-t border-border hover:bg-muted/50">
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{r.codigo}</td>
                      <td className="px-3 py-2">
                        <div className="font-medium">{r.nome}</div>
                        <div className="text-xs text-muted-foreground">{r.descricao ?? "—"}</div>
                      </td>
                      <td className="px-3 py-2 text-xs">{r.marca ?? "—"}</td>
                      <td className="px-3 py-2 text-right font-mono">{BRL(r.preco)}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap space-x-1">
                        <Button size="sm" variant="outline" onClick={() => usarNaOS(r)}>Usar na OS</Button>
                        <Button size="sm" variant="ghost" onClick={() => abrirImportarDoCatalogo(r)}><Store className="h-4 w-4 mr-1" />Importar</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Importar para estoque */}
      <Dialog open={openImportarCatalogo} onOpenChange={setOpenImportarCatalogo}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Importar para estoque</DialogTitle></DialogHeader>
          {importarItem && (
            <div className="space-y-3">
              <div className="text-sm"><span className="text-muted-foreground">Peça:</span> <span className="font-medium">{importarItem.nome}</span></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Preço de venda (R$)</Label><Input type="number" step="0.01" value={importarPreco} onChange={(e) => setImportarPreco(e.target.value)} /></div>
                <div><Label>Quantidade inicial</Label><Input type="number" value={importarQtd} onChange={(e) => setImportarQtd(e.target.value)} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenImportarCatalogo(false)}>Cancelar</Button>
                <Button onClick={confirmarImportarDoCatalogo} className="bg-gradient-primary text-primary-foreground"><Package className="h-4 w-4 mr-2" />Importar</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
