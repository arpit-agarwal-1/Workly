import { Component } from '@angular/core';
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
export class Dashboard {}