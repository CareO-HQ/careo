import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export const runtime = "nodejs";

// Create a Convex client for server-side usage
const convexClient = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

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

function formatEnumValue(value: string): string {
  return value
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}


function generateBladderBowelHTML(data: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Bladder and Bowel Assessment</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.5;
          color: #111827;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          background: white;
          font-size: 14px;
        }
        .header {
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 24px;
          margin-bottom: 32px;
          text-align: center;
        }
        h1 {
          font-size: 1.875rem;
          font-weight: bold;
          margin-bottom: 8px;
          color: #111827;
        }
        h2 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 16px;
          color: #111827;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 8px;
        }
        h3 {
          font-weight: 500;
          margin-bottom: 12px;
          color: #111827;
          font-size: 1.1rem;
        }
        .grid {
          display: grid;
          gap: 16px;
        }
        .grid-cols-2 {
          grid-template-columns: 1fr 1fr;
        }
        .grid-cols-3 {
          grid-template-columns: 1fr 1fr 1fr;
        }
        .section {
          margin-bottom: 32px;
          page-break-inside: avoid;
        }
        .subsection {
          margin-bottom: 20px;
          background-color: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 16px;
        }
        .info-box {
          background-color: #f3f4f6;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          padding: 8px 12px;
          color: #374151;
          min-height: 20px;
        }
        .checkbox-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 8px;
          margin-bottom: 12px;
        }
        .checkbox-item {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 0;
        }
        .checkbox {
          width: 16px;
          height: 16px;
          border: 2px solid #6b7280;
          border-radius: 3px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: white;
        }
        .checkbox.checked {
          background: #10b981;
          border-color: #10b981;
          color: white;
        }
        .footer {
          margin-top: 48px;
          padding-top: 24px;
          border-top: 1px solid #e5e7eb;
          font-size: 0.75rem;
          color: #6b7280;
        }
        strong {
          font-weight: 600;
        }
        .space-y-2 > * + * {
          margin-top: 8px;
        }
        .space-y-4 > * + * {
          margin-top: 16px;
        }
        .field-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 4px 0;
          border-bottom: 1px dotted #d1d5db;
        }
        .field-label {
          font-weight: 500;
          flex: 1;
        }
        .field-value {
          flex: 1;
          text-align: right;
          color: #374151;
        }
        @media print {
          body { max-width: none; margin: 0; padding: 16px; font-size: 12px; }
          .section { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <!-- Header -->
      <div class="header">
        <h1>Bladder and Bowel Assessment</h1>
        <div class="grid grid-cols-2" style="margin-top: 16px;">
          <div>
            <p><strong>Resident:</strong> ${data.residentName}</p>
            <p><strong>Date of Birth:</strong> ${formatDate(data.dateOfBirth)}</p>
            <p><strong>Room Number:</strong> ${data.bedroomNumber}</p>
          </div>
          <div>
            <p><strong>Completed by:</strong> ${data.sigantureCompletingAssessment}</p>
            <p><strong>Information from:</strong> ${data.informationObtainedFrom}</p>
            <p><strong>Date completed:</strong> ${formatDateTime(data.createdAt)}</p>
          </div>
        </div>
      </div>

      <!-- Section 1: Infections -->
      <div class="section">
        <h2>1. Infections</h2>
        <div class="subsection">
          <div class="checkbox-grid">
            <div class="checkbox-item">
              <div class="checkbox ${data.hepatitisAB ? "checked" : ""}">${data.hepatitisAB ? "✓" : ""}</div>
              <span>Hepatitis A/B</span>
            </div>
            <div class="checkbox-item">
              <div class="checkbox ${data.bloodBorneVirues ? "checked" : ""}">${data.bloodBorneVirues ? "✓" : ""}</div>
              <span>Blood Borne Viruses</span>
            </div>
            <div class="checkbox-item">
              <div class="checkbox ${data.mrsa ? "checked" : ""}">${data.mrsa ? "✓" : ""}</div>
              <span>MRSA</span>
            </div>
            <div class="checkbox-item">
              <div class="checkbox ${data.esbl ? "checked" : ""}">${data.esbl ? "✓" : ""}</div>
              <span>ESBL</span>
            </div>
          </div>
          ${data.other ? `<div><strong>Other:</strong> <div class="info-box">${data.other}</div></div>` : ""}
        </div>
      </div>

      <!-- Section 2: Urinalysis on Admission -->
      <div class="section">
        <h2>2. Urinalysis on Admission</h2>
        <div class="subsection">
          <div class="checkbox-grid">
            <div class="checkbox-item">
              <div class="checkbox ${data.ph ? "checked" : ""}">${data.ph ? "✓" : ""}</div>
              <span>pH Abnormal</span>
            </div>
            <div class="checkbox-item">
              <div class="checkbox ${data.nitrates ? "checked" : ""}">${data.nitrates ? "✓" : ""}</div>
              <span>Nitrates Positive</span>
            </div>
            <div class="checkbox-item">
              <div class="checkbox ${data.protein ? "checked" : ""}">${data.protein ? "✓" : ""}</div>
              <span>Protein Positive</span>
            </div>
            <div class="checkbox-item">
              <div class="checkbox ${data.leucocytes ? "checked" : ""}">${data.leucocytes ? "✓" : ""}</div>
              <span>Leucocytes Positive</span>
            </div>
            <div class="checkbox-item">
              <div class="checkbox ${data.glucose ? "checked" : ""}">${data.glucose ? "✓" : ""}</div>
              <span>Glucose Positive</span>
            </div>
            <div class="checkbox-item">
              <div class="checkbox ${data.bloodResult ? "checked" : ""}">${data.bloodResult ? "✓" : ""}</div>
              <span>Blood Positive</span>
            </div>
          </div>
          ${data.mssuDate ? `<div class="field-row"><span class="field-label">MSSU Date:</span><span class="field-value">${formatDate(data.mssuDate)}</span></div>` : ""}
        </div>
      </div>

      <!-- Section 3: Prescribed Medication -->
      <div class="section">
        <h2>3. Prescribed Medication</h2>
        <div class="subsection">
          <div class="checkbox-grid">
            <div class="checkbox-item">
              <div class="checkbox ${data.antiHypertensives ? "checked" : ""}">${data.antiHypertensives ? "✓" : ""}</div>
              <span>Anti-hypertensives</span>
            </div>
            <div class="checkbox-item">
              <div class="checkbox ${data.antiParkinsonDrugs ? "checked" : ""}">${data.antiParkinsonDrugs ? "✓" : ""}</div>
              <span>Anti-Parkinson Drugs</span>
            </div>
            <div class="checkbox-item">
              <div class="checkbox ${data.ironSupplement ? "checked" : ""}">${data.ironSupplement ? "✓" : ""}</div>
              <span>Iron Supplement</span>
            </div>
            <div class="checkbox-item">
              <div class="checkbox ${data.laxatives ? "checked" : ""}">${data.laxatives ? "✓" : ""}</div>
              <span>Laxatives</span>
            </div>
            <div class="checkbox-item">
              <div class="checkbox ${data.diuretics ? "checked" : ""}">${data.diuretics ? "✓" : ""}</div>
              <span>Diuretics</span>
            </div>
            <div class="checkbox-item">
              <div class="checkbox ${data.histamine ? "checked" : ""}">${data.histamine ? "✓" : ""}</div>
              <span>Histamine</span>
            </div>
            <div class="checkbox-item">
              <div class="checkbox ${data.antiDepressants ? "checked" : ""}">${data.antiDepressants ? "✓" : ""}</div>
              <span>Anti-depressants</span>
            </div>
            <div class="checkbox-item">
              <div class="checkbox ${data.cholinergic ? "checked" : ""}">${data.cholinergic ? "✓" : ""}</div>
              <span>Cholinergic</span>
            </div>
            <div class="checkbox-item">
              <div class="checkbox ${data.sedativesHypnotic ? "checked" : ""}">${data.sedativesHypnotic ? "✓" : ""}</div>
              <span>Sedatives/Hypnotic</span>
            </div>
            <div class="checkbox-item">
              <div class="checkbox ${data.antiPsychotic ? "checked" : ""}">${data.antiPsychotic ? "✓" : ""}</div>
              <span>Anti-psychotic</span>
            </div>
            <div class="checkbox-item">
              <div class="checkbox ${data.antihistamines ? "checked" : ""}">${data.antihistamines ? "✓" : ""}</div>
              <span>Antihistamines</span>
            </div>
            <div class="checkbox-item">
              <div class="checkbox ${data.narcoticAnalgesics ? "checked" : ""}">${data.narcoticAnalgesics ? "✓" : ""}</div>
              <span>Narcotic Analgesics</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Section 4: Lifestyle -->
      <div class="section">
        <h2>4. Lifestyle</h2>
        <div class="subsection">
          <div class="space-y-2">
            <div class="field-row">
              <span class="field-label">Smoking Status:</span>
              <span class="field-value">${data.smoking ? formatEnumValue(data.smoking) : "Not specified"}</span>
            </div>
            <div class="field-row">
              <span class="field-label">Weight Status:</span>
              <span class="field-value">${data.weight ? formatEnumValue(data.weight) : "Not specified"}</span>
            </div>
            <div class="field-row">
              <span class="field-label">Skin Condition:</span>
              <span class="field-value">${data.skinCondition ? formatEnumValue(data.skinCondition) : "Not specified"}</span>
            </div>
            <div class="field-row">
              <span class="field-label">Mental State:</span>
              <span class="field-value">${data.mentalState ? formatEnumValue(data.mentalState) : "Not specified"}</span>
            </div>
            <div class="field-row">
              <span class="field-label">Mobility Issues:</span>
              <span class="field-value">${data.mobilityIssues ? formatEnumValue(data.mobilityIssues) : "Not specified"}</span>
            </div>
          </div>
          
          ${
            data.caffeineMls24h ||
            data.caffeineFrequency ||
            data.caffeineTimeOfDay
              ? `
            <h3 style="margin-top: 16px;">Caffeine Consumption</h3>
            <div class="space-y-2">
              ${data.caffeineMls24h ? `<div class="field-row"><span class="field-label">Amount (24h):</span><span class="field-value">${data.caffeineMls24h} mls</span></div>` : ""}
              ${data.caffeineFrequency ? `<div class="field-row"><span class="field-label">Frequency:</span><span class="field-value">${data.caffeineFrequency}</span></div>` : ""}
              ${data.caffeineTimeOfDay ? `<div class="field-row"><span class="field-label">Time of Day:</span><span class="field-value">${data.caffeineTimeOfDay}</span></div>` : ""}
            </div>
          `
              : ""
          }

          ${
            data.excersiceType ||
            data.excersiceFrequency ||
            data.excersiceTimeOfDay
              ? `
            <h3 style="margin-top: 16px;">Exercise</h3>
            <div class="space-y-2">
              ${data.excersiceType ? `<div class="field-row"><span class="field-label">Type:</span><span class="field-value">${data.excersiceType}</span></div>` : ""}
              ${data.excersiceFrequency ? `<div class="field-row"><span class="field-label">Frequency:</span><span class="field-value">${data.excersiceFrequency}</span></div>` : ""}
              ${data.excersiceTimeOfDay ? `<div class="field-row"><span class="field-label">Time of Day:</span><span class="field-value">${data.excersiceTimeOfDay}</span></div>` : ""}
            </div>
          `
              : ""
          }

          ${
            data.alcoholAmount24h ||
            data.alcoholFrequency ||
            data.alcoholTimeOfDay
              ? `
            <h3 style="margin-top: 16px;">Alcohol Consumption</h3>
            <div class="space-y-2">
              ${data.alcoholAmount24h ? `<div class="field-row"><span class="field-label">Amount (24h):</span><span class="field-value">${data.alcoholAmount24h} units</span></div>` : ""}
              ${data.alcoholFrequency ? `<div class="field-row"><span class="field-label">Frequency:</span><span class="field-value">${data.alcoholFrequency}</span></div>` : ""}
              ${data.alcoholTimeOfDay ? `<div class="field-row"><span class="field-label">Time of Day:</span><span class="field-value">${data.alcoholTimeOfDay}</span></div>` : ""}
            </div>
          `
              : ""
          }

          <div class="checkbox-grid" style="margin-top: 16px;">
            <div class="checkbox-item">
              <div class="checkbox ${data.constipationHistory ? "checked" : ""}">${data.constipationHistory ? "✓" : ""}</div>
              <span>History of Constipation</span>
            </div>
            <div class="checkbox-item">
              <div class="checkbox ${data.historyRecurrentUTIs ? "checked" : ""}">${data.historyRecurrentUTIs ? "✓" : ""}</div>
              <span>History of Recurrent UTIs</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Section 5: Urinary Continence -->
      <div class="section">
        <h2>5. Urinary Continence</h2>
        <div class="subsection">
          <div class="space-y-2">
            <div class="field-row">
              <span class="field-label">Incontinence Frequency:</span>
              <span class="field-value">${data.incontinence ? formatEnumValue(data.incontinence) : "Not specified"}</span>
            </div>
            <div class="field-row">
              <span class="field-label">Volume:</span>
              <span class="field-value">${data.volume ? formatEnumValue(data.volume) : "Not specified"}</span>
            </div>
            <div class="field-row">
              <span class="field-label">Onset:</span>
              <span class="field-value">${data.onset ? formatEnumValue(data.onset) : "Not specified"}</span>
            </div>
            <div class="field-row">
              <span class="field-label">Duration:</span>
              <span class="field-value">${data.duration ? formatEnumValue(data.duration) : "Not specified"}</span>
            </div>
            <div class="field-row">
              <span class="field-label">Symptoms Last 6 Months:</span>
              <span class="field-value">${data.symptompsLastSix ? formatEnumValue(data.symptompsLastSix) : "Not specified"}</span>
            </div>
          </div>
          <div class="checkbox-item" style="margin-top: 12px;">
            <div class="checkbox ${data.physicianConsulted ? "checked" : ""}">${data.physicianConsulted ? "✓" : ""}</div>
            <span>Physician Consulted</span>
          </div>
        </div>
      </div>

      <!-- Section 6: Bowel Pattern -->
      <div class="section">
        <h2>6. Bowel Pattern</h2>
        <div class="subsection">
          <div class="space-y-2">
            <div class="field-row">
              <span class="field-label">Bowel State:</span>
              <span class="field-value">${data.bowelState ? formatEnumValue(data.bowelState) : "Not specified"}</span>
            </div>
            <div class="field-row">
              <span class="field-label">Frequency:</span>
              <span class="field-value">${data.bowelFrequency || "Not specified"}</span>
            </div>
            <div class="field-row">
              <span class="field-label">Usual Time of Day:</span>
              <span class="field-value">${data.usualTimeOfDat || "Not specified"}</span>
            </div>
            <div class="field-row">
              <span class="field-label">Amount and Stool Type:</span>
              <span class="field-value">${data.amountAndStoolType || "Not specified"}</span>
            </div>
            <div class="field-row">
              <span class="field-label">Liquid Feeds:</span>
              <span class="field-value">${data.liquidFeeds || "Not specified"}</span>
            </div>
            <div class="field-row">
              <span class="field-label">Other Factors:</span>
              <span class="field-value">${data.otherFactors || "Not specified"}</span>
            </div>
            <div class="field-row">
              <span class="field-label">Other Remedies:</span>
              <span class="field-value">${data.otherRemedies || "Not specified"}</span>
            </div>
          </div>
          <div class="checkbox-item" style="margin-top: 12px;">
            <div class="checkbox ${data.medicalOfficerConsulted ? "checked" : ""}">${data.medicalOfficerConsulted ? "✓" : ""}</div>
            <span>Medical Officer Consulted</span>
          </div>
        </div>
      </div>

      <!-- Section 7: Current Toileting Pattern -->
      <div class="section">
        <h2>7. Current Toileting Pattern and Products</h2>
        <div class="subsection">
          <div class="grid grid-cols-3">
            <div>
              <h3>Day Pattern</h3>
              <div class="info-box">${data.dayPattern ? formatEnumValue(data.dayPattern) : "Not specified"}</div>
            </div>
            <div>
              <h3>Evening Pattern</h3>
              <div class="info-box">${data.eveningPattern ? formatEnumValue(data.eveningPattern) : "Not specified"}</div>
            </div>
            <div>
              <h3>Night Pattern</h3>
              <div class="info-box">${data.nightPattern ? formatEnumValue(data.nightPattern) : "Not specified"}</div>
            </div>
          </div>
          <div style="margin-top: 16px;">
            <h3>Types of Pads</h3>
            <div class="info-box">${data.typesOfPads || "Not specified"}</div>
          </div>
        </div>
      </div>

      <!-- Section 8: Symptoms -->
      <div class="section">
        <h2>8. Symptoms</h2>
        
        <div class="subsection">
          <h3>A. Stress Incontinence Symptoms</h3>
          <div class="checkbox-grid">
            <div class="checkbox-item">
              <div class="checkbox ${data.leakCoughLaugh ? "checked" : ""}">${data.leakCoughLaugh ? "✓" : ""}</div>
              <span>Leak when cough/laugh</span>
            </div>
            <div class="checkbox-item">
              <div class="checkbox ${data.leakStandingUp ? "checked" : ""}">${data.leakStandingUp ? "✓" : ""}</div>
              <span>Leak when standing up</span>
            </div>
            <div class="checkbox-item">
              <div class="checkbox ${data.leakUpstairsDownhill ? "checked" : ""}">${data.leakUpstairsDownhill ? "✓" : ""}</div>
              <span>Leak upstairs/downhill</span>
            </div>
            <div class="checkbox-item">
              <div class="checkbox ${data.passesUrineFrequently ? "checked" : ""}">${data.passesUrineFrequently ? "✓" : ""}</div>
              <span>Passes urine frequently</span>
            </div>
            <div class="checkbox-item">
              <div class="checkbox ${data.desirePassUrine ? "checked" : ""}">${data.desirePassUrine ? "✓" : ""}</div>
              <span>Strong desire to pass urine</span>
            </div>
            <div class="checkbox-item">
              <div class="checkbox ${data.leaksBeforeToilet ? "checked" : ""}">${data.leaksBeforeToilet ? "✓" : ""}</div>
              <span>Leaks before reaching toilet</span>
            </div>
            <div class="checkbox-item">
              <div class="checkbox ${data.moreThanTwiceAtNight ? "checked" : ""}">${data.moreThanTwiceAtNight ? "✓" : ""}</div>
              <span>More than twice at night</span>
            </div>
            <div class="checkbox-item">
              <div class="checkbox ${data.anxiety ? "checked" : ""}">${data.anxiety ? "✓" : ""}</div>
              <span>Anxiety about incontinence</span>
            </div>
          </div>
        </div>

        <div class="subsection">
          <h3>B. Retention/Overflow Symptoms</h3>
          <div class="checkbox-grid">
            <div class="checkbox-item">
              <div class="checkbox ${data.difficultyStarting ? "checked" : ""}">${data.difficultyStarting ? "✓" : ""}</div>
              <span>Difficulty starting stream</span>
            </div>
            <div class="checkbox-item">
              <div class="checkbox ${data.hesintancy ? "checked" : ""}">${data.hesintancy ? "✓" : ""}</div>
              <span>Hesitancy</span>
            </div>
            <div class="checkbox-item">
              <div class="checkbox ${data.dribbles ? "checked" : ""}">${data.dribbles ? "✓" : ""}</div>
              <span>Dribbles after passing urine</span>
            </div>
            <div class="checkbox-item">
              <div class="checkbox ${data.feelsFull ? "checked" : ""}">${data.feelsFull ? "✓" : ""}</div>
              <span>Feels bladder not completely empty</span>
            </div>
            <div class="checkbox-item">
              <div class="checkbox ${data.recurrentTractInfections ? "checked" : ""}">${data.recurrentTractInfections ? "✓" : ""}</div>
              <span>Recurrent urinary tract infections</span>
            </div>
          </div>
        </div>

        <div class="subsection">
          <h3>C. Functional Incontinence Symptoms</h3>
          <div class="checkbox-grid">
            <div class="checkbox-item">
              <div class="checkbox ${data.limitedMobility ? "checked" : ""}">${data.limitedMobility ? "✓" : ""}</div>
              <span>Limited mobility</span>
            </div>
            <div class="checkbox-item">
              <div class="checkbox ${data.unableOnTime ? "checked" : ""}">${data.unableOnTime ? "✓" : ""}</div>
              <span>Unable to get to toilet on time</span>
            </div>
            <div class="checkbox-item">
              <div class="checkbox ${data.notHoldUrinalOrSeat ? "checked" : ""}">${data.notHoldUrinalOrSeat ? "✓" : ""}</div>
              <span>Cannot hold urinal or sit on seat</span>
            </div>
            <div class="checkbox-item">
              <div class="checkbox ${data.notuseCallBell ? "checked" : ""}">${data.notuseCallBell ? "✓" : ""}</div>
              <span>Cannot use call bell</span>
            </div>
            <div class="checkbox-item">
              <div class="checkbox ${data.poorVision ? "checked" : ""}">${data.poorVision ? "✓" : ""}</div>
              <span>Poor vision</span>
            </div>
            <div class="checkbox-item">
              <div class="checkbox ${data.assistedTransfer ? "checked" : ""}">${data.assistedTransfer ? "✓" : ""}</div>
              <span>Requires assisted transfer</span>
            </div>
            <div class="checkbox-item">
              <div class="checkbox ${data.pain ? "checked" : ""}">${data.pain ? "✓" : ""}</div>
              <span>Pain affecting mobility</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Section 9: Assessment Summary -->
      <div class="section">
        <h2>9. Assessment Summary</h2>
        
        <div class="subsection">
          <h3>Bladder Assessment</h3>
          <div class="space-y-2">
            <div class="field-row">
              <span class="field-label">Incontinence Type:</span>
              <span class="field-value">${data.bladderIncontinentType ? formatEnumValue(data.bladderIncontinentType) : "Not specified"}</span>
            </div>
            <div class="field-row">
              <span class="field-label">Referral Required:</span>
              <span class="field-value">${data.bladderReferralRequired ? formatEnumValue(data.bladderReferralRequired) : "Not specified"}</span>
            </div>
            <div class="field-row">
              <span class="field-label">Plan Type:</span>
              <span class="field-value">${data.bladderPlanFollowed ? formatEnumValue(data.bladderPlanFollowed) : "Not specified"}</span>
            </div>
          </div>
          <div class="checkbox-grid" style="margin-top: 12px;">
            <div class="checkbox-item">
              <div class="checkbox ${data.bladderContinent ? "checked" : ""}">${data.bladderContinent ? "✓" : ""}</div>
              <span>Bladder Continent</span>
            </div>
            <div class="checkbox-item">
              <div class="checkbox ${data.bladderIncontinent ? "checked" : ""}">${data.bladderIncontinent ? "✓" : ""}</div>
              <span>Bladder Incontinent</span>
            </div>
            <div class="checkbox-item">
              <div class="checkbox ${data.bladderPlanCommenced ? "checked" : ""}">${data.bladderPlanCommenced ? "✓" : ""}</div>
              <span>Bladder Plan Commenced</span>
            </div>
          </div>
        </div>

        <div class="subsection">
          <h3>Bowel Assessment</h3>
          <div class="field-row">
            <span class="field-label">Referral Required:</span>
            <span class="field-value">${data.bowelReferralRequired ? formatEnumValue(data.bowelReferralRequired) : "Not specified"}</span>
          </div>
          <div class="checkbox-grid" style="margin-top: 12px;">
            <div class="checkbox-item">
              <div class="checkbox ${data.bowelContinent ? "checked" : ""}">${data.bowelContinent ? "✓" : ""}</div>
              <span>Bowel Continent</span>
            </div>
            <div class="checkbox-item">
              <div class="checkbox ${data.bowelIncontinent ? "checked" : ""}">${data.bowelIncontinent ? "✓" : ""}</div>
              <span>Bowel Incontinent</span>
            </div>
            <div class="checkbox-item">
              <div class="checkbox ${data.bowelPlanCommenced ? "checked" : ""}">${data.bowelPlanCommenced ? "✓" : ""}</div>
              <span>Bowel Plan Commenced</span>
            </div>
            <div class="checkbox-item">
              <div class="checkbox ${data.bowelRecordCommenced ? "checked" : ""}">${data.bowelRecordCommenced ? "✓" : ""}</div>
              <span>Bowel Record Commenced</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Section 10: Signatures and Review -->
      <div class="section">
        <h2>10. Signatures and Review</h2>
        <div class="subsection">
          <div class="space-y-2">
            <div class="field-row">
              <span class="field-label">Signature - Completing Assessment:</span>
              <span class="field-value">${data.sigantureCompletingAssessment || "Not provided"}</span>
            </div>
            <div class="field-row">
              <span class="field-label">Signature - Resident/Representative:</span>
              <span class="field-value">${data.sigantureResident || "Not provided"}</span>
            </div>
            <div class="field-row">
              <span class="field-label">Date of Next Review:</span>
              <span class="field-value">${data.dateNextReview ? formatDate(data.dateNextReview) : "Not specified"}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="footer">
        <p>Document generated on ${formatDateTime(Date.now())}</p>
        <p>Bladder and Bowel Assessment - ${data.residentName}</p>
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

    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { assessmentId } = await request.json();

    if (!assessmentId) {
      return NextResponse.json(
        { error: "Assessment ID is required" },
        { status: 400 }
      );
    }

    // Add some debugging
    console.log(
      "Bladder bowel PDF API called with assessmentId:",
      assessmentId
    );

    // Fetch the assessment data directly from Convex
    const assessmentData = await convexClient.query(
      api.careFiles.bladderBowel.getBladderBowelAssessment,
      {
        id: assessmentId as Id<"bladderBowelAssessments">
      }
    );

    if (!assessmentData) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 }
      );
    }

    // Generate HTML content
    const htmlContent = generateBladderBowelHTML(assessmentData);

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
      return new NextResponse(pdfBuffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="bladder-bowel-assessment-${assessmentId}.pdf"`,
          "Content-Length": pdfBuffer.length.toString()
        }
      });
    } catch (error) {
      await browser.close();
      throw error;
    }
  } catch (error) {
    console.error("Bladder bowel PDF generation error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate PDF",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
