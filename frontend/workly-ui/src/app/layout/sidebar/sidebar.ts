import { Component } from '@angular/core';
import {
  LucideLayoutDashboard,
  LucideFolderKanban,
  LucideListChecks,
  LucideCalendarDays,
  LucideUsers,
  LucideChartNoAxesCombined,
  LucideSettings,
} from '@lucide/angular';

@Component({
  selector: 'app-sidebar',
  imports: [
    LucideLayoutDashboard,
    LucideFolderKanban,
    LucideListChecks,
    LucideCalendarDays,
    LucideUsers,
    LucideChartNoAxesCombined,
    LucideSettings,
  ],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {}