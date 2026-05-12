import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Search, Shield, ShieldAlert, ShieldCheck } from "lucide-react";
import { fmtDate } from "@/lib/format";

export const Route = createFileRoute("/app/garantias")({
  component: Page,
  head: () => ({ meta: [{ title: "Garantias — Oficina ERP" }] }),
});

type GarantiaItem = {
  item_id: string;
  os_id: string;
  os_numero: number;
  descricao: string;
  tipo: string;
  garantia_dias: number | null;
  garantia_data_vencimento: string | null;
  tem_garantia: boolean;
  cliente_id: string;
  veiculo_id: string;
  user_id: string;
  data_entrada: string;
  data_conclusao: string | null;
  cliente_nome?: string;
  veiculo_placa?: string;
};

function Page() {
  const [itens, setItens] = useState<GarantiaItem[]>([]);
  const [clientes, setClientes] = useState<Record<string, string>>({});
  const [veiculos, setVeiculos] = useState<Record<string, string>>({});
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("ativas");

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase
      .from("v_garantias_ativas_mecanico")
      .select("*")
      .order("garantia_data_vencimento", { ascending: true });

    const lista = (data ?? []) as GarantiaItem[];

    const clienteIds = [...new Set(lista.map((i) => i.cliente_id))];
    const veiculoIds = [...new Set(lista.map((i) => i.veiculo_id))];

    const [cRes, vRes] = await Promise.all([
      supabase.from("clientes_mecanico").select("id,nome").in("id", clienteIds.length ? clienteIds : [""]),
      supabase.from("veiculos_mecanico").select("id,placa").in("id", veiculoIds.length ? veiculoIds : [""]),
    ]);

    const cMap: Record<string, string> = {};
    (cRes.data ?? []).forEach((c: any) => (cMap[c.id] = c.nome));
    const vMap: Record<string, string> = {};
    (vRes.data ?? []).forEach((v: any) => (vMap[v.id] = v.placa));

    setItens(lista);
    setClientes(cMap);
    setVeiculos(vMap);
  }

  const agora = new Date();
  const em15 = new Date();
  em15.setDate(agora.getDate() + 15);

  const comMeta = useMemo(() => {
    return itens.map((i) => {
      const venc = i.garantia_data_vencimento ? new Date(i.garantia_data_vencimento) : null;
      let status: "ativa" | "proxima" | "vencida" = "ativa";
      if (!venc) return { ...i, status };
      if (venc < agora) status = "vencida";
      else if (venc <= em15) status = "proxima";
      return { ...i, status };
    });
  }, [itens]);

  const filtrado = useMemo(() => {
    const termo = q.trim().toLowerCase();
    return comMeta.filter((i) => {
      const matchTab =
        tab === "ativas" ? i.status === "ativa" : tab === "proximas" ? i.status === "proxima" : i.status === "vencida";
      if (!matchTab) return false;
      if (!termo) return true;
      const cliente = clientes[i.cliente_id] ?? "";
      const placa = veiculos[i.veiculo_id] ?? "";
      return (
        i.descricao.toLowerCase().includes(termo) ||
        String(i.os_numero).includes(termo) ||
        cliente.toLowerCase().includes(termo) ||
        placa.toLowerCase().includes(termo)
      );
    });
  }, [comMeta, tab, q, clientes, veiculos]);

  const contagem = {
    ativas: comMeta.filter((i) => i.status === "ativa").length,
    proximas: comMeta.filter((i) => i.status === "proxima").length,
    vencidas: comMeta.filter((i) => i.status === "vencida").length,
  };

  function statusBadge(status: string) {
    if (status === "ativa")
      return (
        <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
          <ShieldCheck className="h-3 w-3 mr-1" />Ativa
        </Badge>
      );
    if (status === "proxima")
      return (
        <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30">
          <ShieldAlert className="h-3 w-3 mr-1" />Próxima
        </Badge>
      );
    return (
      <Badge className="bg-red-500/15 text-red-400 border-red-500/30">
        <Shield className="h-3 w-3 mr-1" />Vencida
      </Badge>
    );
  }

  return (
    <>
      <PageHeader title="Controle de Garantias" subtitle={`${itens.length} itens com garantia`} />

      <div className="relative mb-4 max-w-md">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por OS, descrição, cliente ou placa"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="pl-9"
        />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="ativas">
            Garantias Ativas {contagem.ativas > 0 && `(${contagem.ativas})`}
          </TabsTrigger>
          <TabsTrigger value="proximas">
            Próximas do Vencimento {contagem.proximas > 0 && `(${contagem.proximas})`}
          </TabsTrigger>
          <TabsTrigger value="vencidas">
            Vencidas {contagem.vencidas > 0 && `(${contagem.vencidas})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={tab}>
          <div className="bg-card border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted text-muted-foreground text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3">OS #</th>
                  <th className="text-left px-4 py-3">Descrição</th>
                  <th className="text-left px-4 py-3">Tipo</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Data OS</th>
                  <th className="text-left px-4 py-3">Garantia</th>
                  <th className="text-left px-4 py-3">Vencimento</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">Cliente</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">Veículo</th>
                </tr>
              </thead>
              <tbody>
                {filtrado.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                      Nenhuma garantia encontrada nesta aba.
                    </td>
                  </tr>
                ) : (
                  filtrado.map((i) => (
                    <tr key={i.item_id} className="border-t border-border hover:bg-muted/50">
                      <td className="px-4 py-3 font-mono text-primary">
                        <Link to="/app/os/$id" params={{ id: i.os_id }} className="hover:underline">
                          #{i.os_numero}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-medium">{i.descricao}</td>
                      <td className="px-4 py-3 capitalize">{i.tipo === "peca" ? "Peça" : "Serviço"}</td>
                      <td className="px-4 py-3 hidden md:table-cell">{fmtDate(i.data_entrada)}</td>
                      <td className="px-4 py-3">{i.garantia_dias ?? 0} dias</td>
                      <td className="px-4 py-3">
                        {i.garantia_data_vencimento ? fmtDate(i.garantia_data_vencimento) : "—"}
                      </td>
                      <td className="px-4 py-3">{statusBadge(i.status)}</td>
                      <td className="px-4 py-3 hidden lg:table-cell">{clientes[i.cliente_id] ?? "—"}</td>
                      <td className="px-4 py-3 hidden lg:table-cell font-mono">{veiculos[i.veiculo_id] ?? "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}
