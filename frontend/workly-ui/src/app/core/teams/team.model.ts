export interface Team {
  _id: string;
  organizationId: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeamListData {
  items: Team[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface TeamListResponse {
  status: 'success';
  data: TeamListData;
}

export interface TeamResponse {
  status: 'success';
  data: Team;
}

export interface CreateTeamPayload {
  name: string;
  description?: string;
}

export interface UpdateTeamPayload {
  name?: string;
  description?: string;
}

export interface TeamMember {
  id: string;

  user: {
    id: string;
    name: string;
    email: string;
    status: 'active' | 'inactive' | 'disabled';
  };

  status: 'active' | 'removed';
  createdAt: string;
  updatedAt: string;
}

export interface TeamMemberListData {
  items: TeamMember[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface TeamMemberListResponse {
  status: 'success';
  data: TeamMemberListData;
}

export interface AvailableTeamMember {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
    status: 'active' | 'inactive' | 'disabled';
  };
  role: 'admin' | 'manager' | 'member';
  status: 'active';
  createdAt: string;
  updatedAt: string;
}

export interface AvailableTeamMemberListData {
  items: AvailableTeamMember[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AvailableTeamMemberListResponse {
  status: 'success';
  data: AvailableTeamMemberListData;
}

export interface TeamMembershipResponse {
  status: 'success';
  data: TeamMember;
}