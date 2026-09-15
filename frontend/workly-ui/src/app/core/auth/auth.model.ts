export interface SignupRequest {
  name: string;
  email: string;
  password: string;
  organizationName: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export interface AuthOrganization {
  id: string;
  name: string;
  slug: string;
}

export interface AuthMembership {
  id: string;
  role: 'admin' | 'manager' | 'member';
  status: 'active' | 'invited' | 'removed';
}

export interface AuthData {
  accessToken: string;
  expiresIn: number;
  user: AuthUser;
  organization: AuthOrganization;
  membership: AuthMembership;
}

export interface AuthResponse {
  status: 'success';
  data: AuthData;
}
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponseData {
  accessToken: string;
  expiresIn: number;
  user: {
    id: string;
    name: string;
    email: string;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  membership: {
    id: string;
    role: string;
    status: string;
  };
}

export interface LoginResponse {
  success: boolean;
  data: LoginResponseData;
}

export interface RefreshResponse {
  success: boolean;
  data: {
    accessToken: string;
    expiresIn: number;
    user: {
      id: string;
      name: string;
      email: string;
    };
    organization: {
      id: string;
      name: string;
      slug: string;
    };
    membership: {
      id: string;
      role: string;
      status: string;
    };
  };
}