"use server";

import resend from "@/lib/resend";

export async function sendInvitationEmail(args: {
    email: string;
    organizationId: string;
    organizationName: string;
    inviterName: string;
    token: string;
    role: string;
}) {
    const { email, organizationName, inviterName, token, role } = args;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const inviteLink = `${baseUrl}/accept-invitation?token=${token}&email=${email}`;

    try {
        const result = await resend.emails.send({
            from: "CareO <care@careo.uk>",
            to: [email],
            subject: `You've been invited to join ${organizationName} on CareO`,
            html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Hello,</h2>
          <p>You've been invited by <strong>${inviterName}</strong> to join <strong>${organizationName}</strong> as a ${role.replace("_", " ")} on the CareO platform.</p>
          <div style="margin: 30px 0;">
            <a href="${inviteLink}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Accept Invitation</a>
          </div>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p>${inviteLink}</p>
          <hr style="margin-top: 40px; border: 0; border-top: 1px solid #eee;" />
          <p style="font-size: 12px; color: #666;">This invitation will expire in 7 days.</p>
        </div>
      `
        });

        if (result.error) {
            console.error("Resend API error:", result.error);
            return { success: false, error: result.error.message };
        }

        console.log(`✅ ${role} invitation email sent successfully to:`, email);
        return { success: true };
    } catch (error: any) {
        console.error("❌ Error sending invitation email:", error);
        return { success: false, error: error.message || "Failed to send email" };
    }
}

export async function sendOwnerInvitationEmail(args: {
    email: string;
    organizationName: string;
    inviterName: string;
    token: string;
}) {
    return sendInvitationEmail({
        ...args,
        organizationId: "", // Not needed for email template
        role: "owner"
    });
}
