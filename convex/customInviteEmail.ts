"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { Resend } from "resend";

/**
 * Action to send invitation email
 */
export const sendInvitationEmail = action({
  args: {
    invitationId: v.string(),
    email: v.string(),
    organizationName: v.string(),
    inviterName: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Check for API key BEFORE creating Resend instance
    if (!process.env.RESEND_API_KEY) {
      const errorMsg = "RESEND_API_KEY is not set in Convex environment variables. Please set it in the Convex dashboard.";
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const inviteLink = `${process.env.NEXT_PUBLIC_BASE_URL}/accept-invitation?token=${args.invitationId}&email=${args.email}`;

    try {
      const result = await resend.emails.send({
        from: "Uprio <uprio@auth.tryuprio.com>",
        to: [args.email],
        subject: "You've been invited to join a team",
        html: `
          <h3>You've been invited to join ${args.organizationName} team by ${args.inviterName}</h3>
          <p>Click <a href="${inviteLink}">here</a> to accept the invitation.</p>
        `
      });
      
      if (result.error) {
        console.error("Resend API error:", result.error);
        throw new Error(`Failed to send email: ${JSON.stringify(result.error)}`);
      }
      
      console.log("✅ Invitation email sent successfully to:", args.email);
    } catch (error) {
      console.error("❌ Error sending invitation email:", error);
      // Re-throw the error so it's visible in logs and can be handled upstream
      throw error;
    }

    return null;
  },
});




