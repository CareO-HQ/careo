import { internalMutation } from "./_generated/server";

// Delete all existing quickCareNotes due to schema change
export const clearQuickCareNotes = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("Clearing all existing quickCareNotes due to schema change...");
    
    // Get all existing quickCareNotes
    const allNotes = await ctx.db.query("quickCareNotes").collect();
    
    let deletedCount = 0;
    
    for (const note of allNotes) {
      await ctx.db.delete(note._id);
      deletedCount++;
      console.log(`Deleted note ${note._id}`);
    }
    
    console.log(`Clear completed. Deleted ${deletedCount} records.`);
    return { 
      success: true, 
      deletedCount,
      message: "All quickCareNotes cleared due to schema change. Users can now add new structured care notes."
    };
  },
});