export interface Driver {
  id: number;
  name: string;
  phone: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DriverPayload {
  name: string;
  phone: string | null;
}

export interface DriversPage {
  data: Driver[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
