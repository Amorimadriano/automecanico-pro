import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Building2, MapPin, CreditCard, Bell, Receipt, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/configuracoes")({
  component: ConfiguracoesPage,
});

type Empresa = {
  id: string;
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  endereco: string;
  telefone: string;
  chave_pix: string;
  alerta_estoque_baixo: boolean;
  cupom_fiscal_automatico: boolean;
};

function ConfiguracoesPage() {
  const { user } = useAuth();
  const [aba, setAba] = useState<"empresa" | "preferencias">("empresa");
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [empresa, setEmpresa] = useState<Partial<Empresa>>({
    razao_social: "",
    nome_fantasia: "",
    cnpj: "",
    endereco: "",
    telefone: "",
    chave_pix: "",
    alerta_estoque_baixo: true,
    cupom_fiscal_automatico: false,
  });

  useEffect(() => {
    if (user) carregar();
  }, [user]);

  async function carregar() {
    setLoading(true);
    const { data } = await supabase
      .from("empresas_mecanico")
      .select("*")
      .eq("user_id", user!.id)
      .single();
    if (data) {
      setEmpresa({
        razao_social: data.razao_social || "",
        nome_fantasia: data.nome_fantasia || "",
        cnpj: data.cnpj || "",
        endereco: data.endereco || "",
        telefone: data.telefone || "",
        chave_pix: data.chave_pix || "",
        alerta_estoque_baixo: data.alerta_estoque_baixo ?? true,
        cupom_fiscal_automatico: data.cupom_fiscal_automatico ?? false,
      });
    }
    setLoading(false);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    const { error } = await supabase
      .from("empresas_mecanico")
      .upsert({
        user_id: user!.id,
        ...empresa,
      }, { onConflict: "user_id" });
    setSalvando(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success("Configurações salvas com sucesso!");
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Carregando...
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl">Configurações</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Dados da oficina e preferências do sistema
        </p>
      </div>

      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
        <button
          onClick={() => setAba("empresa")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition ${
            aba === "empresa"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Building2 className="h-4 w-4 inline mr-1.5 -mt-0.5" />
          Dados da Empresa
        </button>
        <button
          onClick={() => setAba("preferencias")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition ${
            aba === "preferencias"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Bell className="h-4 w-4 inline mr-1.5 -mt-0.5" />
          Preferências
        </button>
      </div>

      <form onSubmit={salvar} className="bg-card border rounded-xl p-6 space-y-5">
        {aba === "empresa" && (
          <>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome Fantasia</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={empresa.nome_fantasia}
                    onChange={(e) => setEmpresa({ ...empresa, nome_fantasia: e.target.value })}
                    placeholder="Oficina do João"
                    className="w-full pl-10 pr-4 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Razão Social</label>
                <input
                  type="text"
                  value={empresa.razao_social}
                  onChange={(e) => setEmpresa({ ...empresa, razao_social: e.target.value })}
                  placeholder="João da Silva Serviços Automotivos LTDA"
                  className="w-full px-4 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">CNPJ</label>
                <input
                  type="text"
                  value={empresa.cnpj}
                  onChange={(e) => setEmpresa({ ...empresa, cnpj: e.target.value })}
                  placeholder="00.000.000/0000-00"
                  className="w-full px-4 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Telefone</label>
                <input
                  type="text"
                  value={empresa.telefone}
                  onChange={(e) => setEmpresa({ ...empresa, telefone: e.target.value })}
                  placeholder="(11) 99999-9999"
                  className="w-full px-4 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Endereço Completo</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={empresa.endereco}
                  onChange={(e) => setEmpresa({ ...empresa, endereco: e.target.value })}
                  placeholder="Rua Exemplo, 123 - Bairro - Cidade/UF - CEP"
                  className="w-full pl-10 pr-4 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Chave Pix</label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={empresa.chave_pix}
                  onChange={(e) => setEmpresa({ ...empresa, chave_pix: e.target.value })}
                  placeholder="CNPJ, e-mail, telefone ou chave aleatória"
                  className="w-full pl-10 pr-4 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <p className="text-xs text-muted-foreground">Essa chave aparece na impressão da OS para pagamento.</p>
            </div>
          </>
        )}

        {aba === "preferencias" && (
          <>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <Bell className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <div className="font-medium">Alerta de estoque baixo</div>
                    <div className="text-sm text-muted-foreground">Notificar quando peças atingirem quantidade mínima</div>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={empresa.alerta_estoque_baixo}
                    onChange={(e) => setEmpresa({ ...empresa, alerta_estoque_baixo: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Receipt className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium">Cupom fiscal automático</div>
                    <div className="text-sm text-muted-foreground">Gera cupom fiscal ao concluir OS (requer integração futura)</div>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={empresa.cupom_fiscal_automatico}
                    onChange={(e) => setEmpresa({ ...empresa, cupom_fiscal_automatico: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            </div>
          </>
        )}

        <div className="pt-2 border-t">
          <button
            type="submit"
            disabled={salvando}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition disabled:opacity-60"
          >
            {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {salvando ? "Salvando..." : "Salvar Configurações"}
          </button>
        </div>
      </form>
    </div>
  );
}
