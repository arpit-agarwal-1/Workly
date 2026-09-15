import { Component, inject } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink
  ],
  templateUrl: './signup.html',
  styleUrl: './signup.scss'
})
export class Signup {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly signupForm = this.formBuilder.nonNullable.group({
    name: [
      '',
      [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(100)
      ]
    ],

    email: [
      '',
      [
        Validators.required,
        Validators.email,
        Validators.maxLength(255)
      ]
    ],

    organizationName: [
      '',
      [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(100)
      ]
    ],

    password: [
      '',
      [
        Validators.required,
        Validators.minLength(8),
        Validators.maxLength(128)
      ]
    ]
  });

  isSubmitting = false;
  showPassword = false;
  errorMessage = '';

  get nameControl() {
    return this.signupForm.controls.name;
  }

  get emailControl() {
    return this.signupForm.controls.email;
  }

  get organizationNameControl() {
    return this.signupForm.controls.organizationName;
  }

  get passwordControl() {
    return this.signupForm.controls.password;
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  submit(): void {
    this.errorMessage = '';

    if (this.signupForm.invalid) {
      this.signupForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;

    this.authService.signup(
      this.signupForm.getRawValue()
    ).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },

      error: (error) => {
        this.isSubmitting = false;

        this.errorMessage =
          error?.error?.message ??
          'Unable to create your account. Please try again.';
      }
    });
  }
}