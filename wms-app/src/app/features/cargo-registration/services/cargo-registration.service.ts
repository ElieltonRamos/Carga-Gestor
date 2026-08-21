import { Injectable, signal } from '@angular/core';
import { Cargo, Delivery } from '../types/cargo-registration';

const STORAGE_KEY = 'wms_cargo';
const SIMULATED_DELAY_MS = 300;

@Injectable({ providedIn: 'root' })
export class CargoService {
  private cargoSignal = signal<Cargo | null>(this.loadFromStorage());

  cargo = this.cargoSignal.asReadonly();

  createCargo(data: Omit<Cargo, 'id' | 'issueDate' | 'deliveries' | 'createdAt'>): Promise<Cargo> {
    const cargo: Cargo = {
      ...data,
      id: this.generateId('CARGA'),
      issueDate: new Date().toISOString(),
      deliveries: [],
      createdAt: new Date().toISOString(),
    };

    return this.delay(() => this.writeToStorage(cargo));
  }

  saveDelivery(delivery: Omit<Delivery, 'status'>): Promise<Cargo> {
    return this.delay(() => {
      const current = this.cargoSignal();
      if (!current) {
        throw new Error('Nenhuma carga em andamento.');
      }

      const updated: Cargo = {
        ...current,
        deliveries: [
          ...current.deliveries.filter((item) => item.id !== delivery.id),
          { ...delivery, status: 'generated' as const },
        ].sort((a, b) => a.sequence - b.sequence),
      };

      return this.writeToStorage(updated);
    });
  }

  resetCargo(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.cargoSignal.set(null);
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

  private writeToStorage(cargo: Cargo): Cargo {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cargo));
    this.cargoSignal.set(cargo);
    return cargo;
  }

  private loadFromStorage(): Cargo | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Cargo) : null;
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
