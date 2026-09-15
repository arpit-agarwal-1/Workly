import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MobileMenuService } from '../../services/mobile-menu.service';
import { AuthService } from '../../core/auth/auth.service';

import {
  LucideSearch,
  LucideBell,
  LucideChevronDown,
  LucideMenu,
  LucideLogOut,
} from '@lucide/angular';

@Component({
  selector: 'app-topbar',
  imports: [
    LucideSearch,
    LucideBell,
    LucideChevronDown,
    LucideMenu,
    LucideLogOut,
  ],
  templateUrl: './topbar.html',
  styleUrl: './topbar.scss',
})
export class Topbar {
  readonly menu = inject(MobileMenuService);

  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly profileMenuOpen = signal(false);

  protected toggleProfileMenu(): void {
    this.profileMenuOpen.update((open) => !open);
  }

  protected closeProfileMenu(): void {
    this.profileMenuOpen.set(false);
  }

  protected logout(): void {
    this.closeProfileMenu();

    this.authService.logout().subscribe({
      next: () => {
        void this.router.navigate(['/login']);
      },
      error: () => {
        // Even if the server request fails, don't leave
        // the user stuck on the authenticated screen.
        this.authService.clearAccessToken();
        void this.router.navigate(['/login']);
      },
    });
  }
}