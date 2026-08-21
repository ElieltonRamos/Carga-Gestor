export interface PackingItem {
  quantity: number;
  product: string;
  volume: string;
  code: string;
  weight?: number;
}

export interface PackingList {
  date: string;
  time: string;
  deliveryNumber: string;
  city: string;
  carrier: string;
  plate: string;
  driver: string;
  items: PackingItem[];
}
