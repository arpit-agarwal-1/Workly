import {
  Component,
  OnInit,
  inject
} from '@angular/core';

import { HttpClient } from '@angular/common/http';

import {
  LucideFolderKanban,
  LucideListTodo,
  LucideTriangleAlert,
  LucideUsers,
} from '@lucide/angular';

@Component({
  selector: 'app-dashboard',
  imports: [
    LucideFolderKanban,
    LucideListTodo,
    LucideTriangleAlert,
    LucideUsers,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard{
  private readonly http = inject(HttpClient);

}