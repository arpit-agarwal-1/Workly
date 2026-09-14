import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { API_CONFIG } from '../api/api.config';
import {
  AuthResponse,
  SignupRequest,
  LoginRequest,
  LoginResponse
} from './auth.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);

  private accessToken: string | null = null;

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
          this.accessToken = response.data.accessToken;
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
        this.accessToken = response.data.accessToken;
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
        this.clearAccessToken();
      })
    );
}

  getAccessToken(): string | null {
    return this.accessToken;
  }

  clearAccessToken(): void {
    this.accessToken = null;
  }
}