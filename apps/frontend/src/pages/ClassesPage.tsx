import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";

import { createClass, deleteClass, getClasses } from "../api/classes";

export function ClassesPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  const classesQuery = useQuery({ queryKey: ["classes"], queryFn: getClasses });

  const createMutation = useMutation({
    mutationFn: createClass,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      setName("");
      setStatus({ ok: true, text: "Class created" });
    },
    onError: (err: any) => setStatus({ ok: false, text: err.response?.data?.detail || "Failed to create class" }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteClass,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      setStatus({ ok: true, text: "Class deleted" });
    },
    onError: (err: any) => setStatus({ ok: false, text: err.response?.data?.detail || "Failed to delete class" }),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    setStatus(null);
    createMutation.mutate(name.trim());
  }

  const classes = classesQuery.data ?? [];

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Classes</h2>
        <p className="mt-0.5 text-sm text-slate-500">Create and manage class master list for teachers and students.</p>
      </div>

      {status && (
        <div className={`rounded-xl border px-3 py-2 text-xs font-semibold ${status.ok ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-700"}`}>
          {status.text}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-bold text-slate-800">Add Class</h3>
        <form onSubmit={submit} className="flex flex-wrap gap-2">
          <input
            className="min-w-[220px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500"
            placeholder="Class name (e.g. 10-A)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="rounded-xl bg-blue-800 px-4 py-2 text-xs font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {createMutation.isPending ? "Adding..." : "Add Class"}
          </button>
        </form>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50 px-5 py-3 text-sm font-bold text-slate-800">Class List</div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/60">
                <th className="px-4 py-2.5 text-[9px] font-bold uppercase tracking-widest text-slate-400">Class</th>
                <th className="px-4 py-2.5 text-[9px] font-bold uppercase tracking-widest text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {classes.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 text-sm font-semibold text-slate-800">{item.name}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Delete class ${item.name}?`)) {
                          deleteMutation.mutate(item.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                      className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-[10px] font-bold text-red-700 hover:bg-red-100 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {classes.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-10 text-center text-sm text-slate-400">No classes yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
