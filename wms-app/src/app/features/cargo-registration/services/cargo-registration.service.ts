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
    return raw ? (JSON.parse(raw) as Cargo[]) : [];
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
}
