"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckSquare, Plus, Trash2, Calendar } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Id } from "@/convex/_generated/dataModel";

interface TodoListProps {
  teamId?: string;
}

export function TodoList({ teamId }: TodoListProps) {
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const todos = useQuery(api.todos.getTodos, { teamId });
  const createTodo = useMutation(api.todos.createTodo);
  const toggleTodo = useMutation(api.todos.toggleTodo);
  const deleteTodo = useMutation(api.todos.deleteTodo);

  const today = format(new Date(), "EEE, MMM dd");

  // Separate incomplete and completed todos
  const incompleteTodos = todos?.filter(todo => !todo.completed) || [];
  const completedTodos = todos?.filter(todo => todo.completed) || [];

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoTitle.trim()) return;

    await createTodo({
      title: newTodoTitle,
      teamId,
    });

    setNewTodoTitle("");
    setShowInput(false);
  };

  const handleToggleTodo = async (id: Id<"todos">) => {
    try {
      console.log("Toggling todo:", id);
      await toggleTodo({ id });
    } catch (error) {
      console.error("Error toggling todo:", error);
    }
  };

  const handleDeleteTodo = async (id: Id<"todos">) => {
    await deleteTodo({ id });
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

        {/* Add Task Button - Top Right */}
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

      <div className="space-y-2">{showInput && (
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

        {/* Incomplete Todo Items */}
        {incompleteTodos.length > 0 ? (
          <div className="space-y-0 max-h-[300px] overflow-y-auto">
            {incompleteTodos.map((todo, index) => {
              const todoId = todo._id;

              return (
                <div key={todoId}>
                  <div
                    className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/30 group transition-colors"
                  >
                    <Checkbox
                      id={`todo-${todoId}`}
                      checked={false}
                      onCheckedChange={() => {
                        handleToggleTodo(todoId);
                      }}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm break-words">
                        {todo.title}
                      </p>
                      {todo.dueDate && (
                        <div className="flex items-center gap-1 mt-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(todo.dueDate), "MMM dd")}
                          </span>
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDeleteTodo(todoId)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                  {index < incompleteTodos.length - 1 && (
                    <div className="border-b border-border/40 my-1" />
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          !showInput && completedTodos.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <CheckSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No tasks yet</p>
            </div>
          )
        )}

        {/* Completed Section */}
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
                {completedTodos.map((todo, index) => {
                  const todoId = todo._id;

                  return (
                    <div key={todoId}>
                      <div className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/30 group transition-colors opacity-60">
                        <Checkbox
                          id={`todo-${todoId}`}
                          checked={true}
                          onCheckedChange={() => {
                            handleToggleTodo(todoId);
                          }}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm break-words line-through text-muted-foreground">
                            {todo.title}
                          </p>
                          {todo.dueDate && (
                            <div className="flex items-center gap-1 mt-1">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(todo.dueDate), "MMM dd")}
                              </span>
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDeleteTodo(todoId)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                      {index < completedTodos.length - 1 && (
                        <div className="border-b border-border/40 my-1" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
