import { Component, inject, signal } from '@angular/core';
import { LogoStorage } from '../../services/logo.service';

@Component({
  selector: 'app-company-logo',
  templateUrl: './company-logo.html',
})
export class CompanyLogo {
  protected readonly logoStorage = inject(LogoStorage);
  protected readonly busy = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  constructor() {
    this.run(() => this.logoStorage.load());
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) this.run(() => this.logoStorage.set(file));
  }

  remove(): void {
    this.run(() => this.logoStorage.clear());
  }

  private async run(action: () => Promise<unknown>): Promise<void> {
    this.busy.set(true);
    this.errorMessage.set(null);
    try {
      await action();
    } catch {
      this.errorMessage.set('Não foi possível concluir a operação com a logo.');
    } finally {
      this.busy.set(false);
    }
  }
}
