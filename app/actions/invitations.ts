"use server";

import resend from "@/lib/resend";
import { escapeHtml } from "@/lib/html";
import { AuthorizationError, getServiceClient, requireSessionActor } from "@/lib/server-auth";

interface StoredInvitation {
    email: string;
    role: string;
    organization_id: string | null;
    invited_by: string | null;
}

/**
 * Loads the invitation the email is for and checks the signed-in user may send it.
 * Recipient and role always come from the stored invitation, never from the caller.
 */
async function loadAuthorizedInvitation(token: string): Promise<StoredInvitation> {
    const actor = await requireSessionActor();
    const { data, error } = await getServiceClient()
        .from("invitations")
        .select("email, role, organization_id, invited_by")
        .eq("token", token)
        .eq("status", "pending")
        .single();
    if (error || !data) throw new Error("Invitation not found");
    const invitation = data as StoredInvitation;

    const isInviter = invitation.invited_by === actor.id;
    const isOrgManager =
        ["owner", "manager"].includes(actor.role) &&
        !!invitation.organization_id &&
        invitation.organization_id === actor.active_organization_id;
    // Owner invitations are platform-level: only the inviting admin may send them.
    const ownerInvite = invitation.role === "owner";
    const allowed = actor.is_saas_admin || isInviter || (!ownerInvite && isOrgManager);
    if (!allowed) throw new AuthorizationError();
    return invitation;
}

export async function sendInvitationEmail(args: {
    email: string;
    organizationId: string;
    careHomeName: string;
    inviterName: string;
    token: string;
    role: string;
}) {
    try {
        const invitation = await loadAuthorizedInvitation(args.token);
        const email = invitation.email;
        const role = escapeHtml(invitation.role.replace("_", " "));
        const careHomeName = escapeHtml(args.careHomeName);
        const inviterName = escapeHtml(args.inviterName);
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
        const inviteLink = `${baseUrl}/accept-invitation?token=${encodeURIComponent(args.token)}&email=${encodeURIComponent(email)}`;

        const result = await resend.emails.send({
            from: "CareO <care@careo.uk>",
            to: [email],
            subject: `You've been invited to join ${args.careHomeName.replace(/[\r\n]/g, " ")} on CareO`,
            html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Hello,</h2>
          <p>You've been invited by <strong>${inviterName}</strong> to join <strong>${careHomeName}</strong> as a ${role} on the CareO platform.</p>
          <div style="margin: 30px 0;">
            <a href="${escapeHtml(inviteLink)}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Accept Invitation</a>
          </div>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p>${escapeHtml(inviteLink)}</p>
          <hr style="margin-top: 40px; border: 0; border-top: 1px solid #eee;" />
          <p style="font-size: 12px; color: #666;">This invitation will expire in 7 days.</p>
        </div>
      `
        });

        if (result.error) {
            console.error("Resend API error:", result.error);
            return { success: false, error: result.error.message };
        }

        return { success: true };
    } catch (error) {
        console.error("❌ Error sending invitation email:", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to send email" };
    }
}

export async function sendOwnerInvitationEmail(args: {
    email: string;
    careHomeName: string;
    inviterName: string;
    token: string;
}) {
    return sendInvitationEmail({
        ...args,
        organizationId: "", // Not needed for email template
        role: "owner"
    });
}
