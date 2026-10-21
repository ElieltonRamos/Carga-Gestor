export interface Company {
  id: number;
  cnpj: string;
  name: string;
  tradeName: string | null;
  stateRegistration: string | null;
  phone: string | null;
  street: string | null;
  streetNumber: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  licenseKey: string | null;
  settings: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyPayload {
  cnpj: string;
  name: string;
  tradeName: string | null;
  stateRegistration: string | null;
  phone: string | null;
  street: string | null;
  streetNumber: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
}
