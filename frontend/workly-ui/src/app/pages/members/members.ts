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
  Member,
  MemberRole,
  MemberStatus,
} from '../../core/members/member.model';

import { MemberService } from '../../core/members/member.service';

import {
  Invitation,
  InvitationRole,
} from '../../core/invitations/invitation.model';

import { InvitationService } from '../../core/invitations/invitation.service';

@Component({
  selector: 'app-members',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  templateUrl: './members.html',
  styleUrl: './members.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Members implements OnInit {
  private readonly memberService =
    inject(MemberService);

  private readonly invitationService =
    inject(InvitationService);

  private readonly fb =
    inject(FormBuilder);

  protected readonly members =
    signal<Member[]>([]);

  protected readonly filteredMembers =
    signal<Member[]>([]);

  protected readonly searchTerm =
    signal('');

  protected readonly selectedRole =
    signal<'all' | MemberRole>('all');

  protected readonly selectedStatus =
    signal<'all' | MemberStatus>('active');

  protected readonly currentPage =
    signal(1);

  protected readonly pageSize = 5;

  protected readonly total =
    signal(0);

  protected readonly totalPages =
    signal(1);

  protected readonly isLoading =
    signal(false);

  protected readonly errorMessage =
    signal('');

  // --------------------------------------------------
  // Invite state
  // --------------------------------------------------

  protected readonly showInviteModal =
    signal(false);

  protected readonly isInviting =
    signal(false);

  protected readonly inviteError =
    signal('');

  protected readonly invitationSuccess =
    signal(false);

  protected readonly createdInvitation =
    signal<Invitation | null>(null);

  protected readonly invitationLink =
    signal('');

  protected readonly copied =
    signal(false);

  protected readonly pendingInvitations =
    signal<Invitation[]>([]);

  protected readonly isLoadingInvitations =
    signal(false);

  protected readonly invitationListError =
    signal('');

  protected readonly revokingInvitationId =
    signal<string | null>(null);

  protected readonly inviteForm =
    this.fb.nonNullable.group({
      email: [
        '',
        [
          Validators.required,
          Validators.email,
          Validators.maxLength(160),
        ],
      ],
      role: [
        'member' as InvitationRole,
        Validators.required,
      ],
    });

  protected get inviteEmail() {
    return this.inviteForm.controls.email;
  }

  protected get inviteRole() {
    return this.inviteForm.controls.role;
  }

  ngOnInit(): void {
    this.loadMembers();
    this.loadPendingInvitations();
  }

  // --------------------------------------------------
  // Members
  // --------------------------------------------------

  protected loadMembers(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.memberService
      .listMembers(
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

          this.applyFilters();

          this.isLoading.set(false);
        },

        error: (error) => {
          console.error(
            'Failed to load members:',
            error
          );

          this.isLoading.set(false);

          this.errorMessage.set(
            'Unable to load members.'
          );
        },
      });
  }

  protected applyFilters(): void {
    const search =
      this.searchTerm()
        .trim()
        .toLowerCase();

    const role =
      this.selectedRole();

    const status =
      this.selectedStatus();

    const filtered =
      this.members().filter(
        (member) => {
          const matchesSearch =
            !search ||
            member.user.name
              .toLowerCase()
              .includes(search) ||
            member.user.email
              .toLowerCase()
              .includes(search);

          const matchesRole =
            role === 'all' ||
            member.role === role;

          const matchesStatus =
            status === 'all' ||
            member.status === status;

          return (
            matchesSearch &&
            matchesRole &&
            matchesStatus
          );
        }
      );

    this.filteredMembers.set(
      filtered
    );
  }

  protected onSearchChange(
    value: string
  ): void {
    this.searchTerm.set(value);
    this.applyFilters();
  }

  protected onRoleChange(
    value: 'all' | MemberRole
  ): void {
    this.selectedRole.set(value);
    this.applyFilters();
  }

  protected onStatusChange(
    value: 'all' | MemberStatus
  ): void {
    this.selectedStatus.set(value);
    this.applyFilters();
  }

  // --------------------------------------------------
  // Invite
  // --------------------------------------------------

  protected openInviteModal(): void {
    this.inviteForm.reset({
      email: '',
      role: 'member',
    });

    this.inviteError.set('');
    this.invitationSuccess.set(false);
    this.createdInvitation.set(null);
    this.invitationLink.set('');
    this.copied.set(false);

    this.showInviteModal.set(true);
  }

  protected closeInviteModal(): void {
    if (this.isInviting()) {
      return;
    }

    this.showInviteModal.set(false);
  }

  protected submitInvitation(): void {
    this.inviteError.set('');

    if (this.inviteForm.invalid) {
      this.inviteForm.markAllAsTouched();
      return;
    }

    this.isInviting.set(true);

    const payload = {
      email: this.inviteEmail.value
        .trim()
        .toLowerCase(),

      role: this.inviteRole.value,
    };

    this.invitationService
      .createInvitation(payload)
      .subscribe({
        next: (response) => {
          const invitation =
            response.data;

          this.createdInvitation.set(
            invitation
          );

          this.invitationLink.set(
            invitation.invitationLink
          );

          this.invitationSuccess.set(
            true
          );

          this.isInviting.set(false);

          this.loadPendingInvitations();
        },

        error: (error) => {
          console.error(
            'Failed to create invitation:',
            error
          );

          this.isInviting.set(false);

          if (
            error.status === 409
          ) {
            this.inviteError.set(
              'A pending invitation already exists for this email.'
            );
            return;
          }

          if (
            error.status === 403
          ) {
            this.inviteError.set(
              'You do not have permission to invite members.'
            );
            return;
          }

          this.inviteError.set(
            'Unable to create invitation. Please try again.'
          );
        },
      });
  }

  protected async copyInvitationLink(): Promise<void> {
    const link =
      this.invitationLink();

    if (!link) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        link
      );

      this.copied.set(true);

      window.setTimeout(() => {
        this.copied.set(false);
      }, 2000);
    } catch (error) {
      console.error(
        'Failed to copy invitation link:',
        error
      );
    }
  }

  protected finishInvitation(): void {
    this.showInviteModal.set(false);
    this.invitationSuccess.set(false);
  }

  // --------------------------------------------------
  // Pending invitations
  // --------------------------------------------------

  protected loadPendingInvitations(): void {
    this.isLoadingInvitations.set(
      true
    );

    this.invitationListError.set('');

    this.invitationService
      .listInvitations(1, 100, 'pending')
      .subscribe({
        next: (response) => {
          this.pendingInvitations.set(
            response.data.items
          );

          this.isLoadingInvitations.set(
            false
          );
        },

        error: (error) => {
          console.error(
            'Failed to load invitations:',
            error
          );

          this.isLoadingInvitations.set(
            false
          );

          this.invitationListError.set(
            'Unable to load pending invitations.'
          );
        },
      });
  }

  protected revokeInvitation(
    invitationId: string
  ): void {
    if (
      this.revokingInvitationId()
    ) {
      return;
    }

    this.revokingInvitationId.set(
      invitationId
    );

    this.invitationService
      .revokeInvitation(invitationId)
      .subscribe({
        next: () => {
          this.pendingInvitations.update(
            (invitations) =>
              invitations.filter(
                (invitation) =>
                  invitation.id !==
                  invitationId
              )
          );

          this.revokingInvitationId.set(
            null
          );
        },

        error: (error) => {
          console.error(
            'Failed to revoke invitation:',
            error
          );

          this.revokingInvitationId.set(
            null
          );
        },
      });
  }

  // --------------------------------------------------
  // Helpers
  // --------------------------------------------------

  protected getInitials(
    member: Member
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
      parts[parts.length - 1].charAt(0)
    ).toUpperCase();
  }

  protected getRoleLabel(
    role: MemberRole
  ): string {
    return (
      role.charAt(0).toUpperCase() +
      role.slice(1)
    );
  }

  protected getInvitationRoleLabel(
    role: InvitationRole
  ): string {
    return (
      role.charAt(0).toUpperCase() +
      role.slice(1)
    );
  }

  protected getStatusLabel(
    status: MemberStatus
  ): string {
    return (
      status.charAt(0).toUpperCase() +
      status.slice(1)
    );
  }

  protected getPageStart(): number {
    const total =
      this.total();

    if (total === 0) {
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

  protected trackByMember(
    _index: number,
    member: Member
  ): string {
    return member.id;
  }
}