export type CargoStatus = 'OPEN' | 'LOADING' | 'DEPARTED';
export type DeliveryStatus = 'GENERATED';

export interface CargoListItem {
  id: number;
  loadOrder: string;
  totalDestinations: number;
  status: CargoStatus;
  loadDate: string;
  issueDate: string;
  driverName: string | null;
  driverPhone: string | null;
  truck: string | null;
  inspectionResponsible: string | null;
  organizationResponsible: string | null;
  assistant1: string | null;
  loadingResponsible: string | null;
  warehouseKeeper: string | null;
  romaneioResponsible: string | null;
  startedAt: string | null;
  endedAt: string | null;
  departedAt: string | null;
  createdAt: string;
  updatedAt: string;
  totalVolumes: number;
  loadedVolumes: number;
  departedById: number | null;
  pendingAtDeparture: number | null;
}

export interface CargoItem {
  id: number;
  deliveryId: number;
  code: string | null;
  product: string;
  quantity: number;
  volumeCount: number | null;
  weight: number | null;
  notes: string | null;
  totalVolumes?: number;
  loadedVolumes?: number;
}

export interface CargoDelivery {
  id: number;
  cargoId: number;
  clientId: number | null;
  sequence: number;
  romaneioNumber: string;
  biddingNumber: string | null;
  modality: string | null;
  hasInstallation: boolean;
  status: DeliveryStatus;
  clientName: string;
  clientDocument: string | null;
  clientAddress: string | null;
  clientNeighborhood: string | null;
  clientCity: string;
  clientState: string | null;
  clientZipCode: string | null;
  clientPhone: string | null;
  items: CargoItem[];
  totalVolumes?: number;
  loadedVolumes?: number;
}

export interface Cargo extends CargoListItem {
  deliveries: CargoDelivery[];
}

export interface ListCargosQuery {
  page?: number;
  limit?: number;
  status?: CargoStatus;
  search?: string | null;
  loadDate?: string;
  createdFrom?: string;
  createdTo?: string;
}

export interface DepartCargoDto {
  force?: boolean;
}

export interface ReopenCargoDto {
  reason: string;
}

export interface CargoClientDto {
  name: string;
  document?: string | null;
  address?: string | null;
  neighborhood?: string | null;
  city: string;
  state?: string | null;
  zipCode?: string | null;
  phone?: string | null;
}

export interface CargoItemDto {
  id?: number;
  code?: string | null;
  product: string;
  quantity: number;
  volumeCount?: number | null;
  weight?: number | null;
  notes?: string | null;
}

export interface CargoDeliveryDto {
  id?: number;
  romaneioNumber: string;
  biddingNumber?: string | null;
  modality?: string | null;
  hasInstallation?: boolean;
  clientId?: number;
  client?: CargoClientDto;
  items: CargoItemDto[];
}

export interface CargoHeaderDto {
  driverName?: string | null;
  driverPhone?: string | null;
  truck?: string | null;
  inspectionResponsible?: string | null;
  organizationResponsible?: string | null;
  assistant1?: string | null;
  loadingResponsible?: string | null;
  warehouseKeeper?: string | null;
  romaneioResponsible?: string | null;
}

export interface CreateCargoDto extends CargoHeaderDto {
  loadOrder: string;
  loadDate: string; // AAAA-MM-DD
  issueDate: string; // AAAA-MM-DD
  deliveries: CargoDeliveryDto[];
}

export type UpdateCargoDto = CargoHeaderDto & Partial<Omit<CreateCargoDto, keyof CargoHeaderDto>>;
