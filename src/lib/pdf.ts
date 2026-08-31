import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
import { BRL, fmtDate } from "./format";

function formatarChavePix(chave: string): string {
  const trimmed = chave.trim();
  if (!trimmed) return "";

  // Email
  if (trimmed.includes("@")) {
    return trimmed.toLowerCase();
  }

  // Chave Aleatória (EVP UUID)
  if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(trimmed)) {
    return trimmed;
  }

  // Telefone com +
  if (trimmed.startsWith("+")) {
    return "+" + trimmed.replace(/\D/g, "");
  }

  // Telefone com parênteses
  if (trimmed.includes("(") || trimmed.includes(")")) {
    return "+55" + trimmed.replace(/\D/g, "");
  }

  const digits = trimmed.replace(/\D/g, "");
  // CNPJ (14 dígitos)
  if (digits.length === 14) {
    return digits;
  }
  // CPF (11 dígitos formatado com . ou -)
  if (digits.length === 11 && (trimmed.includes(".") || trimmed.includes("-"))) {
    return digits;
  }

  return trimmed;
}

// Gera payload Pix EMVCo estático (padrão BRCODE oficial do Banco Central do Brasil)
function gerarPayloadPix(
  chave: string,
  valor: number,
  _descricao: string = "",
  nomeRecebedor: string = "OFICINA ERP",
  cidadeRecebedor: string = "BRASIL"
): string {
  function pad(id: string, val: string) {
    const len = val.length.toString().padStart(2, "0");
    return id + len + val;
  }

  function sanitize(str: string, maxLen: number): string {
    const normalized = str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove acentos
      .replace(/[^a-zA-Z0-9 ]/g, "")   // Apenas alfanuméricos e espaços
      .trim()
      .toUpperCase();
    return (normalized || "RECEBEDOR").substring(0, maxLen);
  }

  const chaveFormatada = formatarChavePix(chave);
  const nomeSanitizado = sanitize(nomeRecebedor, 25);
  const cidadeSanitizada = sanitize(cidadeRecebedor, 15);

  // 26 - Merchant Account Information (Pix)
  const mai = pad("00", "br.gov.bcb.pix") + pad("01", chaveFormatada);

  // 62 - Additional Data Field (TXID)
  const txidSub = pad("05", "***");

  let payload =
    pad("00", "01") +             // Payload Format Indicator (000401)
    pad("26", mai) +              // Merchant Account Information
    pad("52", "0000") +           // Merchant Category Code
    pad("53", "986");             // Transaction Currency (BRL)

  if (valor > 0) {
    payload += pad("54", valor.toFixed(2)); // Transaction Amount
  }

  payload +=
    pad("58", "BR") +             // Country Code (BR)
    pad("59", nomeSanitizado) +   // Nome do Recebedor (Tag 59 - Obrigatório no padrão BRCODE!)
    pad("60", cidadeSanitizada) + // Cidade do Recebedor (Tag 60 - Obrigatório no padrão BRCODE!)
    pad("62", txidSub) +          // Additional Data Field (Tag 62)
    "6304";                       // CRC16 placeholder

  // CRC16-CCITT-FALSE (Padrão BCB)
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
      const nomeEmpresa = empresa?.nome_fantasia || empresa?.razao_social || "OFICINA ERP";
      const payload = gerarPayloadPix(
        empresa.chave_pix,
        Number(os.total),
        `OS #${os.numero}`,
        nomeEmpresa,
        "BRASIL"
      );
      const dataUrl = await QRCode.toDataURL(payload, { width: 300, margin: 2, errorCorrectionLevel: "M" });
      const qrSize = 40;
      const qrX = 14;
      let qrY = doc.internal.pageSize.getHeight() - 60;

      // Se a tabela se estender até a região do QR Code, adiciona nova página
      if (finalY + 25 > qrY) {
        doc.addPage();
        qrY = 20;
      }

      doc.addImage(dataUrl, "PNG", qrX, qrY, qrSize, qrSize);

      const chaveFormatada = formatarChavePix(empresa.chave_pix);
      doc.setTextColor(40); doc.setFontSize(9); doc.setFont("helvetica", "bold");
      doc.text("Pague com Pix", qrX, qrY - 4);
      doc.setFontSize(8); doc.setFont("helvetica", "normal");
      doc.text(`Chave: ${chaveFormatada}`, qrX + qrSize + 5, qrY + 10);
      doc.text(`Valor: ${BRL(os.total)}`, qrX + qrSize + 5, qrY + 16);
      doc.setFontSize(7); doc.setTextColor(120);
      doc.text("Escaneie o QR Code no seu aplicativo de banco", qrX + qrSize + 5, qrY + 24);

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
