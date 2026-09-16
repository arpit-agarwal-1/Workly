import {
  Component,
  inject,
} from '@angular/core';

import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import {
  ActivatedRoute,
  Router,
  RouterLink,
} from '@angular/router';

import { InvitationService } from '../../core/invitations/invitation.service';

@Component({
  selector: 'app-accept-invitation',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
  ],
  templateUrl: './accept-invitation.html',
  styleUrl: './accept-invitation.scss',
})
export class AcceptInvitation {
  private readonly formBuilder = inject(FormBuilder);
  private readonly invitationService = inject(InvitationService);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly acceptInvitationForm =
    this.formBuilder.nonNullable.group({
      name: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(100),
        ],
      ],

      password: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.maxLength(128),
        ],
      ],

      confirmPassword: [
        '',
        [
          Validators.required,
        ],
      ],
    });

  token = '';

  isSubmitting = false;
  showPassword = false;
  showConfirmPassword = false;

  errorMessage = '';
  successMessage = '';

  constructor() {
    this.token =
      this.activatedRoute.snapshot.queryParamMap.get('token')?.trim() ?? '';
  }

  get nameControl() {
    return this.acceptInvitationForm.controls.name;
  }

  get passwordControl() {
    return this.acceptInvitationForm.controls.password;
  }

  get confirmPasswordControl() {
    return this.acceptInvitationForm.controls.confirmPassword;
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword =
      !this.showConfirmPassword;
  }

  submit(): void {
    this.errorMessage = '';

    if (!this.token) {
      this.errorMessage =
        'This invitation link is invalid.';
      return;
    }

    if (this.acceptInvitationForm.invalid) {
      this.acceptInvitationForm.markAllAsTouched();
      return;
    }

    const {
      name,
      password,
      confirmPassword,
    } = this.acceptInvitationForm.getRawValue();

    if (password !== confirmPassword) {
      this.confirmPasswordControl.setErrors({
        mismatch: true,
      });

      this.confirmPasswordControl.markAsTouched();

      return;
    }

    this.isSubmitting = true;

    const payload = {
      name,
      password,
    };

    this.invitationService
      .acceptInvitation(this.token, payload)
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          this.successMessage =
            'Your account has been created successfully.';

          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 1200);
        },

        error: (error) => {
          this.isSubmitting = false;

          this.errorMessage =
            error?.error?.message ??
            'Unable to accept this invitation. Please try again.';
        },
      });
  }
}