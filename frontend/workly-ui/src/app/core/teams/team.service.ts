import { Injectable, inject } from '@angular/core';

import {
  HttpClient,
  HttpParams,
} from '@angular/common/http';

import { Observable } from 'rxjs';

import { API_CONFIG } from '../api/api.config';

import {
  AvailableTeamMemberListResponse,
  CreateTeamPayload,
  TeamListResponse,
  TeamMemberListResponse,
  TeamMembershipResponse,
  TeamResponse,
  UpdateTeamPayload,
} from './team.model';

@Injectable({
  providedIn: 'root',
})
export class TeamService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl =
    `${API_CONFIG.baseUrl}/teams`;

  listTeams(
    page = 1,
    limit = 20
  ): Observable<TeamListResponse> {
    const params = new HttpParams()
      .set('page', page)
      .set('limit', limit);

    return this.http.get<TeamListResponse>(
      this.baseUrl,
      { params }
    );
  }

  createTeam(
    payload: CreateTeamPayload
  ): Observable<TeamResponse> {
    return this.http.post<TeamResponse>(
      this.baseUrl,
      payload
    );
  }

  getTeam(
    teamId: string
  ): Observable<TeamResponse> {
    return this.http.get<TeamResponse>(
      `${this.baseUrl}/${teamId}`
    );
  }

  updateTeam(
    teamId: string,
    payload: UpdateTeamPayload
  ): Observable<TeamResponse> {
    return this.http.patch<TeamResponse>(
      `${this.baseUrl}/${teamId}`,
      payload
    );
  }

  deleteTeam(
    teamId: string
  ): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/${teamId}`
    );
  }

  listTeamMembers(
    teamId: string,
    page = 1,
    limit = 20
  ): Observable<TeamMemberListResponse> {
    const params = new HttpParams()
      .set('page', page)
      .set('limit', limit);

    return this.http.get<TeamMemberListResponse>(
      `${this.baseUrl}/${teamId}/members`,
      { params }
    );
  }

  listAvailableMembers(
    teamId: string,
    page = 1,
    limit = 20,
    search = ''
  ): Observable<AvailableTeamMemberListResponse> {
    let params = new HttpParams()
      .set('page', page)
      .set('limit', limit);

    if (search.trim()) {
      params = params.set(
        'search',
        search.trim()
      );
    }

    return this.http.get<AvailableTeamMemberListResponse>(
      `${this.baseUrl}/${teamId}/available-members`,
      { params }
    );
  }

  addTeamMember(
    teamId: string,
    membershipId: string
  ): Observable<TeamMembershipResponse> {
    return this.http.post<TeamMembershipResponse>(
      `${this.baseUrl}/${teamId}/members`,
      {
        membershipId,
      }
    );
  }

  removeTeamMember(
    teamId: string,
    membershipId: string
  ): Observable<TeamMembershipResponse> {
    return this.http.delete<TeamMembershipResponse>(
      `${this.baseUrl}/${teamId}/members/${membershipId}`
    );
  }
}