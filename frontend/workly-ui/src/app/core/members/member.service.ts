import { Injectable, inject } from '@angular/core';
import {
  HttpClient,
  HttpParams,
} from '@angular/common/http';

import { Observable } from 'rxjs';

import { API_CONFIG } from '../api/api.config';

import {
  MemberListResponse,
  MemberResponse,
  MemberRole,
  MemberStatus,
} from './member.model';

@Injectable({
  providedIn: 'root',
})
export class MemberService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl =
    `${API_CONFIG.baseUrl}/members`;

  listMembers(
    page = 1,
    limit = 1
  ): Observable<MemberListResponse> {
    const params = new HttpParams()
      .set('page', page)
      .set('limit', limit);

    return this.http.get<MemberListResponse>(
      this.baseUrl,
      { params }
    );
  }

  getMember(
    membershipId: string
  ): Observable<MemberResponse> {
    return this.http.get<MemberResponse>(
      `${this.baseUrl}/${membershipId}`
    );
  }

  updateRole(
    membershipId: string,
    role: MemberRole
  ): Observable<MemberResponse> {
    return this.http.patch<MemberResponse>(
      `${this.baseUrl}/${membershipId}/role`,
      { role }
    );
  }

  updateStatus(
    membershipId: string,
    status: MemberStatus
  ): Observable<MemberResponse> {
    return this.http.patch<MemberResponse>(
      `${this.baseUrl}/${membershipId}/status`,
      { status }
    );
  }
}