import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';

import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  Validators,
} from '@angular/forms';

import {
  RouterLink,
} from '@angular/router';

import {
  LucidePlus,
  LucideSearch,
  LucideEye,
  LucidePencil,
  LucideTrash2,
  LucideChevronLeft,
  LucideChevronRight,
  LucideX,
  LucideUsers,
} from '@lucide/angular';

import {
  Team,
} from '../../core/teams/team.model';

import {
  TeamService,
} from '../../core/teams/team.service';

@Component({
  selector: 'app-teams',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,

    LucidePlus,
    LucideSearch,
    LucideEye,
    LucidePencil,
    LucideTrash2,
    LucideChevronLeft,
    LucideChevronRight,
    LucideX,
    LucideUsers,
  ],
  templateUrl: './teams.html',
  styleUrl: './teams.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Teams implements OnInit {
  private readonly teamService =
    inject(TeamService);

  private readonly fb =
    inject(FormBuilder);

  protected readonly teams =
    signal<Team[]>([]);

  protected readonly filteredTeams =
    signal<Team[]>([]);

  protected readonly searchTerm =
    signal('');

  protected readonly currentPage =
    signal(1);

  protected readonly pageSize = 10;

  protected readonly total =
    signal(0);

  protected readonly totalPages =
    signal(1);

  protected readonly isLoading =
    signal(false);

  protected readonly errorMessage =
    signal('');

  protected readonly showCreateModal =
    signal(false);

  protected readonly isCreating =
    signal(false);

  protected readonly createError =
    signal('');

  protected readonly showDeleteModal =
    signal(false);

  protected readonly teamToDelete =
    signal<Team | null>(null);

  protected readonly isDeleting =
    signal(false);

  protected readonly deleteError =
    signal('');

  protected readonly teamForm =
    this.fb.nonNullable.group({
      name: [
        '',
        [
          Validators.required,
          Validators.minLength(1),
          Validators.maxLength(100),
        ],
      ],

      description: [
        '',
        [
          Validators.maxLength(500),
        ],
      ],
    });

  protected get teamName() {
    return this.teamForm.controls.name;
  }

  protected get teamDescription() {
    return this.teamForm.controls.description;
  }

  ngOnInit(): void {
    this.loadTeams();
  }

  protected loadTeams(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.teamService
      .listTeams(
        this.currentPage(),
        this.pageSize
      )
      .subscribe({
        next: (response) => {
          this.teams.set(
            response.data.items
          );

          this.total.set(
            response.data.total
          );

          this.totalPages.set(
            response.data.totalPages
          );

          this.applySearch();

          this.isLoading.set(false);
        },

        error: (error) => {
          console.error(
            'Failed to load teams:',
            error
          );

          this.isLoading.set(false);

          this.errorMessage.set(
            'Unable to load teams.'
          );
        },
      });
  }

  protected onSearchChange(
    value: string
  ): void {
    this.searchTerm.set(value);
    this.applySearch();
  }

  protected applySearch(): void {
    const search =
      this.searchTerm()
        .trim()
        .toLowerCase();

    if (!search) {
      this.filteredTeams.set(
        this.teams()
      );

      return;
    }

    this.filteredTeams.set(
      this.teams().filter(
        (team) =>
          team.name
            .toLowerCase()
            .includes(search) ||
          team.description
            .toLowerCase()
            .includes(search)
      )
    );
  }

  protected openCreateModal(): void {
    this.teamForm.reset({
      name: '',
      description: '',
    });

    this.createError.set('');
    this.showCreateModal.set(true);
  }

  protected closeCreateModal(): void {
    if (this.isCreating()) {
      return;
    }

    this.showCreateModal.set(false);
  }

  protected createTeam(): void {
    this.createError.set('');

    if (this.teamForm.invalid) {
      this.teamForm.markAllAsTouched();
      return;
    }

    this.isCreating.set(true);

    const payload = {
      name: this.teamName.value.trim(),
      description:
        this.teamDescription.value.trim(),
    };

    this.teamService
      .createTeam(payload)
      .subscribe({
        next: () => {
          this.isCreating.set(false);
          this.showCreateModal.set(false);

          this.currentPage.set(1);
          this.loadTeams();
        },

        error: (error) => {
          console.error(
            'Failed to create team:',
            error
          );

          this.isCreating.set(false);

          if (error.status === 409) {
            this.createError.set(
              'A team with this name already exists.'
            );

            return;
          }

          if (error.status === 403) {
            this.createError.set(
              'You do not have permission to create teams.'
            );

            return;
          }

          this.createError.set(
            'Unable to create team. Please try again.'
          );
        },
      });
  }

  protected openDeleteModal(
    team: Team
  ): void {
    this.teamToDelete.set(team);
    this.deleteError.set('');
    this.showDeleteModal.set(true);
  }

  protected closeDeleteModal(): void {
    if (this.isDeleting()) {
      return;
    }

    this.showDeleteModal.set(false);
    this.teamToDelete.set(null);
    this.deleteError.set('');
  }

  protected deleteTeam(): void {
    const team =
      this.teamToDelete();

    if (!team || this.isDeleting()) {
      return;
    }

    this.isDeleting.set(true);

    this.teamService
      .deleteTeam(team._id)
      .subscribe({
        next: () => {
          this.isDeleting.set(false);
          this.showDeleteModal.set(false);
          this.teamToDelete.set(null);

          if (
            this.teams().length === 1 &&
            this.currentPage() > 1
          ) {
            this.currentPage.update(
              (page) => page - 1
            );
          }

          this.loadTeams();
        },

        error: (error) => {
          console.error(
            'Failed to delete team:',
            error
          );

          this.isDeleting.set(false);

          if (error.status === 403) {
            this.deleteError.set(
              'You do not have permission to delete teams.'
            );

            return;
          }

          if (error.status === 404) {
            this.deleteError.set(
              'Team was not found.'
            );

            return;
          }

          this.deleteError.set(
            'Unable to delete team. Please try again.'
          );
        },
      });
  }

  protected previousPage(): void {
    if (this.currentPage() <= 1) {
      return;
    }

    this.currentPage.update(
      (page) => page - 1
    );

    this.loadTeams();
  }

  protected nextPage(): void {
    if (
      this.currentPage() >=
      this.totalPages()
    ) {
      return;
    }

    this.currentPage.update(
      (page) => page + 1
    );

    this.loadTeams();
  }

  protected getPageStart(): number {
    if (this.total() === 0) {
      return 0;
    }

    return (
      (this.currentPage() - 1) *
      this.pageSize +
      1
    );
  }

  protected getPageEnd(): number {
    return Math.min(
      this.currentPage() *
      this.pageSize,
      this.total()
    );
  }

  protected trackByTeam(
    _index: number,
    team: Team
  ): string {
    return team._id;
  }
}