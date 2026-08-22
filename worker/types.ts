export interface RequestVariables {
  requestId: string;
  authUser: AuthenticatedUser | null;
  authSession: AuthenticatedSession | null;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName: string;
  status: "EMAIL_VERIFIED" | "DELETION_REQUESTED" | "SUSPENDED";
  onboardingStatus: "PENDING" | "COMPLETED" | "DISMISSED";
  mustChangePassword: boolean;
  fixedSuperAdmin: boolean;
  roles: string[];
  permissions: string[];
}

export interface AuthenticatedSession {
  id: string;
  userId: string;
  csrfTokenHash: string;
  expiresAt: string;
}

export type AppEnvironment = {
  Bindings: Env;
  Variables: RequestVariables;
};
