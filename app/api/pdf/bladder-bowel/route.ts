import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { chromium } from "playwright";

export const runtime = "nodejs";

function formatDate(dateString?: string | number): string {
  if (!dateString) return "Not specified";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Not specified";
  return date.toLocaleDateString("en-GB");
}

function formatLongDate(dateString?: string | number): string {
  if (!dateString) return "Not specified";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Not specified";
  const day = date.getDate();
  const suffix = day % 10 === 1 && day !== 11
    ? "st"
    : day % 10 === 2 && day !== 12
      ? "nd"
      : day % 10 === 3 && day !== 13
        ? "rd"
        : "th";
  return date.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric"
  }).replace(/\s/, ` ${day}${suffix}, `);
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

type AssessmentData = Record<string, unknown>;

function generateBladderBowelHTML(data: AssessmentData): string {
  const toText = (val: unknown, fallback = "Not specified"): string => {
    if (val === undefined || val === null || val === "") return fallback;
    return String(val);
  };

  const getYesNo = (val: unknown): "Yes" | "No" => {
    if (val === true) return "Yes";
    if (val === false) return "No";
    const normalized = String(val ?? "").trim().toLowerCase();
    if (["yes", "y", "true", "1", "checked"].includes(normalized)) return "Yes";
    return "No";
  };

  const getStatus = (val: unknown) => {
    const status = String(val ?? "");
    if (!status) return "Not specified";
    if (val === "1-2-DAY") return "1-2/day";
    if (val === "3-DAY") return "3/d";
    if (val === "ONCE-A-DAY") return "Once a day";
    if (val === "DAY-AND-NIGHT") return "Day and night";
    if (val === "NIGHTTIME") return "Nighttime";
    if (val === "LESS-6M") return "Less than 6 months";
    if (val === "6M-1Y") return "6 months - 1 year";
    if (val === "MORE-1Y") return "More than 1 year";
    return formatEnumValue(status);
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Bladder and Bowel Continence Assessment</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.4; color: #222; max-width: 920px; margin: 0 auto; padding: 20px; font-size: 12px; }
        .header { text-align: center; border-bottom: 2px solid #222; padding-bottom: 10px; margin-bottom: 18px; }
        h1 { font-size: 20px; margin: 0; }
        h2 { font-size: 16px; margin: 18px 0 8px 0; padding: 4px 0; border-bottom: 1px solid #d9d9d9; }
        h3 { font-size: 13px; margin: 14px 0 6px 0; color: #333; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 16px; }
        .section { margin-bottom: 15px; }
        .field-row { display: flex; border-bottom: 1px dotted #e5e5e5; padding: 4px 0; }
        .field-label { font-weight: bold; width: 62%; }
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
      </div>

      <!-- Section 1: General Information -->
      <div class="section">
        <h2>General Information</h2>
        <div class="field-row"><span class="field-label">Resident Name:</span> <span class="field-value">${toText(data.residentName)}</span></div>
        <div class="field-row"><span class="field-label">Bedroom Number:</span> <span class="field-value">${toText(data.bedroomNumber)}</span></div>
        <div class="field-row"><span class="field-label">Information obtained from:</span> <span class="field-value">${toText(data.informationObtainedFrom)}</span></div>
        <div class="field-row"><span class="field-label">Assessment Date:</span> <span class="field-value">${formatLongDate((data.assessmentDate || data.createdAt) as string | number | undefined)}</span></div>
      </div>

      <!-- Section 2: Infections -->
      <div class="section">
        <h2>Infections</h2>
        <div class="grid">
          <div class="field-row"><span class="field-label">Hepatitis A/B:</span> <span class="field-value">${getYesNo(data.hepatitisAB)}</span></div>
          <div class="field-row"><span class="field-label">Blood Borne Virus:</span> <span class="field-value">${getYesNo(data.bloodBorneVirus)}</span></div>
          <div class="field-row"><span class="field-label">MRSA:</span> <span class="field-value">${getYesNo(data.mrsa)}</span></div>
          <div class="field-row"><span class="field-label">ESBL:</span> <span class="field-value">${getYesNo(data.esbl)}</span></div>
        </div>
        <div class="field-row"><span class="field-label">Other Infections:</span> <span class="field-value">${toText(data.otherInfection)}</span></div>
        <div class="alert-box alert-blue">Note: If Resident has an infection, treat the infection, and reassess in two weeks' time.</div>
        <div class="alert-box alert-orange">Note: If the Resident has diarrhoea, treat and reassess in two weeks' time.</div>
      </div>

      <!-- Section 3: Urinalysis Result on Admission -->
      <div class="section">
        <h2>Urinalysis Result on Admission</h2>
        <div class="grid">
          <div class="field-row"><span class="field-label">pH:</span> <span class="field-value">${getStatus(data.ph)}</span></div>
          <div class="field-row"><span class="field-label">Nitrates:</span> <span class="field-value">${getStatus(data.nitrates)}</span></div>
          <div class="field-row"><span class="field-label">Protein:</span> <span class="field-value">${getStatus(data.protein)}</span></div>
          <div class="field-row"><span class="field-label">Leucocytes:</span> <span class="field-value">${getStatus(data.leucocytes)}</span></div>
          <div class="field-row"><span class="field-label">Glucose:</span> <span class="field-value">${getStatus(data.glucose)}</span></div>
          <div class="field-row"><span class="field-label">Blood:</span> <span class="field-value">${getStatus(data.bloodResult)}</span></div>
        </div>
        <div class="field-row"><span class="field-label">Result Details:</span> <span class="field-value">${toText(data.urinalysisResult)}</span></div>
        <div class="field-row"><span class="field-label">MSSU (if indicated) Date:</span> <span class="field-value">${formatLongDate(data.mssuDate as string | number | undefined)}</span></div>
      </div>

      <!-- Section 4: Prescribed Medication -->
      <div class="section">
        <h2>Prescribed Medication</h2>
        <div class="grid">
          <div class="field-row"><span class="field-label">Anti-hypertensives:</span> <span class="field-value">${getYesNo(data.antiHypertensives)}</span></div>
          <div class="field-row"><span class="field-label">Anti-Parkinson drugs:</span> <span class="field-value">${getYesNo(data.antiParkinsonDrugs)}</span></div>
          <div class="field-row"><span class="field-label">Iron supplements:</span> <span class="field-value">${getYesNo(data.ironSupplement)}</span></div>
          <div class="field-row"><span class="field-label">Laxatives:</span> <span class="field-value">${getYesNo(data.laxatives)}</span></div>
          <div class="field-row"><span class="field-label">Diuretic:</span> <span class="field-value">${getYesNo(data.diuretics)}</span></div>
          <div class="field-row"><span class="field-label">Histamine:</span> <span class="field-value">${getYesNo(data.histamine)}</span></div>
          <div class="field-row"><span class="field-label">Antidepressants:</span> <span class="field-value">${getYesNo(data.antiDepressants)}</span></div>
          <div class="field-row"><span class="field-label">Cholinergic:</span> <span class="field-value">${getYesNo(data.cholinergic)}</span></div>
          <div class="field-row"><span class="field-label">Sedative/Hypnotic:</span> <span class="field-value">${getYesNo(data.sedativesHypnotic)}</span></div>
          <div class="field-row"><span class="field-label">Anti-psychotic:</span> <span class="field-value">${getYesNo(data.antiPsychotic)}</span></div>
          <div class="field-row"><span class="field-label">Antihistamines:</span> <span class="field-value">${getYesNo(data.antihistamines)}</span></div>
          <div class="field-row"><span class="field-label">Narcotic analgesic:</span> <span class="field-value">${getYesNo(data.narcoticAnalgesics)}</span></div>
        </div>
      </div>

      <!-- Section 5: Contributing Risk Factors -->
      <div class="section">
        <h2>Contributing Risk Factors</h2>
        <h3>Caffeine use (Coffee, tea, fizzy drinks)</h3>
        <div class="grid">
          <div class="field-row"><span class="field-label">Amount in 24 hours (mls):</span> <span class="field-value">${toText(data.caffeineMls24h, "0")}</span></div>
          <div class="field-row"><span class="field-label">Frequency:</span> <span class="field-value">${toText(data.caffeineFrequency)}</span></div>
          <div class="field-row"><span class="field-label">Time of Day:</span> <span class="field-value">${toText(data.caffeineTimeOfDay)}</span></div>
        </div>
        <h3>Exercise</h3>
        <div class="grid">
          <div class="field-row"><span class="field-label">Type:</span> <span class="field-value">${toText(data.exerciseType)}</span></div>
          <div class="field-row"><span class="field-label">Frequency:</span> <span class="field-value">${toText(data.exerciseFrequency)}</span></div>
          <div class="field-row"><span class="field-label">Time of Day:</span> <span class="field-value">${toText(data.exerciseTimeOfDay)}</span></div>
        </div>
        <div class="grid" style="margin-top:8px;">
          <div class="field-row"><span class="field-label">Smoking:</span> <span class="field-value">${getStatus(data.smoking)}</span></div>
          <div class="field-row"><span class="field-label">Skin Condition:</span> <span class="field-value">${getStatus(data.skinCondition)}</span></div>
        </div>
        <h3>Alcohol</h3>
        <div class="grid">
          <div class="field-row"><span class="field-label">Amount in 24 hours:</span> <span class="field-value">${toText(data.alcoholAmount24h, "0")}</span></div>
          <div class="field-row"><span class="field-label">Frequency:</span> <span class="field-value">${toText(data.alcoholFrequency)}</span></div>
          <div class="field-row"><span class="field-label">Time of Day:</span> <span class="field-value">${toText(data.alcoholTimeOfDay)}</span></div>
        </div>
        <div class="grid" style="margin-top:8px;">
          <div class="field-row"><span class="field-label">Weight:</span> <span class="field-value">${getStatus(data.weight)}</span></div>
          <div class="field-row"><span class="field-label">Mental State:</span> <span class="field-value">${getStatus(data.mentalState)}</span></div>
          <div class="field-row"><span class="field-label">Mobility:</span> <span class="field-value">${getStatus(data.mobilityIssues)}</span></div>
          <div class="field-row"><span class="field-label">History of constipation?:</span> <span class="field-value">${getYesNo(data.constipationHistory)}</span></div>
          <div class="field-row"><span class="field-label">History of recurrent UTIs?:</span> <span class="field-value">${getYesNo(data.historyRecurrentUTIs)}</span></div>
        </div>
      </div>

      <!-- Section 6: Urinary Continence History -->
      <div class="section" style="page-break-before: always;">
        <h2>Urinary Continence History</h2>
        <div class="field-row"><span class="field-label">Frequency of Urinary Incontinence:</span> <span class="field-value">${getStatus(data.incontinenceFrequency)}</span></div>
        <div class="grid">
          <div class="field-row"><span class="field-label">Typical Volume:</span> <span class="field-value">${getStatus(data.incontinenceVolume)}</span></div>
          <div class="field-row"><span class="field-label">Onset of symptoms:</span> <span class="field-value">${getStatus(data.onset)}</span></div>
          <div class="field-row"><span class="field-label">Duration:</span> <span class="field-value">${getStatus(data.duration)}</span></div>
          <div class="field-row"><span class="field-label">Symptoms in the past 6 months:</span> <span class="field-value">${getStatus(data.symptomsPast6Months)}</span></div>
          <div class="field-row"><span class="field-label">Physician consulted regarding incontinence?:</span> <span class="field-value">${getYesNo(data.physicianConsulted)}</span></div>
        </div>
      </div>

      <!-- Urinary Symptoms (Leakage Triggers) -->
      <div class="section">
        <h2>Urinary Symptoms (Leakage Triggers)</h2>
        <div class="grid">
          <div class="field-row"><span class="field-label">Do you leak when you cough or laugh?</span> <span class="field-value">${getYesNo(data.leakCoughLaugh)}</span></div>
          <div class="field-row"><span class="field-label">Do you leak when you get up from a chair?</span> <span class="field-value">${getYesNo(data.leakStandingUp)}</span></div>
          <div class="field-row"><span class="field-label">Do you leak when you go upstairs/downhill?</span> <span class="field-value">${getYesNo(data.leakUpstairsDownhill)}</span></div>
          <div class="field-row"><span class="field-label">Passes urine frequently?</span> <span class="field-value">${getYesNo(data.passesUrineFrequently)}</span></div>
          <div class="field-row"><span class="field-label">Desire to pass urine very strong?</span> <span class="field-value">${getYesNo(data.desirePassUrineStrong)}</span></div>
          <div class="field-row"><span class="field-label">Leaks urine before reaching the toilet?</span> <span class="field-value">${getYesNo(data.leaksBeforeToilet)}</span></div>
          <div class="field-row"><span class="field-label">Gets up more than twice during the night?</span> <span class="field-value">${getYesNo(data.getsUpMoreThanTwiceNight)}</span></div>
          <div class="field-row"><span class="field-label">Anxiety contributes to frequency?</span> <span class="field-value">${getYesNo(data.anxietyContributesFrequency)}</span></div>
          <div class="field-row"><span class="field-label">Difficulty in beginning to pass urine?</span> <span class="field-value">${getYesNo(data.difficultyBeginningUrine)}</span></div>
          <div class="field-row"><span class="field-label">Hesitancy/Straining?</span> <span class="field-value">${getYesNo(data.hesitancyStraining)}</span></div>
          <div class="field-row"><span class="field-label">Dribbles after passing urine?</span> <span class="field-value">${getYesNo(data.dribblesAfterUrine)}</span></div>
          <div class="field-row"><span class="field-label">Still feels bladder is full after passing urine?</span> <span class="field-value">${getYesNo(data.feelsBladderFullAfterUrine)}</span></div>
          <div class="field-row"><span class="field-label">Has recurrent urinary tract infections?</span> <span class="field-value">${getYesNo(data.recurrentUTIs)}</span></div>
          <div class="field-row"><span class="field-label">Limited mobility?</span> <span class="field-value">${getYesNo(data.limitedMobility)}</span></div>
          <div class="field-row"><span class="field-label">Unable to get to the toilet on time?</span> <span class="field-value">${getYesNo(data.unableToiletOnTime)}</span></div>
          <div class="field-row"><span class="field-label">Cannot hold urinal or sit on toilet?</span> <span class="field-value">${getYesNo(data.cannotHoldUrinalOrSit)}</span></div>
          <div class="field-row"><span class="field-label">Cannot reach/use call bell?</span> <span class="field-value">${getYesNo(data.cannotReachCallBell)}</span></div>
          <div class="field-row"><span class="field-label">Poor vision?</span> <span class="field-value">${getYesNo(data.poorVision)}</span></div>
          <div class="field-row"><span class="field-label">Needs to be assisted to transfer?</span> <span class="field-value">${getYesNo(data.needsAssistedTransfer)}</span></div>
          <div class="field-row"><span class="field-label">Pain?</span> <span class="field-value">${getYesNo(data.pain)}</span></div>
        </div>
      </div>

      <!-- Section 7: Bowel Pattern -->
      <div class="section">
        <h2>Bowel Pattern</h2>
        <div class="field-row"><span class="field-label">Bowel Pattern:</span> <span class="field-value">${getStatus(data.bowelPattern)}</span></div>
        <div class="grid">
          <div class="field-row"><span class="field-label">Frequency:</span> <span class="field-value">${toText(data.bowelFrequency)}</span></div>
          <div class="field-row"><span class="field-label">Usual Time of Day:</span> <span class="field-value">${toText(data.bowelUsualTimeOfDay)}</span></div>
        </div>
        <div class="field-row"><span class="field-label">Bristol Stool Type & Amount:</span> <span class="field-value">${toText(data.bowelAmountStoolType)}</span></div>
        <div class="grid">
          <div class="field-row"><span class="field-label">Liquid Feeds?:</span> <span class="field-value">${getYesNo(data.bowelLiquidFeeds)}</span></div>
          <div class="field-row"><span class="field-label">Other Factors (e.g. Diet/Fluid):</span> <span class="field-value">${toText(data.bowelOtherFactors)}</span></div>
          <div class="field-row"><span class="field-label">Other Remedies (e.g. prune juice):</span> <span class="field-value">${toText(data.bowelOtherRemedies)}</span></div>
          <div class="field-row"><span class="field-label">Medical Officer Consulted?:</span> <span class="field-value">${getYesNo(data.medicalOfficerConsulted)}</span></div>
        </div>
        <div class="field-row"><span class="field-label">Medical Officer Name/Date:</span> <span class="field-value">${toText(data.medicalOfficerName)}</span></div>
      </div>

      <!-- Section 8: Toileting Habits & Aids -->
      <div class="section">
        <h2>Toileting Habits & Aids</h2>
        <div class="grid">
          <div class="field-row"><span class="field-label">Day Pattern:</span> <span class="field-value">${getStatus(data.dayPattern)}</span></div>
          <div class="field-row"><span class="field-label">Evening Pattern:</span> <span class="field-value">${getStatus(data.eveningPattern)}</span></div>
          <div class="field-row"><span class="field-label">Night Pattern:</span> <span class="field-value">${getStatus(data.nightPattern)}</span></div>
        </div>
        <div class="field-row"><span class="field-label">Continence Pads/Aids In Use:</span></div>
        <div class="notes-box">${toText(data.typesOfPads)}</div>
      </div>

      <!-- Section 9: Quality of Life -->
      <div class="section">
        <h2>Quality of Life</h2>
        <div class="field-row"><span class="field-label">On a scale of 0 (not at all) to 10 (greatly), how much does your urinary incontinence affect your quality of life?</span></div>
        <div class="notes-box">${toText(data.qualityOfLife)}</div>
      </div>

      <!-- Section 10: Summary & Planning -->
      <div class="section" style="page-break-before: always;">
        <h2>Summary & Planning</h2>
        <div class="grid">
          <div style="border-right: 1px solid #ccc; padding-right: 10px;">
            <h3>Bladder Decisions</h3>
            <div class="field-row"><span class="field-label">Continent?:</span> <span class="field-value">${getYesNo(data.bladderContinent)}</span></div>
            <div class="field-row"><span class="field-label">Incontinent?:</span> <span class="field-value">${getYesNo(data.bladderIncontinent)}</span></div>
            <div class="field-row"><span class="field-label">If Incontinent, Type:</span> <span class="field-value">${getStatus(data.bladderIncontinentType)}</span></div>
            <div class="field-row"><span class="field-label">Care Plan Commenced?:</span> <span class="field-value">${getYesNo(data.bladderCarePlanCommenced)}</span></div>
            <div class="field-row"><span class="field-label">Referral Required?:</span> <span class="field-value">${getStatus(data.bladderReferralRequired)}</span></div>
            <div class="field-row"><span class="field-label">Treatment Plan Followed:</span> <span class="field-value">${getStatus(data.bladderTreatmentPlanFollowed)}</span></div>
          </div>
          <div style="padding-left: 10px;">
            <h3>Bowel Decisions</h3>
            <div class="field-row"><span class="field-label">Continent?:</span> <span class="field-value">${getYesNo(data.bowelContinent)}</span></div>
            <div class="field-row"><span class="field-label">Incontinent?:</span> <span class="field-value">${getYesNo(data.bowelIncontinent)}</span></div>
            <div class="field-row"><span class="field-label">Care Plan Commenced?:</span> <span class="field-value">${getYesNo(data.bowelCarePlanCommenced)}</span></div>
            <div class="field-row"><span class="field-label">Bowel Record Commenced?:</span> <span class="field-value">${getYesNo(data.bowelRecordCommenced)}</span></div>
            <div class="field-row"><span class="field-label">Referral Required?:</span> <span class="field-value">${getStatus(data.bowelReferralRequired)}</span></div>
          </div>
        </div>
      </div>

      <!-- Section 11: Sign-off & Review -->
      <div class="section">
        <h2>Sign-off & Review</h2>
        <div class="grid">
          <div class="field-row"><span class="field-label">Staff Name:</span> <span class="field-value">${toText(data.sigantureCompletingAssessment || data.completedBy)}</span></div>
          <div class="field-row"><span class="field-label">Resident/Representative Signature:</span> <span class="field-value">${toText(data.sigantureResident)}</span></div>
        </div>
        <div class="field-row"><span class="field-label">Date of Next Review:</span> <span class="field-value">${formatLongDate(data.dateNextReview as string | number | undefined)}</span></div>
      </div>

      <div class="footer" style="margin-top: 30px; font-size: 10px; color: #777;">
        Printed on ${formatDateTime(Date.now())}
      </div>
    </body>
    </html>
  `;
}


function createSupabaseClientForPDF(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value; },
        set(name: string, value: string, options: any) {
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.delete(name);
        },
      },
    }
  );
  return { supabase, response };
}
export async function POST(request: NextRequest) {
  try {

    // --- Authentication ---
    const { supabase } = createSupabaseClientForPDF(request);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

      return new NextResponse(pdfBuffer as BodyInit, {
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
