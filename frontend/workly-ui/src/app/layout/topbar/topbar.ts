import { Component, inject } from '@angular/core';
import { MobileMenuService } from '../../services/mobile-menu.service';
import {
  LucideSearch,
  LucideBell,
  LucideChevronDown,
  LucideMenu,
} from '@lucide/angular';

@Component({
  selector: 'app-topbar',
  imports: [
    LucideSearch,
    LucideBell,
    LucideChevronDown,
    LucideMenu,
  ],
  templateUrl: './topbar.html',
  styleUrl: './topbar.scss',
})
export class Topbar {
  readonly menu = inject(MobileMenuService);
}