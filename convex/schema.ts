import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    // Better Auth user data
    email: v.string(), // Save email from Better Auth
    name: v.optional(v.string()), // Save name from Better Auth
    image: v.optional(v.string()), // Save image from Better Auth
    phone: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    isOnboardingComplete: v.optional(v.boolean()),
    activeTeamId: v.optional(v.string())
  }).index("byEmail", ["email"]), // Add index for email lookups

  // Passkey table for better-auth passkey plugin
  passkey: defineTable({
    id: v.string(), // Unique identifier for each passkey
    name: v.optional(v.string()), // The name of the passkey
    publicKey: v.string(), // The public key of the passkey
    userId: v.string(), // The ID of the user (foreign key)
    credentialID: v.string(), // The unique identifier of the registered credential
    counter: v.number(), // The counter of the passkey
    deviceType: v.string(), // The type of device used to register the passkey
    backedUp: v.boolean(), // Whether the passkey is backed up
    transports: v.string(), // The transports used to register the passkey
    createdAt: v.number(), // The time when the passkey was created (timestamp)
    aaguid: v.optional(v.string()) // Authenticator's Attestation GUID
  })
    .index("byId", ["id"])
    .index("byUserId", ["userId"])
    .index("byCredentialID", ["credentialID"]),

  files: defineTable({
    body: v.id("_storage"),
    name: v.optional(v.string()),
    originalName: v.optional(v.string()),
    size: v.optional(v.number()),
    extension: v.optional(v.string()),
    uploadedBy: v.optional(v.string()),
    uploadedAt: v.optional(v.number()),
    organizationId: v.optional(v.string()),
    teamId: v.optional(v.string()),
    parentFolderId: v.optional(v.id("folders")),
    isPublic: v.optional(v.boolean()),
    labels: v.optional(v.array(v.string())),
    userId: v.string(),
    format: v.string(),
    type: v.union(
      v.literal("profile"),
      v.literal("organization"),
      v.literal("file")
    )
  })
    .index("byUserId", ["userId"])
    .index("byOrganizationId", ["organizationId"])
    .index("byTeamId", ["teamId"])
    .index("byParentFolderId", ["parentFolderId"])
    .index("byLabels", ["labels"])
    .index("byType", ["type"]),

  labels: defineTable({
    name: v.string(),
    color: v.string(),
    organizationId: v.string()
  })
    .index("byName", ["name"])
    .index("byOrganizationId", ["organizationId"]),

  folders: defineTable({
    name: v.string(),
    organizationId: v.string(),
    teamId: v.optional(v.string()),
    parentFolderId: v.optional(v.id("folders")), // For nested folders
    createdBy: v.string(),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
    createdAt: v.number(),
    lastModified: v.number()
  })
    .index("byOrganizationId", ["organizationId"])
    .index("byTeamId", ["teamId"])
    .index("byParentFolderId", ["parentFolderId"])
    .index("byCreatedBy", ["createdBy"])
    .index("byName", ["name"]),

  
  teamMembers: defineTable({
    userId: v.string(), 
    teamId: v.string(), // The team ID from Better Auth
    organizationId: v.string(), // The organization ID for validation
    role: v.optional(v.string()), // Optional role within the team
    createdAt: v.number(), // When the membership was created
    createdBy: v.string() // Who added them to the team
  })
    .index("byUserId", ["userId"])
    .index("byTeamId", ["teamId"])
    .index("byUserAndTeam", ["userId", "teamId"])
    .index("byOrganization", ["organizationId"]),


  residents: defineTable({
    firstName: v.string(),
    lastName: v.string(),
    dateOfBirth: v.string(),
    phoneNumber: v.optional(v.string()),
    roomNumber: v.optional(v.string()),
    admissionDate: v.string(),
    nhsHealthNumber: v.optional(v.string()),
    healthConditions: v.optional(v.union(
      v.array(v.string()),
      v.array(v.object({
        condition: v.string()
      }))
    )),
    risks: v.optional(v.union(
      v.array(v.string()),
      v.array(v.object({
        risk: v.string(),
        level: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high")))
      }))
    )),
    dependencies: v.optional(v.union(
      v.array(v.string()), // Legacy format for backward compatibility
      v.object({
        mobility: v.union(
          v.literal("Independent"), 
          v.literal("Supervision Needed"), 
          v.literal("Assistance Needed"), 
          v.literal("Fully Dependent")
        ),
        eating: v.union(
          v.literal("Independent"), 
          v.literal("Supervision Needed"), 
          v.literal("Assistance Needed"), 
          v.literal("Fully Dependent")
        ),
        dressing: v.union(
          v.literal("Independent"), 
          v.literal("Supervision Needed"), 
          v.literal("Assistance Needed"), 
          v.literal("Fully Dependent")
        ),
        toileting: v.union(
          v.literal("Independent"), 
          v.literal("Supervision Needed"), 
          v.literal("Assistance Needed"), 
          v.literal("Fully Dependent")
        )
      })
    )),
    organizationId: v.string(),
    teamId: v.optional(v.string()),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    isActive: v.optional(v.boolean())
  })
    .index("byOrganizationId", ["organizationId"])
    .index("byTeamId", ["teamId"])
    .index("byCreatedBy", ["createdBy"])
    .index("byRoomNumber", ["roomNumber"])
    .index("byFullName", ["firstName", "lastName"])
    .index("byActiveStatus", ["isActive"]),

  // Emergency contacts for residents
  emergencyContacts: defineTable({
    residentId: v.id("residents"),
    name: v.string(),
    phoneNumber: v.string(),
    relationship: v.string(),
    isPrimary: v.optional(v.boolean()),
    organizationId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number()
  })
    .index("byResidentId", ["residentId"])
    .index("byOrganizationId", ["organizationId"])
    .index("byPrimary", ["isPrimary"]),


});
