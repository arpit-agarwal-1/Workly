import {
  Component,
  inject,
} from '@angular/core';

import {
  Router,
  RouterOutlet,
} from '@angular/router';

import { Sidebar } from './layout/sidebar/sidebar';
import { Topbar } from './layout/topbar/topbar';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    Sidebar,
    Topbar,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly router =
    inject(Router);

  protected get isDashboardRoute(): boolean {
    return (
      this.router.url === '/dashboard' ||
      this.router.url.startsWith('/members')
    );
  }
}