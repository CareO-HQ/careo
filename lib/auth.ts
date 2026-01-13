import { convexAdapter } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth";
import { type GenericCtx } from "../convex/_generated/server";
import { betterAuthComponent, organizationRoles } from "../convex/auth";
import { nextCookies } from "better-auth/next-js";
import resend from "./resend";
import { organization, customSession, twoFactor } from "better-auth/plugins";
import { components, api } from "../convex/_generated/api";
import { passkey } from "better-auth/plugins/passkey";
import { admin } from "better-auth/plugins";

const siteUrl = process.env.NEXT_PUBLIC_BASE_URL;

export const createAuth = (ctx: GenericCtx) =>
  betterAuth({
    baseURL: siteUrl,
    database: convexAdapter(ctx, betterAuthComponent),
    trustedOrigins: [
      "http://localhost:3000",
      "http://localhost:8081", // Mobile app (Expo)
      "exp://localhost:8081",  // Expo Go app
      ...(process.env.NEXT_PUBLIC_BASE_URL ? [process.env.NEXT_PUBLIC_BASE_URL] : []),
      ...(process.env.NEXT_PUBLIC_MOBILE_APP_URL ? [process.env.NEXT_PUBLIC_MOBILE_APP_URL] : [])
    ],
    advanced: {
      crossSubDomainCookies: {
        enabled: true,
      },
      useSecureCookies: process.env.NODE_ENV === "production",
    },
    databaseHooks: {
      session: {
        create: {
          before: async (session) => {
            // Get all members for this user
            const members = await ctx.runQuery(
              components.betterAuth.lib.findMany,
              {
                model: "member",
                where: [{ field: "userId", value: session.userId }],
                paginationOpts: {
                  cursor: null,
                  numItems: 1000
                }
              }
            );

            let activeOrganizationId: string | null = null;

            if (members?.page && members.page.length > 0) {
              // Find the first active organization
              for (const member of members.page) {
                const isActive = await ctx.runQuery(api.auth.isOrganizationActive, {
                  organizationId: member.organizationId
                });
                if (isActive) {
                  activeOrganizationId = member.organizationId;
                  break;
                }
              }
            }

            return {
              data: {
                ...session,
                activeOrganizationId: activeOrganizationId,
                activeTeamId: null // Initialize with no active team
              }
            };
          }
        }
      }
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      autoSignIn: true,
      sendResetPassword: async ({ user, url }) => {
        console.log("sendResetPassword", user.email, url);
        await resend.emails.send({
          from: "Uprio <uprio@auth.tryuprio.com>",
          to: [user.email],
          subject: "Reset your password",
          html: `
            <h3>Reset your password</h3>
            <p>Click <a href="${url}">here</a> to reset your password.</p>
            <p>This link will expire in 15 minutes.</p>
          `
        });
      }
    },
    plugins: [
      nextCookies(),
      convex(),
      twoFactor({
        skipVerificationOnEnable: true,
        otpOptions: {
          async sendOTP({ user, otp }) {
            await resend.emails.send({
              from: "Uprio <uprio@auth.tryuprio.com>",
              to: [user.email],
              subject: "Your Uprio 2FA code",
              html: `
            <h3>Your Uprio 2FA code</h3>
            <p>Your 2FA code is ${otp}</p>
            <p>This code will expire in 3 minutes.</p>
            `
            });
          }
        }
      }),
      organization({
        allowUserToCreateOrganization: true,
        organizationLimit: 1,
        invitationExpiresIn: 1000 * 60 * 60 * 24 * 7, // 7 days
        membershipRequireApproval: false,
        roles: organizationRoles,
        teams: {
          enabled: true,
          maximumTeams: 10,
          allowRemovingAllTeams: false
        },
        async sendInvitationEmail(data) {
          const inviteLink = `${process.env.NEXT_PUBLIC_BASE_URL}/accept-invitation?token=${data.id}&email=${data.email}`;
          console.log("sendInvitationEmail", inviteLink);
          
          try {
            await resend.emails.send({
              from: "Uprio <uprio@auth.tryuprio.com>",
              to: [data.email],
              subject: "You've been invited to join a team",
              html: `
                <h3>You've been invited to join ${data.organization.name} team by ${data.inviter.user.name}</h3>
                <p>Click <a href="${inviteLink}">here</a> to accept the invitation.</p>
              `
            });
            console.log("✅ Invitation email sent successfully to:", data.email);
          } catch (error) {
            console.error("❌ Failed to send invitation email:", error);
            console.error("Make sure RESEND_API_KEY is set in your environment variables");
            throw new Error("Failed to send invitation email. Please check your email configuration.");
          }
        }
      }),
      passkey(),
      customSession(async ({ user, session }) => {
        return {
          user,
          session: {
            ...session,
            activeTeamId: (session as any).activeTeamId || null
          }
        };
      }),
      admin({
        // SaaS Admin status is checked via isSaasAdmin flag in Convex users table
        // This is dynamically determined (first user becomes SaaS Admin)
        // Admin plugin is kept for Better Auth admin features, but authorization
        // is primarily handled through isSaasAdmin flag checks in Convex functions
        adminUserIds: []
      })
    ]
  });
