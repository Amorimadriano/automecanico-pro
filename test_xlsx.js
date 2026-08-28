const XLSX = require('xlsx');
const fs = require('fs');

const ws = XLSX.utils.aoa_to_sheet([
    ["Nome", "Telefone", "CPF/CNPJ", "Email", "Endereço", "Observações"],
    ["João Silva", "11999998888", "123.456.789-00", "joao@teste.com", "Rua A, 123", ""],
    ["Maria Souza", "11888887777", "98.765.432/0001-10", "maria@teste.com", "Av B, 456", "Cliente VIP"],
    ["Pedro Santos", "11777776666", "", "pedro@teste.com", "", ""],
]);

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Clientes");
const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
fs.writeFileSync('teste_clientes.xlsx', buf);

const data = fs.readFileSync('teste_clientes.xlsx');
const wb2 = XLSX.read(data, { type: 'buffer' });
const sheet = wb2.Sheets[wb2.SheetNames[0]];
const json = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

console.log("Headers:", json[0]);
console.log("Row 1:", json[1]);
console.log("Row 2:", json[2]);
console.log("Total rows:", json.length);
console.log("✅ Biblioteca xlsx funcionando corretamente!");
