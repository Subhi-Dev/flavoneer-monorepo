import migrations from "@convex-dev/migrations/convex.config.js";
import { defineApp } from "convex/server";
import { v } from "convex/values";
import betterAuth from "./betterAuth/convex.config.js";

const app = defineApp({
  env: {
    BETTER_AUTH_URL: v.optional(v.string()),
    CONVEX_SITE_URL: v.optional(v.string()),
    // Optional. Required only when Expo enhanced push security is enabled for the project.
    EXPO_ACCESS_TOKEN: v.optional(v.string()),
    INVITATION_EMAIL_WEBHOOK_SECRET: v.optional(v.string()),
    INVITATION_EMAIL_WEBHOOK_URL: v.optional(v.string()),
    MOBILE_SITE_URL: v.optional(v.string()),
    QC_FLOOR_SITE_URL: v.optional(v.string()),
    REGULATORY_IMPORT_TOKEN: v.optional(v.string()),
    SITE_URL: v.optional(v.string()),
  },
});
app.use(betterAuth);
app.use(migrations);
export default app;
