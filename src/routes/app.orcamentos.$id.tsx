import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, FileDown, Plus, Trash2, Wrench, Package, CheckCircle2, XCircle, RotateCcw, FileCheck } from "lucide-react";
import { toast } from "sonner";
import { BRL, fmtDate, STATUS_ORCAMENTO } from "@/lib/format";

export const Route = createFileRoute("/app/orcamentos/$id")({ component: Page });

function Page() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [orcamento, setOrcamento] = useState<any>(null);
  const [cliente, setCliente] = useState<any>(null);
  const [veiculo, setVeiculo] = useState<any>(null);
  const [funcionario, setFuncionario] = useState<any>(null);
  const [itens, setItens] = useState<any[]>([]);
  const [pecas, setPecas] = useState<any[]>([]);
  const [openItem, setOpenItem] = useState(false);
  const [tipoNovo, setTipoNovo] = useState("servico");
  const [pecaId, setPecaId] = useState("");
  const [convertendo, setConvertendo] = useState(false);

  useEffect(() => { load(); }, [id]);

  async function load() {
    const { data: o } = await supabase.from("orcamentos_mecanico").select("*").eq("id", id).single();
    if (!o) return;
    setOrcamento(o);
    const [{ data: c }, { data: v }, { data: it }, { data: p }] = await Promise.all([
      supabase.from("clientes_mecanico").select("*").eq("id", o.cliente_id).single(),
      supabase.from("veiculos_mecanico").select("*").eq("id", o.veiculo_id).single(),
      supabase.from("orcamento_itens_mecanico").select("*").eq("orcamento_id", id).order("created_at"),
      supabase.from("pecas_mecanico").select("*"),
    ]);
    setCliente(c); setVeiculo(v); setItens(it ?? []); setPecas(p ?? []);
    if (o.funcionario_id) {
      const { data: f } = await supabase.from("funcionarios_mecanico").select("*").eq("id", o.funcionario_id).single();
      setFuncionario(f);
    }
  }

  async function recalcular(novoDesconto?: number) {
    const totalPecas = itens.filter(i => i.tipo === "peca").reduce((s, i) => s + Number(i.subtotal), 0);
    const totalServ = itens.filter(i => i.tipo === "servico").reduce((s, i) => s + Number(i.subtotal), 0);
    const desc = novoDesconto ?? Number(orcamento.desconto ?? 0);
    const total = Math.max(0, totalPecas + totalServ - desc);
    await supabase.from("orcamentos_mecanico").update({
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
      const peca = pecas.find(p => p.id === pecaId);
      if (!peca) return toast.error("Selecione uma peça");
      descricao = peca.nome;
      preco = Number(peca.preco_venda);
      pecaIdFinal = peca.id;
    }
    if (!descricao) return toast.error("Descrição obrigatória");

    const subtotal = qtd * preco;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("orcamento_itens_mecanico").insert({
      orcamento_id: id, tipo, peca_id: pecaIdFinal, descricao, quantidade: qtd,
      preco_unitario: preco, subtotal, user_id: user!.id,
    });
    if (error) return toast.error(error.message);

    toast.success("Item adicionado");
    setOpenItem(false); setPecaId(""); setTipoNovo("servico");
    const { data: it } = await supabase.from("orcamento_itens_mecanico").select("*").eq("orcamento_id", id).order("created_at");
    setItens(it ?? []);
    setTimeout(() => recalcular(), 100);
  }

  async function removerItem(item: any) {
    if (!confirm("Remover item?")) return;
    await supabase.from("orcamento_itens_mecanico").delete().eq("id", item.id);
    const { data: it } = await supabase.from("orcamento_itens_mecanico").select("*").eq("orcamento_id", id).order("created_at");
    setItens(it ?? []);
    setTimeout(() => recalcular(), 100);
  }

  async function mudarStatus(novo: string) {
    await supabase.from("orcamentos_mecanico").update({ status: novo }).eq("id", id);
    toast.success(`Orçamento ${STATUS_ORCAMENTO[novo]?.label ?? novo}`);
    load();
  }

  async function converterEmOS() {
    if (!confirm("Converter este orçamento em OS? Os dados serão copiados e o orçamento será marcado como convertido.")) return;
    setConvertendo(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Criar OS copiando dados do orçamento
      const { data: novaOS, error: errOS } = await supabase.from("ordens_servico_mecanico").insert({
        user_id: user.id,
        cliente_id: orcamento.cliente_id,
        veiculo_id: orcamento.veiculo_id,
        funcionario_id: orcamento.funcionario_id,
        status: "aberta",
        descricao_problema: orcamento.descricao_problema,
        diagnostico: orcamento.diagnostico,
        km_entrada: orcamento.km_entrada,
        desconto: orcamento.desconto,
        total_pecas: orcamento.total_pecas,
        total_servicos: orcamento.total_servicos,
        total: orcamento.total,
        observacoes: orcamento.observacoes,
      }).select().single();

      if (errOS || !novaOS) throw errOS ?? new Error("Falha ao criar OS");

      // Copiar itens
      if (itens.length > 0) {
        const itensOS = itens.map(i => ({
          user_id: user.id,
          os_id: novaOS.id,
          tipo: i.tipo,
          peca_id: i.peca_id,
          descricao: i.descricao,
          quantidade: i.quantidade,
          preco_unitario: i.preco_unitario,
          subtotal: i.subtotal,
        }));
        const { error: errItens } = await supabase.from("os_itens_mecanico").insert(itensOS);
        if (errItens) throw errItens;
      }

      // Atualizar status do orçamento
      await supabase.from("orcamentos_mecanico").update({ status: "convertido" }).eq("id", id);

      toast.success(`Convertido em OS #${novaOS.numero}`);
      navigate({ to: `/app/os/${novaOS.id}` });
    } catch (err: any) {
      toast.error(err.message || "Erro ao converter");
    } finally {
      setConvertendo(false);
    }
  }

  async function salvarDescricoes(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await supabase.from("orcamentos_mecanico").update({
      descricao_problema: String(fd.get("descricao_problema") ?? ""),
      diagnostico: String(fd.get("diagnostico") ?? ""),
      desconto: Number(fd.get("desconto") || 0),
      observacoes: String(fd.get("observacoes") ?? ""),
      data_validade: String(fd.get("data_validade") || null),
    }).eq("id", id);
    toast.success("Orçamento atualizado");
    setTimeout(() => recalcular(Number(fd.get("desconto") || 0)), 100);
  }

  async function excluirOrcamento() {
    if (!confirm(`Excluir orçamento #${orcamento.numero}? Esta ação não pode ser desfeita.`)) return;
    await supabase.from("orcamentos_mecanico").delete().eq("id", id);
    navigate({ to: "/app/orcamentos" });
  }

  if (!orcamento) return <div className="text-muted-foreground">Carregando...</div>;
  const st = STATUS_ORCAMENTO[orcamento.status];
  const podeEditar = orcamento.status === "pendente";

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <Link to="/app/orcamentos" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" />Voltar
        </Link>
        <div className="flex gap-2">
          {podeEditar && (
            <>
              <Button onClick={() => mudarStatus("aprovado")} className="bg-success text-success-foreground">
                <CheckCircle2 className="h-4 w-4 mr-2" />Aprovar
              </Button>
              <Button onClick={() => mudarStatus("rejeitado")} variant="outline" className="text-destructive border-destructive">
                <XCircle className="h-4 w-4 mr-2" />Rejeitar
              </Button>
            </>
          )}
          {orcamento.status === "aprovado" && (
            <Button onClick={() => mudarStatus("pendente")} variant="outline">
              <RotateCcw className="h-4 w-4 mr-2" />Reabrir
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 pb-4 border-b">
        <div>
          <div className="font-mono text-primary text-sm">ORÇAMENTO</div>
          <h1 className="text-4xl md:text-5xl font-display">#{orcamento.numero}</h1>
          <div className="text-sm text-muted-foreground mt-1">Criado em {fmtDate(orcamento.data_criacao)}</div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded border text-xs uppercase ${st.cls}`}>{st.label}</span>
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
                <div className="text-muted-foreground text-xs">{veiculo?.marca} {veiculo?.modelo} {veiculo?.ano && `• ${veiculo.ano}`} {orcamento.km_entrada && `• KM ${orcamento.km_entrada}`}</div>
              </div>
              {funcionario && (
                <div>
                  <div className="text-xs text-muted-foreground uppercase mb-1">Mecânico</div>
                  <div className="font-medium">{funcionario.nome}</div>
                </div>
              )}
              {orcamento.data_validade && (
                <div>
                  <div className="text-xs text-muted-foreground uppercase mb-1">Validade</div>
                  <div className="font-medium">{fmtDate(orcamento.data_validade)}</div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-card border rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-lg">Itens do Orçamento</h3>
              {podeEditar && (
                <Dialog open={openItem} onOpenChange={(o) => { setOpenItem(o); if (!o) { setPecaId(""); setTipoNovo("servico"); } }}>
                  <DialogTrigger asChild><Button size="sm" className="bg-gradient-primary text-primary-foreground"><Plus className="h-4 w-4 mr-1" />Adicionar</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle className="font-display">Adicionar item</DialogTitle></DialogHeader>
                    <form onSubmit={adicionarItem} className="space-y-3">
                      <div>
                        <Label>Tipo</Label>
                        <Select value={tipoNovo} onValueChange={(v) => { setTipoNovo(v); setPecaId(""); }}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="servico">Serviço (mão de obra)</SelectItem>
                            <SelectItem value="peca">Peça do estoque</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {tipoNovo === "peca" ? (
                        <div>
                          <Label>Peça*</Label>
                          <Select value={pecaId} onValueChange={setPecaId}>
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
                      ) : (
                        <>
                          <div><Label>Descrição*</Label><Input name="descricao" required placeholder="Ex.: Troca de óleo" /></div>
                          <div><Label>Preço unitário*</Label><Input name="preco_unitario" type="number" step="0.01" required /></div>
                        </>
                      )}
                      <div><Label>Quantidade</Label><Input name="quantidade" type="number" step="0.01" defaultValue={1} required /></div>
                      <DialogFooter><Button type="submit" className="bg-gradient-primary text-primary-foreground">Adicionar</Button></DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            {itens.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum item ainda. Adicione peças e serviços.</p>
            ) : (
              <table className="w-full text-sm">
                <tbody>
                  {itens.map(i => (
                    <tr key={i.id} className="border-t border-border first:border-t-0">
                      <td className="py-3 pr-2 w-6">{i.tipo === "peca" ? <Package className="h-4 w-4 text-chart-5" /> : <Wrench className="h-4 w-4 text-primary" />}</td>
                      <td className="py-3"><div className="font-medium">{i.descricao}</div><div className="text-xs text-muted-foreground">{i.quantidade} × {BRL(i.preco_unitario)}</div></td>
                      <td className="py-3 text-right font-mono">{BRL(i.subtotal)}</td>
                      <td className="py-3 pl-2">{podeEditar && <Button size="icon" variant="ghost" onClick={() => removerItem(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <form onSubmit={salvarDescricoes} className="bg-card border rounded-xl p-5 space-y-3">
            <h3 className="font-display text-lg">Detalhes</h3>
            <div><Label>Problema relatado pelo cliente</Label><Textarea name="descricao_problema" defaultValue={orcamento.descricao_problema ?? ""} rows={2} /></div>
            <div><Label>Diagnóstico / Serviço proposto</Label><Textarea name="diagnostico" defaultValue={orcamento.diagnostico ?? ""} rows={3} /></div>
            <div><Label>Observações</Label><Textarea name="observacoes" defaultValue={orcamento.observacoes ?? ""} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3 items-end">
              <div><Label>Desconto (R$)</Label><Input name="desconto" type="number" step="0.01" defaultValue={orcamento.desconto} /></div>
              <div><Label>Validade</Label><Input name="data_validade" type="date" defaultValue={orcamento.data_validade ? orcamento.data_validade.slice(0,10) : ""} /></div>
            </div>
            <Button type="submit" className="bg-gradient-primary text-primary-foreground">Salvar</Button>
          </form>
        </div>

        <aside className="space-y-4">
          <div className="bg-card border rounded-xl p-5 shadow-card">
            <h3 className="font-display text-lg mb-3">Total</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Peças</span><span className="font-mono">{BRL(orcamento.total_pecas)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Serviços</span><span className="font-mono">{BRL(orcamento.total_servicos)}</span></div>
              {Number(orcamento.desconto) > 0 && <div className="flex justify-between text-destructive"><span>Desconto</span><span className="font-mono">-{BRL(orcamento.desconto)}</span></div>}
              <div className="border-t border-border pt-3 mt-3 flex justify-between items-end">
                <span className="text-xs uppercase text-muted-foreground">Total</span>
                <span className="font-display text-3xl text-primary">{BRL(orcamento.total)}</span>
              </div>
            </div>
          </div>

          <div className="bg-card border rounded-xl p-5">
            <h3 className="font-display text-base mb-3">Ações</h3>
            <div className="space-y-2">
              {podeEditar && (
                <Button onClick={converterEmOS} disabled={convertendo} className="w-full bg-chart-5 text-primary-foreground">
                  <FileCheck className="h-4 w-4 mr-2" />{convertendo ? "Convertendo..." : "Converter em OS"}
                </Button>
              )}
              {orcamento.status === "convertido" && (
                <p className="text-sm text-muted-foreground">Este orçamento já foi convertido em OS.</p>
              )}
              <Button variant="ghost" className="w-full text-destructive hover:text-destructive" onClick={excluirOrcamento}>
                <Trash2 className="h-4 w-4 mr-2" />Excluir Orçamento
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
