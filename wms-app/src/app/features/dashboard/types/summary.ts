export type ScanReason = 'NOT_FOUND' | 'ALREADY_LOADED' | 'WRONG_CARGO' | 'CARGO_DEPARTED';

export interface CargoSummary {
  period: { from: string; to: string };
  cargos: { total: number; open: number; loading: number; departed: number };
  deliveries: number;
  volumes: { total: number; loaded: number; pending: number };
  pendingAtDeparture: number;
  scans: {
    total: number;
    ok: number;
    error: number;
    warning: number;
    undo: number;
    byReason: Partial<Record<ScanReason, number>>;
  };
}
