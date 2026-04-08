"use client";

import { useState, useEffect, useCallback } from "react";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { useProfile } from "@/hooks/use-profile";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckSquare, Plus, Trash2, Calendar, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Todo {
  id: string;
  title: string;
  is_completed: boolean;
  due_date?: string;
  organization_id: string;
  team_id?: string;
  created_by: string;
  created_at: string;
}

interface TodoListProps {
  teamId?: string;
}

export function TodoList({ teamId }: TodoListProps) {
  const { supabase } = useSupabase();
  const { profile } = useProfile();

  const [todos, setTodos] = useState<Todo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const fetchTodos = useCallback(async () => {
    if (!profile?.active_organization_id || !profile?.id) return;

    try {
      setIsLoading(true);
      let query = supabase
        .from("todos")
        .select("*")
        .eq("organization_id", profile.active_organization_id)
        .eq("created_by", profile.id);

      // If teamId is provided, filter by it. Otherwise, get todos without a team or for any team in the org?
      if (teamId) {
        query = query.eq("team_id", teamId);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;
      setTodos(data || []);
    } catch (error) {
      console.error("Error fetching todos:", error);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, profile?.active_organization_id, teamId]);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  const today = format(new Date(), "EEE, MMM dd");

  const incompleteTodos = todos.filter(todo => !todo.is_completed);
  const completedTodos = todos.filter(todo => todo.is_completed);

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoTitle.trim() || !profile?.active_organization_id || !profile?.id) return;

    try {
      const { error } = await supabase.from("todos").insert({
        title: newTodoTitle,
        organization_id: profile.active_organization_id,
        team_id: teamId || null,
        created_by: profile.id,
        is_completed: false,
      });

      if (error) throw error;

      setNewTodoTitle("");
      setShowInput(false);
      fetchTodos();
    } catch (error) {
      console.error("Error creating todo:", error);
    }
  };

  const handleToggleTodo = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("todos")
        .update({
          is_completed: !currentStatus,
          completed_at: !currentStatus ? new Date().toISOString() : null,
          completed_by: !currentStatus ? profile?.id : null
        })
        .eq("id", id);

      if (error) throw error;
      fetchTodos();
    } catch (error) {
      console.error("Error toggling todo:", error);
    }
  };

  const handleDeleteTodo = async (id: string) => {
    try {
      const { error } = await supabase.from("todos").delete().eq("id", id);
      if (error) throw error;
      fetchTodos();
    } catch (error) {
      console.error("Error deleting todo:", error);
    }
  };

  return (
    <Card className="p-5 border shadow-none rounded-sm bg-yellow-50 dark:bg-yellow-950/20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
            <CheckSquare className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div>
            <h2 className="text-base font-medium">My Tasks</h2>
            <p className="text-xs text-muted-foreground">{today}</p>
          </div>
        </div>

        {!showInput && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-muted-foreground hover:text-foreground"
            onClick={() => setShowInput(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add task
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {showInput && (
          <form onSubmit={handleAddTodo} className="flex items-center gap-2 mb-2 pb-2 border-b">
            <Input
              type="text"
              placeholder="Add a task..."
              value={newTodoTitle}
              onChange={(e) => setNewTodoTitle(e.target.value)}
              className="h-9 text-sm"
              autoFocus
              onBlur={() => {
                if (!newTodoTitle.trim()) {
                  setShowInput(false);
                }
              }}
            />
            <Button type="submit" size="sm" className="h-9">
              Add
            </Button>
          </form>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : incompleteTodos.length > 0 ? (
          <div className="space-y-0 max-h-[300px] overflow-y-auto">
            {incompleteTodos.map((todo, index) => (
              <div key={todo.id}>
                <div className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/30 group transition-colors">
                  <Checkbox
                    id={`todo-${todo.id}`}
                    checked={false}
                    onCheckedChange={() => handleToggleTodo(todo.id, false)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm break-words">{todo.title}</p>
                    {todo.due_date && (
                      <div className="flex items-center gap-1 mt-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(todo.due_date), "MMM dd")}
                        </span>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDeleteTodo(todo.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
                {index < incompleteTodos.length - 1 && (
                  <div className="border-b border-border/40 my-1" />
                )}
              </div>
            ))}
          </div>
        ) : (
          !showInput && completedTodos.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <CheckSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No tasks yet</p>
            </div>
          )
        )}

        {completedTodos.length > 0 && (
          <div className="mt-4">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground hover:text-foreground h-8 px-2"
              onClick={() => setShowCompleted(!showCompleted)}
            >
              <span className="text-xs font-medium">
                Completed ({completedTodos.length})
              </span>
            </Button>

            {showCompleted && (
              <div className="space-y-0 mt-2">
                {completedTodos.map((todo, index) => (
                  <div key={todo.id}>
                    <div className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/30 group transition-colors opacity-60">
                      <Checkbox
                        id={`todo-${todo.id}`}
                        checked={true}
                        onCheckedChange={() => handleToggleTodo(todo.id, true)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm break-words line-through text-muted-foreground">
                          {todo.title}
                        </p>
                        {todo.due_date && (
                          <div className="flex items-center gap-1 mt-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(todo.due_date), "MMM dd")}
                            </span>
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleDeleteTodo(todo.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                    {index < completedTodos.length - 1 && (
                      <div className="border-b border-border/40 my-1" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
