import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  Bluetooth,
  BluetoothOff,
  Gauge,
  Thermometer,
  AlertTriangle,
  RotateCcw,
  Activity,
  Stethoscope,
  ScanLine,
  Car,
  Wrench,
} from "lucide-react";
import {
  isWebBluetoothSupported,
  connectOBD2,
  disconnectOBD2,
  readDTC,
  clearDTC,
  readPID,
  createMockConnection,
  OBD2_PIDS,
  type OBD2Connection,
  type DTCItem,
  type PIDValue,
} from "@/lib/obd2";

interface DiagnosticoOBD2ModalProps {
  veiculo: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DiagnosticoOBD2Modal({ veiculo, open, onOpenChange }: DiagnosticoOBD2ModalProps) {
  const id = veiculo?.id;
  const [osList, setOsList] = useState<any[]>([]);
  const [conn, setConn] = useState<OBD2Connection | null>(null);
  const [simulated, setSimulated] = useState(false);
  const [dtcs, setDtcs] = useState<DTCItem[]>([]);
  const [pids, setPids] = useState<Record<string, PIDValue>>({});
  const [loadingDTC, setLoadingDTC] = useState(false);
  const [loadingClear, setLoadingClear] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selectedOs, setSelectedOs] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (open && id) {
      loadOSList();
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (conn) disconnectOBD2(conn);
    };
  }, [open, id]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      handleDisconnect();
      setDtcs([]);
      setPids({});
      setSimulated(false);
      setScanning(false);
    }
  }, [open]);

  async function loadOSList() {
    if (!id) return;
    const { data } = await supabase
      .from("ordens_servico_mecanico")
      .select("id, numero, status, data_entrada")
      .eq("veiculo_id", id)
      .order("data_entrada", { ascending: false });
    setOsList(data ?? []);
  }

  async function handleConnect() {
    if (!isWebBluetoothSupported()) {
      toast.error("Seu navegador não suporta Web Bluetooth. Ative o modo simulação.");
      return;
    }
    const connection = await connectOBD2();
    if (connection) {
      setConn(connection);
      setSimulated(false);
      toast.success("OBD2 conectado!");
      startScanning(connection);
    } else {
      toast.info("Nenhum dispositivo selecionado. Ative o modo simulação para testar.");
    }
  }

  function handleSimulate() {
    if (conn) disconnectOBD2(conn);
    const mock = createMockConnection();
    setConn(mock);
    setSimulated(true);
    toast.info("Modo de demonstração ativado");
    startScanning(mock);
  }

  function handleDisconnect() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (conn) disconnectOBD2(conn);
    setConn(null);
    setSimulated(false);
    setDtcs([]);
    setPids({});
    setScanning(false);
  }

  async function scanOnce(connection: OBD2Connection) {
    try {
      const codes = await readDTC(connection);
      setDtcs(codes);
    } catch {
      // ignore intermittent errors
    }
    const pidKeys = Object.keys(OBD2_PIDS);
    const nextPids: Record<string, PIDValue> = {};
    for (const pid of pidKeys) {
      try {
        const val = await readPID(connection, pid);
        if (val) nextPids[pid] = val;
      } catch {
        // ignore
      }
    }
    setPids(nextPids);
  }

  function startScanning(connection: OBD2Connection) {
    setScanning(true);
    scanOnce(connection);
    intervalRef.current = setInterval(() => {
      scanOnce(connection);
    }, 1500);
  }

  async function handleClearDTC() {
    if (!conn) return;
    setLoadingClear(true);
    const ok = await clearDTC(conn);
    setLoadingClear(false);
    if (ok) {
      setDtcs([]);
      toast.success("Códigos de erro limpos");
    } else {
      toast.error("Não foi possível limpar os códigos");
    }
  }

  async function handleImportDiagnostico() {
    if (!selectedOs) return toast.error("Selecione uma OS");
    const codesText = dtcs.map((d) => `${d.code}: ${d.description}`).join("\n");
    const pidText = Object.values(pids)
      .map((p) => `${p.name}: ${p.value} ${p.unit}`)
      .join("\n");
    const diagnostico = [`Diagnóstico OBD2 — ${new Date().toLocaleString("pt-BR")}`, "", "Códigos de erro:", codesText || "Nenhum", "", "Leituras:", pidText || "Nenhuma"].join("\n");

    const { error } = await supabase.from("ordens_servico_mecanico").update({ diagnostico }).eq("id", selectedOs);
    if (error) return toast.error(error.message);
    toast.success("Diagnóstico importado para a OS");
    setImportOpen(false);
    setSelectedOs("");
  }

  const supported = isWebBluetoothSupported();
  const isConnected = !!conn;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-primary" />
            Diagnóstico OBD2
            {veiculo && (
              <span className="text-muted-foreground text-sm font-normal">
                — {veiculo.placa} {veiculo.marca} {veiculo.modelo}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 mb-4">
          {isConnected ? (
            <Button variant="outline" size="sm" onClick={handleDisconnect}>
              <BluetoothOff className="h-4 w-4 mr-2" />Desconectar
            </Button>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button size="sm" onClick={handleConnect} disabled={!supported}>
                      <Bluetooth className="h-4 w-4 mr-2" />Conectar OBD2
                    </Button>
                  </span>
                </TooltipTrigger>
                {!supported && (
                  <TooltipContent>
                    <p>Seu navegador não suporta Web Bluetooth (Chrome/Android necessário)</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          )}
          {!isConnected && (
            <Button size="sm" variant="secondary" onClick={handleSimulate}>
              <Activity className="h-4 w-4 mr-2" />Modo demonstração
            </Button>
          )}
        </div>

        {simulated && (
          <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2">
            <ScanLine className="h-3 w-3" />
            Modo de demonstração — conecte um adaptador OBD2 Bluetooth para leituras reais
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-4">
          {/* DTCs */}
          <Card className="md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="font-display text-base flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-primary" />
                Códigos de erro (DTCs)
              </CardTitle>
              {isConnected && dtcs.length > 0 && (
                <Button size="sm" variant="outline" onClick={handleClearDTC} disabled={loadingClear}>
                  <RotateCcw className="h-3 w-3 mr-1" />
                  {loadingClear ? "Limpando..." : "Limpar"}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {!isConnected ? (
                <div className="text-sm text-muted-foreground text-center py-6">
                  Conecte um adaptador OBD2 ou ative o modo de demonstração para visualizar os códigos.
                </div>
              ) : loadingDTC ? (
                <div className="text-sm text-muted-foreground text-center py-6">Lendo códigos...</div>
              ) : dtcs.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-6">Nenhum código de erro encontrado.</div>
              ) : (
                <div className="space-y-2">
                  {dtcs.map((d) => (
                    <div key={d.code} className="flex items-start gap-2 bg-muted rounded-lg p-2">
                      <div className="mt-0.5">
                        {d.severity === "alta" ? (
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                        ) : d.severity === "média" ? (
                          <AlertTriangle className="h-4 w-4 text-warning" />
                        ) : (
                          <Activity className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-primary font-semibold text-sm">{d.code}</span>
                          <Badge variant="secondary" className="text-[10px]">
                            {d.severity}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">{d.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Leituras em tempo real */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-base flex items-center gap-2">
                <Gauge className="h-4 w-4 text-primary" />
                Leituras em tempo real
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!isConnected ? (
                <div className="text-sm text-muted-foreground text-center py-6">
                  Conecte um adaptador OBD2 ou ative o modo de demonstração.
                </div>
              ) : Object.keys(pids).length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-6">
                  {scanning ? "Aguardando leituras..." : "Sem leituras"}
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.values(pids).map((p) => (
                    <div key={p.pid} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {p.name === "RPM" && <Gauge className="h-3 w-3" />}
                        {p.name === "Velocidade" && <Car className="h-3 w-3" />}
                        {p.name.includes("Temp") && <Thermometer className="h-3 w-3" />}
                        {p.name}
                      </div>
                      <div className="font-mono text-sm text-foreground">
                        {p.value} <span className="text-xs text-muted-foreground">{p.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Importar diagnóstico */}
        {isConnected && (
          <div className="mt-4">
            <Button className="bg-gradient-primary text-primary-foreground shadow-glow" onClick={() => setImportOpen(true)}>
              <Wrench className="h-4 w-4 mr-2" />Adicionar diagnóstico à OS
            </Button>
          </div>
        )}

        <Dialog open={importOpen} onOpenChange={setImportOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display">Importar diagnóstico para OS</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Label>Selecione a ordem de serviço</Label>
              <Select value={selectedOs} onValueChange={setSelectedOs}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha uma OS" />
                </SelectTrigger>
                <SelectContent>
                  {osList.map((os) => (
                    <SelectItem key={os.id} value={os.id}>
                      OS #{os.numero} — {os.status} ({new Date(os.data_entrada).toLocaleDateString("pt-BR")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {dtcs.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhum código de erro encontrado. Será importado apenas as leituras de sensores.</p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setImportOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleImportDiagnostico} disabled={!selectedOs} className="bg-gradient-primary text-primary-foreground">
                Importar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
