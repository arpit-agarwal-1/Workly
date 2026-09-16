import {
    Injectable,
    inject,
} from '@angular/core';

import {
    HttpClient,
    HttpParams,
} from '@angular/common/http';

import { Observable } from 'rxjs';

import { API_CONFIG } from '../api/api.config';

import {
    CreateInvitationRequest,
    CreateInvitationResponse,
    InvitationListResponse,
    RevokeInvitationResponse,
    AcceptInvitationRequest,
    AcceptInvitationResponse,
} from './invitation.model';

@Injectable({
    providedIn: 'root',
})
export class InvitationService {
    private readonly http =
        inject(HttpClient);

    private readonly baseUrl =
        `${API_CONFIG.baseUrl}/invitations`;

    createInvitation(
        payload: CreateInvitationRequest
    ): Observable<CreateInvitationResponse> {
        return this.http.post<CreateInvitationResponse>(
            this.baseUrl,
            payload
        );
    }

    listInvitations(
        page = 1,
        limit = 10,
        status = 'pending'
    ): Observable<InvitationListResponse> {
        const params = new HttpParams()
            .set('page', page)
            .set('limit', limit)
            .set('status', status);

        return this.http.get<InvitationListResponse>(
            this.baseUrl,
            { params }
        );
    }

    revokeInvitation(
        invitationId: string
    ): Observable<RevokeInvitationResponse> {
        return this.http.delete<RevokeInvitationResponse>(
            `${this.baseUrl}/${invitationId}`
        );
    }

    acceptInvitation(
        token: string,
        payload: AcceptInvitationRequest
    ): Observable<AcceptInvitationResponse> {
        return this.http.post<AcceptInvitationResponse>(
            `${this.baseUrl}/${encodeURIComponent(token)}/accept`,
            payload
        );
    }
}