export type MemberRole =
  'admin' |
  'manager' |
  'member';

export type MemberStatus =
  'active' |
  'invited' |
  'removed';

export type MemberUserStatus =
  'active' |
  'inactive' |
  'disabled';

export interface MemberUser {
  id: string;
  name: string;
  email: string;
  status: MemberUserStatus;
}

export interface Member {
  id: string;
  user: MemberUser;
  role: MemberRole;
  status: MemberStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MemberListData {
  items: Member[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface MemberListResponse {
  status: 'success';
  data: MemberListData;
}

export interface MemberResponse {
  status: 'success';
  data: Member;
}