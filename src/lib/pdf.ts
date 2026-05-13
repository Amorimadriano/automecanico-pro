import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
import { BRL, fmtDate } from "./format";

// Gera payload Pix EMVCo estático (padrão BRCODE)
function gerarPayloadPix(chave: string, valor: number, _descricao: string): string {
  function pad(id: string, val: string) {
    const len = val.length.toString().padStart(2, "0");
    return id + len + val;
  }

  // Merchant Account Information
  const mai = pad("00", "br.gov.bcb.pix") + pad("01", chave);

  // Additional Data Field (TXID)
  const txid = pad("05", "***");

  let payload =
    pad("00", "01") +           // Payload Format Indicator
    pad("26", mai) +            // Merchant Account Information
    pad("52", "0000") +         // Merchant Category Code
    pad("53", "986");           // Transaction Currency (BRL)

  if (valor > 0) {
    payload += pad("54", valor.toFixed(2)); // Transaction Amount
  }

  payload +=
    pad("58", "BR") +           // Country Code
    pad("62", txid) +           // Additional Data Field
    "6304";                     // CRC16 placeholder

  // CRC16-CCITT-FALSE
  function crc16(str: string): string {
    let crc = 0xFFFF;
    const polynomial = 0x1021;
    for (let i = 0; i < str.length; i++) {
      crc ^= str.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        if ((crc & 0x8000) !== 0) {
          crc = ((crc << 1) ^ polynomial) & 0xFFFF;
        } else {
          crc = (crc << 1) & 0xFFFF;
        }
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, "0");
  }

  return payload + crc16(payload);
}

export async function gerarOSPdf(os: any, cliente: any, veiculo: any, itens: any[], funcionario?: any, empresa?: any) {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();

  // Header com dados da empresa
  doc.setFillColor(20, 20, 20);
  doc.rect(0, 0, pageW, empresa ? 36 : 28, "F");
  doc.setFillColor(234, 88, 12);
  doc.rect(0, empresa ? 36 : 28, pageW, 2, "F");

  doc.setTextColor(234, 88, 12);
  doc.setFont("helvetica", "bold"); doc.setFontSize(18);
  doc.text(empresa?.nome_fantasia || empresa?.razao_social || "OFICINA ERP", 14, 14);

  if (empresa) {
    doc.setTextColor(200);
    doc.setFontSize(8); doc.setFont("helvetica", "normal");
    let h = 22;
    if (empresa.cnpj) { doc.text(`CNPJ: ${empresa.cnpj}`, 14, h); h += 4; }
    if (empresa.endereco) { doc.text(empresa.endereco, 14, h); h += 4; }
    if (empresa.telefone) { doc.text(`Tel: ${empresa.telefone}`, 14, h); }
  }

  doc.setTextColor(255);
  doc.setFontSize(10); doc.setFont("helvetica", "normal");
  doc.text(`Ordem de Serviço #${os.numero}`, 14, empresa ? 36 : 22);
  doc.text(`Emitida: ${fmtDate(new Date())}`, pageW - 14, empresa ? 36 : 22, { align: "right" });

  let y = empresa ? 48 : 40;
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

  let footerY = doc.internal.pageSize.getHeight() - 12;

  // QR Code Pix
  if (empresa?.chave_pix && Number(os.total) > 0) {
    try {
      const payload = gerarPayloadPix(empresa.chave_pix, Number(os.total), `OS #${os.numero}`);
      const dataUrl = await QRCode.toDataURL(payload, { width: 300, margin: 2, errorCorrectionLevel: "M" });
      const qrSize = 40;
      const qrX = 14;
      const qrY = doc.internal.pageSize.getHeight() - 60;
      doc.addImage(dataUrl, "PNG", qrX, qrY, qrSize, qrSize);

      doc.setTextColor(40); doc.setFontSize(9); doc.setFont("helvetica", "bold");
      doc.text("Pague com Pix", qrX, qrY - 4);
      doc.setFontSize(8); doc.setFont("helvetica", "normal");
      doc.text(`Chave: ${empresa.chave_pix}`, qrX + qrSize + 5, qrY + 10);
      doc.text(`Valor: ${BRL(os.total)}`, qrX + qrSize + 5, qrY + 16);
      doc.setFontSize(7); doc.setTextColor(120);
      doc.text("Escaneie o QR Code ou copie a chave Pix", qrX + qrSize + 5, qrY + 24);

      footerY = qrY - 8;
    } catch {
      doc.setTextColor(234, 88, 12); doc.setFontSize(9); doc.setFont("helvetica", "bold");
      doc.text(`Pagamento via Pix: ${empresa.chave_pix}`, pageW / 2, footerY, { align: "center" });
      footerY -= 5;
    }
  }

  doc.setTextColor(120); doc.setFontSize(8); doc.setFont("helvetica", "normal");
  doc.text(empresa?.nome_fantasia || empresa?.razao_social || "Oficina ERP", pageW / 2, footerY, { align: "center" });

  doc.save(`OS-${os.numero}.pdf`);
}
