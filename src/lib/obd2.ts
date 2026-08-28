// OBD2 utilities with Web Bluetooth API + simulation fallback

export interface PIDInfo {
  pid: string;
  name: string;
  unit: string;
  description: string;
}

export const OBD2_PIDS: Record<string, PIDInfo> = {
  "0C": { pid: "0C", name: "RPM", unit: "rpm", description: "Rotações por minuto do motor" },
  "0D": { pid: "0D", name: "Velocidade", unit: "km/h", description: "Velocidade do veículo" },
  "05": { pid: "05", name: "Temp. Motor", unit: "°C", description: "Temperatura do líquido de arrefecimento" },
  "0F": { pid: "0F", name: "Temp. Ar", unit: "°C", description: "Temperatura do ar de admissão" },
  "2F": { pid: "2F", name: "Combustível", unit: "%", description: "Nível de combustível" },
  "46": { pid: "46", name: "Temp. Ambiente", unit: "°C", description: "Temperatura ambiente" },
  "5C": { pid: "5C", name: "Temp. Óleo", unit: "°C", description: "Temperatura do óleo do motor" },
  "10": { pid: "10", name: "Fluxo Ar MAF", unit: "g/s", description: "Fluxo de massa de ar" },
  "11": { pid: "11", name: "Posição Borboleta", unit: "%", description: "Posição da borboleta de aceleração" },
  "5B": { pid: "5B", name: "Híbrido Bateria", unit: "%", description: "Nível de carga da bateria híbrida" },
};

export interface DTCItem {
  code: string;
  description: string;
  severity: "baixa" | "média" | "alta";
}

export interface OBD2Connection {
  device: BluetoothDevice;
  server: BluetoothRemoteGATTServer;
  service: BluetoothRemoteGATTService;
  characteristic: BluetoothRemoteGATTCharacteristic;
  simulate?: boolean;
}

export function isWebBluetoothSupported(): boolean {
  return typeof navigator !== "undefined" && "bluetooth" in navigator;
}

const ELM327_SERVICE_UUID = "0000fff0-0000-1000-8000-00805f9b34fb";
const ELM327_CHARACTERISTIC_UUID = "0000fff1-0000-1000-8000-00805f9b34fb";

const INIT_COMMANDS = ["ATZ", "ATE0", "ATL1", "ATSP0"];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function initELM327(conn: OBD2Connection): Promise<boolean> {
  for (const cmd of INIT_COMMANDS) {
    try {
      const resp = await sendCommand(conn, cmd, { timeout: 2000 });
      if (resp.includes("ERROR")) {
        console.warn(`[OBD2] Falha no comando ${cmd}:`, resp);
      }
    } catch (e) {
      console.warn(`[OBD2] Timeout no comando ${cmd}:`, e);
    }
  }
  return true;
}

async function discoverCharacteristic(server: BluetoothRemoteGATTServer): Promise<BluetoothRemoteGATTCharacteristic | null> {
  try {
    const service = await server.getPrimaryService(ELM327_SERVICE_UUID);
    return await service.getCharacteristic(ELM327_CHARACTERISTIC_UUID);
  } catch {
    // fallback: scan all services/characteristics
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const services = await (server as any).getPrimaryServices();
    for (const svc of services) {
      try {
        const characteristics = await svc.getCharacteristics();
        for (const ch of characteristics) {
          if (ch.properties.write && ch.properties.read) {
            return ch;
          }
        }
      } catch {
        // ignore
      }
    }
  }
  return null;
}

export async function connectOBD2(): Promise<OBD2Connection | null> {
  if (!isWebBluetoothSupported()) {
    console.warn("Web Bluetooth não suportado. Usando modo simulação.");
    return null;
  }

  try {
    const device = await navigator.bluetooth!.requestDevice({
      acceptAllDevices: true,
      optionalServices: [ELM327_SERVICE_UUID],
    });

    if (!device.gatt) {
      toast("Dispositivo sem suporte GATT");
      return null;
    }

    const server = await device.gatt.connect();
    const characteristic = await discoverCharacteristic(server);
    if (!characteristic) {
      toast("Não encontrou característica compatível no dispositivo");
      server.disconnect();
      return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = (characteristic as any).service;

    const conn: OBD2Connection = { device, server, service, characteristic };
    await initELM327(conn);
    return conn;
  } catch (e: any) {
    if (e.name === "NotFoundError" || e.name === "UserCancelled") {
      return null;
    }
    console.error("Erro ao conectar OBD2:", e);
    return null;
  }
}

export function disconnectOBD2(conn: OBD2Connection) {
  if (!conn.simulate && conn.server?.connected) {
    try {
      conn.server.disconnect();
    } catch {
      // ignore
    }
  }
}

interface SendOptions {
  timeout?: number;
  retries?: number;
}

async function sendCommand(conn: OBD2Connection, cmd: string, opts?: SendOptions): Promise<string> {
  if (conn.simulate) {
    return mockResponse(cmd);
  }
  const timeout = opts?.timeout ?? 2000;
  const encoder = new TextEncoder();
  await conn.characteristic.writeValue(encoder.encode(cmd + "\r"));

  // Espera adaptador processar e colocar resposta no buffer BLE
  let raw = "";
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const value = await conn.characteristic.readValue();
      const decoder = new TextDecoder("utf-8");
      const chunk = decoder.decode(value).trim();
      raw += chunk;
      // Resposta completa termina com > ou possui \r\n suficiente
      if (chunk.includes(">") || chunk.includes("\r\n")) {
        break;
      }
    } catch {
      // ignorar erros de leitura intermitentes
    }
    await delay(80);
  }
  return raw.trim().replace(">", "").trim();
}

function mockResponse(cmd: string): string {
  const clean = cmd.trim().toUpperCase();
  if (clean === "03") {
    // DTCs
    return "43 01 03 01 04 02 02 \r\n";
  }
  if (clean === "04") {
    // Clear DTCs
    return "44 \r\n";
  }
  if (clean === "010C") {
    // RPM = (A*256 + B)/4
    const a = 0x1F;
    const b = 0x40;
    return `41 0C ${a.toString(16).padStart(2, "0")} ${b.toString(16).padStart(2, "0")} \r\n`;
  }
  if (clean === "010D") {
    // Speed = A
    const a = 0x55; // 85 km/h
    return `41 0D ${a.toString(16).padStart(2, "0")} \r\n`;
  }
  if (clean === "0105") {
    // Engine temp = A - 40
    const a = 0x5A; // 90°C
    return `41 05 ${a.toString(16).padStart(2, "0")} \r\n`;
  }
  if (clean === "010F") {
    const a = 0x37; // 15°C
    return `41 0F ${a.toString(16).padStart(2, "0")} \r\n`;
  }
  if (clean === "012F") {
    const a = 0x7D; // ~49%
    return `41 2F ${a.toString(16).padStart(2, "0")} \r\n`;
  }
  if (clean === "0146") {
    const a = 0x32; // 10°C
    return `41 46 ${a.toString(16).padStart(2, "0")} \r\n`;
  }
  if (clean === "015C") {
    const a = 0x64; // 60°C
    return `41 5C ${a.toString(16).padStart(2, "0")} \r\n`;
  }
  if (clean === "0110") {
    const a = 0x01;
    const b = 0xF4; // 500 g/s
    return `41 10 ${a.toString(16).padStart(2, "0")} ${b.toString(16).padStart(2, "0")} \r\n`;
  }
  if (clean === "0111") {
    const a = 0x50; // 31%
    return `41 11 ${a.toString(16).padStart(2, "0")} \r\n`;
  }
  if (clean === "015B") {
    const a = 0x78; // 60%
    return `41 5B ${a.toString(16).padStart(2, "0")} \r\n`;
  }
  return "NO DATA";
}

function parseHexByte(hex: string): number {
  return parseInt(hex, 16);
}

function hexToAsciiDTC(a: number, b: number): string {
  // P = Powertrain, C = Chassis, B = Body, U = Network
  const first = (a >> 6) & 0x03;
  const prefix = ["P", "C", "B", "U"][first];
  const digit2 = (a >> 4) & 0x03;
  const digit3 = a & 0x0F;
  const digit4 = (b >> 4) & 0x0F;
  const digit5 = b & 0x0F;
  return `${prefix}${digit2}${digit3.toString(16).toUpperCase()}${digit4.toString(16).toUpperCase()}${digit5.toString(16).toUpperCase()}`;
}

export function parseDTCs(response: string): DTCItem[] {
  const parts = response.split(/\s+/).filter((s) => s.length > 0);
  const modeByte = parts[0] || "";
  if (!modeByte.startsWith("4")) return [];
  const count = parseHexByte(parts[1] || "00") & 0x7F;
  const codes: DTCItem[] = [];
  for (let i = 0; i < count; i++) {
    const a = parseHexByte(parts[2 + i * 2] || "00");
    const b = parseHexByte(parts[3 + i * 2] || "00");
    if (a === 0 && b === 0) continue;
    const code = hexToAsciiDTC(a, b);
    codes.push({
      code,
      description: dtcDescription(code),
      severity: severityFromCode(code),
    });
  }
  return codes;
}

function severityFromCode(code: string): "baixa" | "média" | "alta" {
  const num = parseInt(code.slice(1), 16);
  if (num >= 0x000 && num <= 0x050) return "alta";
  if (num >= 0x300 && num <= 0x400) return "média";
  return "baixa";
}

function dtcDescription(code: string): string {
  const map: Record<string, string> = {
    P0301: "Falha de ignição no cilindro 1",
    P0302: "Falha de ignição no cilindro 2",
    P0303: "Falha de ignição no cilindro 3",
    P0304: "Falha de ignição no cilindro 4",
    P0420: "Eficiência do conversor catalítico abaixo do limiar",
    P0171: "Mistura pobre (banco 1)",
    P0172: "Mistura rica (banco 1)",
    P0101: "Desempenho do sensor MAF fora da faixa",
    P0128: "Termostato abaixo da temperatura de regulação",
    P0562: "Tensão do sistema baixa",
    P0606: "Falha no processador ECM/PCM",
    P0705: "Sensor de posição da alavanca de transmissão",
  };
  return map[code] || `Código de erro ${code}`;
}

export async function readDTC(conn: OBD2Connection): Promise<DTCItem[]> {
  const resp = await sendCommand(conn, "03");
  return parseDTCs(resp);
}

export async function clearDTC(conn: OBD2Connection): Promise<boolean> {
  const resp = await sendCommand(conn, "04");
  return resp.includes("44");
}

export interface PIDValue {
  pid: string;
  value: number;
  unit: string;
  name: string;
}

export async function readPID(conn: OBD2Connection, pid: string): Promise<PIDValue | null> {
  const cleanPid = pid.toUpperCase();
  const resp = await sendCommand(conn, `01${cleanPid}`);
  const parts = resp.split(/\s+/).filter(Boolean);
  if (parts.length < 3) return null;
  const expectedMode = `4${cleanPid[0]}`;
  if (!parts[0].startsWith(expectedMode)) return null;

  const info = OBD2_PIDS[cleanPid];
  let value = 0;

  switch (cleanPid) {
    case "0C": {
      const a = parseHexByte(parts[2]);
      const b = parseHexByte(parts[3] || "00");
      value = ((a * 256 + b) / 4);
      break;
    }
    case "0D": {
      value = parseHexByte(parts[2]);
      break;
    }
    case "05":
    case "0F":
    case "46":
    case "5C": {
      value = parseHexByte(parts[2]) - 40;
      break;
    }
    case "2F": {
      value = (parseHexByte(parts[2]) * 100) / 255;
      break;
    }
    case "10": {
      const a = parseHexByte(parts[2]);
      const b = parseHexByte(parts[3] || "00");
      value = ((a * 256 + b) / 100);
      break;
    }
    case "11": {
      value = (parseHexByte(parts[2]) * 100) / 255;
      break;
    }
    case "5B": {
      value = (parseHexByte(parts[2]) * 100) / 255;
      break;
    }
    default:
      return null;
  }

  return {
    pid: cleanPid,
    value: Math.round(value * 10) / 10,
    unit: info?.unit ?? "",
    name: info?.name ?? cleanPid,
  };
}

// Shorthand helpers for common PIDs
export async function readRPM(conn: OBD2Connection): Promise<PIDValue | null> {
  return readPID(conn, "0C");
}
export async function readSpeed(conn: OBD2Connection): Promise<PIDValue | null> {
  return readPID(conn, "0D");
}
export async function readEngineTemp(conn: OBD2Connection): Promise<PIDValue | null> {
  return readPID(conn, "05");
}

// Simulation connection factory
export function createMockConnection(): OBD2Connection {
  return {
    device: {} as BluetoothDevice,
    server: {} as BluetoothRemoteGATTServer,
    service: {} as BluetoothRemoteGATTService,
    characteristic: {} as BluetoothRemoteGATTCharacteristic,
    simulate: true,
  };
}

// Polyfill toast import to avoid circular deps (consumer should use sonner)
function toast(message: string) {
  if (typeof window !== "undefined") {
    // eslint-disable-next-line no-console
    console.log("[OBD2]", message);
  }
}
