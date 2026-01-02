import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all todos for the current user
export const getTodos = query({
  args: {
    teamId: v.optional(v.string()),
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

    // Get incomplete todos
    const incompleteTodos = await ctx.db
      .query("todos")
      .withIndex("byUserAndCompleted", (q) =>
        q.eq("userId", user._id).eq("completed", false)
      )
      .order("desc")
      .collect();

    // Get completed todos
    const completedTodos = await ctx.db
      .query("todos")
      .withIndex("byUserAndCompleted", (q) =>
        q.eq("userId", user._id).eq("completed", true)
      )
      .order("desc")
      .collect();

    // Sort by createdAt (newest first) within each group
    const sortedIncomplete = incompleteTodos.sort((a, b) => b.createdAt - a.createdAt);
    const sortedCompleted = completedTodos.sort((a, b) => b.createdAt - a.createdAt);

    // Return incomplete first, then completed
    return [...sortedIncomplete, ...sortedCompleted];
  },
});

// Create a new todo
export const createTodo = mutation({
  args: {
    title: v.string(),
    dueDate: v.optional(v.string()),
    teamId: v.optional(v.string()),
    organizationId: v.optional(v.string()),
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

    const todoId = await ctx.db.insert("todos", {
      title: args.title,
      completed: false,
      createdAt: Date.now(),
      dueDate: args.dueDate,
      userId: user._id,
      teamId: args.teamId,
      organizationId: args.organizationId,
    });

    return todoId;
  },
});

// Toggle todo completion
export const toggleTodo = mutation({
  args: {
    id: v.id("todos"),
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

    const todo = await ctx.db.get(args.id);
    if (!todo) {
      throw new Error("Todo not found");
    }

    if (todo.userId !== user._id) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.id, {
      completed: !todo.completed,
      completedAt: !todo.completed ? Date.now() : undefined,
    });
  },
});

// Delete a todo
export const deleteTodo = mutation({
  args: {
    id: v.id("todos"),
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

    const todo = await ctx.db.get(args.id);
    if (!todo) {
      throw new Error("Todo not found");
    }

    if (todo.userId !== user._id) {
      throw new Error("Not authorized");
    }

    await ctx.db.delete(args.id);
  },
});

// Update todo title
export const updateTodo = mutation({
  args: {
    id: v.id("todos"),
    title: v.string(),
    dueDate: v.optional(v.string()),
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

    const todo = await ctx.db.get(args.id);
    if (!todo) {
      throw new Error("Todo not found");
    }

    if (todo.userId !== user._id) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.id, {
      title: args.title,
      dueDate: args.dueDate,
    });
  },
});
