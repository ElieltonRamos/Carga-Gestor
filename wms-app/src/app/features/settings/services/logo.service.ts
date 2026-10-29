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

    const src = document.createElement('canvas');
    src.width = bmp.width;
    src.height = bmp.height;
    const sctx = src.getContext('2d', { willReadFrequently: true })!;
    sctx.fillStyle = '#fff';
    sctx.fillRect(0, 0, src.width, src.height);
    sctx.drawImage(bmp, 0, 0);

    // Área ocupada pela marca (pixels que não são quase brancos)
    const { data, width, height } = sctx.getImageData(0, 0, src.width, src.height);
    let minX = width,
      minY = height,
      maxX = -1,
      maxY = -1;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        if (data[i] < 240 || data[i + 1] < 240 || data[i + 2] < 240) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < 0) {
      minX = 0;
      minY = 0;
      maxX = width - 1;
      maxY = height - 1;
    }

    const cw = maxX - minX + 1;
    const ch = maxY - minY + 1;
    const scale = Math.min(1, maxW / cw, maxH / ch);
    const out = document.createElement('canvas');
    out.width = Math.max(1, Math.round(cw * scale));
    out.height = Math.max(1, Math.round(ch * scale));
    const octx = out.getContext('2d')!;
    octx.fillStyle = '#fff';
    octx.fillRect(0, 0, out.width, out.height);
    octx.drawImage(src, minX, minY, cw, ch, 0, 0, out.width, out.height);
    return out.toDataURL('image/png');
  }
}
