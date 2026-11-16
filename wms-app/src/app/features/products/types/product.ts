export interface Product {
  id: number;
  name: string;
  weight: number | null;
  volumeCount: number | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductPayload {
  name: string;
  weight: number | null;
  volumeCount: number | null;
}

export interface ProductsPage {
  data: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
