import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { catchError, debounceTime, of, switchMap } from 'rxjs';
import { NotificationService } from '../../../shared/toastr/notification.service';
import { ClientsService } from '../services/clients.service';
import { Client, ClientPayload } from '../types/client';
import { alertConfirm } from '../../../shared/alerts/custom-alerts';

const digitsLength =
  (lengths: number[]): ValidatorFn =>
  (control: AbstractControl): ValidationErrors | null => {
    const digits = String(control.value ?? '').replace(/\D/g, '');
    if (!digits) return null;
    return lengths.includes(digits.length) ? null : { digits: true };
  };

const formatDocument = (document: string | null): string => {
  if (!document) return '—';
  if (document.length === 11) {
    return document.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  if (document.length === 14) {
    return document.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return document;
};

const orNull = (value: string): string | null => value.trim() || null;

type FieldName = keyof ClientPayload;

interface FieldConfig {
  name: FieldName;
  label: string;
  span: string;
  maxLength: number;
  error: string;
}

@Component({
  selector: 'app-clients',
  imports: [ReactiveFormsModule],
  templateUrl: './clients.html',
})
export class Clients {
  @ViewChild('formCard') formCard!: ElementRef<HTMLElement>;

  private readonly fb = inject(FormBuilder);
  private readonly clientsService = inject(ClientsService);
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
      name: 'document',
      label: 'CPF / CNPJ',
      span: 'md:col-span-2',
      maxLength: 18,
      error: 'Informe 11 (CPF) ou 14 (CNPJ) dígitos',
    },
    {
      name: 'address',
      label: 'Endereço',
      span: 'md:col-span-3',
      maxLength: 191,
      error: 'Endereço muito longo',
    },
    {
      name: 'neighborhood',
      label: 'Bairro',
      span: 'md:col-span-3',
      maxLength: 191,
      error: 'Bairro muito longo',
    },
    {
      name: 'city',
      label: 'Cidade *',
      span: 'md:col-span-3',
      maxLength: 191,
      error: 'Informe a cidade',
    },
    { name: 'state', label: 'UF', span: 'md:col-span-1', maxLength: 2, error: '2 letras' },
    {
      name: 'zipCode',
      label: 'CEP',
      span: 'md:col-span-2',
      maxLength: 9,
      error: 'O CEP deve ter 8 dígitos',
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
    document: ['', [digitsLength([11, 14])]],
    address: ['', [Validators.maxLength(191)]],
    neighborhood: ['', [Validators.maxLength(191)]],
    city: ['', [Validators.required, Validators.maxLength(191)]],
    state: ['', [Validators.pattern(/^[A-Za-z]{2}$/)]],
    zipCode: ['', [digitsLength([8])]],
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
        this.clientsService.findAll({ page, limit, search }).pipe(catchError(() => of(null))),
      ),
    ),
    { initialValue: undefined },
  );

  loading = computed(() => this.response() === undefined);
  failed = computed(() => this.response() === null);
  totalPages = computed(() => this.response()?.totalPages ?? 0);

  rows = computed(() =>
    (this.response()?.data ?? []).map((client) => ({
      ...client,
      documentLabel: formatDocument(client.document),
      location: [client.city, client.state].filter(Boolean).join(' / '),
    })),
  );

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
      id === null ? this.clientsService.create(payload) : this.clientsService.update(id, payload);

    request$.subscribe({
      next: () => {
        this.notification.success(id === null ? 'Cliente cadastrado' : 'Cliente atualizado');
        this.resetForm();
        this.refresh.update((v) => v + 1);
        this.saving.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.notification.error(this.errorMessage(err, 'Não foi possível salvar o cliente'));
      },
    });
  }

  startEdit(client: Client): void {
    this.editingId.set(client.id);
    this.form.reset({
      name: client.name,
      document: client.document ?? '',
      address: client.address ?? '',
      neighborhood: client.neighborhood ?? '',
      city: client.city,
      state: client.state ?? '',
      zipCode: client.zipCode ?? '',
      phone: client.phone ?? '',
    });
    this.formCard.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  cancelEdit(): void {
    this.resetForm();
  }

  async remove(client: Client): Promise<void> {
    const confirmed = await alertConfirm('Excluir este cliente?');
    if (!confirmed) return;

    this.clientsService.remove(client.id).subscribe({
      next: () => {
        this.notification.success('Cliente excluído');
        if (this.editingId() === client.id) this.resetForm();
        if (this.rows().length === 1 && this.page() > 1) this.page.update((p) => p - 1);
        this.refresh.update((v) => v + 1);
      },
      error: (err: HttpErrorResponse) => {
        this.notification.error(this.errorMessage(err, 'Não foi possível excluir o cliente'));
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

  private toPayload(): ClientPayload {
    const v = this.form.getRawValue();
    return {
      name: v.name.trim(),
      document: orNull(v.document),
      address: orNull(v.address),
      neighborhood: orNull(v.neighborhood),
      city: v.city.trim(),
      state: orNull(v.state),
      zipCode: orNull(v.zipCode),
      phone: orNull(v.phone),
    };
  }

  private errorMessage(err: HttpErrorResponse, fallback: string): string {
    if (err.status === 0 || err.status === 500) return 'Servidor indisponível';
    const msg = err.error?.message;
    return Array.isArray(msg) ? msg.join(', ') : msg || fallback;
  }
}
