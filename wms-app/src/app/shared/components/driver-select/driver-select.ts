import { Component, EventEmitter, inject, Input, Output, signal, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil, switchMap, of, catchError } from 'rxjs';
import { DriversService } from '../../../features/drivers/services/drivers.service';
import { Driver } from '../../../features/drivers/types/driver';

@Component({
  selector: 'app-driver-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './driver-select.html',
  styleUrl: './driver-select.css',
})
export class DriverSelect implements OnDestroy {
  private readonly driversService = inject(DriversService);
  private readonly destroy$ = new Subject<void>();
  private readonly searchSubject = new Subject<string>();
  private readonly uniqueId = Math.random().toString(36).slice(2, 9);

  @Input() driverId: number | null = null;
  @Input() driverName: string = '';
  @Input() driverPhone: string | null = null;
  @Input() placeholder = 'Buscar motorista...';
  @Input() disabled = false;

  @Output() driverSelected = new EventEmitter<Driver | null>();
  @Output() nameChanged = new EventEmitter<string>();
  @Output() phoneChanged = new EventEmitter<string | null>();

  protected readonly searchTerm = signal('');
  protected readonly options = signal<Driver[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly isOpen = signal(false);
  protected readonly selectedDriver = signal<Driver | null>(null);
  protected readonly error = signal<string | null>(null);

  protected readonly inputId = `driver-select-${this.uniqueId}`;

  constructor() {
    // Sync searchTerm with driverName input when it changes externally (e.g., form patchValue)
    effect(() => {
      const name = this.driverName;
      const driver = this.selectedDriver();
      if (!driver && name) {
        this.searchTerm.set(name);
      } else if (driver) {
        this.searchTerm.set(driver.name);
      }
    });

    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((term) => {
        if (!term.trim()) {
          this.options.set([]);
          return of({ data: [], total: 0, page: 1, limit: 10, totalPages: 0 });
        }
        this.isLoading.set(true);
        this.error.set(null);
        return this.driversService.findAll({ page: 1, limit: 10, search: term }).pipe(
          catchError(() => {
            this.error.set('Erro ao buscar motoristas');
            return of({ data: [], total: 0, page: 1, limit: 10, totalPages: 0 });
          }),
        );
      }),
      takeUntil(this.destroy$),
    ).subscribe((result) => {
      this.options.set(result.data);
      this.isLoading.set(false);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
    this.searchSubject.next(value);
    this.isOpen.set(true);
  }

  protected onFocus(): void {
    if (this.searchTerm()) {
      this.isOpen.set(true);
    }
  }

  protected onBlur(): void {
    // Small delay to allow click on option
    setTimeout(() => this.isOpen.set(false), 200);
  }

  protected selectDriver(driver: Driver): void {
    this.selectedDriver.set(driver);
    this.searchTerm.set(driver.name);
    this.driverId = driver.id;
    this.driverName = driver.name;
    this.driverPhone = driver.phone;
    this.options.set([]);
    this.isOpen.set(false);
    this.driverSelected.emit(driver);
    this.nameChanged.emit(driver.name);
    this.phoneChanged.emit(driver.phone);
  }

  protected onNameInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    // If user manually edits the name, clear driverId so backend uses name matching
    if (this.selectedDriver() && value !== this.selectedDriver()!.name) {
      this.selectedDriver.set(null);
      this.driverId = null;
    }
    this.driverName = value;
    this.nameChanged.emit(value);
  }

  protected onPhoneInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.driverPhone = value || null;
    this.phoneChanged.emit(this.driverPhone);
  }

  protected clearSelection(): void {
    this.selectedDriver.set(null);
    this.searchTerm.set('');
    this.driverId = null;
    this.driverName = '';
    this.driverPhone = null;
    this.driverSelected.emit(null);
    this.nameChanged.emit('');
    this.phoneChanged.emit(null);
  }
}