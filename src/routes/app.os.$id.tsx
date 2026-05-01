import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, FileDown, Plus, Trash2, Wrench, Package, CheckCircle2, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { BRL, fmtDate, STATUS_OS } from "@/lib/format";
import { gerarOSPdf } from "@/lib/pdf";

export const Route = createFileRoute("/app/os/$id")({ component: Page });

function Page() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [os, setOs] = useState<any>(null);
  const [cliente, setCliente] = useState<any>(null);
  const [veiculo, setVeiculo] = useState<any>(null);
  const [funcionario, setFuncionario] = useState<any>(null);
  const [itens, setItens] = useState<any[]>([]);
  const [pecas, setPecas] = useState<any[]>([]);
  const [openItem, setOpenItem] = useState(false);
  const [tipoNovo, setTipoNovo] = useState("servico");
  const [pecaId, setPecaId] = useState("");

  useEffect(() => { load(); }, [id]);

  async function load() {
    const { data: o } = await supabase.from("ordens_servico").select("*").eq("id", id).single();
    if (!o) return;
    setOs(o);
    const [{ data: c }, { data: v }, { data: it }, { data: p }] = await Promise.all([
      supabase.from("clientes").select("*").eq("id", o.cliente_id).single(),
      supabase.from("veiculos").select("*").eq("id", o.veiculo_id).single(),
      supabase.from("os_itens").select("*").eq("os_id", id).order("created_at"),
      supabase.from("pecas").select("*"),
    ]);
    setCliente(c); setVeiculo(v); setItens(it ?? []); setPecas(p ?? []);
    if (o.funcionario_id) {
      const { data: f } = await supabase.from("funcionarios").select("*").eq("id", o.funcionario_id).single();
      setFuncionario(f);
    }
  }

  async function recalcular(novoDesconto?: number) {
    const totalPecas = itens.filter(i => i.tipo === "peca").reduce((s, i) => s + Number(i.subtotal), 0);
    const totalServ = itens.filter(i => i.tipo === "servico").reduce((s, i) => s + Number(i.subtotal), 0);
    const desc = novoDesconto ?? Number(os.desconto ?? 0);
    const total = Math.max(0, totalPecas + totalServ - desc);
    await supabase.from("ordens_servico").update({
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
      if (peca.quantidade < qtd) return toast.error(`Estoque insuficiente (${peca.quantidade} disponível)`);
      descricao = peca.nome;
      preco = Number(peca.preco_venda);
      pecaIdFinal = peca.id;
    }
    if (!descricao) return toast.error("Descrição obrigatória");

    const subtotal = qtd * preco;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("os_itens").insert({
      os_id: id, tipo, peca_id: pecaIdFinal, descricao, quantidade: qtd,
      preco_unitario: preco, subtotal, user_id: user!.id,
    });
    if (error) return toast.error(error.message);

    if (tipo === "peca" && pecaIdFinal) {
      const peca = pecas.find(p => p.id === pecaIdFinal);
      await supabase.from("pecas").update({ quantidade: peca.quantidade - qtd }).eq("id", pecaIdFinal);
    }

    toast.success("Item adicionado");
    setOpenItem(false); setPecaId(""); setTipoNovo("servico");
    const { data: it } = await supabase.from("os_itens").select("*").eq("os_id", id).order("created_at");
    setItens(it ?? []);
    setTimeout(() => recalcular(), 100);
  }

  async function removerItem(item: any) {
    if (!confirm("Remover item?")) return;
    await supabase.from("os_itens").delete().eq("id", item.id);
    if (item.tipo === "peca" && item.peca_id) {
      const peca = pecas.find(p => p.id === item.peca_id);
      if (peca) await supabase.from("pecas").update({ quantidade: peca.quantidade + Number(item.quantidade) }).eq("id", peca.id);
    }
    const { data: it } = await supabase.from("os_itens").select("*").eq("os_id", id).order("created_at");
    setItens(it ?? []);
    setTimeout(() => recalcular(), 100);
  }

  async function atualizarStatus(novo: string) {
    const upd: any = { status: novo };
    if (novo === "concluida") upd.data_conclusao = new Date().toISOString();
    await supabase.from("ordens_servico").update(upd).eq("id", id);

    if (novo === "concluida" && !os.pago && Number(os.total) > 0) {
      // Cria conta a receber automaticamente
      const { data: existente } = await supabase.from("financeiro").select("id").eq("os_id", id).maybeSingle();
      if (!existente) {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from("financeiro").insert({
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
    await supabase.from("ordens_servico").update({ pago: true }).eq("id", id);
    await supabase.from("financeiro").update({ pago: true, data_pagamento: new Date().toISOString().slice(0, 10) }).eq("os_id", id);
    toast.success("Pagamento registrado");
    load();
  }

  async function salvarDescricoes(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await supabase.from("ordens_servico").update({
      descricao_problema: String(fd.get("descricao_problema") ?? ""),
      diagnostico: String(fd.get("diagnostico") ?? ""),
      desconto: Number(fd.get("desconto") || 0),
    }).eq("id", id);
    toast.success("OS atualizada");
    setTimeout(() => recalcular(Number(fd.get("desconto") || 0)), 100);
  }

  async function excluirOS() {
    if (!confirm(`Excluir OS #${os.numero}? Esta ação não pode ser desfeita.`)) return;
    await supabase.from("ordens_servico").delete().eq("id", id);
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
          <Button variant="outline" onClick={() => gerarOSPdf(os, cliente, veiculo, itens, funcionario)}>
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
            <div><Label>Diagnóstico / Serviço executado</Label><Textarea name="diagnostico" defaultValue={os.diagnostico ?? ""} rows={3} /></div>
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
              <Button variant="outline" className="w-full" onClick={() => gerarOSPdf(os, cliente, veiculo, itens, funcionario)}>
                <FileDown className="h-4 w-4 mr-2" />Baixar orçamento PDF
              </Button>
              <Button variant="ghost" className="w-full text-destructive hover:text-destructive" onClick={excluirOS}>
                <Trash2 className="h-4 w-4 mr-2" />Excluir OS
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
