import { NextRequest, NextResponse } from "next/server";
import resend from "@/lib/resend";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { careHomeName, staffName, email, contactNumber, inquiryType, message } = body;

    // Validate required fields
    if (!careHomeName || !staffName || !email || !inquiryType || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Format inquiry type for display
    const formatInquiryType = (type: string) => {
      switch (type) {
        case "question":
          return "Question";
        case "complaint":
          return "Complaint";
        case "support_request":
          return "Support Request";
        default:
          return type;
      }
    };

    // Send email using Resend
    const emailContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #111827;">
            New Help & Support Request
          </h2>
          <div style="background-color: #fff; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">
              <strong style="color: #111827;">Inquiry Type:</strong> ${formatInquiryType(inquiryType)}
            </p>
          </div>
        </div>

        <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin-bottom: 16px;">
          <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #111827;">
            Contact Information
          </h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #6b7280; width: 40%;">Care Home Name:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #111827; font-weight: 500;">${careHomeName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Staff Name:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #111827; font-weight: 500;">${staffName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Email:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #111827; font-weight: 500;"><a href="mailto:${email}" style="color: #2563eb;">${email}</a></td>
            </tr>
            ${contactNumber ? `
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Contact Number:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #111827; font-weight: 500;">${contactNumber}</td>
            </tr>
            ` : ''}
          </table>
        </div>

        <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px;">
          <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #111827;">
            Message
          </h3>
          <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px;">
            <p style="margin: 0; font-size: 14px; color: #374151; line-height: 1.6; white-space: pre-wrap;">${message}</p>
          </div>
        </div>

        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center;">
          <p style="margin: 0; font-size: 12px; color: #9ca3af;">
            This email was sent from the CareO Help & Support form
          </p>
        </div>
      </div>
    `;

    // Configure the email recipient
    // Note: Currently using contactabisgeorge@gmail.com because Resend is in testing mode
    // To use abi@careo.uk, verify the careo.uk domain at resend.com/domains
    const supportEmail = "contactabisgeorge@gmail.com"; // Change to abi@careo.uk after domain verification

    console.log("Attempting to send email to:", supportEmail);
    console.log("Resend API Key exists:", !!process.env.RESEND_API_KEY);

    const result = await resend.emails.send({
      from: "CareO Support <onboarding@resend.dev>",
      to: [supportEmail],
      subject: `Help & Support: ${formatInquiryType(inquiryType)} from ${careHomeName}`,
      html: emailContent,
      replyTo: email,
    });

    console.log("Email sent successfully:", result);

    return NextResponse.json(
      { success: true, message: "Support request sent successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error processing support request:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      response: error.response?.data
    });
    return NextResponse.json(
      {
        error: "Failed to send support request",
        details: error.message || "Unknown error"
      },
      { status: 500 }
    );
  }
}
