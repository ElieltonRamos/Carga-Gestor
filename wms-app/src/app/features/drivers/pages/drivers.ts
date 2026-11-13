import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, debounceTime, of, switchMap } from 'rxjs';
import { NotificationService } from '../../../shared/toastr/notification.service';
import { DriversService } from '../services/drivers.service';
import { Driver, DriverPayload } from '../types/driver';
import { alertConfirm } from '../../../shared/alerts/custom-alerts';

const orNull = (value: string): string | null => value.trim() || null;

type FieldName = keyof DriverPayload;

interface FieldConfig {
  name: FieldName;
  label: string;
  span: string;
  maxLength: number;
  error: string;
}

@Component({
  selector: 'app-drivers',
  imports: [ReactiveFormsModule],
  templateUrl: './drivers.html',
})
export class Drivers {
  @ViewChild('formCard') formCard!: ElementRef<HTMLElement>;

  private readonly fb = inject(FormBuilder);
  private readonly driversService = inject(DriversService);
  private readonly notification = inject(NotificationService);

  readonly limit = 10;

  readonly fields: FieldConfig[] = [
    {
      name: 'name',
      label: 'Nome *',
      span: 'md:col-span-4',
      maxLength: 191,
      error: 'Informe o nome',
    },
    {
      name: 'phone',
      label: 'Telefone',
      span: 'md:col-span-2',
      maxLength: 20,
      error: 'Telefone muito longo',
    },
  ];

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(191)]],
    phone: ['', [Validators.maxLength(20)]],
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
        this.driversService.findAll({ page, limit, search }).pipe(catchError(() => of(null))),
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
      id === null ? this.driversService.create(payload) : this.driversService.update(id, payload);

    request$.subscribe({
      next: () => {
        this.notification.success(id === null ? 'Motorista cadastrado' : 'Motorista atualizado');
        this.resetForm();
        this.refresh.update((v) => v + 1);
        this.saving.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.notification.error(this.errorMessage(err, 'Não foi possível salvar o motorista'));
      },
    });
  }

  startEdit(driver: Driver): void {
    this.editingId.set(driver.id);
    this.form.reset({
      name: driver.name,
      phone: driver.phone ?? '',
    });
    this.formCard.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  cancelEdit(): void {
    this.resetForm();
  }

  async remove(driver: Driver): Promise<void> {
    const confirmed = await alertConfirm('Desativar este motorista?');
    if (!confirmed) return;

    this.driversService.remove(driver.id).subscribe({
      next: () => {
        this.notification.success('Motorista desativado');
        if (this.editingId() === driver.id) this.resetForm();
        if (this.rows().length === 1 && this.page() > 1) this.page.update((p) => p - 1);
        this.refresh.update((v) => v + 1);
      },
      error: (err: HttpErrorResponse) => {
        this.notification.error(this.errorMessage(err, 'Não foi possível desativar o motorista'));
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

  private toPayload(): DriverPayload {
    const v = this.form.getRawValue();
    return {
      name: v.name.trim(),
      phone: orNull(v.phone),
    };
  }

  private errorMessage(err: HttpErrorResponse, fallback: string): string {
    if (err.status === 0 || err.status === 500) return 'Servidor indisponível';
    const msg = err.error?.message;
    return Array.isArray(msg) ? msg.join(', ') : msg || fallback;
  }
}
