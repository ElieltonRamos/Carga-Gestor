import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';

interface NavItem {
  label: string;
  route: string;
  icon: 'grid' | 'package' | 'building' | 'settings';
}

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app-layout.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppLayout {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly themeService = inject(ThemeService);

  readonly nav: NavItem[] = [
    { label: 'Dashboard', route: '/dashboard', icon: 'grid' },
    { label: 'Cargas', route: '/cargas', icon: 'package' },
    { label: 'Clientes', route: '/clientes', icon: 'building' },
    { label: 'Configurações', route: '/configuracoes', icon: 'settings' },
  ];

  readonly isDark = computed(() => this.themeService.theme() === 'dark');

  readonly currentUser = (() => {
    const payload = this.auth.getTokenPayload();
    const name = payload?.username ?? '';
    return {
      name,
      role: payload?.role ?? '',
      initials: name.slice(0, 2).toUpperCase(),
    };
  })();

  toggleTheme(): void {
    this.themeService.toggle();
  }

  logout(): void {
    localStorage.removeItem('token');
    this.router.navigate(['/']);
  }
}
