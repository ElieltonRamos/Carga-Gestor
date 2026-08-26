import { Injectable, inject } from '@angular/core';
import { CargoService } from '../../cargo-registration/services/cargo-registration.service';
import { Delivery } from '../../cargo-registration/types/cargo-registration';

export type ScanResult =
  | { status: 'ok'; itemIndex: number; loadedQuantity: number; volumeCount: number }
  | { status: 'not_found' }
  | { status: 'already_complete'; itemIndex: number };

@Injectable({ providedIn: 'root' })
export class ScanService {
  private readonly cargoService = inject(CargoService);

  async scan(cargoId: string, delivery: Delivery, code: string): Promise<ScanResult> {
    const itemIndex = delivery.items.findIndex((item) => item.code === code);

    if (itemIndex === -1) {
      return { status: 'not_found' };
    }

    const item = delivery.items[itemIndex];
    const volumeCount = item.volumeCount ?? 1;
    const currentLoaded = item.loadedQuantity ?? 0;

    if (currentLoaded >= volumeCount) {
      return { status: 'already_complete', itemIndex };
    }

    const newLoadedQuantity = currentLoaded + 1;

    const updatedItems = delivery.items.map((it, idx) =>
      idx === itemIndex
        ? { ...it, loadedQuantity: newLoadedQuantity, loaded: newLoadedQuantity >= volumeCount }
        : it,
    );

    const updatedDelivery: Omit<Delivery, 'status'> = {
      ...delivery,
      items: updatedItems,
    };

    await this.cargoService.saveDelivery(cargoId, updatedDelivery);

    return { status: 'ok', itemIndex, loadedQuantity: newLoadedQuantity, volumeCount };
  }
}
