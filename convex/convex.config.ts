import { defineApp } from "convex/server";
import betterAuth from "@convex-dev/better-auth/convex.config";
import { owner, manager, nurse, careAssistant } from "./lib/permissions";

const app = defineApp();
app.use(betterAuth, {
    organization: {
        ac: {
            owner,
            admin: manager, // Map our 'manager' permissions to Better Auth's 'admin' access
            manager,
            nurse,
            care_assistant: careAssistant,
            member: careAssistant,
        },
    },
} as any);

export default app;
