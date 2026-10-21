import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, debounceTime, of, switchMap } from 'rxjs';
import { CreateUserPayload, UpdateUserPayload, User, UserRole } from '../../types/user';
import { UsersService } from '../../services/users.service';
import { NotificationService } from '../../../../shared/toastr/notification.service';
import { AuthService } from '../../../../core/services/auth.service';
import { httpErrorMessage } from '../../../../shared/utils/form-utils';
import { alertConfirm } from '../../../../shared/alerts/custom-alerts';

const PROTECTED_USER_ID = 1;

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  OPERATOR: 'Operador',
  CHECKER: 'Conferente',
};

const ROLE_CLASSES: Record<UserRole, string> = {
  ADMIN: 'bg-primary-subtle text-primary-text',
  OPERATOR: 'bg-bg-surface text-text-secondary',
  CHECKER: 'bg-info-subtle text-info',
};

@Component({
  selector: 'app-users-list',
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './users-list.html',
})
export class UsersList {
  @ViewChild('formCard') formCard!: ElementRef<HTMLElement>;

  private readonly fb = inject(FormBuilder);
  private readonly usersService = inject(UsersService);
  private readonly notification = inject(NotificationService);
  private readonly auth = inject(AuthService);

  readonly roles = (Object.keys(ROLE_LABELS) as UserRole[]).map((value) => ({
    value,
    label: ROLE_LABELS[value],
  }));

  readonly currentUserId = this.auth.getTokenPayload()?.userId;

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(191)]],
    username: [
      '',
      [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(50),
        Validators.pattern(/^[A-Za-z0-9._-]+$/),
      ],
    ],
    password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(72)]],
    role: ['OPERATOR' as UserRole, [Validators.required]],
  });

  editingId = signal<number | null>(null);
  saving = signal(false);
  search = signal('');
  roleFilter = signal<UserRole | ''>('');
  private readonly refresh = signal(0);

  private readonly query = computed(() => ({
    username: this.search().trim() || undefined,
    role: this.roleFilter() || undefined,
    refresh: this.refresh(),
  }));

  private readonly response = toSignal(
    toObservable(this.query).pipe(
      debounceTime(300),
      switchMap(({ username, role }) =>
        this.usersService.findAll({ username, role }).pipe(catchError(() => of(null))),
      ),
    ),
    { initialValue: undefined },
  );

  rows = computed(() => this.response() ?? []);
  loading = computed(() => this.response() === undefined);
  failed = computed(() => this.response() === null);

  roleLabel(role: UserRole): string {
    return ROLE_LABELS[role];
  }

  roleClass(role: UserRole): string {
    return ROLE_CLASSES[role];
  }

  isProtected(user: User): boolean {
    return user.id === PROTECTED_USER_ID;
  }

  canDeactivate(user: User): boolean {
    return !this.isProtected(user) && user.id !== this.currentUserId;
  }

  invalid(name: 'name' | 'username' | 'password' | 'role'): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || control.dirty);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { name, username, password, role } = this.form.getRawValue();
    const id = this.editingId();

    this.saving.set(true);

    let request$;
    if (id === null) {
      const payload: CreateUserPayload = {
        name: name.trim(),
        username: username.trim(),
        password,
        role,
      };
      request$ = this.usersService.create(payload);
    } else {
      const payload: UpdateUserPayload = { name: name.trim(), username: username.trim(), role };
      if (password) payload.password = password;
      request$ = this.usersService.update(id, payload);
    }

    request$.subscribe({
      next: () => {
        this.notification.success(id === null ? 'Usuário cadastrado' : 'Usuário atualizado');
        this.resetForm();
        this.refresh.update((v) => v + 1);
        this.saving.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.notification.error(httpErrorMessage(err, 'Não foi possível salvar o usuário'));
      },
    });
  }

  startEdit(user: User): void {
    this.editingId.set(user.id);
    this.setPasswordRules(true);
    this.form.reset({
      name: user.name,
      username: user.username,
      password: '',
      role: user.role,
    });
    this.formCard.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  cancelEdit(): void {
    this.resetForm();
  }

  async deactivate(user: User): Promise<void> {
    const confirmed = await alertConfirm('Desativar este usuário?');
    if (!confirmed) return;

    this.usersService.remove(user.id).subscribe({
      next: () => {
        this.notification.success('Usuário desativado');
        if (this.editingId() === user.id) this.resetForm();
        this.refresh.update((v) => v + 1);
      },
      error: (err: HttpErrorResponse) => {
        this.notification.error(httpErrorMessage(err, 'Não foi possível desativar o usuário'));
      },
    });
  }

  private resetForm(): void {
    this.editingId.set(null);
    this.setPasswordRules(false);
    this.form.reset({ name: '', username: '', password: '', role: 'OPERATOR' });
  }

  // Cadastro: senha obrigatória. Edição: opcional (vazio mantém a atual)
  private setPasswordRules(editing: boolean): void {
    const rules = [Validators.minLength(6), Validators.maxLength(72)];
    const control = this.form.controls.password;
    control.setValidators(editing ? rules : [Validators.required, ...rules]);
    control.updateValueAndValidity();
  }
}
