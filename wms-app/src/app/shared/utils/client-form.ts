import { FormBuilder, Validators } from '@angular/forms';
import { Client } from '../../features/clients/types/client';
import { CargoClientDto } from '../../features/cargo-overview/types/cargo';

export function createClientGroup(fb: FormBuilder) {
  return fb.group({
    // Cliente do cadastro vinculado (vai como clientId no romaneio, não dentro de client)
    id: fb.control<number | null>(null),
    name: ['', Validators.required],
    document: [''],
    address: [''],
    neighborhood: [''],
    city: ['', Validators.required],
    state: [''],
    zipCode: [''],
    phone: [''],
  });
}

export type ClientGroup = ReturnType<typeof createClientGroup>;

// Preenche os campos com o cadastro; o usuário pode editar depois
export function applyClient(group: ClientGroup, client: Client): void {
  group.patchValue({
    id: client.id,
    name: client.name,
    document: client.document ?? '',
    address: client.address ?? '',
    neighborhood: client.neighborhood ?? '',
    city: client.city,
    state: client.state ?? '',
    zipCode: client.zipCode ?? '',
    phone: client.phone ?? '',
  });
}

export function unlinkClient(group: ClientGroup): void {
  group.controls.id.setValue(null);
}

// Extrai o DTO do cliente do form para envio ao backend
export function toClientDto(group: ClientGroup): CargoClientDto | undefined {
  const value = group.getRawValue();
  const hasData = Object.values(value).some(v => v !== '' && v !== null && v !== undefined);
  if (!hasData) return undefined;

  return {
    name: value.name || '',
    document: value.document || null,
    address: value.address || null,
    neighborhood: value.neighborhood || null,
    city: value.city || '',
    state: value.state || null,
    zipCode: value.zipCode || null,
    phone: value.phone || null,
  };
}