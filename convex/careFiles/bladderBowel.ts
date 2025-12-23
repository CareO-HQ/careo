import {
  mutation,
  query,
  internalAction,
  internalMutation
} from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";

/**
 * Submit a bladder bowel assessment form
 */
export const submitBladderBowelAssessment = mutation({
  args: {
    residentId: v.id("residents"),
    teamId: v.string(),
    organizationId: v.string(),
    userId: v.string(),
    savedAsDraft: v.optional(v.boolean()),

    // Section 1 - Resident info
    residentName: v.string(),
    dateOfBirth: v.number(),
    bedroomNumber: v.string(),
    informationObtainedFrom: v.string(),

    // Section 2 - Infections
    hepatitisAB: v.optional(v.boolean()),
    bloodBorneVirues: v.optional(v.boolean()),
    mrsa: v.optional(v.boolean()),
    esbl: v.optional(v.boolean()),
    other: v.optional(v.string()),

    // Section 3 - Urinalysis on Admission
    ph: v.optional(v.boolean()),
    nitrates: v.optional(v.boolean()),
    protein: v.optional(v.boolean()),
    leucocytes: v.optional(v.boolean()),
    glucose: v.optional(v.boolean()),
    bloodResult: v.optional(v.boolean()),
    mssuDate: v.optional(v.number()),

    // Section 4 - Prescribed medication
    antiHypertensives: v.optional(v.boolean()),
    antiParkinsonDrugs: v.optional(v.boolean()),
    ironSupplement: v.optional(v.boolean()),
    laxatives: v.optional(v.boolean()),
    diuretics: v.optional(v.boolean()),
    histamine: v.optional(v.boolean()),
    antiDepressants: v.optional(v.boolean()),
    cholinergic: v.optional(v.boolean()),
    sedativesHypnotic: v.optional(v.boolean()),
    antiPsychotic: v.optional(v.boolean()),
    antihistamines: v.optional(v.boolean()),
    narcoticAnalgesics: v.optional(v.boolean()),

    // Section 5 - Lifestyle
    caffeineMls24h: v.optional(v.number()),
    caffeineFrequency: v.optional(v.string()),
    caffeineTimeOfDay: v.optional(v.string()),
    excersiceType: v.optional(v.string()),
    excersiceFrequency: v.optional(v.string()),
    excersiceTimeOfDay: v.optional(v.string()),
    alcoholAmount24h: v.optional(v.number()),
    alcoholFrequency: v.optional(v.string()),
    alcoholTimeOfDay: v.optional(v.string()),
    smoking: v.union(
      v.literal("SMOKER"),
      v.literal("NON-SMOKER"),
      v.literal("EX-SMOKER")
    ),
    weight: v.union(
      v.literal("NORMAL"),
      v.literal("OBESE"),
      v.literal("UNDERWEIGHT")
    ),
    skinCondition: v.union(
      v.literal("HEALTHY"),
      v.literal("RED"),
      v.literal("EXCORIATED"),
      v.literal("BROKEN")
    ),
    constipationHistory: v.optional(v.boolean()),
    mentalState: v.union(
      v.literal("ALERT"),
      v.literal("CONFUSED"),
      v.literal("LEARNING-DISABLED"),
      v.literal("COGNITIVELY-IMPAIRED")
    ),
    mobilityIssues: v.union(
      v.literal("INDEPENDENT"),
      v.literal("ASSISTANCE"),
      v.literal("HOISTED")
    ),
    historyRecurrentUTIs: v.optional(v.boolean()),

    // Section 6 - Urinary continence
    incontinence: v.union(
      v.literal("NONE"),
      v.literal("ONE"),
      v.literal("1-2DAY"),
      v.literal("3DAY"),
      v.literal("NIGHT"),
      v.literal("DAYANDNIGHT")
    ),
    volume: v.union(
      v.literal("ENTIRE-BLADDER"),
      v.literal("SMALL-VOL"),
      v.literal("UNABLE-DETERMINE")
    ),
    onset: v.union(v.literal("SUDDEN"), v.literal("GRADUAL")),
    duration: v.union(
      v.literal("LESS-6M"),
      v.literal("6M-1Y"),
      v.literal("MORE-1Y")
    ),
    symptompsLastSix: v.union(
      v.literal("STABLE"),
      v.literal("WORSENING"),
      v.literal("IMPROVING"),
      v.literal("FLUCTUATING")
    ),
    physicianConsulted: v.optional(v.boolean()),

    // Section 7 - Bowel pattern
    bowelState: v.union(
      v.literal("NORMAL"),
      v.literal("CONSTIPATION"),
      v.literal("DIARRHOEA"),
      v.literal("STOMA"),
      v.literal("FAECAL-INCONTINENCE"),
      v.literal("IRRITABLE-BOWEL")
    ),
    bowelFrequency: v.string(),
    usualTimeOfDat: v.string(),
    amountAndStoolType: v.string(),
    liquidFeeds: v.string(),
    otherFactors: v.string(),
    otherRemedies: v.string(),
    medicalOfficerConsulted: v.optional(v.boolean()),

    // Section 8 - Current toileting pattern and products in use
    dayPattern: v.union(
      v.literal("TOILET"),
      v.literal("COMMODE"),
      v.literal("BED-PAN"),
      v.literal("URINAL")
    ),
    eveningPattern: v.union(
      v.literal("TOILET"),
      v.literal("COMMODE"),
      v.literal("BED-PAN"),
      v.literal("URINAL")
    ),
    nightPattern: v.union(
      v.literal("TOILET"),
      v.literal("COMMODE"),
      v.literal("BED-PAN"),
      v.literal("URINAL")
    ),
    typesOfPads: v.string(),

    // Section 9 - Symptoms
    // 9.A
    leakCoughLaugh: v.optional(v.boolean()),
    leakStandingUp: v.optional(v.boolean()),
    leakUpstairsDownhill: v.optional(v.boolean()),
    passesUrineFrequently: v.optional(v.boolean()),
    desirePassUrine: v.optional(v.boolean()),
    leaksBeforeToilet: v.optional(v.boolean()),
    moreThanTwiceAtNight: v.optional(v.boolean()),
    anxiety: v.optional(v.boolean()),
    // 9.B
    difficultyStarting: v.optional(v.boolean()),
    hesintancy: v.optional(v.boolean()),
    dribbles: v.optional(v.boolean()),
    feelsFull: v.optional(v.boolean()),
    recurrentTractInfections: v.optional(v.boolean()),
    // 9.C
    limitedMobility: v.optional(v.boolean()),
    unableOnTime: v.optional(v.boolean()),
    notHoldUrinalOrSeat: v.optional(v.boolean()),
    notuseCallBell: v.optional(v.boolean()),
    poorVision: v.optional(v.boolean()),
    assistedTransfer: v.optional(v.boolean()),
    pain: v.optional(v.boolean()),

    // Section 10
    // Bladder
    bladderContinent: v.optional(v.boolean()),
    bladderIncontinent: v.optional(v.boolean()),
    bladderIncontinentType: v.union(
      v.literal("STRESS"),
      v.literal("URGE"),
      v.literal("MIXED"),
      v.literal("FUNCTIONAL")
    ),
    bladderPlanCommenced: v.optional(v.boolean()),
    bladderReferralRequired: v.union(
      v.literal("DIETICIAN"),
      v.literal("GP"),
      v.literal("OT"),
      v.literal("PHYSIOTHERAPIST"),
      v.literal("CONTINENCE-NURSE"),
      v.literal("NONE")
    ),
    bladderPlanFollowed: v.union(
      v.literal("STRESS"),
      v.literal("URGE"),
      v.literal("MIXED"),
      v.literal("RETENTION-OVERFLOW")
    ),
    // Bowel
    bowelContinent: v.optional(v.boolean()),
    bowelIncontinent: v.optional(v.boolean()),
    bowelPlanCommenced: v.optional(v.boolean()),
    bowelRecordCommenced: v.optional(v.boolean()),
    bowelReferralRequired: v.union(
      v.literal("DIETICIAN"),
      v.literal("GP"),
      v.literal("OT"),
      v.literal("PHYSIOTHERAPIST"),
      v.literal("NONE")
    ),

    // Section 11
    sigantureCompletingAssessment: v.string(),
    sigantureResident: v.optional(v.string()),
    dateNextReview: v.number()
  },
  returns: v.id("bladderBowelAssessments"),
  handler: async (ctx, args) => {
    // Verify the resident exists
    const resident = await ctx.db.get(args.residentId);
    if (!resident) {
      throw new Error("Resident not found");
    }

    // Get the current user ID from auth
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("User not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("byEmail", (q) => q.eq("email", identity.email!))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Create the bladder bowel assessment
    const assessmentId = await ctx.db.insert("bladderBowelAssessments", {
      ...args,
      createdAt: Date.now(),
      createdBy: user._id,
      savedAsDraft: args.savedAsDraft ?? false
    });

    // Schedule PDF generation after successful save if not a draft
    if (!args.savedAsDraft) {
      await ctx.scheduler.runAfter(
        0,
        internal.careFiles.bladderBowel.generatePDFAndUpdateRecord,
        {
          assessmentId: assessmentId
        }
      );
    }

    return assessmentId;
  }
});

/**
 * Get a bladder bowel assessment by ID
 */
export const getBladderBowelAssessment = query({
  args: {
    id: v.id("bladderBowelAssessments")
  },
  returns: v.union(
    v.object({
      _id: v.id("bladderBowelAssessments"),
      _creationTime: v.number(),
      residentId: v.id("residents"),
      teamId: v.string(),
      organizationId: v.string(),
      userId: v.string(),
      savedAsDraft: v.optional(v.boolean()),

      // Section 1 - Resident info
      residentName: v.string(),
      dateOfBirth: v.number(),
      bedroomNumber: v.string(),
      informationObtainedFrom: v.string(),

      // Section 2 - Infections
      hepatitisAB: v.optional(v.boolean()),
      bloodBorneVirues: v.optional(v.boolean()),
      mrsa: v.optional(v.boolean()),
      esbl: v.optional(v.boolean()),
      other: v.optional(v.string()),

      // Section 3 - Urinalysis on Admission
      ph: v.optional(v.boolean()),
      nitrates: v.optional(v.boolean()),
      protein: v.optional(v.boolean()),
      leucocytes: v.optional(v.boolean()),
      glucose: v.optional(v.boolean()),
      bloodResult: v.optional(v.boolean()),
      mssuDate: v.optional(v.number()),

      // Section 4 - Prescribed medication
      antiHypertensives: v.optional(v.boolean()),
      antiParkinsonDrugs: v.optional(v.boolean()),
      ironSupplement: v.optional(v.boolean()),
      laxatives: v.optional(v.boolean()),
      diuretics: v.optional(v.boolean()),
      histamine: v.optional(v.boolean()),
      antiDepressants: v.optional(v.boolean()),
      cholinergic: v.optional(v.boolean()),
      sedativesHypnotic: v.optional(v.boolean()),
      antiPsychotic: v.optional(v.boolean()),
      antihistamines: v.optional(v.boolean()),
      narcoticAnalgesics: v.optional(v.boolean()),

      // Section 5 - Lifestyle
      caffeineMls24h: v.optional(v.number()),
      caffeineFrequency: v.optional(v.string()),
      caffeineTimeOfDay: v.optional(v.string()),
      excersiceType: v.optional(v.string()),
      excersiceFrequency: v.optional(v.string()),
      excersiceTimeOfDay: v.optional(v.string()),
      alcoholAmount24h: v.optional(v.number()),
      alcoholFrequency: v.optional(v.string()),
      alcoholTimeOfDay: v.optional(v.string()),
      smoking: v.union(
        v.literal("SMOKER"),
        v.literal("NON-SMOKER"),
        v.literal("EX-SMOKER")
      ),
      weight: v.union(
        v.literal("NORMAL"),
        v.literal("OBESE"),
        v.literal("UNDERWEIGHT")
      ),
      skinCondition: v.union(
        v.literal("HEALTHY"),
        v.literal("RED"),
        v.literal("EXCORIATED"),
        v.literal("BROKEN")
      ),
      constipationHistory: v.optional(v.boolean()),
      mentalState: v.union(
        v.literal("ALERT"),
        v.literal("CONFUSED"),
        v.literal("LEARNING-DISABLED"),
        v.literal("COGNITIVELY-IMPAIRED")
      ),
      mobilityIssues: v.union(
        v.literal("INDEPENDENT"),
        v.literal("ASSISTANCE"),
        v.literal("HOISTED")
      ),
      historyRecurrentUTIs: v.optional(v.boolean()),

      // Section 6 - Urinary continence
      incontinence: v.union(
        v.literal("NONE"),
        v.literal("ONE"),
        v.literal("1-2DAY"),
        v.literal("3DAY"),
        v.literal("NIGHT"),
        v.literal("DAYANDNIGHT")
      ),
      volume: v.union(
        v.literal("ENTIRE-BLADDER"),
        v.literal("SMALL-VOL"),
        v.literal("UNABLE-DETERMINE")
      ),
      onset: v.union(v.literal("SUDDEN"), v.literal("GRADUAL")),
      duration: v.union(
        v.literal("LESS-6M"),
        v.literal("6M-1Y"),
        v.literal("MORE-1Y")
      ),
      symptompsLastSix: v.union(
        v.literal("STABLE"),
        v.literal("WORSENING"),
        v.literal("IMPROVING"),
        v.literal("FLUCTUATING")
      ),
      physicianConsulted: v.optional(v.boolean()),

      // Section 7 - Bowel pattern
      bowelState: v.union(
        v.literal("NORMAL"),
        v.literal("CONSTIPATION"),
        v.literal("DIARRHOEA"),
        v.literal("STOMA"),
        v.literal("FAECAL-INCONTINENCE"),
        v.literal("IRRITABLE-BOWEL")
      ),
      bowelFrequency: v.string(),
      usualTimeOfDat: v.string(),
      amountAndStoolType: v.string(),
      liquidFeeds: v.string(),
      otherFactors: v.string(),
      otherRemedies: v.string(),
      medicalOfficerConsulted: v.optional(v.boolean()),

      // Section 8 - Current toileting pattern and products in use
      dayPattern: v.union(
        v.literal("TOILET"),
        v.literal("COMMODE"),
        v.literal("BED-PAN"),
        v.literal("URINAL")
      ),
      eveningPattern: v.union(
        v.literal("TOILET"),
        v.literal("COMMODE"),
        v.literal("BED-PAN"),
        v.literal("URINAL")
      ),
      nightPattern: v.union(
        v.literal("TOILET"),
        v.literal("COMMODE"),
        v.literal("BED-PAN"),
        v.literal("URINAL")
      ),
      typesOfPads: v.string(),

      // Section 9 - Symptoms
      // 9.A
      leakCoughLaugh: v.optional(v.boolean()),
      leakStandingUp: v.optional(v.boolean()),
      leakUpstairsDownhill: v.optional(v.boolean()),
      passesUrineFrequently: v.optional(v.boolean()),
      desirePassUrine: v.optional(v.boolean()),
      leaksBeforeToilet: v.optional(v.boolean()),
      moreThanTwiceAtNight: v.optional(v.boolean()),
      anxiety: v.optional(v.boolean()),
      // 9.B
      difficultyStarting: v.optional(v.boolean()),
      hesintancy: v.optional(v.boolean()),
      dribbles: v.optional(v.boolean()),
      feelsFull: v.optional(v.boolean()),
      recurrentTractInfections: v.optional(v.boolean()),
      // 9.C
      limitedMobility: v.optional(v.boolean()),
      unableOnTime: v.optional(v.boolean()),
      notHoldUrinalOrSeat: v.optional(v.boolean()),
      notuseCallBell: v.optional(v.boolean()),
      poorVision: v.optional(v.boolean()),
      assistedTransfer: v.optional(v.boolean()),
      pain: v.optional(v.boolean()),

      // Section 10
      // Bladder
      bladderContinent: v.optional(v.boolean()),
      bladderIncontinent: v.optional(v.boolean()),
      bladderIncontinentType: v.union(
        v.literal("STRESS"),
        v.literal("URGE"),
        v.literal("MIXED"),
        v.literal("FUNCTIONAL")
      ),
      bladderPlanCommenced: v.optional(v.boolean()),
      bladderReferralRequired: v.union(
        v.literal("DIETICIAN"),
        v.literal("GP"),
        v.literal("OT"),
        v.literal("PHYSIOTHERAPIST"),
        v.literal("CONTINENCE-NURSE"),
        v.literal("NONE")
      ),
      bladderPlanFollowed: v.union(
        v.literal("STRESS"),
        v.literal("URGE"),
        v.literal("MIXED"),
        v.literal("RETENTION-OVERFLOW")
      ),
      // Bowel
      bowelContinent: v.optional(v.boolean()),
      bowelIncontinent: v.optional(v.boolean()),
      bowelPlanCommenced: v.optional(v.boolean()),
      bowelRecordCommenced: v.optional(v.boolean()),
      bowelReferralRequired: v.union(
        v.literal("DIETICIAN"),
        v.literal("GP"),
        v.literal("OT"),
        v.literal("PHYSIOTHERAPIST"),
        v.literal("NONE")
      ),

      // Section 11
      sigantureCompletingAssessment: v.string(),
      sigantureResident: v.optional(v.string()),
      dateNextReview: v.number(),

      // Metadata
      createdAt: v.number(),
      createdBy: v.id("users"),
      updatedAt: v.optional(v.number()),
      updatedBy: v.optional(v.id("users")),
      pdfFileId: v.optional(v.id("_storage"))
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const assessment = await ctx.db.get(args.id);
    return assessment;
  }
});

/**
 * Get bladder bowel assessments for a specific resident
 */
export const getBladderBowelAssessmentsByResident = query({
  args: {
    residentId: v.id("residents")
  },
  returns: v.array(
    v.object({
      _id: v.id("bladderBowelAssessments"),
      _creationTime: v.number(),
      residentId: v.id("residents"),
      teamId: v.string(),
      organizationId: v.string(),
      savedAsDraft: v.optional(v.boolean()),
      residentName: v.string(),
      dateOfBirth: v.number(),
      bedroomNumber: v.string(),
      sigantureCompletingAssessment: v.string(),
      dateNextReview: v.number(),
      createdAt: v.number(),
      createdBy: v.id("users"),
      pdfFileId: v.optional(v.id("_storage"))
    })
  ),
  handler: async (ctx, args) => {
    const assessments = await ctx.db
      .query("bladderBowelAssessments")
      .withIndex("by_resident", (q) => q.eq("residentId", args.residentId))
      .collect();

    return assessments.map((assessment) => ({
      _id: assessment._id,
      _creationTime: assessment._creationTime,
      residentId: assessment.residentId,
      teamId: assessment.teamId,
      organizationId: assessment.organizationId,
      savedAsDraft: assessment.savedAsDraft,
      residentName: assessment.residentName,
      dateOfBirth: assessment.dateOfBirth,
      bedroomNumber: assessment.bedroomNumber,
      sigantureCompletingAssessment: assessment.sigantureCompletingAssessment,
      dateNextReview: assessment.dateNextReview,
      createdAt: assessment.createdAt,
      createdBy: assessment.createdBy,
      pdfFileId: assessment.pdfFileId
    }));
  }
});

/**
 * Update an existing bladder bowel assessment (creates new version)
 */
export const updateBladderBowelAssessment = mutation({
  args: {
    id: v.id("bladderBowelAssessments"),
    residentId: v.id("residents"),
    teamId: v.string(),
    organizationId: v.string(),
    userId: v.string(),
    savedAsDraft: v.optional(v.boolean()),

    // Section 1 - Resident info
    residentName: v.string(),
    dateOfBirth: v.number(),
    bedroomNumber: v.string(),
    informationObtainedFrom: v.string(),

    // Section 2 - Infections
    hepatitisAB: v.optional(v.boolean()),
    bloodBorneVirues: v.optional(v.boolean()),
    mrsa: v.optional(v.boolean()),
    esbl: v.optional(v.boolean()),
    other: v.optional(v.string()),

    // Section 3 - Urinalysis on Admission
    ph: v.optional(v.boolean()),
    nitrates: v.optional(v.boolean()),
    protein: v.optional(v.boolean()),
    leucocytes: v.optional(v.boolean()),
    glucose: v.optional(v.boolean()),
    bloodResult: v.optional(v.boolean()),
    mssuDate: v.optional(v.number()),

    // Section 4 - Prescribed medication
    antiHypertensives: v.optional(v.boolean()),
    antiParkinsonDrugs: v.optional(v.boolean()),
    ironSupplement: v.optional(v.boolean()),
    laxatives: v.optional(v.boolean()),
    diuretics: v.optional(v.boolean()),
    histamine: v.optional(v.boolean()),
    antiDepressants: v.optional(v.boolean()),
    cholinergic: v.optional(v.boolean()),
    sedativesHypnotic: v.optional(v.boolean()),
    antiPsychotic: v.optional(v.boolean()),
    antihistamines: v.optional(v.boolean()),
    narcoticAnalgesics: v.optional(v.boolean()),

    // Section 5 - Lifestyle
    caffeineMls24h: v.optional(v.number()),
    caffeineFrequency: v.optional(v.string()),
    caffeineTimeOfDay: v.optional(v.string()),
    excersiceType: v.optional(v.string()),
    excersiceFrequency: v.optional(v.string()),
    excersiceTimeOfDay: v.optional(v.string()),
    alcoholAmount24h: v.optional(v.number()),
    alcoholFrequency: v.optional(v.string()),
    alcoholTimeOfDay: v.optional(v.string()),
    smoking: v.union(
      v.literal("SMOKER"),
      v.literal("NON-SMOKER"),
      v.literal("EX-SMOKER")
    ),
    weight: v.union(
      v.literal("NORMAL"),
      v.literal("OBESE"),
      v.literal("UNDERWEIGHT")
    ),
    skinCondition: v.union(
      v.literal("HEALTHY"),
      v.literal("RED"),
      v.literal("EXCORIATED"),
      v.literal("BROKEN")
    ),
    constipationHistory: v.optional(v.boolean()),
    mentalState: v.union(
      v.literal("ALERT"),
      v.literal("CONFUSED"),
      v.literal("LEARNING-DISABLED"),
      v.literal("COGNITIVELY-IMPAIRED")
    ),
    mobilityIssues: v.union(
      v.literal("INDEPENDENT"),
      v.literal("ASSISTANCE"),
      v.literal("HOISTED")
    ),
    historyRecurrentUTIs: v.optional(v.boolean()),

    // Section 6 - Urinary continence
    incontinence: v.union(
      v.literal("NONE"),
      v.literal("ONE"),
      v.literal("1-2DAY"),
      v.literal("3DAY"),
      v.literal("NIGHT"),
      v.literal("DAYANDNIGHT")
    ),
    volume: v.union(
      v.literal("ENTIRE-BLADDER"),
      v.literal("SMALL-VOL"),
      v.literal("UNABLE-DETERMINE")
    ),
    onset: v.union(v.literal("SUDDEN"), v.literal("GRADUAL")),
    duration: v.union(
      v.literal("LESS-6M"),
      v.literal("6M-1Y"),
      v.literal("MORE-1Y")
    ),
    symptompsLastSix: v.union(
      v.literal("STABLE"),
      v.literal("WORSENING"),
      v.literal("IMPROVING"),
      v.literal("FLUCTUATING")
    ),
    physicianConsulted: v.optional(v.boolean()),

    // Section 7 - Bowel pattern
    bowelState: v.union(
      v.literal("NORMAL"),
      v.literal("CONSTIPATION"),
      v.literal("DIARRHOEA"),
      v.literal("STOMA"),
      v.literal("FAECAL-INCONTINENCE"),
      v.literal("IRRITABLE-BOWEL")
    ),
    bowelFrequency: v.string(),
    usualTimeOfDat: v.string(),
    amountAndStoolType: v.string(),
    liquidFeeds: v.string(),
    otherFactors: v.string(),
    otherRemedies: v.string(),
    medicalOfficerConsulted: v.optional(v.boolean()),

    // Section 8 - Current toileting pattern and products in use
    dayPattern: v.union(
      v.literal("TOILET"),
      v.literal("COMMODE"),
      v.literal("BED-PAN"),
      v.literal("URINAL")
    ),
    eveningPattern: v.union(
      v.literal("TOILET"),
      v.literal("COMMODE"),
      v.literal("BED-PAN"),
      v.literal("URINAL")
    ),
    nightPattern: v.union(
      v.literal("TOILET"),
      v.literal("COMMODE"),
      v.literal("BED-PAN"),
      v.literal("URINAL")
    ),
    typesOfPads: v.string(),

    // Section 9 - Symptoms
    // 9.A
    leakCoughLaugh: v.optional(v.boolean()),
    leakStandingUp: v.optional(v.boolean()),
    leakUpstairsDownhill: v.optional(v.boolean()),
    passesUrineFrequently: v.optional(v.boolean()),
    desirePassUrine: v.optional(v.boolean()),
    leaksBeforeToilet: v.optional(v.boolean()),
    moreThanTwiceAtNight: v.optional(v.boolean()),
    anxiety: v.optional(v.boolean()),
    // 9.B
    difficultyStarting: v.optional(v.boolean()),
    hesintancy: v.optional(v.boolean()),
    dribbles: v.optional(v.boolean()),
    feelsFull: v.optional(v.boolean()),
    recurrentTractInfections: v.optional(v.boolean()),
    // 9.C
    limitedMobility: v.optional(v.boolean()),
    unableOnTime: v.optional(v.boolean()),
    notHoldUrinalOrSeat: v.optional(v.boolean()),
    notuseCallBell: v.optional(v.boolean()),
    poorVision: v.optional(v.boolean()),
    assistedTransfer: v.optional(v.boolean()),
    pain: v.optional(v.boolean()),

    // Section 10
    // Bladder
    bladderContinent: v.optional(v.boolean()),
    bladderIncontinent: v.optional(v.boolean()),
    bladderIncontinentType: v.union(
      v.literal("STRESS"),
      v.literal("URGE"),
      v.literal("MIXED"),
      v.literal("FUNCTIONAL")
    ),
    bladderPlanCommenced: v.optional(v.boolean()),
    bladderReferralRequired: v.union(
      v.literal("DIETICIAN"),
      v.literal("GP"),
      v.literal("OT"),
      v.literal("PHYSIOTHERAPIST"),
      v.literal("CONTINENCE-NURSE"),
      v.literal("NONE")
    ),
    bladderPlanFollowed: v.union(
      v.literal("STRESS"),
      v.literal("URGE"),
      v.literal("MIXED"),
      v.literal("RETENTION-OVERFLOW")
    ),
    // Bowel
    bowelContinent: v.optional(v.boolean()),
    bowelIncontinent: v.optional(v.boolean()),
    bowelPlanCommenced: v.optional(v.boolean()),
    bowelRecordCommenced: v.optional(v.boolean()),
    bowelReferralRequired: v.union(
      v.literal("DIETICIAN"),
      v.literal("GP"),
      v.literal("OT"),
      v.literal("PHYSIOTHERAPIST"),
      v.literal("NONE")
    ),

    // Section 11
    sigantureCompletingAssessment: v.string(),
    sigantureResident: v.optional(v.string()),
    dateNextReview: v.number()
  },
  returns: v.id("bladderBowelAssessments"),
  handler: async (ctx, args) => {
    // Verify the assessment exists
    const existingAssessment = await ctx.db.get(args.id);
    if (!existingAssessment) {
      throw new Error("Bladder bowel assessment not found");
    }

    // Get the current user ID from auth
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("User not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("byEmail", (q) => q.eq("email", identity.email!))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Create a NEW version instead of patching the old one
    const newAssessmentId = await ctx.db.insert("bladderBowelAssessments", {
      residentId: args.residentId,
      teamId: args.teamId,
      organizationId: args.organizationId,
      userId: args.userId,
      savedAsDraft: args.savedAsDraft ?? false,

      // Section 1 - Resident info
      residentName: args.residentName,
      dateOfBirth: args.dateOfBirth,
      bedroomNumber: args.bedroomNumber,
      informationObtainedFrom: args.informationObtainedFrom,

      // Section 2 - Infections
      hepatitisAB: args.hepatitisAB,
      bloodBorneVirues: args.bloodBorneVirues,
      mrsa: args.mrsa,
      esbl: args.esbl,
      other: args.other,

      // Section 3 - Urinalysis on Admission
      ph: args.ph,
      nitrates: args.nitrates,
      protein: args.protein,
      leucocytes: args.leucocytes,
      glucose: args.glucose,
      bloodResult: args.bloodResult,
      mssuDate: args.mssuDate,

      // Section 4 - Prescribed medication
      antiHypertensives: args.antiHypertensives,
      antiParkinsonDrugs: args.antiParkinsonDrugs,
      ironSupplement: args.ironSupplement,
      laxatives: args.laxatives,
      diuretics: args.diuretics,
      histamine: args.histamine,
      antiDepressants: args.antiDepressants,
      cholinergic: args.cholinergic,
      sedativesHypnotic: args.sedativesHypnotic,
      antiPsychotic: args.antiPsychotic,
      antihistamines: args.antihistamines,
      narcoticAnalgesics: args.narcoticAnalgesics,

      // Section 5 - Lifestyle
      caffeineMls24h: args.caffeineMls24h,
      caffeineFrequency: args.caffeineFrequency,
      caffeineTimeOfDay: args.caffeineTimeOfDay,
      excersiceType: args.excersiceType,
      excersiceFrequency: args.excersiceFrequency,
      excersiceTimeOfDay: args.excersiceTimeOfDay,
      alcoholAmount24h: args.alcoholAmount24h,
      alcoholFrequency: args.alcoholFrequency,
      alcoholTimeOfDay: args.alcoholTimeOfDay,
      smoking: args.smoking,
      weight: args.weight,
      skinCondition: args.skinCondition,
      constipationHistory: args.constipationHistory,
      mentalState: args.mentalState,
      mobilityIssues: args.mobilityIssues,
      historyRecurrentUTIs: args.historyRecurrentUTIs,

      // Section 6 - Urinary continence
      incontinence: args.incontinence,
      volume: args.volume,
      onset: args.onset,
      duration: args.duration,
      symptompsLastSix: args.symptompsLastSix,
      physicianConsulted: args.physicianConsulted,

      // Section 7 - Bowel pattern
      bowelState: args.bowelState,
      bowelFrequency: args.bowelFrequency,
      usualTimeOfDat: args.usualTimeOfDat,
      amountAndStoolType: args.amountAndStoolType,
      liquidFeeds: args.liquidFeeds,
      otherFactors: args.otherFactors,
      otherRemedies: args.otherRemedies,
      medicalOfficerConsulted: args.medicalOfficerConsulted,

      // Section 8 - Current toileting pattern and products in use
      dayPattern: args.dayPattern,
      eveningPattern: args.eveningPattern,
      nightPattern: args.nightPattern,
      typesOfPads: args.typesOfPads,

      // Section 9 - Symptoms
      leakCoughLaugh: args.leakCoughLaugh,
      leakStandingUp: args.leakStandingUp,
      leakUpstairsDownhill: args.leakUpstairsDownhill,
      passesUrineFrequently: args.passesUrineFrequently,
      desirePassUrine: args.desirePassUrine,
      leaksBeforeToilet: args.leaksBeforeToilet,
      moreThanTwiceAtNight: args.moreThanTwiceAtNight,
      anxiety: args.anxiety,
      difficultyStarting: args.difficultyStarting,
      hesintancy: args.hesintancy,
      dribbles: args.dribbles,
      feelsFull: args.feelsFull,
      recurrentTractInfections: args.recurrentTractInfections,
      limitedMobility: args.limitedMobility,
      unableOnTime: args.unableOnTime,
      notHoldUrinalOrSeat: args.notHoldUrinalOrSeat,
      notuseCallBell: args.notuseCallBell,
      poorVision: args.poorVision,
      assistedTransfer: args.assistedTransfer,
      pain: args.pain,

      // Section 10
      bladderContinent: args.bladderContinent,
      bladderIncontinent: args.bladderIncontinent,
      bladderIncontinentType: args.bladderIncontinentType,
      bladderPlanCommenced: args.bladderPlanCommenced,
      bladderReferralRequired: args.bladderReferralRequired,
      bladderPlanFollowed: args.bladderPlanFollowed,
      bowelContinent: args.bowelContinent,
      bowelIncontinent: args.bowelIncontinent,
      bowelPlanCommenced: args.bowelPlanCommenced,
      bowelRecordCommenced: args.bowelRecordCommenced,
      bowelReferralRequired: args.bowelReferralRequired,

      // Section 11
      sigantureCompletingAssessment: args.sigantureCompletingAssessment,
      sigantureResident: args.sigantureResident,
      dateNextReview: args.dateNextReview,

      // Metadata
      createdAt: Date.now(),
      createdBy: user._id
    });

    // Schedule PDF generation if not a draft
    if (!args.savedAsDraft) {
      await ctx.scheduler.runAfter(
        0,
        internal.careFiles.bladderBowel.generatePDFAndUpdateRecord,
        {
          assessmentId: newAssessmentId
        }
      );
    }

    return newAssessmentId;
  }
});

/**
 * Check if a bladder bowel assessment exists for a resident
 */
export const hasBladderBowelAssessment = query({
  args: {
    residentId: v.id("residents")
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const assessment = await ctx.db
      .query("bladderBowelAssessments")
      .withIndex("by_resident", (q) => q.eq("residentId", args.residentId))
      .first();

    return assessment !== null;
  }
});

/**
 * Delete a bladder bowel assessment
 */
export const deleteBladderBowelAssessment = mutation({
  args: {
    id: v.id("bladderBowelAssessments")
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Verify the assessment exists
    const existingAssessment = await ctx.db.get(args.id);
    if (!existingAssessment) {
      throw new Error("Bladder bowel assessment not found");
    }

    // Delete the assessment
    await ctx.db.delete(args.id);
    return null;
  }
});

/**
 * Generate PDF and update the record with the file ID
 */
export const generatePDFAndUpdateRecord = internalAction({
  args: {
    assessmentId: v.id("bladderBowelAssessments")
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      // Get the PDF API URL from environment variables
      const pdfApiUrl = process.env.PDF_API_URL;
      const pdfApiToken = process.env.PDF_API_TOKEN;

      // Check if PDF generation is properly configured
      if (!pdfApiUrl?.startsWith("https://")) {
        console.warn(
          "PDF generation disabled: PDF_API_URL not set or not HTTPS. Set PDF_API_URL=https://your-domain.com"
        );
        return null;
      }

      // Prepare headers
      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };

      // Add authentication header if token is available
      if (pdfApiToken) {
        headers["Authorization"] = `Bearer ${pdfApiToken}`;
      }

      // Call the PDF generation API
      console.log("Calling PDF API at:", `${pdfApiUrl}/api/pdf/bladder-bowel`);
      const pdfResponse = await fetch(`${pdfApiUrl}/api/pdf/bladder-bowel`, {
        method: "POST",
        headers,
        body: JSON.stringify({ assessmentId: args.assessmentId })
      });

      console.log(
        "PDF API response status:",
        pdfResponse.status,
        pdfResponse.statusText
      );

      if (!pdfResponse.ok) {
        const errorText = await pdfResponse.text();
        console.log("PDF API error response:", errorText);
        throw new Error(
          `PDF generation failed: ${pdfResponse.status} ${pdfResponse.statusText} - ${errorText}`
        );
      }

      // Get the PDF as a buffer
      const pdfBuffer = await pdfResponse.arrayBuffer();

      // Convert to Blob for Convex storage
      const pdfBlob = new Blob([pdfBuffer], { type: "application/pdf" });

      // Store the PDF in Convex file storage
      const storageId = await ctx.storage.store(pdfBlob);

      // Update the assessment record with the PDF file ID
      await ctx.runMutation(internal.careFiles.bladderBowel.updatePDFFileId, {
        assessmentId: args.assessmentId,
        pdfFileId: storageId
      });
    } catch (error) {
      console.error("Error generating and saving PDF:", error);
      // Don't throw here to avoid crashing the entire form submission
    }

    return null;
  }
});

/**
 * Update a bladder bowel assessment with PDF file ID
 */
export const updatePDFFileId = internalMutation({
  args: {
    assessmentId: v.id("bladderBowelAssessments"),
    pdfFileId: v.id("_storage")
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.assessmentId, {
      pdfFileId: args.pdfFileId
    });
    return null;
  }
});

/**
 * Get PDF URL for a bladder bowel assessment
 */
export const getPDFUrl = query({
  args: {
    assessmentId: v.id("bladderBowelAssessments")
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const assessment = await ctx.db.get(args.assessmentId);

    if (!assessment || !assessment.pdfFileId) {
      return null;
    }

    const url = await ctx.storage.getUrl(assessment.pdfFileId);
    return url;
  }
});

/**
 * Get archived (non-latest) bladder bowel assessments for a resident
 * Returns all assessments except the most recent one
 */
export const getArchivedForResident = query({
  args: {
    residentId: v.id("residents")
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    // Get all assessments for this resident, ordered by creation time (newest first)
    const allAssessments = await ctx.db
      .query("bladderBowelAssessments")
      .withIndex("by_resident", (q) => q.eq("residentId", args.residentId))
      .order("desc")
      .collect();

    // Return all except the first one (the latest)
    return allAssessments.length > 1 ? allAssessments.slice(1) : [];
  }
});
