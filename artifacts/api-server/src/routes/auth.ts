import { Router, type IRouter, type CookieOptions } from "express";
import { AUTH_COOKIE } from "../middlewares/requireAuth";

const router: IRouter = Router();

const COOKIE_MAX_AGE = 1000 * 60 * 60 * 24 * 30; // 30 days

function cookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    signed: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  };
}

router.post("/login", (req, res) => {
  const { username, password } = (req.body ?? {}) as {
    username?: string;
    password?: string;
  };

  const expectedUser = process.env.ADMIN_USERNAME;
  const expectedPass = process.env.ADMIN_PASSWORD;

  if (!expectedUser || !expectedPass) {
    req.log.error("ADMIN_USERNAME yoki ADMIN_PASSWORD sozlanmagan");
    return res.status(500).json({ error: "Server sozlanmagan" });
  }

  if (username === expectedUser && password === expectedPass) {
    res.cookie(AUTH_COOKIE, "1", cookieOptions());
    return res.json({ authenticated: true });
  }

  return res.status(401).json({ error: "Login yoki parol noto'g'ri" });
});

router.post("/logout", (_req, res) => {
  res.clearCookie(AUTH_COOKIE, { path: "/" });
  res.json({ authenticated: false });
});

router.get("/me", (req, res) => {
  res.json({ authenticated: req.signedCookies?.[AUTH_COOKIE] === "1" });
});

export default router;
