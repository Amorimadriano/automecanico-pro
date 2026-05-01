export const BRL = (n: number | null | undefined) =>
  (Number(n ?? 0)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const fmtDate = (d?: string | Date | null) => {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("pt-BR");
};

export const fmtDateTime = (d?: string | Date | null) => {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
};

export const STATUS_OS: Record<string, { label: string; cls: string }> = {
  aberta: { label: "Aberta", cls: "bg-chart-5/20 text-chart-5 border-chart-5/40" },
  em_andamento: { label: "Em Andamento", cls: "bg-warning/20 text-warning border-warning/40" },
  aguardando_pecas: { label: "Aguard. Peças", cls: "bg-destructive/20 text-destructive border-destructive/40" },
  concluida: { label: "Concluída", cls: "bg-success/20 text-success border-success/40" },
  cancelada: { label: "Cancelada", cls: "bg-muted text-muted-foreground border-border" },
};
