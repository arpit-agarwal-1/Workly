import { Component, inject } from '@angular/core';
import { MobileMenuService } from '../../services/mobile-menu.service';
import {
  RouterLink, RouterLinkActive
} from '@angular/router';
import {
  LucideLayoutDashboard,
  LucideFolderKanban,
  LucideListChecks,
  LucideCalendarDays,
  LucideUsers,
  LucideChartNoAxesCombined,
  LucideSettings,
  LucideX,
} from '@lucide/angular';

@Component({
  selector: 'app-sidebar',
  imports: [
    RouterLink,
    RouterLinkActive,
    LucideLayoutDashboard,
    LucideFolderKanban,
    LucideListChecks,
    LucideCalendarDays,
    LucideUsers,
    LucideChartNoAxesCombined,
    LucideSettings,
    LucideX,
  ],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  readonly menu = inject(MobileMenuService);
}