// Minimal Web Bluetooth API type declarations for OBD2 module

interface BluetoothDevice {
  id: string;
  name: string | null;
  gatt: BluetoothRemoteGATTServer | null;
}

interface BluetoothRemoteGATTServer {
  connected: boolean;
  connect(): Promise<BluetoothRemoteGATTServer>;
  disconnect(): void;
  getPrimaryService(service: string): Promise<BluetoothRemoteGATTService>;
}

interface BluetoothRemoteGATTService {
  getCharacteristic(characteristic: string): Promise<BluetoothRemoteGATTCharacteristic>;
}

interface BluetoothRemoteGATTCharacteristic {
  writeValue(value: ArrayBufferView | ArrayBuffer): Promise<void>;
  readValue(): Promise<DataView>;
}

interface Bluetooth {
  requestDevice(options: {
    acceptAllDevices?: boolean;
    optionalServices?: string[];
    filters?: Array<{ services?: string[]; name?: string; namePrefix?: string }>;
  }): Promise<BluetoothDevice>;
}

interface Navigator {
  bluetooth?: Bluetooth;
}
