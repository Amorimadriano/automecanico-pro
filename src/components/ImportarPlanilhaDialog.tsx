import { useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Upload, FileSpreadsheet, Download, AlertTriangle, CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";

interface Campo {
  key: string;
  label: string;
  required?: boolean;
  transform?: (v: any) => any;
}

interface ImportarPlanilhaDialogProps {
  tabela: string;
  campos: Campo[];
  titulo: string;
  onSuccess?: () => void;
  onBeforeInsert?: (payload: any[]) => Promise<any[]>;
}

export function ImportarPlanilhaDialog({ tabela, campos, titulo, onSuccess, onBeforeInsert }: ImportarPlanilhaDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"upload" | "map" | "preview" | "done">("upload");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<{ row: number; campo: string; valor: any; erro: string }[]>([]);
  const [imported, setImported] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const guessMapping = useCallback((fileHeaders: string[]) => {
    const map: Record<string, string> = {};
    campos.forEach((c) => {
      const lowerLabel = c.label.toLowerCase();
      const lowerKey = c.key.toLowerCase();
      const match = fileHeaders.find(
        (h) =>
          h.toLowerCase() === lowerKey ||
          h.toLowerCase() === lowerLabel ||
          h.toLowerCase().includes(lowerKey) ||
          lowerKey.includes(h.toLowerCase())
      );
      if (match) map[c.key] = match;
    });
    return map;
  }, [campos]);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target!.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as any[][];
      if (json.length < 2) {
        toast.error("Planilha vazia ou sem dados.");
        return;
      }
      const fileHeaders = json[0].map((h: any) => String(h).trim());
      const fileRows = json.slice(1).map((row) => {
        const obj: any = {};
        fileHeaders.forEach((h, i) => (obj[h] = row[i]));
        return obj;
      });
      setHeaders(fileHeaders);
      setRows(fileRows);
      setMapping(guessMapping(fileHeaders));
      setStep("map");
    };
    reader.readAsArrayBuffer(file);
  }

  function baixarModelo() {
    const ws = XLSX.utils.aoa_to_sheet([campos.map((c) => c.label)]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, titulo);
    XLSX.writeFile(wb, `modelo_${tabela}.xlsx`);
  }

  function validar() {
    const errs: typeof errors = [];
    rows.forEach((row, idx) => {
      campos.forEach((c) => {
        if (!c.required) return;
        const col = mapping[c.key];
        const val = col !== undefined ? row[col] : undefined;
        if (val === undefined || val === null || val === "") {
          errs.push({ row: idx + 2, campo: c.label, valor: val, erro: "Campo obrigatório ausente" });
        }
      });
    });
    setErrors(errs);
    if (errs.length > 0) {
      setStep("preview");
      toast.error(`${errs.length} erro(s) encontrados. Revise antes de importar.`);
    } else {
      setStep("preview");
      toast.success("Validação OK! Revise os dados e confirme a importação.");
    }
  }

  async function confirmarImportacao() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return toast.error("Usuário não autenticado");

    const payload = rows.map((row) => {
      const obj: any = { user_id: user.id };
      campos.forEach((c) => {
        const col = mapping[c.key];
        if (col !== undefined) {
          let v = row[col];
          if (c.transform) v = c.transform(v);
          if (v !== undefined && v !== null && v !== "") obj[c.key] = v;
        }
      });
      return obj;
    });

    let finalPayload = payload;
    if (onBeforeInsert) {
      try {
        finalPayload = await onBeforeInsert(payload);
      } catch (err: any) {
        toast.error(err.message || "Erro ao processar dados antes da importação.");
        setStep("done");
        setImported(0);
        return;
      }
    }

    // Insert in batches of 500
    let total = 0;
    for (let i = 0; i < finalPayload.length; i += 500) {
      const batch = finalPayload.slice(i, i + 500);
      const { error } = await (supabase.from as any)(tabela).insert(batch);
      if (error) {
        toast.error(`Erro no lote ${Math.floor(i / 500) + 1}: ${error.message}`);
        setStep("done");
        setImported(total);
        return;
      }
      total += batch.length;
    }

    setImported(total);
    setStep("done");
    toast.success(`${total} registro(s) importados com sucesso!`);
    onSuccess?.();
  }

  function reset() {
    setStep("upload");
    setHeaders([]);
    setRows([]);
    setMapping({});
    setErrors([]);
    setImported(0);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <Upload className="h-4 w-4" /> Importar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-green-600" />
            Importar {titulo}
          </DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-muted rounded-xl p-8 text-center space-y-3">
              <Upload className="h-10 w-10 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">
                Arraste um arquivo .xlsx, .xls ou .csv ou clique para selecionar.
              </p>
              <Input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={onFile} className="mx-auto max-w-xs" />
            </div>
            <Button variant="ghost" size="sm" className="w-full gap-2 text-muted-foreground" onClick={baixarModelo}>
              <Download className="h-4 w-4" /> Baixar modelo de planilha
            </Button>
          </div>
        )}

        {step === "map" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Mapeie as colunas da planilha para os campos do sistema. Colunas obrigatórias estão marcadas com *.
            </p>
            <div className="space-y-2">
              {campos.map((c) => (
                <div key={c.key} className="flex items-center gap-3">
                  <Label className="w-40 shrink-0 text-sm">
                    {c.label}
                    {c.required && <span className="text-destructive ml-1">*</span>}
                  </Label>
                  <Select
                    value={mapping[c.key] ?? "__UNMAPPED__"}
                    onValueChange={(v) => {
                      if (v === "__UNMAPPED__" || v === "__IGNORE__") {
                        setMapping((m) => { const n = { ...m }; delete n[c.key]; return n; });
                      } else {
                        setMapping((m) => ({ ...m, [c.key]: v }));
                      }
                    }}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecione a coluna da planilha">
                        {mapping[c.key] ?? "(Ignorar)"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__UNMAPPED__">(Ignorar)</SelectItem>
                      {headers.map((h) => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="ghost" onClick={() => setStep("upload")}>Voltar</Button>
              <Button className="bg-gradient-primary text-primary-foreground ml-auto" onClick={validar}>
                Validar e visualizar
              </Button>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            {errors.length > 0 && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-destructive">{errors.length} erro(s) encontrados</p>
                  <ul className="mt-1 space-y-0.5 text-destructive/80 max-h-32 overflow-y-auto">
                    {errors.slice(0, 10).map((e, i) => (
                      <li key={i}>Linha {e.row}: {e.campo} — {e.erro}</li>
                    ))}
                    {errors.length > 10 && <li>... e mais {errors.length - 10} erros</li>}
                  </ul>
                </div>
              </div>
            )}

            {errors.length === 0 && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                <span className="text-sm font-medium text-green-700">Todos os campos obrigatórios estão preenchidos.</span>
              </div>
            )}

            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted px-3 py-2 text-xs text-muted-foreground uppercase font-medium flex justify-between">
                <span>Preview ({Math.min(rows.length, 5)} de {rows.length} linhas)</span>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    {campos.map((c) => (
                      <th key={c.key} className="text-left px-3 py-2">{c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 5).map((row, idx) => (
                    <tr key={idx} className="border-t border-border">
                      {campos.map((c) => {
                        const col = mapping[c.key];
                        const val = col !== undefined ? row[col] : "—";
                        const hasError = errors.some((e) => e.row === idx + 2 && e.campo === c.label);
                        return (
                          <td key={c.key} className={`px-3 py-2 ${hasError ? "text-destructive font-medium" : ""}`}>
                            {val !== undefined && val !== null && val !== "" ? String(val) : "—"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="ghost" onClick={() => setStep("map")}>Voltar</Button>
              <Button
                className="bg-gradient-primary text-primary-foreground ml-auto"
                onClick={confirmarImportacao}
                disabled={errors.length > 0}
              >
                Importar {rows.length} registro(s)
              </Button>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="text-center space-y-4 py-4">
            <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
            <div>
              <p className="text-lg font-medium font-display">Importação concluída</p>
              <p className="text-sm text-muted-foreground mt-1">
                {imported} de {rows.length} registro(s) importados com sucesso.
              </p>
            </div>
            <Button onClick={() => { setOpen(false); reset(); }} className="bg-gradient-primary text-primary-foreground">
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
