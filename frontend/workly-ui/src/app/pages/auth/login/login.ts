import { Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import {
  LucideEye,
  LucideEyeOff
} from '@lucide/angular';

import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    LucideEye,
    LucideEyeOff],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly isSubmitting = signal(false);
  protected readonly serverError = signal<string | null>(null);

  protected readonly loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  protected get email() {
    return this.loginForm.controls.email;
  }

  protected get password() {
    return this.loginForm.controls.password;
  }

  protected readonly showPassword = signal(false);

  protected togglePasswordVisibility(): void {
    this.showPassword.update((visible) => !visible);
  }

  protected submit(): void {
    this.serverError.set(null);

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    this.authService.login(this.loginForm.getRawValue()).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        void this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        this.isSubmitting.set(false);

        if (error.status === 401) {
          this.serverError.set(
            'Invalid email or password.'
          );
          return;
        }

        this.serverError.set(
          'Unable to sign in right now. Please try again.'
        );
      }
    });
  }
}