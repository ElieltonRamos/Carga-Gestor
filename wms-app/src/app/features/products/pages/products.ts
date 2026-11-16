import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { catchError, debounceTime, of, switchMap } from 'rxjs';
import { NotificationService } from '../../../shared/toastr/notification.service';
import { ProductsService } from '../services/products.service';
import { Product, ProductPayload } from '../types/product';
import { alertConfirm } from '../../../shared/alerts/custom-alerts';

const integer = (control: AbstractControl): ValidationErrors | null => {
  const value = control.value;
  return value === null || value === '' || Number.isInteger(value) ? null : { integer: true };
};

type FieldName = keyof ProductPayload;

@Component({
  selector: 'app-products',
  imports: [ReactiveFormsModule],
  templateUrl: './products.html',
})
export class Products {
  @ViewChild('formCard') formCard!: ElementRef<HTMLElement>;

  private readonly fb = inject(FormBuilder);
  private readonly productsService = inject(ProductsService);
  private readonly notification = inject(NotificationService);

  readonly limit = 10;

  form = this.fb.group({
    name: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(191)]),
    weight: this.fb.control<number | null>(null, [Validators.min(0), Validators.max(9999999.999)]),
    volumeCount: this.fb.control<number | null>(null, [
      Validators.min(1),
      Validators.max(10000),
      integer,
    ]),
  });

  editingId = signal<number | null>(null);
  saving = signal(false);
  search = signal('');
  page = signal(1);
  private readonly refresh = signal(0);

  private readonly query = computed(() => ({
    page: this.page(),
    limit: this.limit,
    search: this.search().trim() || undefined,
    refresh: this.refresh(),
  }));

  private readonly response = toSignal(
    toObservable(this.query).pipe(
      debounceTime(300),
      switchMap(({ page, limit, search }) =>
        this.productsService.findAll({ page, limit, search }).pipe(catchError(() => of(null))),
      ),
    ),
    { initialValue: undefined },
  );

  loading = computed(() => this.response() === undefined);
  failed = computed(() => this.response() === null);
  totalPages = computed(() => this.response()?.totalPages ?? 0);
  rows = computed(() => this.response()?.data ?? []);

  invalid(name: FieldName): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || control.dirty);
  }

  onSearch(value: string): void {
    this.search.set(value);
    this.page.set(1);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.toPayload();
    const id = this.editingId();

    this.saving.set(true);

    const request$ =
      id === null ? this.productsService.create(payload) : this.productsService.update(id, payload);

    request$.subscribe({
      next: () => {
        this.notification.success(id === null ? 'Produto cadastrado' : 'Produto atualizado');
        this.resetForm();
        this.refresh.update((v) => v + 1);
        this.saving.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.notification.error(this.errorMessage(err, 'Não foi possível salvar o produto'));
      },
    });
  }

  startEdit(product: Product): void {
    this.editingId.set(product.id);
    this.form.reset({
      name: product.name,
      weight: product.weight,
      volumeCount: product.volumeCount,
    });
    this.formCard.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  cancelEdit(): void {
    this.resetForm();
  }

  async remove(product: Product): Promise<void> {
    const confirmed = await alertConfirm('Desativar este produto?');
    if (!confirmed) return;

    this.productsService.remove(product.id).subscribe({
      next: () => {
        this.notification.success('Produto desativado');
        if (this.editingId() === product.id) this.resetForm();
        if (this.rows().length === 1 && this.page() > 1) this.page.update((p) => p - 1);
        this.refresh.update((v) => v + 1);
      },
      error: (err: HttpErrorResponse) => {
        this.notification.error(this.errorMessage(err, 'Não foi possível desativar o produto'));
      },
    });
  }

  prevPage(): void {
    this.page.update((p) => Math.max(1, p - 1));
  }

  nextPage(): void {
    this.page.update((p) => Math.min(this.totalPages(), p + 1));
  }

  private resetForm(): void {
    this.editingId.set(null);
    this.form.reset();
  }

  private toPayload(): ProductPayload {
    const v = this.form.getRawValue();
    return {
      name: v.name.trim(),
      weight: v.weight ?? null,
      volumeCount: v.volumeCount ?? null,
    };
  }

  private errorMessage(err: HttpErrorResponse, fallback: string): string {
    if (err.status === 0 || err.status === 500) return 'Servidor indisponível';
    const msg = err.error?.message;
    return Array.isArray(msg) ? msg.join(', ') : msg || fallback;
  }
}
