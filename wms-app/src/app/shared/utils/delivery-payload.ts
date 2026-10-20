import { CargoDelivery, CargoDeliveryDto } from "../../features/cargo-overview/types/cargo";

// Romaneio existente como o PATCH espera: com id e sem client (o snapshot fica intacto)
export function toDeliveryDto(delivery: CargoDelivery): CargoDeliveryDto {
  return {
    id: delivery.id,
    romaneioNumber: delivery.romaneioNumber,
    biddingNumber: delivery.biddingNumber,
    modality: delivery.modality,
    hasInstallation: delivery.hasInstallation,
    items: delivery.items.map((item) => ({
      id: item.id,
      code: item.code,
      product: item.product,
      quantity: item.quantity,
      volumeCount: item.volumeCount,
      weight: item.weight,
      notes: item.notes,
    })),
  };
}
