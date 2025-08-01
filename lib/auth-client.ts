import { createAuthClient } from "better-auth/react";
import { convexClient } from "@convex-dev/better-auth/client/plugins";
import {
  organizationClient,
  customSessionClient
} from "better-auth/client/plugins";
import { passkeyClient } from "better-auth/client/plugins";
import type { createAuth } from "./auth";

export const authClient = createAuthClient({
  plugins: [
    convexClient(),
    organizationClient({
      teams: {
        enabled: true
      }
    }),
    passkeyClient(),
    customSessionClient()
  ]
});
