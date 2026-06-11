import type { RequestHandler } from "express";

export const AUTH_COOKIE = "olmos_admin";

/**
 * Protects admin-only routes. Authentication is a signed httpOnly cookie set
 * by POST /api/auth/login after the username/password match the
 * ADMIN_USERNAME / ADMIN_PASSWORD environment variables.
 */
export const requireAuth: RequestHandler = (req, res, next) => {
  if (req.signedCookies?.[AUTH_COOKIE] === "1") {
    return next();
  }
  res.status(401).json({ error: "Avtorizatsiya talab qilinadi" });
};

/**
 * Allows the given HTTP methods through without auth (e.g. public reads on the
 * landing page) while requiring auth for every other method on that router.
 */
export function allowMethods(...methods: string[]): RequestHandler {
  const allowed = new Set(methods.map((m) => m.toUpperCase()));
  return (req, res, next) => {
    if (allowed.has(req.method.toUpperCase())) return next();
    return requireAuth(req, res, next);
  };
}

/**
 * Lets a request through without auth only when `predicate` returns true,
 * otherwise requires auth. Use for routers that have one public endpoint mixed
 * with protected ones (e.g. applications: public POST "/" create, but admin-only
 * approve/reject). `req.path` is relative to the router's mount point.
 */
export function allowWhen(
  predicate: (req: Parameters<RequestHandler>[0]) => boolean,
): RequestHandler {
  return (req, res, next) => {
    if (predicate(req)) return next();
    return requireAuth(req, res, next);
  };
}
