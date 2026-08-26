import { Cargo, Delivery } from "../../features/cargo-registration/types/cargo-registration";

export type ProgressStatus = 'pending' | 'partial' | 'complete';

export interface DeliveryProgress {
  deliveryId: string;
  romaneioNumber: string;
  city: string;
  loadedVolumes: number;
  totalVolumes: number;
  percentage: number;
  status: ProgressStatus;
}

export interface CargoProgress {
  loadedVolumes: number;
  totalVolumes: number;
  percentage: number;
  status: ProgressStatus;
}

function statusFromCounts(loaded: number, total: number): ProgressStatus {
  if (total === 0 || loaded === 0) return 'pending';
  if (loaded >= total) return 'complete';
  return 'partial';
}

export function computeDeliveryProgress(delivery: Delivery): DeliveryProgress {
  const totals = delivery.items.reduce(
    (acc, item) => {
      const totalVolumes = item.volumeCount ?? 1;
      const loadedVolumes = Math.min(item.loadedQuantity ?? 0, totalVolumes);
      return {
        loaded: acc.loaded + loadedVolumes,
        total: acc.total + totalVolumes,
      };
    },
    { loaded: 0, total: 0 },
  );

  const percentage = totals.total === 0 ? 0 : Math.round((totals.loaded / totals.total) * 100);

  return {
    deliveryId: delivery.id,
    romaneioNumber: delivery.romaneioNumber,
    city: delivery.client.city,
    loadedVolumes: totals.loaded,
    totalVolumes: totals.total,
    percentage,
    status: statusFromCounts(totals.loaded, totals.total),
  };
}

export function computeCargoProgress(cargo: Cargo | null): CargoProgress {
  if (!cargo || cargo.deliveries.length === 0) {
    return { loadedVolumes: 0, totalVolumes: 0, percentage: 0, status: 'pending' };
  }

  const totals = cargo.deliveries.reduce(
    (acc, delivery) => {
      const progress = computeDeliveryProgress(delivery);
      return {
        loaded: acc.loaded + progress.loadedVolumes,
        total: acc.total + progress.totalVolumes,
      };
    },
    { loaded: 0, total: 0 },
  );

  const percentage = totals.total === 0 ? 0 : Math.round((totals.loaded / totals.total) * 100);

  return {
    loadedVolumes: totals.loaded,
    totalVolumes: totals.total,
    percentage,
    status: statusFromCounts(totals.loaded, totals.total),
  };
}
