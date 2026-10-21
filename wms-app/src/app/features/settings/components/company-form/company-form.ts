import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NotificationService } from '../../../../shared/toastr/notification.service';
import {
  digitsLength,
  httpErrorMessage,
  onlyDigits,
  orNull,
} from '../../../../shared/utils/form-utils';
import { CompanyService } from '../../services/company.service';
import { Company, CompanyPayload } from '../../types/company';

type FieldName = keyof CompanyPayload;

interface FieldConfig {
  name: FieldName;
  label: string;
  span: string;
  maxLength: number;
  error: string;
}

const formatCnpj = (v: string) =>
  v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
const formatZip = (v: string) => v.replace(/^(\d{5})(\d{3})$/, '$1-$2');

@Component({
  selector: 'app-company-form',
  imports: [ReactiveFormsModule],
  templateUrl: './company-form.html',
})
export class CompanyForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly companyService = inject(CompanyService);
  private readonly notification = inject(NotificationService);

  readonly fields: FieldConfig[] = [
    {
      name: 'cnpj',
      label: 'CNPJ *',
      span: 'md:col-span-2',
      maxLength: 18,
      error: 'Informe 14 dígitos',
    },
    {
      name: 'name',
      label: 'Razão social *',
      span: 'md:col-span-4',
      maxLength: 191,
      error: 'Informe a razão social',
    },
    {
      name: 'tradeName',
      label: 'Nome fantasia',
      span: 'md:col-span-3',
      maxLength: 191,
      error: 'Nome muito longo',
    },
    {
      name: 'stateRegistration',
      label: 'Inscrição estadual',
      span: 'md:col-span-3',
      maxLength: 20,
      error: 'Máximo de 20 caracteres',
    },
    {
      name: 'phone',
      label: 'Telefone',
      span: 'md:col-span-2',
      maxLength: 20,
      error: 'Máximo de 20 caracteres',
    },
    {
      name: 'zipCode',
      label: 'CEP',
      span: 'md:col-span-2',
      maxLength: 9,
      error: 'O CEP deve ter 8 dígitos',
    },
    { name: 'state', label: 'UF', span: 'md:col-span-2', maxLength: 2, error: '2 letras' },
    {
      name: 'street',
      label: 'Logradouro',
      span: 'md:col-span-4',
      maxLength: 191,
      error: 'Logradouro muito longo',
    },
    {
      name: 'streetNumber',
      label: 'Número',
      span: 'md:col-span-2',
      maxLength: 20,
      error: 'Máximo de 20 caracteres',
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
      label: 'Cidade',
      span: 'md:col-span-3',
      maxLength: 191,
      error: 'Cidade muito longa',
    },
  ];

  form = this.fb.nonNullable.group({
    cnpj: ['', [Validators.required, digitsLength([14])]],
    name: ['', [Validators.required, Validators.maxLength(191)]],
    tradeName: ['', [Validators.maxLength(191)]],
    stateRegistration: ['', [Validators.maxLength(20)]],
    phone: ['', [Validators.maxLength(20)]],
    zipCode: ['', [digitsLength([8])]],
    state: ['', [Validators.pattern(/^[A-Za-z]{2}$/)]],
    street: ['', [Validators.maxLength(191)]],
    streetNumber: ['', [Validators.maxLength(20)]],
    neighborhood: ['', [Validators.maxLength(191)]],
    city: ['', [Validators.maxLength(191)]],
  });

  status = signal<'loading' | 'ready' | 'error'>('loading');
  saving = signal(false);

  private original: CompanyPayload | null = null;

  ngOnInit(): void {
    this.load();
  }

  invalid(name: FieldName): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || control.dirty);
  }

  load(): void {
    this.status.set('loading');
    this.companyService.get().subscribe({
      next: (company) => {
        this.apply(company);
        this.status.set('ready');
      },
      error: () => this.status.set('error'),
    });
  }

  discard(): void {
    if (this.original) this.fillForm(this.original);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (!this.original) return;

    const current = this.toPayload();
    const changes: Record<string, unknown> = {};
    for (const { name } of this.fields) {
      if (current[name] !== this.original[name]) changes[name] = current[name];
    }

    if (!Object.keys(changes).length) {
      this.notification.warning('Nenhuma alteração detectada.');
      return;
    }

    this.saving.set(true);
    this.companyService.update(changes as Partial<CompanyPayload>).subscribe({
      next: (company) => {
        this.apply(company);
        this.saving.set(false);
        this.notification.success('Dados da empresa salvos');
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.notification.error(
          httpErrorMessage(err, 'Não foi possível salvar os dados da empresa'),
        );
      },
    });
  }

  private apply(company: Company): void {
    this.original = {
      cnpj: company.cnpj,
      name: company.name,
      tradeName: company.tradeName,
      stateRegistration: company.stateRegistration,
      phone: company.phone,
      street: company.street,
      streetNumber: company.streetNumber,
      neighborhood: company.neighborhood,
      city: company.city,
      state: company.state,
      zipCode: company.zipCode,
    };
    this.fillForm(this.original);
  }

  private fillForm(p: CompanyPayload): void {
    this.form.reset({
      cnpj: formatCnpj(p.cnpj),
      name: p.name,
      tradeName: p.tradeName ?? '',
      stateRegistration: p.stateRegistration ?? '',
      phone: p.phone ?? '',
      zipCode: p.zipCode ? formatZip(p.zipCode) : '',
      state: p.state ?? '',
      street: p.street ?? '',
      streetNumber: p.streetNumber ?? '',
      neighborhood: p.neighborhood ?? '',
      city: p.city ?? '',
    });
  }

  private toPayload(): CompanyPayload {
    const v = this.form.getRawValue();
    return {
      cnpj: onlyDigits(v.cnpj),
      name: v.name.trim(),
      tradeName: orNull(v.tradeName),
      stateRegistration: orNull(v.stateRegistration),
      phone: orNull(v.phone),
      street: orNull(v.street),
      streetNumber: orNull(v.streetNumber),
      neighborhood: orNull(v.neighborhood),
      city: orNull(v.city),
      state: orNull(v.state)?.toUpperCase() ?? null,
      zipCode: onlyDigits(v.zipCode) || null,
    };
  }
}
