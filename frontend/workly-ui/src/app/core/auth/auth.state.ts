import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthState {
  private readonly _accessToken = signal<string | null>(null);
  private readonly _authenticated = signal(false);
  private readonly _initialized = signal(false);

  readonly accessToken = this._accessToken.asReadonly();
  readonly authenticated = this._authenticated.asReadonly();
  readonly initialized = this._initialized.asReadonly();

  setAccessToken(token: string): void {
    this._accessToken.set(token);
    this._authenticated.set(true);
  }

  clear(): void {
    this._accessToken.set(null);
    this._authenticated.set(false);
  }

  markInitialized(): void {
    this._initialized.set(true);
  }

  getAccessToken(): string | null {
    return this._accessToken();
  }

  isAuthenticated(): boolean {
    return this._authenticated();
  }

  isInitialized(): boolean {
    return this._initialized();
  }
}