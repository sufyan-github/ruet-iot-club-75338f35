import type { MiddlewareHandler } from "hono";
import { requireAuth } from "../auth/session";
import { AppError } from "../lib/app-error";
import { userHasPermission } from "../repositories/authorization-repository";
import type { AppEnvironment } from "../types";

export function requirePermission(permission: string): MiddlewareHandler<AppEnvironment> {
  return async (context, next) => {
    const { user } = requireAuth(context);
    if (user.mustChangePassword) {
      throw new AppError({
        code: "PASSWORD_CHANGE_REQUIRED",
        message: "Change the temporary password before using administration features.",
        status: 403,
      });
    }
    if (!(await userHasPermission(context.env.DB, user.id, permission))) {
      throw new AppError({
        code: "PERMISSION_DENIED",
        message: "You do not have permission to perform this action.",
        status: 403,
      });
    }
    return next();
  };
}

export function requireAnyPermission(permissions: string[]): MiddlewareHandler<AppEnvironment> {
  return async (context, next) => {
    const { user } = requireAuth(context);
    if (user.mustChangePassword) {
      throw new AppError({
        code: "PASSWORD_CHANGE_REQUIRED",
        message: "Change the temporary password before using administration features.",
        status: 403,
      });
    }
    const decisions = await Promise.all(permissions.map((permission) => userHasPermission(context.env.DB, user.id, permission)));
    if (!decisions.some(Boolean)) {
      throw new AppError({
        code: "PERMISSION_DENIED",
        message: "You do not have permission to perform this action.",
        status: 403,
      });
    }
    return next();
  };
}
