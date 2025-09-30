import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";

export const runtime = "nodejs";

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-GB");
}

function formatDateTime(timestamp: number): string {
  return (
    new Date(timestamp).toLocaleDateString("en-GB") +
    " at " +
    new Date(timestamp).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit"
    })
  );
}

function generateTimlAssessmentHTML(data: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>This Is My Life Assessment</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #111827;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          background: white;
        }
        .header {
          border-bottom: 3px solid #3b82f6;
          padding-bottom: 24px;
          margin-bottom: 32px;
          text-align: center;
        }
        h1 {
          font-size: 2rem;
          font-weight: bold;
          margin-bottom: 8px;
          color: #1e40af;
        }
        h2 {
          font-size: 1.375rem;
          font-weight: 600;
          margin-bottom: 20px;
          margin-top: 32px;
          color: #1e40af;
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 8px;
        }
        h3 {
          font-weight: 600;
          margin-bottom: 12px;
          color: #374151;
          font-size: 1.125rem;
        }
        .section {
          margin-bottom: 40px;
          page-break-inside: avoid;
        }
        .field-group {
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 16px;
        }
        .field-label {
          font-weight: 600;
          color: #475569;
          margin-bottom: 6px;
          font-size: 0.875rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .field-value {
          color: #111827;
          font-size: 1rem;
          word-wrap: break-word;
          white-space: pre-wrap;
        }
        .grid {
          display: grid;
          gap: 16px;
        }
        .grid-cols-2 {
          grid-template-columns: 1fr 1fr;
        }
        .resident-info-box {
          background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
          border: 2px solid #3b82f6;
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 32px;
          text-align: center;
        }
        .resident-name {
          font-size: 1.5rem;
          font-weight: bold;
          color: #1e40af;
          margin-bottom: 8px;
        }
        .resident-details {
          color: #374151;
          font-size: 1rem;
        }
        .life-section {
          background-color: #fefefe;
          border-left: 4px solid #3b82f6;
          border-radius: 8px;
          padding: 24px;
          margin-bottom: 24px;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
        }
        .life-section h3 {
          color: #1e40af;
          margin-top: 0;
          margin-bottom: 16px;
          font-size: 1.25rem;
        }
        .consent-box {
          background-color: #f0f9ff;
          border: 2px solid #0ea5e9;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 24px;
          text-align: center;
        }
        .consent-status {
          font-size: 1.125rem;
          font-weight: 600;
          color: #0c4a6e;
        }
        .signature-section {
          border-top: 3px solid #e5e7eb;
          padding-top: 32px;
          margin-top: 40px;
        }
        .signature-box {
          background-color: #f1f5f9;
          border: 2px solid #cbd5e1;
          border-radius: 8px;
          padding: 20px;
          margin: 16px 0;
          min-height: 60px;
        }
        .signature-label {
          font-weight: 600;
          color: #475569;
          margin-bottom: 8px;
          font-size: 0.875rem;
        }
        .signature-name {
          font-family: cursive;
          font-size: 1.25rem;
          color: #1e293b;
          margin-bottom: 4px;
        }
        .signature-date {
          font-size: 0.875rem;
          color: #64748b;
        }
        .footer {
          margin-top: 48px;
          padding-top: 24px;
          border-top: 2px solid #e5e7eb;
          text-align: center;
          font-size: 0.75rem;
          color: #6b7280;
        }
        .question-answer {
          margin-bottom: 20px;
        }
        .question {
          font-weight: 600;
          color: #374151;
          margin-bottom: 8px;
        }
        .answer {
          color: #111827;
          background-color: #f9fafb;
          padding: 12px;
          border-radius: 6px;
          border-left: 3px solid #3b82f6;
        }
        @media print {
          body {
            margin: 0;
            padding: 15px;
          }
          .section, .life-section {
            page-break-inside: avoid;
          }
          h2 {
            page-break-after: avoid;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>This Is My Life Assessment</h1>
        <p>Personal Life Story and Preferences</p>
      </div>

      <div class="resident-info-box">
        <div class="resident-name">${data.firstName} ${data.lastName}</div>
        <div class="resident-details">
          Preferred Name: ${data.desiredName} | Date of Birth: ${formatDate(data.dateOfBirth)}
        </div>
      </div>

      <div class="consent-box">
        <div class="consent-status">
          ${data.agree ? "✓ Consent given to complete life story assessment" : "⚠ Consent not confirmed"}
        </div>
      </div>

      <div class="section">
        <div class="life-section">
          <h3>🌟 Childhood Memories</h3>
          <div class="question-answer">
            <div class="question">Where were you born?</div>
            <div class="answer">${data.born || "Not provided"}</div>
          </div>
          <div class="question-answer">
            <div class="question">What were your parents' and siblings' names?</div>
            <div class="answer">${data.parentsSiblingsNames || "Not provided"}</div>
          </div>
          <div class="question-answer">
            <div class="question">What work did your family members do?</div>
            <div class="answer">${data.familyMembersOccupation || "Not provided"}</div>
          </div>
          <div class="question-answer">
            <div class="question">Where did you live as a child?</div>
            <div class="answer">${data.whereLived || "Not provided"}</div>
          </div>
          <div class="question-answer">
            <div class="question">What school(s) did you attend?</div>
            <div class="answer">${data.schoolAttended || "Not provided"}</div>
          </div>
          <div class="question-answer">
            <div class="question">What was your favourite subject?</div>
            <div class="answer">${data.favouriteSubject || "Not provided"}</div>
          </div>
          <div class="question-answer">
            <div class="question">Did you have any pets?</div>
            <div class="answer">${data.pets ? `Yes${data.petsNames ? ` - ${data.petsNames}` : ""}` : "No"}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="life-section">
          <h3>🎓 Adolescence & Early Career</h3>
          <div class="question-answer">
            <div class="question">When did you leave school and what did you do?</div>
            <div class="answer">${data.whenLeavingSchool || "Not provided"}</div>
          </div>
          <div class="question-answer">
            <div class="question">What work did you do?</div>
            <div class="answer">${data.whatWork || "Not provided"}</div>
          </div>
          <div class="question-answer">
            <div class="question">Where did you work?</div>
            <div class="answer">${data.whereWorked || "Not provided"}</div>
          </div>
          <div class="question-answer">
            <div class="question">Did you have any special training?</div>
            <div class="answer">${data.specialTraining || "Not provided"}</div>
          </div>
          <div class="question-answer">
            <div class="question">Any special memories from work?</div>
            <div class="answer">${data.specialMemoriesWork || "Not provided"}</div>
          </div>
          <div class="question-answer">
            <div class="question">Did you do National Service or military service?</div>
            <div class="answer">${data.nationalService || "Not provided"}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="life-section">
          <h3>💕 Adulthood & Relationships</h3>
          <div class="question-answer">
            <div class="question">Did you have a partner?</div>
            <div class="answer">${data.partner || "Not provided"}</div>
          </div>
          <div class="question-answer">
            <div class="question">What was their name?</div>
            <div class="answer">${data.partnerName || "Not provided"}</div>
          </div>
          <div class="question-answer">
            <div class="question">Where did you meet?</div>
            <div class="answer">${data.whereMet || "Not provided"}</div>
          </div>
          <div class="question-answer">
            <div class="question">Where and when did you get married?</div>
            <div class="answer">${data.whereWhenMarried || "Not provided"}</div>
          </div>
          <div class="question-answer">
            <div class="question">What did you wear?</div>
            <div class="answer">${data.whatDidYouWear || "Not provided"}</div>
          </div>
          <div class="question-answer">
            <div class="question">What flowers did you have?</div>
            <div class="answer">${data.flowers || "Not provided"}</div>
          </div>
          <div class="question-answer">
            <div class="question">Where did you go for your honeymoon?</div>
            <div class="answer">${data.honeyMoon || "Not provided"}</div>
          </div>
          <div class="question-answer">
            <div class="question">Where did you live as adults?</div>
            <div class="answer">${data.whereLivedAdult || "Not provided"}</div>
          </div>
          <div class="question-answer">
            <div class="question">Do you have children? What are their names?</div>
            <div class="answer">${data.childrenAndNames || "Not provided"}</div>
          </div>
          <div class="question-answer">
            <div class="question">Do you have grandchildren? What are their names?</div>
            <div class="answer">${data.grandchildrenAndNames || "Not provided"}</div>
          </div>
          <div class="question-answer">
            <div class="question">Do you have special friends? What are their names?</div>
            <div class="answer">${data.specialFriendsAndNames || "Not provided"}</div>
          </div>
          <div class="question-answer">
            <div class="question">Where did you meet them and are you still in touch?</div>
            <div class="answer">${data.specialFriendsMetAndStillTouch || "Not provided"}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="life-section">
          <h3>🌅 Retirement</h3>
          <div class="question-answer">
            <div class="question">When did you retire?</div>
            <div class="answer">${data.whenRetired || "Not provided"}</div>
          </div>
          <div class="question-answer">
            <div class="question">What were you looking forward to?</div>
            <div class="answer">${data.lookingForwardTo || "Not provided"}</div>
          </div>
          <div class="question-answer">
            <div class="question">What hobbies and interests did you have?</div>
            <div class="answer">${data.hobbiesInterests || "Not provided"}</div>
          </div>
          <div class="question-answer">
            <div class="question">What were the biggest changes in retirement?</div>
            <div class="answer">${data.biggestChangesRetirement || "Not provided"}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="life-section">
          <h3>🎯 Current Preferences</h3>
          <div class="question-answer">
            <div class="question">What do you enjoy now?</div>
            <div class="answer">${data.whatEnjoyNow || "Not provided"}</div>
          </div>
          <div class="question-answer">
            <div class="question">What do you like to read?</div>
            <div class="answer">${data.whatLikeRead || "Not provided"}</div>
          </div>
        </div>
      </div>

      <div class="signature-section">
        <h2>Assessment Completion</h2>
        <div class="grid grid-cols-2">
          <div class="signature-box">
            <div class="signature-label">Completed By</div>
            <div class="signature-name">${data.completedBy}</div>
            <div class="signature-date">${data.completedByJobRole}</div>
          </div>
          
          <div class="signature-box">
            <div class="signature-label">Digital Signature</div>
            <div class="signature-name">${data.completedBySignature}</div>
            <div class="signature-date">Signed on ${formatDate(data.date)}</div>
          </div>
        </div>
      </div>

      <div class="footer">
        <p>This life story assessment was generated electronically and is valid without a physical signature.</p>
        <p>Generated on ${formatDateTime(Date.now())}</p>
        ${data._id ? `<p>Assessment ID: ${data._id}</p>` : ""}
      </div>
    </body>
    </html>
  `;
}

export async function POST(request: NextRequest) {
  try {
    // Check for API token authentication (server-to-server)
    const authHeader = request.headers.get("authorization");
    const expectedToken = process.env.PDF_API_TOKEN;
    const isDev = process.env.NODE_ENV === "development";

    // Only enforce authentication in production and if PDF_API_TOKEN is set
    if (!isDev && expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      console.log("PDF API authentication failed:", {
        expectedToken: expectedToken ? "***SET***" : "NOT_SET",
        authHeader: authHeader ? "PROVIDED" : "MISSING",
        environment: process.env.NODE_ENV
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("TIML Assessment PDF API request received:", {
      environment: process.env.NODE_ENV,
      hasToken: !!expectedToken,
      hasAuthHeader: !!authHeader
    });

    // Parse the request body
    const assessmentData = await request.json();

    if (!assessmentData) {
      return NextResponse.json(
        { error: "Assessment data is required" },
        { status: 400 }
      );
    }

    console.log("TIML Assessment PDF API called with data:", {
      residentName: `${assessmentData.firstName} ${assessmentData.lastName}`,
      desiredName: assessmentData.desiredName,
      formId: assessmentData._id
    });

    // Generate HTML content
    const htmlContent = generateTimlAssessmentHTML(assessmentData);

    // Launch Playwright browser
    const browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();

    try {
      // Set the HTML content directly
      await page.setContent(htmlContent, {
        waitUntil: "networkidle",
        timeout: 30000
      });

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: {
          top: "20px",
          bottom: "20px",
          left: "20px",
          right: "20px"
        },
        displayHeaderFooter: false,
        preferCSSPageSize: true
      });

      await browser.close();

      // Return the PDF as a response
      return new NextResponse(pdfBuffer as any, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="timl-assessment-${assessmentData.firstName?.replace(/\s+/g, "-") || "resident"}-${assessmentData.lastName?.replace(/\s+/g, "-") || ""}.pdf"`,
          "Content-Length": pdfBuffer.length.toString()
        }
      });
    } catch (error) {
      await browser.close();
      throw error;
    }
  } catch (error) {
    console.error("TIML Assessment PDF generation error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate TIML Assessment PDF",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
