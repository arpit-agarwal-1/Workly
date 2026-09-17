import {
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';

import {
  LucideFolderKanban,
  LucideListTodo,
  LucideTriangleAlert,
  LucideUsers,
} from '@lucide/angular';

import { MemberService } from '../../core/members/member.service';

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
export class Dashboard {
  private readonly memberService = inject(MemberService);

  protected readonly totalMembers = signal(0);

  ngOnInit(): void {
    this.loadTotalMembers();
  }

  private loadTotalMembers(): void {
    this.memberService
      .listMembers(1, 1)
      .subscribe({
        next: (response) => {
          this.totalMembers.set(response.data.total);
        },
      });
  }


}