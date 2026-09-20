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
  ActivatedRoute,
  Router,
  RouterLink,
} from '@angular/router';

import {
  LucideArrowLeft,
  LucidePlus,
  LucideSearch,
  LucideTrash2,
  LucideChevronLeft,
  LucideChevronRight,
  LucideX,
} from '@lucide/angular';

import {
  AvailableTeamMember,
  Team,
  TeamMember,
} from '../../core/teams/team.model';

import {
  TeamService,
} from '../../core/teams/team.service';

@Component({
  selector: 'app-team-detail',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,

    LucideArrowLeft,
    LucidePlus,
    LucideSearch,
    LucideTrash2,
    LucideChevronLeft,
    LucideChevronRight,
    LucideX,
  ],
  templateUrl: './team-detail.html',
  styleUrl: './team-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamDetail implements OnInit {
  private readonly teamService =
    inject(TeamService);

  private readonly route =
    inject(ActivatedRoute);

  private readonly router =
    inject(Router);

  private readonly fb =
    inject(FormBuilder);

  protected readonly team =
    signal<Team | null>(null);

  protected readonly members =
    signal<TeamMember[]>([]);

  protected readonly availableMembers =
    signal<AvailableTeamMember[]>([]);

  protected readonly memberSearch =
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

  protected readonly showAddMemberModal =
    signal(false);

  protected readonly isLoadingAvailable =
    signal(false);

  protected readonly availableMembersError =
    signal('');

  protected readonly selectedMemberId =
    signal('');

  protected readonly isAddingMember =
    signal(false);

  protected readonly addMemberError =
    signal('');

  protected readonly removingMemberId =
    signal<string | null>(null);

  protected readonly removeMemberError =
    signal('');

  protected readonly showRemoveMemberDialog =
    signal(false);

  protected readonly memberToRemove =
    signal<TeamMember | null>(null);

  protected readonly showEditModal =
    signal(false);

  protected readonly isUpdating =
    signal(false);

  protected readonly updateError =
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

  private teamId = '';

  ngOnInit(): void {
    this.teamId =
      this.route.snapshot.paramMap.get(
        'teamId'
      ) ?? '';

    if (!this.teamId) {
      this.router.navigate(['/teams']);
      return;
    }

    this.loadTeam();
    this.loadMembers();
  }

  protected loadTeam(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.teamService
      .getTeam(this.teamId)
      .subscribe({
        next: (response) => {
          this.team.set(response.data);
          this.isLoading.set(false);
        },

        error: (error) => {
          console.error(
            'Failed to load team:',
            error
          );

          this.isLoading.set(false);

          if (error.status === 404) {
            this.errorMessage.set(
              'Team not found.'
            );

            return;
          }

          this.errorMessage.set(
            'Unable to load team.'
          );
        },
      });
  }

  protected loadMembers(): void {
    this.teamService
      .listTeamMembers(
        this.teamId,
        this.currentPage(),
        this.pageSize
      )
      .subscribe({
        next: (response) => {
          this.members.set(
            response.data.items
          );

          this.total.set(
            response.data.total
          );

          this.totalPages.set(
            response.data.totalPages
          );
        },

        error: (error) => {
          console.error(
            'Failed to load team members:',
            error
          );
        },
      });
  }

  protected openEditModal(): void {
    const currentTeam =
      this.team();

    if (!currentTeam) {
      return;
    }

    this.teamForm.reset({
      name: currentTeam.name,
      description: currentTeam.description,
    });

    this.updateError.set('');
    this.showEditModal.set(true);
  }

  protected closeEditModal(): void {
    if (this.isUpdating()) {
      return;
    }

    this.showEditModal.set(false);
  }

  protected updateTeam(): void {
    this.updateError.set('');

    if (this.teamForm.invalid) {
      this.teamForm.markAllAsTouched();
      return;
    }

    this.isUpdating.set(true);

    const payload = {
      name: this.teamName.value.trim(),
      description:
        this.teamDescription.value.trim(),
    };

    this.teamService
      .updateTeam(
        this.teamId,
        payload
      )
      .subscribe({
        next: (response) => {
          this.team.set(response.data);
          this.isUpdating.set(false);
          this.showEditModal.set(false);
        },

        error: (error) => {
          console.error(
            'Failed to update team:',
            error
          );

          this.isUpdating.set(false);

          if (error.status === 409) {
            this.updateError.set(
              'A team with this name already exists.'
            );

            return;
          }

          if (error.status === 403) {
            this.updateError.set(
              'You do not have permission to update teams.'
            );

            return;
          }

          this.updateError.set(
            'Unable to update team. Please try again.'
          );
        },
      });
  }

  protected openAddMemberModal(): void {
    this.memberSearch.set('');
    this.availableMembers.set([]);
    this.selectedMemberId.set('');
    this.availableMembersError.set('');
    this.addMemberError.set('');

    this.showAddMemberModal.set(true);

    this.loadAvailableMembers();
  }

  protected closeAddMemberModal(): void {
    if (this.isAddingMember()) {
      return;
    }

    this.showAddMemberModal.set(false);
  }

  protected onMemberSearch(
    value: string
  ): void {
    this.memberSearch.set(value);
    this.loadAvailableMembers();
  }

  protected loadAvailableMembers(): void {
    this.isLoadingAvailable.set(true);
    this.availableMembersError.set('');

    this.teamService
      .listAvailableMembers(
        this.teamId,
        1,
        20,
        this.memberSearch()
      )
      .subscribe({
        next: (response) => {
          this.availableMembers.set(
            response.data.items
          );

          this.isLoadingAvailable.set(false);
        },

        error: (error) => {
          console.error(
            'Failed to load available members:',
            error
          );

          this.isLoadingAvailable.set(false);

          this.availableMembersError.set(
            'Unable to load available members.'
          );
        },
      });
  }

  protected selectMember(
    membershipId: string
  ): void {
    this.selectedMemberId.set(
      membershipId
    );
  }

  protected addMember(): void {
    const membershipId =
      this.selectedMemberId();

    if (
      !membershipId ||
      this.isAddingMember()
    ) {
      return;
    }

    this.isAddingMember.set(true);
    this.addMemberError.set('');

    this.teamService
      .addTeamMember(
        this.teamId,
        membershipId
      )
      .subscribe({
        next: () => {
          this.isAddingMember.set(false);
          this.showAddMemberModal.set(false);

          this.loadMembers();
        },

        error: (error) => {
          console.error(
            'Failed to add team member:',
            error
          );

          this.isAddingMember.set(false);

          if (error.status === 409) {
            this.addMemberError.set(
              'This member is already in the team.'
            );

            return;
          }

          this.addMemberError.set(
            'Unable to add member. Please try again.'
          );
        },
      });
  }

  protected openRemoveMemberDialog(
    member: TeamMember
  ): void {
    this.memberToRemove.set(member);
    this.removeMemberError.set('');
    this.showRemoveMemberDialog.set(true);
  }

  protected closeRemoveMemberDialog(): void {
    if (this.removingMemberId()) {
      return;
    }

    this.showRemoveMemberDialog.set(false);
    this.memberToRemove.set(null);
    this.removeMemberError.set('');

  }

  protected confirmRemoveMember(): void {
    const member = this.memberToRemove();

    if (!member || this.removingMemberId()) {
      return;
    }

    this.removingMemberId.set(member.id);

    this.teamService
      .removeTeamMember(
        this.teamId,
        member.id
      )
      .subscribe({
        next: () => {
          this.removingMemberId.set(null);
          this.showRemoveMemberDialog.set(false);
          this.memberToRemove.set(null);

          if (
            this.members().length === 1 &&
            this.currentPage() > 1
          ) {
            this.currentPage.update(
              (page) => page - 1
            );
          }

          this.loadMembers();
        },

        error: (error) => {
          console.error(
            'Failed to remove team member:',
            error
          );

          this.removingMemberId.set(null);

          if (error.status === 404) {
            this.removeMemberError.set(
              'Team member was not found.'
            );
            return;
          }

          if (error.status === 403) {
            this.removeMemberError.set(
              'You do not have permission to remove team members.'
            );
            return;
          }

          this.removeMemberError.set(
            'Unable to remove team member. Please try again.'
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

    this.loadMembers();
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

    this.loadMembers();
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

  protected getInitials(
    member: TeamMember
  ): string {
    const name =
      member.user.name.trim();

    if (!name) {
      return '?';
    }

    const parts =
      name.split(/\s+/);

    if (parts.length === 1) {
      return parts[0]
        .charAt(0)
        .toUpperCase();
    }

    return (
      parts[0].charAt(0) +
      parts[
        parts.length - 1
      ].charAt(0)
    ).toUpperCase();
  }

  protected getAvailableInitials(
    member: AvailableTeamMember
  ): string {
    const name =
      member.user.name.trim();

    if (!name) {
      return '?';
    }

    const parts =
      name.split(/\s+/);

    if (parts.length === 1) {
      return parts[0]
        .charAt(0)
        .toUpperCase();
    }

    return (
      parts[0].charAt(0) +
      parts[
        parts.length - 1
      ].charAt(0)
    ).toUpperCase();
  }

  protected trackByMember(
    _index: number,
    member: TeamMember
  ): string {
    return member.id;
  }

  protected trackByAvailableMember(
    _index: number,
    member: AvailableTeamMember
  ): string {
    return member.id;
  }
}