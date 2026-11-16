import { FormBuilder, Validators } from '@angular/forms';
import { Product } from '../../features/products/types/product';

export function createItemGroup(fb: FormBuilder) {
  const group = fb.group({
    id: fb.control<number | null>(null),
    productId: fb.control<number | null>(null),
    // Volumes por unidade do produto escolhido; null = volumes editados à mão ou sem produto
    unitVolumes: fb.control<number | null>(null),
    code: [''],
    product: ['', Validators.required],
    quantity: [1, [Validators.required, Validators.min(1)]],
    volumeCount: [1, [Validators.required, Validators.min(1), Validators.max(9999)]],
    weight: fb.control<number | null>(null),
    notes: [''],
  });

  // Com produto do cadastro, mudar a quantidade recalcula os volumes
  group.controls.quantity.valueChanges.subscribe((quantity) => {
    const perUnit = group.controls.unitVolumes.value;
    if (perUnit !== null && quantity && quantity > 0) {
      group.controls.volumeCount.setValue(perUnit * quantity);
    }
  });

  return group;
}

export type ItemGroup = ReturnType<typeof createItemGroup>;

// Peso copiado direto (é o total do item); volumes = volumes por unidade × quantidade.
// Só preenche o que o produto tem.
export function applyProduct(group: ItemGroup, product: Product): void {
  const { quantity } = group.getRawValue();
  group.patchValue({
    productId: product.id,
    code: String(product.id),
    product: product.name,
    unitVolumes: product.volumeCount,
  });
  if (product.weight !== null) group.controls.weight.setValue(product.weight);
  if (product.volumeCount !== null) {
    group.controls.volumeCount.setValue(product.volumeCount * (quantity ?? 1));
  }
}

// Digitar um nome desvincula o produto escolhido; o backend vincula ou cria pelo nome
export function unlinkProduct(group: ItemGroup, name: string): void {
  group.patchValue({ productId: null, unitVolumes: null, code: '', product: name });
}

// Editar os volumes à mão para o recálculo automático
export function releaseVolumes(group: ItemGroup): void {
  group.controls.unitVolumes.setValue(null);
}