import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  Observable,
  catchError,
  finalize,
  map,
  of,
  shareReplay,
  tap
} from 'rxjs';

import { AuthState } from './auth.state';

import { API_CONFIG } from '../api/api.config';
import {
  AuthResponse,
  SignupRequest,
  LoginRequest,
  LoginResponse,
  RefreshResponse
} from './auth.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly authState = inject(AuthState);

  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  private refreshInFlight$: Observable<RefreshResponse> | null = null;

  private scheduleTokenRefresh(accessToken: string): void {
    this.clearRefreshTimer();

    const payload = this.decodeJwtPayload(accessToken);

    if (!payload?.exp) {
      return;
    }

    const expiresAt = payload.exp * 1000;

    // Refresh 3 minutes before expiry.
    const refreshDelay = Math.max(
      expiresAt - Date.now() - 3 * 60 * 1000,
      0
    );

    this.refreshTimer = setTimeout(() => {
      this.refresh().subscribe({
        error: () => {
          this.clearRefreshTimer();
          this.authState.clear();
        }
      });
    }, refreshDelay);
  }

  private clearRefreshTimer(): void {
    if (this.refreshTimer !== null) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private decodeJwtPayload(
    token: string
  ): { exp?: number } | null {
    try {
      const payload = token.split('.')[1];

      if (!payload) {
        return null;
      }

      const base64 = payload
        .replace(/-/g, '+')
        .replace(/_/g, '/');

      const json = atob(base64);

      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  signup(payload: SignupRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(
        `${API_CONFIG.baseUrl}/auth/signup`,
        payload,
        {
          withCredentials: true
        }
      )
      .pipe(
        tap((response: AuthResponse) => {
          const token = response.data.accessToken;

          this.authState.setAccessToken(token);
          this.scheduleTokenRefresh(token);
        })
      );
  }

  login(payload: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(
        `${API_CONFIG.baseUrl}/auth/login`,
        payload,
        {
          withCredentials: true
        }
      )
      .pipe(
        tap((response: LoginResponse) => {
          const token = response.data.accessToken;

          this.authState.setAccessToken(token);
          this.scheduleTokenRefresh(token);
        })
      );
  }

  refresh(): Observable<RefreshResponse> {
    if (this.refreshInFlight$) {
      return this.refreshInFlight$;
    }

    this.refreshInFlight$ = this.http
      .post<RefreshResponse>(
        `${API_CONFIG.baseUrl}/auth/refresh`,
        {},
        {
          withCredentials: true
        }
      )
      .pipe(
        tap((response: RefreshResponse) => {
          const token = response.data.accessToken;

          this.authState.setAccessToken(token);
          this.scheduleTokenRefresh(token);
        }),
        finalize(() => {
          this.refreshInFlight$ = null;
        }),
        shareReplay({
          bufferSize: 1,
          refCount: false
        })
      );

    return this.refreshInFlight$;
  }

  restoreSession(): Observable<RefreshResponse | null> {
    return this.refresh().pipe(
      map((response) => {
        this.authState.markInitialized();
        return response;
      }),
      catchError(() => {
        this.authState.clear();
        this.authState.markInitialized();

        return of(null);
      })
    );
  }
  logout(): Observable<void> {
    return this.http
      .post<void>(
        `${API_CONFIG.baseUrl}/auth/logout`,
        {},
        {
          withCredentials: true
        }
      )
      .pipe(
        tap(() => {
          this.clearRefreshTimer();
          this.clearAccessToken();
        })
      );
  }

  getAccessToken(): string | null {
    return this.authState.getAccessToken();
  }

  clearAccessToken(): void {
    this.clearRefreshTimer();
    this.authState.clear();
  }
}