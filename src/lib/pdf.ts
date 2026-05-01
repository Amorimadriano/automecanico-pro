import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { BRL, fmtDate } from "./format";

export function gerarOSPdf(os: any, cliente: any, veiculo: any, itens: any[], funcionario?: any) {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(20, 20, 20);
  doc.rect(0, 0, pageW, 28, "F");
  doc.setFillColor(234, 88, 12);
  doc.rect(0, 28, pageW, 2, "F");
  doc.setTextColor(234, 88, 12);
  doc.setFont("helvetica", "bold"); doc.setFontSize(20);
  doc.text("OFICINA ERP", 14, 14);
  doc.setTextColor(255);
  doc.setFontSize(10); doc.setFont("helvetica", "normal");
  doc.text(`Ordem de Serviço #${os.numero}`, 14, 22);
  doc.text(`Emitida: ${fmtDate(new Date())}`, pageW - 14, 22, { align: "right" });

  let y = 40;
  doc.setTextColor(40);
  doc.setFontSize(11); doc.setFont("helvetica", "bold");
  doc.text("CLIENTE", 14, y);
  doc.text("VEÍCULO", pageW / 2 + 4, y);
  y += 5;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  doc.text(`${cliente?.nome ?? "—"}`, 14, y);
  doc.text(`${veiculo?.placa ?? "—"} • ${[veiculo?.marca, veiculo?.modelo].filter(Boolean).join(" ")}`, pageW / 2 + 4, y);
  y += 5;
  doc.text(`Tel: ${cliente?.telefone ?? "—"}`, 14, y);
  doc.text(`Ano: ${veiculo?.ano ?? "—"} • KM: ${os.km_entrada ?? "—"}`, pageW / 2 + 4, y);
  y += 5;
  doc.text(`Doc: ${cliente?.documento ?? "—"}`, 14, y);
  if (funcionario) doc.text(`Mecânico: ${funcionario.nome}`, pageW / 2 + 4, y);

  y += 10;
  if (os.descricao_problema) {
    doc.setFont("helvetica", "bold"); doc.setFontSize(10);
    doc.text("Problema relatado", 14, y); y += 5;
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    const lines = doc.splitTextToSize(os.descricao_problema, pageW - 28);
    doc.text(lines, 14, y); y += lines.length * 4 + 3;
  }
  if (os.diagnostico) {
    doc.setFont("helvetica", "bold"); doc.setFontSize(10);
    doc.text("Diagnóstico / Serviço executado", 14, y); y += 5;
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    const lines = doc.splitTextToSize(os.diagnostico, pageW - 28);
    doc.text(lines, 14, y); y += lines.length * 4 + 3;
  }

  autoTable(doc, {
    startY: y + 4,
    head: [["Tipo", "Descrição", "Qtd", "Unit.", "Subtotal"]],
    body: itens.map((i) => [
      i.tipo === "peca" ? "Peça" : "Serviço",
      i.descricao,
      String(i.quantidade),
      BRL(i.preco_unitario),
      BRL(i.subtotal),
    ]),
    headStyles: { fillColor: [234, 88, 12], textColor: 255 },
    styles: { fontSize: 9 },
    theme: "striped",
  });

  const finalY = (doc as any).lastAutoTable.finalY + 6;
  const xR = pageW - 14;
  doc.setFontSize(10); doc.setFont("helvetica", "normal");
  doc.text(`Peças: ${BRL(os.total_pecas)}`, xR, finalY, { align: "right" });
  doc.text(`Serviços: ${BRL(os.total_servicos)}`, xR, finalY + 5, { align: "right" });
  if (Number(os.desconto) > 0) doc.text(`Desconto: -${BRL(os.desconto)}`, xR, finalY + 10, { align: "right" });
  doc.setFont("helvetica", "bold"); doc.setFontSize(14);
  doc.setTextColor(234, 88, 12);
  doc.text(`TOTAL: ${BRL(os.total)}`, xR, finalY + 18, { align: "right" });

  doc.setTextColor(120); doc.setFontSize(8); doc.setFont("helvetica", "normal");
  doc.text("Documento gerado por Oficina ERP", pageW / 2, doc.internal.pageSize.getHeight() - 8, { align: "center" });

  doc.save(`OS-${os.numero}.pdf`);
}
