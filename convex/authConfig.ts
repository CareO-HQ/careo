"use node";

import { convexAdapter } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth";
import { type GenericCtx } from "./_generated/server";
import { betterAuthComponent, organizationRoles } from "./auth";
import { organization, customSession, twoFactor } from "better-auth/plugins";
import { components } from "./_generated/api";
import { passkey } from "better-auth/plugins/passkey";
import { admin } from "better-auth/plugins";
import { Resend } from "resend";

const siteUrl = process.env.NEXT_PUBLIC_BASE_URL;

export const createAuth = (ctx: GenericCtx) =>
  betterAuth({
    baseURL: siteUrl,
    database: convexAdapter(ctx, betterAuthComponent),
    trustedOrigins: [
      "http://localhost:3000",
      "http://localhost:8081", // Mobile app (Expo)
      "exp://localhost:8081",  // Expo Go app
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
            const member = await ctx.runQuery(
              components.betterAuth.lib.findOne,
              {
                model: "member",
                where: [{ field: "userId", value: session.userId }]
              }
            );
            return {
              data: {
                ...session,
                activeOrganizationId: member?.organizationId,
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
        // Email sending is handled by the action in customInviteEmail.ts
      }
    },
    plugins: [
      convex(),
      twoFactor({
        skipVerificationOnEnable: true,
        otpOptions: {
          async sendOTP({ user, otp }) {
            console.log("sendOTP", user.email, otp);
            // Email sending would be handled by an action
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
          
          // Send email directly using Resend (Convex has access to RESEND_API_KEY)
          try {
            const resend = new Resend(process.env.RESEND_API_KEY);
            await resend.emails.send({
              from: "Uprio <uprio@auth.tryuprio.com>",
              to: [data.email],
              subject: "You've been invited to join a team",
              html: `
                <h3>You've been invited to join ${data.organization.name} team by ${data.inviter.user.name}</h3>
                <p>Click <a href="${inviteLink}">here</a> to accept the invitation.</p>
              `
            });
            console.log("✅ Owner invitation email sent successfully to:", data.email);
          } catch (error) {
            console.error("❌ Failed to send owner invitation email:", error);
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
        adminUserIds: [
          "m17f5hycmedfr15th28e1xt13d7n4nqc",
          "m170w78er3krb5js6j3yh3c6rd7n2pyz"
        ]
      })
    ]
  });

