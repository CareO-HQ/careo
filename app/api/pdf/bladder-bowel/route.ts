import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";

export const runtime = "nodejs";

function formatDate(dateString?: string | number): string {
  if (!dateString) return "Not specified";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Not specified";
  return date.toLocaleDateString("en-GB");
}

function formatDateTime(dateString?: string | number): string {
  if (!dateString) return "Not specified";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Not specified";
  return (
    date.toLocaleDateString("en-GB") +
    " at " +
    date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit"
    })
  );
}

function formatEnumValue(value: string): string {
  if (!value) return "Not specified";
  return value
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function generateBladderBowelHTML(data: any): string {
  const getVal = (val: any) => (val === "YES" || val === "Yes") ? "Yes" : (val === "NO" || val === "No") ? "No" : val === "NOT-KNOWN" ? "Not Known" : val || "Not specified";
  const getStatus = (val: any) => {
    if (val === "1-2-DAY") return "1-2/day";
    if (val === "3-DAY") return "3/d";
    if (val === "ONCE-A-DAY") return "Once a day";
    if (val === "DAY-AND-NIGHT") return "Day and night";
    if (val === "NIGHTTIME") return "Nighttime";
    if (val === "LESS-6M") return "Less than 6 months";
    if (val === "6M-1Y") return "6 months - 1 year";
    if (val === "MORE-1Y") return "More than 1 year";
    return formatEnumValue(val);
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Bladder and Bowel Continence Assessment</title>
      <style>
        body { font-family: sans-serif; line-height: 1.4; color: #333; max-width: 900px; margin: 0 auto; padding: 20px; font-size: 12px; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
        h1 { font-size: 20px; margin: 0; }
        h2 { font-size: 16px; background: #f0f0f0; padding: 5px; border-left: 4px solid #333; margin: 20px 0 10px 0; }
        h3 { font-size: 14px; margin: 15px 0 5px 0; color: #555; border-bottom: 1px solid #ddd; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .section { margin-bottom: 15px; }
        .field-row { display: flex; border-bottom: 1px solid #eee; padding: 4px 0; }
        .field-label { font-weight: bold; width: 60%; }
        .field-value { width: 40%; text-align: right; }
        .notes-box { border: 1px solid #ccc; padding: 10px; min-height: 40px; margin-top: 5px; background: #fafafa; }
        .alert-box { padding: 8px; margin: 10px 0; border-radius: 4px; font-size: 11px; }
        .alert-blue { background: #eef6ff; border: 1px solid #d0e7ff; color: #004085; }
        .alert-orange { background: #fff8ee; border: 1px solid #ffe8cc; color: #856404; }
        @media print { .section { page-break-inside: avoid; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Bladder and Bowel Continence Assessment</h1>
        <div class="grid" style="margin-top: 10px; text-align: left;">
          <div>
            <strong>Resident Name:</strong> ${data.residentName}<br/>
            <strong>Date of Birth:</strong> ${formatDate(data.dateOfBirth)}<br/>
            <strong>Bedroom Number:</strong> ${data.bedroomNumber}
          </div>
          <div style="text-align: right;">
            <strong>Information obtained from:</strong> ${data.informationObtainedFrom}<br/>
            <strong>Date:</strong> ${formatDate(data.assessmentDate || data.createdAt)}<br/>
            <strong>Assessed by:</strong> ${data.sigantureCompletingAssessment || data.completedBy || "Not specified"}
          </div>
        </div>
      </div>

      <div class="section">
        <h2>1. Infections & Urinalysis</h2>
        <div class="grid">
          <div class="field-row"><span class="field-label">Hepatitis A/B:</span> <span class="field-value">${getVal(data.hepatitisAB)}</span></div>
          <div class="field-row"><span class="field-label">Blood Borne Virus:</span> <span class="field-value">${getVal(data.bloodBorneVirus)}</span></div>
          <div class="field-row"><span class="field-label">MRSA:</span> <span class="field-value">${getVal(data.mrsa)}</span></div>
          <div class="field-row"><span class="field-label">ESBL:</span> <span class="field-value">${getVal(data.esbl)}</span></div>
          <div class="field-row" style="grid-column: span 2;"><span class="field-label">Other Infection:</span> <span class="field-value">${data.otherInfection || "None"}</span></div>
        </div>
        <div class="alert-box alert-blue">Note: If Resident has an infection, treat the infection, and reassess in two weeks' time.</div>
        <div class="alert-box alert-orange">Note: If the Resident has diarrhoea, treat and reassess in two weeks' time.</div>
        
        <h3>Urinalysis on Admission</h3>
        <div class="grid">
          <div class="field-row"><span class="field-label">pH:</span> <span class="field-value">${getStatus(data.ph)}</span></div>
          <div class="field-row"><span class="field-label">Nitrates:</span> <span class="field-value">${getStatus(data.nitrates)}</span></div>
          <div class="field-row"><span class="field-label">Protein:</span> <span class="field-value">${getStatus(data.protein)}</span></div>
          <div class="field-row"><span class="field-label">Leucocytes:</span> <span class="field-value">${getStatus(data.leucocytes)}</span></div>
          <div class="field-row"><span class="field-label">Glucose:</span> <span class="field-value">${getStatus(data.glucose)}</span></div>
          <div class="field-row"><span class="field-label">Blood:</span> <span class="field-value">${getStatus(data.bloodResult)}</span></div>
          <div class="field-row" style="grid-column: span 2;"><span class="field-label">Result:</span> <span class="field-value">${data.urinalysisResult || "No details provided"}</span></div>
          <div class="field-row"><span class="field-label">MSSU (if indicated) Date:</span> <span class="field-value">${formatDate(data.mssuDate)}</span></div>
        </div>
      </div>

      <div class="section">
        <h2>2. Prescribed Medication</h2>
        <div class="grid">
          <div class="field-row"><span class="field-label">Anti-hypertensives:</span> <span class="field-value">${getVal(data.antiHypertensives)}</span></div>
          <div class="field-row"><span class="field-label">Anti-Parkinson drugs:</span> <span class="field-value">${getVal(data.antiParkinsonDrugs)}</span></div>
          <div class="field-row"><span class="field-label">Iron supplements:</span> <span class="field-value">${getVal(data.ironSupplement)}</span></div>
          <div class="field-row"><span class="field-label">Laxatives:</span> <span class="field-value">${getVal(data.laxatives)}</span></div>
          <div class="field-row"><span class="field-label">Diuretic:</span> <span class="field-value">${getVal(data.diuretics)}</span></div>
          <div class="field-row"><span class="field-label">Histamine:</span> <span class="field-value">${getVal(data.histamine)}</span></div>
          <div class="field-row"><span class="field-label">Antidepressants:</span> <span class="field-value">${getVal(data.antiDepressants)}</span></div>
          <div class="field-row"><span class="field-label">Cholinergic:</span> <span class="field-value">${getVal(data.cholinergic)}</span></div>
          <div class="field-row"><span class="field-label">Sedative/Hypnotic:</span> <span class="field-value">${getVal(data.sedativesHypnotic)}</span></div>
          <div class="field-row"><span class="field-label">Anti-psychotic:</span> <span class="field-value">${getVal(data.antiPsychotic)}</span></div>
          <div class="field-row"><span class="field-label">Antihistamines:</span> <span class="field-value">${getVal(data.antihistamines)}</span></div>
          <div class="field-row"><span class="field-label">Narcotic analgesic:</span> <span class="field-value">${getVal(data.narcoticAnalgesics)}</span></div>
        </div>
      </div>

      <div class="section">
        <h2>3. Contributing Risk Factors</h2>
        <div style="margin-bottom: 10px;">
          <strong>Caffeine:</strong> ${data.caffeineMls24h || 0}mls, Frequency: ${data.caffeineFrequency || "N/A"}, Time: ${data.caffeineTimeOfDay || "N/A"}
        </div>
        <div style="margin-bottom: 10px;">
          <strong>Exercise:</strong> Type: ${data.exerciseType || "N/A"}, Frequency: ${data.exerciseFrequency || "N/A"}, Time: ${data.exerciseTimeOfDay || "N/A"}
        </div>
        <div class="grid">
          <div class="field-row"><span class="field-label">Smoking:</span> <span class="field-value">${getStatus(data.smoking)}</span></div>
          <div class="field-row"><span class="field-label">Skin Condition:</span> <span class="field-value">${getStatus(data.skinCondition)}</span></div>
          <div class="field-row"><span class="field-label">Weight:</span> <span class="field-value">${getStatus(data.weight)}</span></div>
          <div class="field-row"><span class="field-label">Mental State:</span> <span class="field-value">${getStatus(data.mentalState)}</span></div>
          <div class="field-row"><span class="field-label">Mobility:</span> <span class="field-value">${getStatus(data.mobilityIssues)}</span></div>
          <div class="field-row"><span class="field-label">History of Constipation:</span> <span class="field-value">${getVal(data.constipationHistory)}</span></div>
          <div class="field-row"><span class="field-label">History of Recurrent UTIs:</span> <span class="field-value">${getVal(data.historyRecurrentUTIs)}</span></div>
        </div>
        <div style="margin-top: 10px;">
          <strong>Alcohol:</strong> ${data.alcoholAmount24h || 0} units/24h, Frequency: ${data.alcoholFrequency || "N/A"}, Time: ${data.alcoholTimeOfDay || "N/A"}
        </div>
      </div>

      <div class="section" style="page-break-before: always;">
        <h2>4. Urinary Continence History</h2>
        <div class="field-row"><span class="field-label">Frequency of Urinary Incontinence:</span> <span class="field-value">${getStatus(data.incontinenceFrequency)}</span></div>
        <div class="field-row"><span class="field-label">Typical Volume:</span> <span class="field-value">${getStatus(data.incontinenceVolume)}</span></div>
        <div class="field-row"><span class="field-label">Onset of symptoms:</span> <span class="field-value">${getStatus(data.onset)}</span></div>
        <div class="field-row"><span class="field-label">Duration:</span> <span class="field-value">${getStatus(data.duration)}</span></div>
        <div class="field-row"><span class="field-label">Symptoms in past 6 months:</span> <span class="field-value">${getStatus(data.symptomsPast6Months)}</span></div>
        <div class="field-row"><span class="field-label">Physician consulted regarding incontinence?</span> <span class="field-value">${getVal(data.physicianConsulted)}</span></div>
      </div>

      <div class="section">
        <h2>5. Bowel Pattern</h2>
        <div class="field-row"><span class="field-label">Pattern:</span> <span class="field-value">${getStatus(data.bowelPattern)}</span></div>
        <div class="grid">
          <div class="field-row"><span class="field-label">Frequency:</span> <span class="field-value">${data.bowelFrequency || "Not specified"}</span></div>
          <div class="field-row"><span class="field-label">Usual Time of Day:</span> <span class="field-value">${data.bowelUsualTimeOfDay || "Not specified"}</span></div>
        </div>
        <div class="field-row"><span class="field-label">Bristol Stool Type & Amount:</span> <span class="field-value">${data.bowelAmountStoolType || "Not specified"}</span></div>
        <div class="grid">
          <div class="field-row"><span class="field-label">Liquid Feeds:</span> <span class="field-value">${getVal(data.bowelLiquidFeeds)}</span></div>
          <div class="field-row"><span class="field-label">Medical Officer Consulted:</span> <span class="field-value">${data.medicalOfficerConsulted || "No"}</span></div>
        </div>
        <div class="field-row"><span class="field-label">Other Factors (Diet/Fluid):</span> <span class="field-value">${data.bowelOtherFactors || "None"}</span></div>
        <div class="field-row"><span class="field-label">Other Remedies:</span> <span class="field-value">${data.bowelOtherRemedies || "None"}</span></div>
      </div>

      <div class="section">
        <h2>6. Toileting Habits & Aids</h2>
        <div class="grid">
          <div class="field-row"><span class="field-label">Day Pattern:</span> <span class="field-value">${getStatus(data.dayPattern)}</span></div>
          <div class="field-row"><span class="field-label">Evening Pattern:</span> <span class="field-value">${getStatus(data.eveningPattern)}</span></div>
          <div class="field-row"><span class="field-label">Night Pattern:</span> <span class="field-value">${getStatus(data.nightPattern)}</span></div>
        </div>
        <strong>Continence Pads/Aids In Use:</strong>
        <div class="notes-box">${data.typesOfPads || "None specified"}</div>
      </div>

      <div class="section">
        <h2>7. Urinary Symptoms</h2>
        <div class="grid">
          <div class="field-row"><span class="field-label">Do you leak when you cough or laugh?</span> <span class="field-value">${getVal(data.leakCoughLaugh)}</span></div>
          <div class="field-row"><span class="field-label">Do you leak when you get up from a chair?</span> <span class="field-value">${getVal(data.leakStandingUp)}</span></div>
          <div class="field-row"><span class="field-label">Do you leak when you go upstairs/downhill?</span> <span class="field-value">${getVal(data.leakUpstairsDownhill)}</span></div>
          <div class="field-row"><span class="field-label">Passes urine frequently?</span> <span class="field-value">${getVal(data.passesUrineFrequently)}</span></div>
          <div class="field-row"><span class="field-label">Desire to pass urine very strong?</span> <span class="field-value">${getVal(data.desirePassUrineStrong)}</span></div>
          <div class="field-row"><span class="field-label">Leaks urine before reaching the toilet?</span> <span class="field-value">${getVal(data.leaksBeforeToilet)}</span></div>
          <div class="field-row"><span class="field-label">Gets up more than twice during the night?</span> <span class="field-value">${getVal(data.getsUpMoreThanTwiceNight)}</span></div>
          <div class="field-row"><span class="field-label">Anxiety contributes to frequency?</span> <span class="field-value">${getVal(data.anxietyContributesFrequency)}</span></div>
          <div class="field-row"><span class="field-label">Difficulty in beginning to pass urine?</span> <span class="field-value">${getVal(data.difficultyBeginningUrine)}</span></div>
          <div class="field-row"><span class="field-label">Hesitancy/Straining?</span> <span class="field-value">${getVal(data.hesitancyStraining)}</span></div>
          <div class="field-row"><span class="field-label">Dribbles after passing urine?</span> <span class="field-value">${getVal(data.dribblesAfterUrine)}</span></div>
          <div class="field-row"><span class="field-label">Still feels bladder is full after passing urine?</span> <span class="field-value">${getVal(data.feelsBladderFullAfterUrine)}</span></div>
          <div class="field-row"><span class="field-label">Has recurrent urinary tract infections?</span> <span class="field-value">${getVal(data.recurrentUTIs)}</span></div>
          <div class="field-row"><span class="field-label">Limited mobility?</span> <span class="field-value">${getVal(data.limitedMobility)}</span></div>
          <div class="field-row"><span class="field-label">Unable to get to the toilet on time?</span> <span class="field-value">${getVal(data.unableToiletOnTime)}</span></div>
          <div class="field-row"><span class="field-label">Cannot hold urinal or sit on toilet?</span> <span class="field-value">${getVal(data.cannotHoldUrinalOrSit)}</span></div>
          <div class="field-row"><span class="field-label">Cannot reach/use call bell?</span> <span class="field-value">${getVal(data.cannotReachCallBell)}</span></div>
          <div class="field-row"><span class="field-label">Poor vision?</span> <span class="field-value">${getVal(data.poorVision)}</span></div>
          <div class="field-row"><span class="field-label">Needs to be assisted to transfer?</span> <span class="field-value">${getVal(data.needsAssistedTransfer)}</span></div>
          <div class="field-row"><span class="field-label">Pain?</span> <span class="field-value">${getVal(data.pain)}</span></div>
        </div>
      </div>

      <div class="section">
        <h2>8. Quality of Life</h2>
        <p>Impact of urinary incontinence on life (Scale 0-10): <strong>${data.qualityOfLife || "Not specified"}</strong></p>
      </div>

      <div class="section" style="page-break-before: always;">
        <h2>9. Summary & Planning</h2>
        <div class="grid">
          <div style="border-right: 1px solid #ccc; padding-right: 10px;">
            <h3>Bladder Decisions</h3>
            <div class="field-row"><span class="field-label">Continent:</span> <span class="field-value">${getVal(data.bladderContinent)}</span></div>
            <div class="field-row"><span class="field-label">Incontinent:</span> <span class="field-value">${getVal(data.bladderIncontinent)}</span></div>
            <div class="field-row"><span class="field-label">Type:</span> <span class="field-value">${getStatus(data.bladderIncontinentType)}</span></div>
            <div class="field-row"><span class="field-label">Care Plan Commenced:</span> <span class="field-value">${getVal(data.bladderCarePlanCommenced)}</span></div>
            <div class="field-row"><span class="field-label">Referral Required:</span> <span class="field-value">${getStatus(data.bladderReferralRequired)}</span></div>
            <div class="field-row"><span class="field-label">Treatment Plan Followed:</span> <span class="field-value">${getStatus(data.bladderTreatmentPlanFollowed)}</span></div>
          </div>
          <div style="padding-left: 10px;">
            <h3>Bowel Decisions</h3>
            <div class="field-row"><span class="field-label">Continent:</span> <span class="field-value">${getVal(data.bowelContinent)}</span></div>
            <div class="field-row"><span class="field-label">Incontinent:</span> <span class="field-value">${getVal(data.bowelIncontinent)}</span></div>
            <div class="field-row"><span class="field-label">Care Plan Commenced:</span> <span class="field-value">${getVal(data.bowelCarePlanCommenced)}</span></div>
            <div class="field-row"><span class="field-label">Record Commenced:</span> <span class="field-value">${getVal(data.bowelRecordCommenced)}</span></div>
            <div class="field-row"><span class="field-label">Referral Required:</span> <span class="field-value">${getStatus(data.bowelReferralRequired)}</span></div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>10. Signatures</h2>
        <div class="grid">
          <div>
            <strong>Staff Name:</strong> ${data.sigantureCompletingAssessment || data.completedBy || "Not specified"}<br/>
            <strong>Date:</strong> ${formatDate(data.assessmentDate || data.createdAt)}
          </div>
          <div style="text-align: right;">
            <strong>Resident/Rep Signature:</strong> ${data.sigantureResident || "No signature on record"}<br/>
            <strong>Next Review Date:</strong> ${formatDate(data.dateNextReview)}
          </div>
        </div>
      </div>

      <div class="footer" style="margin-top: 30px; font-size: 10px; color: #777;">
        Printed on ${formatDateTime(Date.now())}
      </div>
    </body>
    </html>
  `;
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const expectedToken = process.env.PDF_API_TOKEN;

    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const assessmentData = await request.json();

    if (!assessmentData) {
      return NextResponse.json({ error: "Assessment data is required" }, { status: 400 });
    }

    // Flatten data for easier access in template
    const flattenedData = {
      ...assessmentData,
      ...(assessmentData.assessment_data || {}),
      ...(assessmentData.lifestyle_factors || {}),
      ...(assessmentData.bladder_pattern || {}),
      ...(assessmentData.bowel_pattern || {}),
      ...(assessmentData.symptoms || {}),
      ...(assessmentData.symptoms?.infections || {}),
      ...(assessmentData.symptoms?.urinalysis || {}),
      ...(assessmentData.symptoms?.medications || {}),
      ...(assessmentData.symptoms?.specific || {}),
      ...(assessmentData.symptoms?.functional || {}),
      residentName: assessmentData.residentName || assessmentData.assessment_data?.residentName || "Resident",
      dateOfBirth: assessmentData.dateOfBirth || assessmentData.assessment_data?.dateOfBirth,
      bedroomNumber: assessmentData.bedroomNumber || assessmentData.assessment_data?.bedroomNumber,
      createdAt: assessmentData.assessment_date || assessmentData.created_at || Date.now(),
      sigantureCompletingAssessment: assessmentData.sigantureCompletingAssessment || assessmentData.completed_by || assessmentData.completedBy || "Not provided"
    };

    const htmlContent = generateBladderBowelHTML(flattenedData);

    const browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();

    try {
      await page.setContent(htmlContent, { waitUntil: "networkidle", timeout: 30000 });
      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "20px", bottom: "20px", left: "20px", right: "20px" },
        displayHeaderFooter: false,
        preferCSSPageSize: true
      });
      await browser.close();

      return new NextResponse(pdfBuffer as any, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="bladder-bowel-assessment-${assessmentData.residentName?.replace(/\s+/g, "-") || "record"}.pdf"`,
          "Content-Length": pdfBuffer.length.toString()
        }
      });
    } catch (error) {
      await browser.close();
      throw error;
    }
  } catch (error) {
    console.error("Bladder bowel PDF generation error:", error);
    return NextResponse.json({ error: "Failed to generate PDF", details: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
