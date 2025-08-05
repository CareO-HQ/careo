import { convexAdapter } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth";
import { type GenericCtx } from "../convex/_generated/server";
import { betterAuthComponent } from "../convex/auth";
import { nextCookies } from "better-auth/next-js";
import resend from "./resend";
import { organization, customSession, twoFactor } from "better-auth/plugins";
import { components } from "../convex/_generated/api";
import { ac, member, admin, owner } from "./permissions";
import { passkey } from "better-auth/plugins/passkey";

const siteUrl = process.env.NEXT_PUBLIC_BASE_URL;

export const createAuth = (ctx: GenericCtx) =>
  betterAuth({
    baseURL: siteUrl,
    database: convexAdapter(ctx, betterAuthComponent),
    trustedOrigins: ["http://localhost:3000"],
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
        ac,
        roles: {
          owner,
          admin,
          member
        },
        teams: {
          enabled: true,
          maximumTeams: 10,
          allowRemovingAllTeams: false
        },
        async sendInvitationEmail(data) {
          const inviteLink = `${process.env.NEXT_PUBLIC_BASE_URL}/accept-invitation?token=${data.id}`;
          await resend.emails.send({
            from: "Uprio <uprio@auth.tryuprio.com>",
            to: [data.email],
            subject: "You've been invited to join a team",
            html: `
              <h3>You've been invited to join ${data.organization.name} team by ${data.inviter.user.name}</h3>
              <p>Click <a href="${inviteLink}">here</a> to accept the invitation.</p>
            `
          });
        }
      }),
      passkey(),
      customSession(async ({ user, session }) => {
        return {
          user,
          session: {
            ...session,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            activeTeamId: (session as any).activeTeamId || null
          }
        };
      })
    ]
  });
