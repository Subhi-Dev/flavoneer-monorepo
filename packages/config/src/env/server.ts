import {
  booleanWithDefault,
  type EnvInput,
  optionalString,
  optionalUrl,
  parseEnv,
  stringWithDefault,
  urlWithDefault,
} from "./core";

const httpProtocols = ["http:", "https:"] as const;

const backendAuthEnvSchema = {
  BETTER_AUTH_URL: optionalUrl({ protocols: httpProtocols }),
  CONVEX_SITE_URL: optionalUrl({ protocols: httpProtocols }),
  INVITATION_EMAIL_WEBHOOK_SECRET: optionalString(),
  INVITATION_EMAIL_WEBHOOK_URL: optionalUrl({ protocols: httpProtocols }),
  MOBILE_SITE_URL: urlWithDefault("flavoneer://"),
  QC_FLOOR_SITE_URL: urlWithDefault("http://localhost:3002", {
    protocols: httpProtocols,
  }),
  SITE_URL: urlWithDefault("http://localhost:3001", {
    protocols: httpProtocols,
  }),
};

export type BackendAuthEnvSource = EnvInput<typeof backendAuthEnvSchema>;

export function createBackendAuthEnv(source: BackendAuthEnvSource) {
  const env = parseEnv(backendAuthEnvSchema, source);
  return Object.freeze({
    authBaseUrl: env.BETTER_AUTH_URL ?? env.CONVEX_SITE_URL,
    invitationWebhookSecret: env.INVITATION_EMAIL_WEBHOOK_SECRET,
    invitationWebhookUrl: env.INVITATION_EMAIL_WEBHOOK_URL,
    mobileSiteUrl: env.MOBILE_SITE_URL,
    qcFloorSiteUrl: env.QC_FLOOR_SITE_URL,
    siteUrl: env.SITE_URL,
  });
}

const backendRegulatoryEnvSchema = {
  REGULATORY_IMPORT_TOKEN: optionalString(),
};

export type BackendRegulatoryEnvSource = EnvInput<typeof backendRegulatoryEnvSchema>;

export function createBackendRegulatoryEnv(source: BackendRegulatoryEnvSource) {
  const env = parseEnv(backendRegulatoryEnvSchema, source);
  return Object.freeze({ importToken: env.REGULATORY_IMPORT_TOKEN });
}

const playwrightEnvSchema = {
  CI: booleanWithDefault(false),
  PLAYWRIGHT_BASE_URL: urlWithDefault("http://localhost:3001", {
    protocols: httpProtocols,
  }),
  PLAYWRIGHT_SKIP_WEB_SERVER: booleanWithDefault(false),
};

export type PlaywrightEnvSource = EnvInput<typeof playwrightEnvSchema>;

export function createPlaywrightEnv(source: PlaywrightEnvSource) {
  const env = parseEnv(playwrightEnvSchema, source);
  return Object.freeze({
    baseUrl: env.PLAYWRIGHT_BASE_URL,
    ci: env.CI,
    skipWebServer: env.PLAYWRIGHT_SKIP_WEB_SERVER,
  });
}

const regulatoryImportEnvSchema = {
  FOODWATCH_BACKEND_DIR: stringWithDefault(
    "/Users/subhi/Documents/GitHub/FoodWatch/packages/backend",
  ),
  FOODWATCH_DATABASE_URL: optionalString(),
  REGULATORY_IMPORT_TOKEN: optionalString(),
};

export type RegulatoryImportEnvSource = EnvInput<typeof regulatoryImportEnvSchema>;

export function createRegulatoryImportEnv(source: RegulatoryImportEnvSource) {
  const env = parseEnv(regulatoryImportEnvSchema, source);
  return Object.freeze({
    backendDir: env.FOODWATCH_BACKEND_DIR,
    databaseUrl: env.FOODWATCH_DATABASE_URL,
    importToken: env.REGULATORY_IMPORT_TOKEN,
  });
}

const mobileBuildEnvSchema = {
  SENTRY_AUTH_TOKEN: optionalString(),
};

export type MobileBuildEnvSource = EnvInput<typeof mobileBuildEnvSchema>;

export function createMobileBuildEnv(source: MobileBuildEnvSource) {
  const env = parseEnv(mobileBuildEnvSchema, source);
  return Object.freeze({ sentryAuthToken: env.SENTRY_AUTH_TOKEN });
}
