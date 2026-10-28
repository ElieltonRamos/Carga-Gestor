import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CompanyService } from './company.service'; // ajuste o caminho

@Injectable({ providedIn: 'root' })
export class LogoStorage {
  private readonly companyService = inject(CompanyService);
  readonly logo = signal<string | null>(null);

  async load(): Promise<string | null> {
    const { logo } = await firstValueFrom(this.companyService.getLogo());
    this.logo.set(logo);
    return logo;
  }

  async set(file: File): Promise<void> {
    const dataUrl = await this.resize(file, 400, 200);
    const { logo } = await firstValueFrom(this.companyService.setLogo(dataUrl));
    this.logo.set(logo);
  }

  async clear(): Promise<void> {
    await firstValueFrom(this.companyService.removeLogo());
    this.logo.set(null);
  }

  // Reduz e converte para PNG com fundo branco, para ficar abaixo do limite do backend
  private async resize(file: File, maxW: number, maxH: number): Promise<string> {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, maxW / bmp.width, maxH / bmp.height);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  }
}
