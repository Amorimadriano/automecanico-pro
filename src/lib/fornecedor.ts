export interface CatalogoItem {
  codigo: string;
  nome: string;
  descricao?: string;
  preco: number;
  marca: string;
  categoria?: string;
}

export async function buscarCatalogoMock(query: string): Promise<CatalogoItem[]> {
  await new Promise((r) => setTimeout(r, 600));
  const base: CatalogoItem[] = [
    { codigo: "BRG-1234", nome: `Pastilha de freio ${query}`, descricao: "Pastilha cerâmica dianteira", preco: 45.9, marca: "Bosch", categoria: "Freios" },
    { codigo: "DIS-5678", nome: `Disco de freio ${query}`, descricao: "Disco ventilado 280mm", preco: 129.0, marca: "Bosch", categoria: "Freios" },
    { codigo: "OLE-9012", nome: `Óleo de motor ${query}`, descricao: "Óleo sintético 5W30 1L", preco: 38.5, marca: "Mobil", categoria: "Lubrificantes" },
    { codigo: "FIL-3456", nome: `Filtro de óleo ${query}`, descricao: "Filtro de óleo compatível", preco: 18.9, marca: "Mann", categoria: "Filtros" },
    { codigo: "BAT-7890", nome: `Bateria ${query}`, descricao: "Bateria 60Ah", preco: 349.0, marca: "Moura", categoria: "Elétrica" },
    { codigo: "VEL-1111", nome: `Vela de ignição ${query}`, descricao: "Vela de iridium", preco: 32.0, marca: "NGK", categoria: "Ignição" },
    { codigo: "COR-2222", nome: `Correia dentada ${query}`, descricao: "Correia dentada kit", preco: 89.9, marca: "Gates", categoria: "Motor" },
    { codigo: "AMO-3333", nome: `Amortecedor ${query}`, descricao: "Amortecedor dianteiro", preco: 199.0, marca: "Monroe", categoria: "Suspensão" },
  ];
  if (!query.trim()) return base;
  const q = query.toLowerCase();
  return base.filter(
    (i) =>
      i.nome.toLowerCase().includes(q) ||
      i.codigo.toLowerCase().includes(q) ||
      (i.descricao && i.descricao.toLowerCase().includes(q)) ||
      i.marca.toLowerCase().includes(q)
  );
}
