export interface ScanCounts {
  ok: number;
  error: number;
  warning: number;
  undo: number;
  total: number;
}

export interface OperatorReport {
  userId: number;
  name: string | null;
  volumesLoaded: number;
  scans: ScanCounts;
}

export interface DeviceReport {
  device: string | null;
  scans: ScanCounts;
}

export interface LoadingTimeReport {
  cargos: number;
  avgLoadSeconds: number | null;
  avgToDepartSeconds: number | null;
  longestLoad: { loadOrder: string; seconds: number } | null;
}

export interface PendingCargo {
  id: number;
  loadOrder: string;
  pendingAtDeparture: number | null;
  departedAt: string | null;
  driverName: string | null;
  truck: string | null;
}

export interface ScansByDay extends ScanCounts {
  day: string;
}

export interface ScansByHour {
  hour: number;
  total: number;
}

export interface CountRow {
  label: string | null;
  count: number;
}

export interface TallyRow {
  label: string;
  volumes: number;
  weight: number;
  deliveries: number;
}

export interface Reports {
  period: { from: string; to: string };
  operators: OperatorReport[];
  devices: DeviceReport[];
  loadingTime: LoadingTimeReport;
  departedWithPending: PendingCargo[];
  scansByDay: ScansByDay[];
  scansByHour: ScansByHour[];
  cargosByDriver: CountRow[];
  cargosByTruck: CountRow[];
  byClient: TallyRow[];
  byCity: TallyRow[];
}
