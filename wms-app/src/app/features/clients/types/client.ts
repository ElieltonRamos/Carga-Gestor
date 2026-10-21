export interface Client {
  id: number;
  name: string;
  document: string | null;
  address: string | null;
  neighborhood: string | null;
  city: string;
  state: string | null;
  zipCode: string | null;
  phone: string | null;
}

export interface ClientPayload {
  name: string;
  document: string | null;
  address: string | null;
  neighborhood: string | null;
  city: string;
  state: string | null;
  zipCode: string | null;
  phone: string | null;
}

export interface ClientsPage {
  data: Client[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
