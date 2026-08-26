import { Injectable, computed, signal } from '@angular/core';
import { Cargo, Delivery } from '../types/cargo-registration';

const STORAGE_KEY = 'wms_cargos';
const SIMULATED_DELAY_MS = 300;

type CargoInput = Omit<Cargo, 'id' | 'issueDate' | 'deliveries' | 'createdAt'>;

@Injectable({ providedIn: 'root' })
export class CargoService {
  private cargosSignal = signal<Cargo[]>(this.loadFromStorage());

  cargos = this.cargosSignal.asReadonly();

  getCargoSignal(cargoId: string) {
    return computed(() => this.cargosSignal().find((c) => c.id === cargoId) ?? null);
  }

  createCargo(data: CargoInput): Promise<Cargo> {
    const cargo: Cargo = {
      ...data,
      id: this.generateId('CARGA'),
      issueDate: new Date().toISOString(),
      deliveries: [],
      createdAt: new Date().toISOString(),
    };

    return this.delay(() => {
      this.writeToStorage([...this.cargosSignal(), cargo]);
      return cargo;
    });
  }

  saveDelivery(cargoId: string, delivery: Omit<Delivery, 'status'>): Promise<Cargo> {
    return this.delay(() => {
      const current = this.cargosSignal();
      const target = current.find((c) => c.id === cargoId);
      if (!target) {
        throw new Error('Carga não encontrada.');
      }

      const updatedCargo: Cargo = {
        ...target,
        deliveries: [
          ...target.deliveries.filter((item) => item.id !== delivery.id),
          { ...delivery, status: 'generated' as const },
        ].sort((a, b) => a.sequence - b.sequence),
      };

      const updatedList = current.map((c) => (c.id === cargoId ? updatedCargo : c));
      this.writeToStorage(updatedList);
      return updatedCargo;
    });
  }

  deleteCargo(cargoId: string): void {
    this.writeToStorage(this.cargosSignal().filter((c) => c.id !== cargoId));
  }

  generateCode(): string {
    return `LOG-${Math.floor(100000 + Math.random() * 900000)}`;
  }

  generateRomaneioNumber(): string {
    return `ROM-${Math.floor(100000 + Math.random() * 900000)}`;
  }

  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}`;
  }

  private writeToStorage(cargos: Cargo[]): Cargo[] {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cargos));
    this.cargosSignal.set(cargos);
    return cargos;
  }

  private loadFromStorage(): Cargo[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as Cargo[];
    }

    const seed = this.buildMockCargos();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    return seed;
  }

  private buildMockCargos(): Cargo[] {
    const today = new Date().toISOString().slice(0, 10);

    return [
      {
        id: 'CARGA-MOCK-1',
        totalDestinations: 2,
        loadOrder: '1° Carregamento',
        loadDate: today,
        issueDate: new Date().toISOString(),
        driverName: 'Carlos Silva',
        driverPhone: '38999990000',
        truck: 'Scania R450',
        inspectionResponsible: 'João Pereira',
        organizationResponsible: 'Marcos Lima',
        assistant1: 'Pedro Souza',
        createdAt: new Date().toISOString(),
        deliveries: [
          {
            id: 'CARGA-MOCK-1-1',
            sequence: 1,
            romaneioNumber: 'ROM-100001',
            client: {
              name: 'Prefeitura Municipal de Espinosa',
              document: '12.345.678/0001-90',
              address: 'Praça Central, 100',
              neighborhood: 'Centro',
              city: 'Espinosa',
              state: 'MG',
              zipCode: '39525-000',
              phone: '3838310000',
            },
            biddingNumber: '045/2026',
            modality: 'Pregão Eletrônico',
            hasInstallation: true,
            status: 'generated',
            items: [
              {
                code: 'PROD-98765',
                product: 'Smart TV 55" 4K UHD',
                quantity: 1,
                volumeCount: 1,
                weight: 15,
                loadedQuantity: 1,
                loaded: true,
              },
              {
                code: 'PROD-11223',
                product: 'Ar Condicionado Split 12000 BTU',
                quantity: 2,
                volumeCount: 2,
                weight: 28,
                loadedQuantity: 1,
                loaded: false,
              },
            ],
          },
          {
            id: 'CARGA-MOCK-1-2',
            sequence: 2,
            romaneioNumber: 'ROM-100002',
            client: {
              name: 'Câmara Municipal de Montes Claros',
              document: '98.765.432/0001-10',
              address: 'Av. Brasil, 500',
              neighborhood: 'Ibituruna',
              city: 'Montes Claros',
              state: 'MG',
              zipCode: '39400-100',
              phone: '3832110000',
            },
            biddingNumber: '046/2026',
            modality: 'Pregão Eletrônico',
            hasInstallation: false,
            status: 'generated',
            items: [
              {
                code: 'PROD-33445',
                product: 'Cadeira de Escritório Ergonômica',
                quantity: 5,
                volumeCount: 5,
                weight: 8,
                loadedQuantity: 0,
                loaded: false,
              },
            ],
          },
        ],
      },
      {
        id: 'CARGA-MOCK-2',
        totalDestinations: 1,
        loadOrder: '2° Carregamento',
        loadDate: today,
        issueDate: new Date().toISOString(),
        driverName: 'Ana Ferreira',
        driverPhone: '38988880000',
        truck: 'Volvo FH540',
        createdAt: new Date().toISOString(),
        deliveries: [
          {
            id: 'CARGA-MOCK-2-1',
            sequence: 1,
            romaneioNumber: 'ROM-200001',
            client: {
              name: 'Hospital Regional de Janaúba',
              document: '11.222.333/0001-44',
              address: 'Rua da Saúde, 50',
              neighborhood: 'Centro',
              city: 'Janaúba',
              state: 'MG',
              zipCode: '39440-000',
              phone: '3838310099',
            },
            biddingNumber: '012/2026',
            modality: 'Dispensa de Licitação',
            hasInstallation: true,
            status: 'generated',
            items: [
              {
                code: 'PROD-55667',
                product: 'Cama Hospitalar Elétrica',
                quantity: 3,
                volumeCount: 3,
                weight: 45,
                loadedQuantity: 3,
                loaded: true,
              },
            ],
          },
        ],
      },
    ];
  }

  private delay<T>(fn: () => T): Promise<T> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          resolve(fn());
        } catch (error) {
          reject(error);
        }
      }, SIMULATED_DELAY_MS);
    });
  }

  resetAll(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.cargosSignal.set([]);
  }

  resetToMock(): void {
    const seed = this.buildMockCargos();
    this.writeToStorage(seed);
  }
}
