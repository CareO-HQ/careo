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
    const resend = new Resend(process.env.RESEND_API_KEY);

    const inviteLink = `${process.env.NEXT_PUBLIC_BASE_URL}/accept-invitation?token=${args.invitationId}&email=${args.email}`;
    
    try {
      await resend.emails.send({
        from: "Uprio <uprio@auth.tryuprio.com>",
        to: [args.email],
        subject: "You've been invited to join a team",
        html: `
          <h3>You've been invited to join ${args.organizationName} team by ${args.inviterName}</h3>
          <p>Click <a href="${inviteLink}">here</a> to accept the invitation.</p>
        `
      });
      
      console.log("Invitation email sent to:", args.email);
    } catch (error) {
      console.error("Error sending invitation email:", error);
    }

    return null;
  },
});




