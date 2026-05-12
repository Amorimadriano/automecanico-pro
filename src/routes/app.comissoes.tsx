import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BadgeCheck, Check, Percent } from "lucide-react";
import { toast } from "sonner";
import { BRL, fmtDate } from "@/lib/format";

export const Route = createFileRoute("/app/comissoes")({ component: Page, head: () => ({ meta: [{ title: "Comissões" }] }) });

function Page() {
  const [list, setList] = useState<any[]>([]);
  const [funcs, setFuncs] = useState<any[]>([]);
  const [funcFilter, setFuncFilter] = useState<string>("todos");

  useEffect(() => { load(); }, []);
  async function load() {
    const { data: c } = await supabase
      .from("comissoes_mecanico")
      .select("*, funcionarios_mecanico(nome), ordens_servico_mecanico(numero)")
      .order("created_at", { ascending: false });
    const { data: f } = await supabase.from("funcionarios_mecanico").select("id,nome").eq("ativo", true).order("nome");
    setList(c ?? []);
    setFuncs(f ?? []);
  }

  async function marcarPago(item: any) {
    const hoje = new Date().toISOString().slice(0, 10);
    const { error } = await supabase
      .from("comissoes_mecanico")
      .update({ pago: true, data_pagamento: hoje })
      .eq("id", item.id);
    if (error) return toast.error(error.message);
    toast.success("Comissão marcada como paga");
    load();
  }

  const pendentes = list.filter((l) => !l.pago);
  const pagas = list.filter((l) => l.pago);

  const filteredPendentes = useMemo(() => {
    if (funcFilter === "todos") return pendentes;
    return pendentes.filter((p) => p.funcionario_id === funcFilter);
  }, [pendentes, funcFilter]);

  const filteredPagas = useMemo(() => {
    if (funcFilter === "todos") return pagas;
    return pagas.filter((p) => p.funcionario_id === funcFilter);
  }, [pagas, funcFilter]);

  const totalAPagar = filteredPendentes.reduce((s, l) => s + Number(l.valor_comissao), 0);
  const totalPago = filteredPagas.reduce((s, l) => s + Number(l.valor_comissao), 0);

  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);
  const totalPagoMes = pagas
    .filter((l) => l.data_pagamento && new Date(l.data_pagamento) >= inicioMes)
    .reduce((s, l) => s + Number(l.valor_comissao), 0);

  return (
    <>
      <PageHeader title="Comissões" subtitle="Controle de comissões por funcionário" />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-card border rounded-xl p-5">
          <div className="text-xs text-muted-foreground uppercase">Total a pagar</div>
          <div className="text-2xl font-display text-destructive mt-1">{BRL(totalAPagar)}</div>
        </div>
        <div className="bg-card border rounded-xl p-5">
          <div className="text-xs text-muted-foreground uppercase">Total pago</div>
          <div className="text-2xl font-display text-success mt-1">{BRL(totalPago)}</div>
        </div>
        <div className="bg-card border rounded-xl p-5 col-span-2 lg:col-span-1">
          <div className="text-xs text-muted-foreground uppercase">Pago no mês atual</div>
          <div className="text-2xl font-display text-primary mt-1">{BRL(totalPagoMes)}</div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="w-full sm:w-64">
          <Select value={funcFilter} onValueChange={setFuncFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por funcionário" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os funcionários</SelectItem>
              {funcs.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-muted-foreground">
          {funcFilter === "todos" ? `${list.length} registro(s)` : `${filteredPendentes.length + filteredPagas.length} registro(s)`}
        </div>
      </div>

      <Tabs defaultValue="pendentes">
        <TabsList>
          <TabsTrigger value="pendentes">Pendentes</TabsTrigger>
          <TabsTrigger value="pagas">Pagas</TabsTrigger>
        </TabsList>
        <TabsContent value="pendentes">
          <Lista items={filteredPendentes} marcarPago={marcarPago} funcs={funcs} />
        </TabsContent>
        <TabsContent value="pagas">
          <Lista items={filteredPagas} funcs={funcs} readOnly />
        </TabsContent>
      </Tabs>

      {list.length === 0 && <EmptyState icon={Percent} title="Sem comissões" hint="Conclua uma OS com mecânico vinculado para gerar comissões." />}
    </>
  );
}

function Lista({ items, marcarPago, funcs, readOnly }: any) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground p-4">Nada por aqui.</p>;

  const getFuncName = (id: string) => funcs.find((f: any) => f.id === id)?.nome ?? "—";

  return (
    <div className="bg-card border rounded-xl overflow-hidden mt-4">
      <table className="w-full text-sm">
        <thead className="bg-muted text-xs uppercase text-muted-foreground">
          <tr>
            <th className="text-left px-4 py-3">Funcionário</th>
            <th className="text-left px-4 py-3">OS #</th>
            <th className="text-right px-4 py-3">Valor Serviços</th>
            <th className="text-right px-4 py-3">% Comissão</th>
            <th className="text-right px-4 py-3">Valor Comissão</th>
            <th className="text-left px-4 py-3 hidden md:table-cell">Data</th>
            <th className="text-left px-4 py-3">Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((l: any) => (
            <tr key={l.id} className="border-t border-border">
              <td className="px-4 py-3 font-medium">{l.funcionarios_mecanico?.nome ?? getFuncName(l.funcionario_id)}</td>
              <td className="px-4 py-3 font-mono text-primary">#{l.ordens_servico_mecanico?.numero ?? l.os_id.slice(0, 6)}</td>
              <td className="px-4 py-3 text-right font-mono">{BRL(l.valor_total_servicos)}</td>
              <td className="px-4 py-3 text-right font-mono">{l.percentual}%</td>
              <td className="px-4 py-3 text-right font-mono font-semibold">{BRL(l.valor_comissao)}</td>
              <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{fmtDate(l.created_at)}</td>
              <td className="px-4 py-3">
                {l.pago ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs bg-success/20 text-success border-success/40">
                    <BadgeCheck className="h-3 w-3" /> Paga
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs bg-warning/20 text-warning border-warning/40">
                    Pendente
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-right whitespace-nowrap">
                {!readOnly && (
                  <Button size="sm" className="bg-gradient-primary text-primary-foreground" onClick={() => marcarPago(l)}>
                    <Check className="h-3 w-3 mr-1" /> Marcar paga
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
