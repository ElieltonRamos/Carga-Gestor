export interface ItemRomaneio {
  produto: string;
  volume: string;
  codigo: string;
  quantidade: number;
  peso?: number;
}

export interface Romaneio {
  numeroEntrega: string;
  cidade: string;
  data: string;
  hora: string;
  transportadora: string;
  placa: string;
  motorista: string;
  itens: ItemRomaneio[];
}
