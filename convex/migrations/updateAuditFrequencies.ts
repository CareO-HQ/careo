import { mutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Migration to update audit template frequencies from old values to new standardized values
 * 
 * Old values → New values:
 * - "3months" → "quarterly" (3 months = 1 quarter)
 * - "6months" → "quarterly" (closest match, though 6 months = 2 quarters)
 * - "daily" → "monthly" (closest match)
 * - "weekly" → "monthly" (closest match)
 * - "adhoc" → "yearly" (default to yearly for ad-hoc audits)
 * 
 * This migration updates:
 * - residentAuditTemplates
 * - careFileAuditTemplates
 * - governanceAuditTemplates
 * - clinicalAuditTemplates
 * - environmentAuditTemplates
 * 
 * Usage:
 * 1. Run this mutation from the Convex dashboard: migrations.updateAuditFrequencies.migrateAllAuditFrequencies
 * 2. Or call it programmatically after deploying the schema changes
 */
export const migrateAllAuditFrequencies = mutation({
  args: {},
  returns: v.object({
    success: v.boolean(),
    updated: v.object({
      resident: v.number(),
      careFile: v.number(),
      governance: v.number(),
      clinical: v.number(),
      environment: v.number(),
    }),
    message: v.string(),
  }),
  handler: async (ctx) => {
    console.log("Starting audit frequency migration...");

    // Helper function to map old frequency to new frequency
    const mapFrequency = (oldFreq: string): "monthly" | "quarterly" | "yearly" => {
      switch (oldFreq) {
        case "3months":
          return "quarterly";
        case "6months":
          return "quarterly";
        case "daily":
          return "monthly";
        case "weekly":
          return "monthly";
        case "adhoc":
          return "yearly";
        case "monthly":
        case "quarterly":
        case "yearly":
          return oldFreq as "monthly" | "quarterly" | "yearly";
        default:
          console.warn(`Unknown frequency "${oldFreq}", defaulting to "yearly"`);
          return "yearly";
      }
    };

    let residentUpdated = 0;
    let careFileUpdated = 0;
    let governanceUpdated = 0;
    let clinicalUpdated = 0;
    let environmentUpdated = 0;

    // 1. Update residentAuditTemplates
    const residentTemplates = await ctx.db.query("residentAuditTemplates").collect();
    for (const template of residentTemplates) {
      const oldFreq = template.frequency;
      const newFreq = mapFrequency(oldFreq);
      if (oldFreq !== newFreq) {
        await ctx.db.patch(template._id, { frequency: newFreq });
        residentUpdated++;
        console.log(`Updated resident template ${template._id}: ${oldFreq} → ${newFreq}`);
      }
    }

    // 2. Update careFileAuditTemplates
    const careFileTemplates = await ctx.db.query("careFileAuditTemplates").collect();
    for (const template of careFileTemplates) {
      const oldFreq = template.frequency;
      const newFreq = mapFrequency(oldFreq);
      if (oldFreq !== newFreq) {
        await ctx.db.patch(template._id, { frequency: newFreq });
        careFileUpdated++;
        console.log(`Updated careFile template ${template._id}: ${oldFreq} → ${newFreq}`);
      }
    }

    // 3. Update governanceAuditTemplates
    const governanceTemplates = await ctx.db.query("governanceAuditTemplates").collect();
    for (const template of governanceTemplates) {
      const oldFreq = template.frequency;
      const newFreq = mapFrequency(oldFreq);
      if (oldFreq !== newFreq) {
        await ctx.db.patch(template._id, { frequency: newFreq });
        governanceUpdated++;
        console.log(`Updated governance template ${template._id}: ${oldFreq} → ${newFreq}`);
      }
    }

    // 4. Update clinicalAuditTemplates
    const clinicalTemplates = await ctx.db.query("clinicalAuditTemplates").collect();
    for (const template of clinicalTemplates) {
      const oldFreq = template.frequency;
      const newFreq = mapFrequency(oldFreq);
      if (oldFreq !== newFreq) {
        await ctx.db.patch(template._id, { frequency: newFreq });
        clinicalUpdated++;
        console.log(`Updated clinical template ${template._id}: ${oldFreq} → ${newFreq}`);
      }
    }

    // 5. Update environmentAuditTemplates
    const environmentTemplates = await ctx.db.query("environmentAuditTemplates").collect();
    for (const template of environmentTemplates) {
      const oldFreq = template.frequency;
      const newFreq = mapFrequency(oldFreq);
      if (oldFreq !== newFreq) {
        await ctx.db.patch(template._id, { frequency: newFreq });
        environmentUpdated++;
        console.log(`Updated environment template ${template._id}: ${oldFreq} → ${newFreq}`);
      }
    }

    const totalUpdated = residentUpdated + careFileUpdated + governanceUpdated + clinicalUpdated + environmentUpdated;

    console.log(`Migration completed. Updated ${totalUpdated} templates total.`);
    console.log(`  - Resident: ${residentUpdated}`);
    console.log(`  - Care File: ${careFileUpdated}`);
    console.log(`  - Governance: ${governanceUpdated}`);
    console.log(`  - Clinical: ${clinicalUpdated}`);
    console.log(`  - Environment: ${environmentUpdated}`);

    return {
      success: true,
      updated: {
        resident: residentUpdated,
        careFile: careFileUpdated,
        governance: governanceUpdated,
        clinical: clinicalUpdated,
        environment: environmentUpdated,
      },
      message: `Successfully migrated ${totalUpdated} audit templates to new frequency values.`,
    };
  },
});

