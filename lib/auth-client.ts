import { createAuthClient } from "better-auth/react";
import { convexClient } from "@convex-dev/better-auth/client/plugins";
import {
  organizationClient,
  customSessionClient,
  twoFactorClient
} from "better-auth/client/plugins";
import { passkeyClient, adminClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
  plugins: [
    convexClient(),
    twoFactorClient(),
    organizationClient({
      teams: {
        enabled: true
      }
    }),
    passkeyClient(),
    customSessionClient(),
    adminClient()
  ]
});
