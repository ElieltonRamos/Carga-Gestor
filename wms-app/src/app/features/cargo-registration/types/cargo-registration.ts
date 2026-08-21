export interface Client {
  name: string;
  document?: string;
  address?: string;
  neighborhood?: string;
  city: string;
  state?: string;
  zipCode?: string;
  phone?: string;
}

export interface DeliveryItem {
  code?: string;
  product: string;
  quantity: number;
  volumeCount?: number;
  weight?: number;
  loadedQuantity?: number;
  loaded?: boolean;
  notes?: string;
}

export interface Delivery {
  id: string;
  sequence: number;
  romaneioNumber: string;
  client: Client;
  biddingNumber?: string;
  modality?: string;
  hasInstallation?: boolean;
  items: DeliveryItem[];
  status: 'generated';
}

export interface Cargo {
  id: string;
  totalDestinations: number;
  loadOrder: string;
  loadDate: string;
  issueDate: string;
  driverName?: string;
  driverPhone?: string;
  truck?: string;
  inspectionResponsible?: string;
  organizationResponsible?: string;
  assistant1?: string;
  loadingResponsible?: string;
  warehouseKeeper?: string;
  romaneioResponsible?: string;
  startDate?: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  departureDate?: string;
  deliveries: Delivery[];
  createdAt: string;
}
