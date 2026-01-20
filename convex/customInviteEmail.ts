"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { Resend } from "resend";

/**
 * Internal helper function to send invitation email
 * This is the actual email sending logic
 */
async function sendEmail(
  invitationId: string,
  email: string,
  organizationName: string,
  inviterName: string
): Promise<void> {
  // Check for API key BEFORE creating Resend instance
  if (!process.env.RESEND_API_KEY) {
    const errorMsg = "RESEND_API_KEY is not set in Convex environment variables. Please set it in the Convex dashboard.";
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const inviteLink = `${process.env.NEXT_PUBLIC_BASE_URL}/accept-invitation?token=${invitationId}&email=${email}`;

  const result = await resend.emails.send({
    from: "Careo <care@careo.uk>",
    to: [email],
    subject: "You've been invited to join a team",
    html: `
      <h3>You've been invited to join ${organizationName} team by ${inviterName}</h3>
      <p>Click <a href="${inviteLink}">here</a> to accept the invitation.</p>
    `
  });

  if (result.error) {
    console.error("Resend API error:", result.error);
    throw new Error(`Failed to send email: ${JSON.stringify(result.error)}`);
  }

  console.log("✅ Invitation email sent successfully to:", email);
}

/**
 * Action to send invitation email (public API)
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
    try {
      await sendEmail(args.invitationId, args.email, args.organizationName, args.inviterName);
    } catch (err) {
      console.error("❌ Error sending invitation email:", err);
      // Re-throw the error so it's visible in logs and can be handled upstream
      throw err;
    }
    return null;
  },
});

/**
 * Internal action to send invitation email (can be called from mutations via scheduler)
 */
export const sendInvitationEmailInternal = internalAction({
  args: {
    invitationId: v.string(),
    email: v.string(),
    organizationName: v.string(),
    inviterName: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      await sendEmail(args.invitationId, args.email, args.organizationName, args.inviterName);
    } catch (err) {
      console.error("❌ Error sending invitation email (internal):", err);
      throw err;
    }
    return null;
  },
});




