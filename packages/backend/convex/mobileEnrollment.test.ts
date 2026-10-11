import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { afterEach, describe, expect, test, vi } from "vitest";
import { mobileEnrollment } from "./mobileEnrollment";

const BASE_URL = "http://localhost:3000";

function createTestAuth() {
  const db: Record<string, Record<string, unknown>[]> = {
    account: [],
    session: [],
    user: [],
    verification: [],
  };
  return betterAuth({
    baseURL: BASE_URL,
    database: memoryAdapter(db),
    emailAndPassword: { enabled: true },
    plugins: [mobileEnrollment()],
    secret: "test-secret-that-is-long-enough-for-better-auth",
  });
}

type TestAuth = ReturnType<typeof createTestAuth>;

function request(auth: TestAuth, path: string, init: { body?: unknown; cookie?: string } = {}) {
  const headers = new Headers({ origin: BASE_URL });
  if (init.body !== undefined) {
    headers.set("content-type", "application/json");
  }
  if (init.cookie) {
    headers.set("cookie", init.cookie);
  }
  return auth.handler(
    new Request(`${BASE_URL}/api/auth${path}`, {
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      headers,
      method: init.body === undefined && path === "/get-session" ? "GET" : "POST",
    }),
  );
}

function sessionCookie(response: Response) {
  const match = response.headers.get("set-cookie")?.match(/better-auth\.session_token=([^;]*)/);
  return match ? `better-auth.session_token=${match[1]}` : null;
}

async function signUp(auth: TestAuth) {
  const response = await request(auth, "/sign-up/email", {
    body: { email: "lab@example.com", name: "Lab", password: "password1234" },
  });
  expect(response.status).toBe(200);
  const cookie = sessionCookie(response);
  expect(cookie).not.toBeNull();
  return cookie as string;
}

async function createCode(auth: TestAuth, cookie: string) {
  const response = await request(auth, "/mobile-enrollment/create", { body: {}, cookie });
  expect(response.status).toBe(200);
  return (await response.json()) as { expiresAt: number; token: string };
}

async function getSessionToken(auth: TestAuth, cookie: string) {
  const response = await request(auth, "/get-session", { cookie });
  const data = (await response.json()) as { session: { token: string } } | null;
  return data?.session.token ?? null;
}

afterEach(() => {
  vi.useRealTimers();
});

describe("mobile enrollment", () => {
  test("redeeming a code signs the phone in with its own session", async () => {
    const auth = createTestAuth();
    const webCookie = await signUp(auth);
    const { token } = await createCode(auth, webCookie);

    const redeemed = await request(auth, "/mobile-enrollment/redeem", { body: { token } });
    expect(redeemed.status).toBe(200);
    expect(await redeemed.json()).toMatchObject({ user: { email: "lab@example.com" } });
    const phoneCookie = sessionCookie(redeemed);
    expect(phoneCookie).not.toBeNull();

    const webSession = await getSessionToken(auth, webCookie);
    const phoneSession = await getSessionToken(auth, phoneCookie as string);
    expect(phoneSession).not.toBeNull();
    expect(phoneSession).not.toBe(webSession);

    // Signing out on the phone keeps the browser signed in.
    await request(auth, "/sign-out", { body: {}, cookie: phoneCookie as string });
    expect(await getSessionToken(auth, phoneCookie as string)).toBeNull();
    expect(await getSessionToken(auth, webCookie)).toBe(webSession);
  });

  test("codes are single use", async () => {
    const auth = createTestAuth();
    const { token } = await createCode(auth, await signUp(auth));

    expect((await request(auth, "/mobile-enrollment/redeem", { body: { token } })).status).toBe(
      200,
    );
    expect((await request(auth, "/mobile-enrollment/redeem", { body: { token } })).status).toBe(
      400,
    );
  });

  test("expired codes are rejected", async () => {
    const auth = createTestAuth();
    const { token } = await createCode(auth, await signUp(auth));

    vi.useFakeTimers({ now: Date.now() + 5 * 60 * 1000 + 1 });
    const response = await request(auth, "/mobile-enrollment/redeem", { body: { token } });
    expect(response.status).toBe(400);
    expect(sessionCookie(response)).toBeNull();
  });

  test("creating a code requires a signed-in user", async () => {
    const auth = createTestAuth();
    const response = await request(auth, "/mobile-enrollment/create", { body: {} });
    expect(response.status).toBe(401);
  });

  test("unknown codes are rejected", async () => {
    const auth = createTestAuth();
    const response = await request(auth, "/mobile-enrollment/redeem", {
      body: { token: "not-a-real-code" },
    });
    expect(response.status).toBe(400);
  });
});
