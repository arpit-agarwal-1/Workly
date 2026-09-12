import { Component } from '@angular/core';
import {
  LucideSearch,
  LucideBell,
  LucideChevronDown,
} from '@lucide/angular';

@Component({
  selector: 'app-topbar',
  imports: [
    LucideSearch,
    LucideBell,
    LucideChevronDown,
  ],
  templateUrl: './topbar.html',
  styleUrl: './topbar.scss',
})
export class Topbar {}