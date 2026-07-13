"use client";

import * as React from "react";
import { useState } from "react";

import { motion } from "framer-motion";
import { CheckSquare, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";

import { Avatar } from "../ui/avatar";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Progress } from "../ui/progress";

export function TeamActivity() {
  // Functional Quick Todo Checklist local state
  const [todos, setTodos] = useState([
    { id: 1, text: "Review active task cards", completed: false },
    { id: 2, text: "Push design specifications", completed: true },
    { id: 3, text: "Prepare sync presentation slides", completed: false },
  ]);
  const [newTodo, setNewTodo] = useState("");

  const handleToggle = (id: number) => {
    setTodos(todos.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim()) {
      return;
    }
    setTodos([...todos, { id: Date.now(), text: newTodo.trim(), completed: false }]);
    setNewTodo("");
  };

  const handleDelete = (id: number) => {
    setTodos(todos.filter((t) => t.id !== id));
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Widget 1: Team workload load meter */}
      <Card className="p-6 flex flex-col justify-between space-y-4 hover:shadow-[0_0_50px_rgba(16,185,129,0.25)] transition-shadow duration-300">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <h2 className="text-base font-extrabold text-white">Team Activity</h2>
          <select className="bg-transparent border-0 outline-none text-xs text-[#94a3b8] cursor-pointer font-bold uppercase tracking-wider">
            <option className="bg-[#0f1c25]">This week</option>
            <option className="bg-[#0f1c25]">This month</option>
          </select>
        </div>

        <div className="space-y-5 flex-1 justify-center flex flex-col">
          {/* Vansh */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2.5">
                <Avatar name="Vansh Jain" size="sm" />
                <span className="font-bold text-white">Vansh Jain</span>
              </div>
              <span className="text-[#94a3b8] text-xs font-semibold">32 tasks</span>
            </div>
            <Progress value={70} className="h-2" indicatorClassName="from-cyan-500 to-blue-500" />
          </div>

          {/* Rohit */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2.5">
                <Avatar name="Rohit Sharma" size="sm" />
                <span className="font-bold text-white">Rohit Sharma</span>
              </div>
              <span className="text-[#94a3b8] text-xs font-semibold">28 tasks</span>
            </div>
            <Progress value={55} className="h-2" indicatorClassName="from-rose-500 to-orange-500" />
          </div>
        </div>
      </Card>

      {/* Widget 2: Interactive checklist Quick Todo List */}
      <Card className="p-6 space-y-4 hover:shadow-[0_0_50px_rgba(16,185,129,0.25)] transition-shadow duration-300">
        <div className="flex items-center border-b border-white/5 pb-3">
          <h2 className="text-base font-extrabold text-white flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-[#10b981]" />
            Quick Todo List
          </h2>
        </div>

        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            type="text"
            placeholder="Add new checklist task..."
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            className="flex-1 bg-[#071017]/40 border border-white/5 rounded-xl px-3 py-2 text-sm text-white placeholder:text-[#94a3b8]/50 outline-none focus:border-[#10b981]/60 transition-colors"
          />
          <Button type="submit" size="md" className="shrink-0 text-sm">
            Add
          </Button>
        </form>

        <div className="space-y-3.5 max-h-[160px] overflow-auto pr-1">
          {todos.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-between group/todo text-sm"
            >
              <label className="flex items-center gap-3 cursor-pointer min-w-0 flex-1 select-none">
                <input
                  type="checkbox"
                  checked={t.completed}
                  onChange={() => handleToggle(t.id)}
                  className="rounded border-zinc-700 bg-zinc-950 text-[#10b981] focus:ring-0 focus:ring-offset-0 h-4.5 w-4.5 shrink-0"
                />
                <span
                  className={cn(
                    "truncate font-semibold transition-all text-sm",
                    t.completed ? "line-through text-[#94a3b8]/40" : "text-white",
                  )}
                >
                  {t.text}
                </span>
              </label>
              <button
                onClick={() => handleDelete(t.id)}
                className="opacity-0 group-hover/todo:opacity-100 p-0.5 hover:text-red-400 text-zinc-500 transition-opacity"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </div>
      </Card>
    </div>
  );
}
