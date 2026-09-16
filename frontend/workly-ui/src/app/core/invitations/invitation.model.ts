export type InvitationRole =
  'manager' |
  'member';

export type InvitationStatus =
  'pending' |
  'accepted' |
  'revoked' |
  'expired';

export interface CreateInvitationRequest {
  email: string;
  role: InvitationRole;
}

export interface Invitation {
  id: string;
  organizationId: string;
  email: string;
  role: InvitationRole;
  status: InvitationStatus;
  expiresAt: string;
  invitedBy: string | null;
  acceptedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInvitationResponseData
  extends Invitation {
  invitationToken: string;
  invitationLink: string;
}

export interface CreateInvitationResponse {
  status: 'success';
  data: CreateInvitationResponseData;
}

export interface InvitationListData {
  items: Invitation[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface InvitationListResponse {
  status: 'success';
  data: InvitationListData;
}

export interface RevokeInvitationResponse {
  status: 'success';
  data: {
    message: string;
    invitation: Invitation;
  };
}

export interface AcceptInvitationRequest {
  name: string;
  password: string;
}

export interface AcceptInvitationResponse {
  status: 'success';
  data: {
    message: string;
    invitation: {
      id: string;
      status: string;
      acceptedAt: string;
    };
    user: {
      id: string;
      name: string;
      email: string;
      status: string;
    };
    membership: {
      id: string;
      organizationId: string;
      role: string;
      status: string;
    };
  };
}