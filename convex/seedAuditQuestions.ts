import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const seedSectionAQuestions = mutation({
  args: {
    residentId: v.id("residents"),
    organizationId: v.string(),
    teamId: v.string()
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("byEmail", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const sectionAQuestions = [
      {
        questionId: "A001",
        question: "Is resident documentation kept safe and only accessible by relevant staff?"
      },
      {
        questionId: "A002",
        question: "Do all residents have a folder to hold all necessary hard copies of documentation?"
      },
      {
        questionId: "A003",
        question: "Folders are tidy and presentable with clear labelling on spine or front cover?"
      },
      {
        questionId: "A004",
        question: "Is resident profile fully completed?"
      },
      {
        questionId: "A005",
        question: "Is additional preferences information completed with person-centred profile sheets?"
      },
      {
        questionId: "A006",
        question: "Is a photo in place that is current, with date, and less than 6 months old on resident profile sheet; if dated, is there note for renewal?"
      },
      {
        questionId: "A007",
        question: "There is NO Resuscitation directive in place with corresponding care plan. Evidence of discussion to have a DNACPR documented along with a review date."
      },
      {
        questionId: "A008",
        question: "DNACPR is reviewed annually (or according to GP instructions)?"
      },
      {
        questionId: "A009",
        question: "There is a PEEP (Personal Emergency Evacuation Plan) completed in full and accurate?"
      },
      {
        questionId: "A010",
        question: "Has the PEEP been reviewed monthly?"
      }
    ];

    // Check if audit data already exists for this resident
    const existingAudits = await ctx.db
      .query("careoAudits")
      .withIndex("byResident", (q) => q.eq("residentId", args.residentId))
      .collect();

    if (existingAudits.length > 0) {
      throw new Error("Audit data already exists for this resident");
    }

    // Create audit entries for Section A questions
    const auditPromises = sectionAQuestions.map(async (q, index) => {
      return await ctx.db.insert("careoAudits", {
        residentId: args.residentId,
        section: "Section A",
        question: q.question,
        questionId: q.questionId,
        auditedBy: user._id,
        auditDate: Date.now(),
        organizationId: args.organizationId,
        teamId: args.teamId,
        createdAt: Date.now(),
        createdBy: user._id,
      });
    });

    const results = await Promise.all(auditPromises);
    return {
      message: `Created ${results.length} Section A audit questions`,
      count: results.length,
      questionIds: results
    };
  },
});