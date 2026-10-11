import { httpRouter } from "convex/server";
import { authComponent, backendAuthEnv, createAuth } from "./auth";

const http = httpRouter();

authComponent.registerRoutesLazy(http, createAuth, {
  cors: true,
  trustedOrigins: [
    backendAuthEnv.siteUrl,
    backendAuthEnv.mobileSiteUrl,
    backendAuthEnv.qcFloorSiteUrl,
    "flavoneer://",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
  ],
});

export default http;
