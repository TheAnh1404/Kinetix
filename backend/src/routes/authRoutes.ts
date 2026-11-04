import { Router, Request, Response, NextFunction } from "express";
import { and, eq, isNull, gt } from "drizzle-orm";
import { db } from "../db";
import { sessions, workspaceMembers } from "../db/schema";
import * as service from "../auth/service";
import { databaseErrorCode } from "../db/errors";
import {
  AuthError,
  assert,
  applicationOrigin,
  randomToken,
  uuidInput,
  digest,
  requestIp,
} from "../auth/security";

export type AuthRequest = Request & { auth?: service.AuthContext };
export function cookie(req: Request, name: string): string | undefined {
  const entry = req.headers.cookie
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  if (!entry) return undefined;
  try {
    return decodeURIComponent(entry.slice(name.length + 1));
  } catch {
    return undefined;
  }
}
export function setCookie(
  res: Response,
  name: string,
  value: string,
  maxAge: number,
) {
  res.cookie(name, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: maxAge * 1000,
  });
}
export const endpoint =
  (handler: (req: AuthRequest, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res)).catch(next);
  };
export function authErrorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (error instanceof AuthError)
    return res
      .status(error.status)
      .json({ success: false, error: error.message, code: error.code });
  const databaseCode = databaseErrorCode(error);
  if (databaseCode === "42P01" || databaseCode === "42703") {
    console.error("Kinetix database schema is outdated", {
      code: databaseCode,
    });
    return res
      .status(503)
      .json({
        success: false,
        code: "DATABASE_SCHEMA_OUTDATED",
        error:
          "Hệ thống chưa cập nhật cấu trúc dữ liệu. Người quản trị cần chạy migration trước khi tải lại.",
      });
  }
  if (databaseCode === "23505")
    return res.status(409).json({
      success: false,
      error: "Tên đăng nhập, ví hoặc yêu cầu này đã được sử dụng.",
      code: "CONFLICT",
    });
  if ((error as { type?: string })?.type === "entity.parse.failed")
    return res
      .status(400)
      .json({ success: false, error: "JSON không hợp lệ." });
  // Never serialize database queries, credentials, signatures or server errors to the caller/log.
  console.error("Kinetix request failed", {
    category: error instanceof Error ? error.name : "UnknownError",
  });
  return res.status(500).json({
    success: false,
    error: "Không thể xử lý yêu cầu. Vui lòng thử lại.",
  });
}
export function originGuard(req: Request, _res: Response, next: NextFunction) {
  try {
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      assert(
        req.headers.origin === applicationOrigin().origin,
        403,
        "Nguồn yêu cầu không hợp lệ.",
        "ORIGIN_REJECTED",
      );
      assert(
        req.is("application/json"),
        415,
        "Yêu cầu cần Content-Type application/json.",
      );
    }
    next();
  } catch (error) {
    next(error);
  }
}
// Express middlewares must call next explicitly; endpoint is only for terminal handlers.
export function authenticated(
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
) {
  service
    .authenticate(cookie(req, service.SESSION_COOKIE))
    .then(async (auth) => {
      req.auth = auth;
      if (Date.now() - auth.session.lastSeenAt.getTime() > 60000)
        await db
          .update(sessions)
          .set({ lastSeenAt: new Date() })
          .where(
            and(
              eq(sessions.id, auth.session.id),
              isNull(sessions.revokedAt),
              gt(sessions.expiresAt, new Date()),
            ),
          );
      next();
    })
    .catch(next);
}
export function fullSession(
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
) {
  try {
    assert(req.auth, 401, "Vui lòng đăng nhập.");
    service.requireFull(req.auth);
    next();
  } catch (error) {
    next(error);
  }
}
async function resultSession(
  req: AuthRequest,
  res: Response,
  result: { token: string },
) {
  setCookie(res, service.SESSION_COOKIE, result.token, service.SESSION_SECONDS);
  return res.json(await service.me(await service.authenticate(result.token)));
}
const requireBrowser = (req: Request) => {
  const value = cookie(req, service.BROWSER_COOKIE);
  assert(
    value && /^[A-Za-z0-9_-]{43}$/.test(value),
    401,
    "Hãy yêu cầu thông điệp ký mới.",
  );
  return value;
};
export const authRouter = Router();
authRouter.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});
authRouter.post(
  "/login",
  endpoint(async (req, res) => {
    await service.rateLimit(`login-ip:${requestIp(req)}`, 30);
    return resultSession(
      req,
      res,
      await service.login(req.body.username, req.body.password),
    );
  }),
);
authRouter.post(
  "/wallet/challenge",
  endpoint(async (req, res) => {
    await service.rateLimit(`challenge:${requestIp(req)}`, 30);
    const purpose = req.body.purpose;
    const auth =
      purpose === "LINK" || purpose === "REAUTH"
        ? await service.authenticate(cookie(req, service.SESSION_COOKIE))
        : undefined;
    const candidate = cookie(req, service.BROWSER_COOKIE);
    const browser =
      candidate && /^[A-Za-z0-9_-]{43}$/.test(candidate)
        ? candidate
        : randomToken();
    setCookie(res, service.BROWSER_COOKIE, browser, 600);
    return res.json({
      success: true,
      ...(await service.createChallenge(
        purpose,
        req.body.address,
        req.body.chainId,
        browser,
        auth,
      )),
    });
  }),
);
authRouter.post(
  "/register-family",
  endpoint(async (req, res) => {
    await service.rateLimit(`register:${requestIp(req)}`, 10);
    return resultSession(
      req,
      res,
      await service.registerGuardian(req.body, requireBrowser(req)),
    );
  }),
);
authRouter.post(
  "/verify-siwe",
  endpoint(async (req, res) => {
    await service.rateLimit(`wallet-login:${requestIp(req)}`, 20);
    return resultSession(
      req,
      res,
      await service.walletLogin(
        uuidInput(req.body.challengeId || ""),
        req.body.signature,
        requireBrowser(req),
      ),
    );
  }),
);
// Deliberately retire all fallback/PIN/address-only auth, including direct Express calls.
for (const path of [
  "/family-login",
  "/member-login",
  "/join-family",
  "/sync-wallet",
  "/nonce",
  "/check-wallet",
]) {
  authRouter.all(path, (_req, res) =>
    res.status(410).json({
      success: false,
      error:
        "Luồng xác thực cũ đã ngừng. Hãy đăng nhập bằng tài khoản hoặc Core.",
      code: "LEGACY_AUTH_RETIRED",
    }),
  );
}
authRouter.post(
  "/logout",
  endpoint(async (req, res) => {
    const token = cookie(req, service.SESSION_COOKIE);
    if (token && /^[A-Za-z0-9_-]{43}$/.test(token))
      await db
        .update(sessions)
        .set({ revokedAt: new Date() })
        .where(eq(sessions.tokenHash, digest(token)));
    setCookie(res, service.SESSION_COOKIE, "", 0);
    setCookie(res, service.BROWSER_COOKIE, "", 0);
    return res.json({ success: true });
  }),
);
authRouter.use(authenticated);
authRouter.get(
  "/me",
  endpoint(async (req, res) => res.json(await service.me(req.auth!))),
);
authRouter.post(
  "/change-password",
  endpoint(async (req, res) => {
    await service.rateLimit(`password:${req.auth!.user.id}`, 10);
    return resultSession(
      req,
      res,
      await service.changePassword(
        req.auth!,
        req.body.currentPassword,
        req.body.newPassword,
      ),
    );
  }),
);
authRouter.post(
  "/credentials",
  endpoint(async (req, res) => {
    await service.rateLimit(`credentials:${req.auth!.user.id}`, 10);
    return resultSession(
      req,
      res,
      await service.setupCredentials(
        req.auth!,
        req.body.username,
        req.body.password,
      ),
    );
  }),
);
authRouter.post(
  "/wallet/link",
  endpoint(async (req, res) => {
    await service.rateLimit(`wallet-link:${req.auth!.user.id}`, 10);
    return resultSession(
      req,
      res,
      await service.linkWallet(
        req.auth!,
        uuidInput(req.body.challengeId || ""),
        req.body.signature,
        requireBrowser(req),
      ),
    );
  }),
);
authRouter.post(
  "/reauthenticate",
  endpoint(async (req, res) => {
    await service.rateLimit(`reauth:${req.auth!.user.id}`, 10);
    await service.reauthenticate(
      req.auth!,
      uuidInput(req.body.challengeId || ""),
      req.body.signature,
      requireBrowser(req),
    );
    return res.json({ success: true });
  }),
);
authRouter.post(
  "/accept-invitation",
  fullSession,
  endpoint(async (req, res) => {
    return res.json(await service.acceptInvitation(req.auth!, req.body.token));
  }),
);
authRouter.get(
  "/sessions",
  fullSession,
  endpoint(async (req, res) =>
    res.json({
      success: true,
      sessions: await service.listSessions(req.auth!),
      currentSessionId: req.auth!.session.id,
    }),
  ),
);
authRouter.delete(
  "/sessions/:id",
  fullSession,
  endpoint(async (req, res) => {
    const id = uuidInput(req.params.id);
    await service.revokeSession(req.auth!, id);
    if (id === req.auth!.session.id)
      setCookie(res, service.SESSION_COOKIE, "", 0);
    return res.json({ success: true });
  }),
);
export const managedMemberRouter = Router({ mergeParams: true });
managedMemberRouter.get(
  "/",
  endpoint(async (req, res) =>
    res.json(
      await service.listManagedMembers(req.auth!, uuidInput(req.params.id)),
    ),
  ),
);
managedMemberRouter.post(
  "/",
  endpoint(async (req, res) => {
    await service.rateLimit(`managed-create:${req.auth!.user.id}`, 20, 3600);
    return res
      .status(201)
      .json(
        await service.createManagedMember(
          req.auth!,
          uuidInput(req.params.id),
          req.body,
          req.get("Idempotency-Key") || "",
        ),
      );
  }),
);
managedMemberRouter.get(
  "/:memberId/activity",
  endpoint(async (req, res) =>
    res.json({
      success: true,
      activity: await service.activity(
        req.auth!,
        uuidInput(req.params.id),
        uuidInput(req.params.memberId),
      ),
    }),
  ),
);
for (const [method, action] of [
  ["patch", "profile"],
  ["patch", "access"],
  ["post", "reset-password"],
  ["post", "enroll"],
  ["patch", "manager"],
] as const) {
  managedMemberRouter[method](
    `/:memberId/${action}`,
    endpoint(async (req, res) => {
      await service.rateLimit(`managed-update:${req.auth!.user.id}`, 40);
      return res.json(
        await service.updateManagedMember(
          req.auth!,
          uuidInput(req.params.id),
          uuidInput(req.params.memberId),
          action,
          req.body,
        ),
      );
    }),
  );
}

export const workspaceAdminRouter = Router({ mergeParams: true });
workspaceAdminRouter.post(
  "/invitations",
  endpoint(async (req, res) =>
    res
      .status(201)
      .json(
        await service.createInvitation(
          req.auth!,
          uuidInput(req.params.id),
          req.body.address,
        ),
      ),
  ),
);
workspaceAdminRouter.patch(
  "/management-permissions/:guardianId",
  endpoint(async (req, res) =>
    res.json(
      await service.setManagementPermission(
        req.auth!,
        uuidInput(req.params.id),
        uuidInput(req.params.guardianId),
        req.body.enabled,
      ),
    ),
  ),
);
