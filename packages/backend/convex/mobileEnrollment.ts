import type { BetterAuthPlugin } from "better-auth";
import { createAuthEndpoint, sessionMiddleware } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { generateRandomString } from "better-auth/crypto";
import * as z from "zod";

// Enrollment codes are shown as a QR code on the web lab and scanned by the
// mobile app. Redeeming one creates a new session for the phone, so signing
// out on either device never affects the other.
const ENROLLMENT_TOKEN_TTL_MS = 5 * 60 * 1000;
const IDENTIFIER_PREFIX = "mobile-enrollment:";

async function hashToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export const mobileEnrollment = () =>
  ({
    id: "mobile-enrollment",
    endpoints: {
      createMobileEnrollment: createAuthEndpoint(
        "/mobile-enrollment/create",
        { method: "POST", use: [sessionMiddleware] },
        async (c) => {
          const token = generateRandomString(32);
          const expiresAt = new Date(Date.now() + ENROLLMENT_TOKEN_TTL_MS);
          await c.context.internalAdapter.createVerificationValue({
            identifier: `${IDENTIFIER_PREFIX}${await hashToken(token)}`,
            value: c.context.session.user.id,
            expiresAt,
          });
          return c.json({ token, expiresAt: expiresAt.getTime() });
        },
      ),
      redeemMobileEnrollment: createAuthEndpoint(
        "/mobile-enrollment/redeem",
        { method: "POST", body: z.object({ token: z.string().min(1) }) },
        async (c) => {
          const identifier = `${IDENTIFIER_PREFIX}${await hashToken(c.body.token)}`;
          const verification = await c.context.internalAdapter.findVerificationValue(identifier);
          if (!verification) {
            throw c.error("BAD_REQUEST", { message: "Invalid enrollment code" });
          }
          // Single use: consume before any other check.
          await c.context.internalAdapter.deleteVerificationByIdentifier(identifier);
          if (verification.expiresAt < new Date()) {
            throw c.error("BAD_REQUEST", { message: "Enrollment code expired" });
          }

          const user = await c.context.internalAdapter.findUserById(verification.value);
          if (!user) {
            throw c.error("BAD_REQUEST", { message: "Enrollment code is no longer valid" });
          }

          const session = await c.context.internalAdapter.createSession(user.id);
          await setSessionCookie(c, { session, user });
          return c.json({ user: { id: user.id, email: user.email, name: user.name } });
        },
      ),
    },
  }) satisfies BetterAuthPlugin;
