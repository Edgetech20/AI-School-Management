import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";

import { getClasses } from "../api/classes";
import { createUser, deleteUser, getUsers, updateUser } from "../api/users";
import type { AdminUser } from "../types";

type FormState = {
  username: string;
  password: string;
  role: "admin" | "teacher";
  class_name: string;
  is_active: boolean;
};

type DialogState =
  | { type: "toggle"; user: AdminUser }
  | { type: "reassign"; user: AdminUser }
  | { type: "password"; user: AdminUser }
  | { type: "delete"; user: AdminUser }
  | null;

export function UsersPage({ currentUserId }: { currentUserId: number }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [dialogClass, setDialogClass] = useState("");
  const [dialogPassword, setDialogPassword] = useState("");
  const [form, setForm] = useState<FormState>({
    username: "",
    password: "",
    role: "teacher",
    class_name: "",
    is_active: true,
  });

  const usersQuery = useQuery({ queryKey: ["users"], queryFn: getUsers });
  const classesQuery = useQuery({ queryKey: ["classes"], queryFn: getClasses });

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setForm({ username: "", password: "", role: "teacher", class_name: "", is_active: true });
      setStatus({ ok: true, text: "User created" });
    },
    onError: (err: any) => setStatus({ ok: false, text: err.response?.data?.detail || "Failed to create user" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ userId, payload }: { userId: number; payload: any }) => updateUser(userId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setStatus({ ok: true, text: "User updated" });
    },
    onError: (err: any) => setStatus({ ok: false, text: err.response?.data?.detail || "Failed to update user" }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setStatus({ ok: true, text: "User deleted" });
    },
    onError: (err: any) => setStatus({ ok: false, text: err.response?.data?.detail || "Failed to delete user" }),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    setStatus(null);
    createMutation.mutate({
      username: form.username.trim(),
      password: form.password,
      role: form.role,
      class_name: form.role === "teacher" ? form.class_name.trim() : undefined,
      is_active: form.is_active,
    });
  }

  function closeDialog() {
    setDialog(null);
    setDialogClass("");
    setDialogPassword("");
  }

  function openReassignDialog(user: AdminUser) {
    setDialogClass(user.class_name ?? "");
    setDialog({ type: "reassign", user });
  }

  function openPasswordDialog(user: AdminUser) {
    setDialogPassword("");
    setDialog({ type: "password", user });
  }

  function submitToggleActive() {
    if (!dialog || dialog.type !== "toggle") return;
    updateMutation.mutate(
      { userId: dialog.user.id, payload: { is_active: !dialog.user.is_active } },
      { onSuccess: () => closeDialog() },
    );
  }

  function submitReassignClass() {
    if (!dialog || dialog.type !== "reassign") return;
    if (!dialogClass.trim()) {
      setStatus({ ok: false, text: "Please select a class" });
      return;
    }
    updateMutation.mutate(
      { userId: dialog.user.id, payload: { class_name: dialogClass.trim() } },
      { onSuccess: () => closeDialog() },
    );
  }

  function submitResetPassword() {
    if (!dialog || dialog.type !== "password") return;
    if (dialogPassword.length < 6) {
      setStatus({ ok: false, text: "Password must be at least 6 characters" });
      return;
    }
    updateMutation.mutate(
      { userId: dialog.user.id, payload: { password: dialogPassword } },
      { onSuccess: () => closeDialog() },
    );
  }

  function submitDeleteUser() {
    if (!dialog || dialog.type !== "delete") return;
    deleteMutation.mutate(dialog.user.id, { onSuccess: () => closeDialog() });
  }

  function renderRoleBadge(role: string) {
    if (role === "admin") {
      return <span className="rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700">Admin</span>;
    }
    return <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">Teacher</span>;
  }

  const users = usersQuery.data ?? [];
  const classes = classesQuery.data ?? [];

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Users</h2>
          <p className="mt-0.5 text-sm text-slate-500">Admins can create/manage users and assign class ownership for teachers.</p>
        </div>
      </div>

      {status && (
        <div className={`rounded-xl border px-3 py-2 text-xs font-semibold ${status.ok ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-700"}`}>
          {status.text}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-bold text-slate-800">Create User</h3>
        <form onSubmit={submit} className="grid gap-3 md:grid-cols-5">
          <input
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500"
            placeholder="Username"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            required
          />
          <input
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500"
            placeholder="Password"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          <select
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as "admin" | "teacher" })}
          >
            <option value="teacher">Teacher</option>
            <option value="admin">Admin</option>
          </select>
          <select
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500"
            value={form.class_name}
            onChange={(e) => setForm({ ...form, class_name: e.target.value })}
            disabled={form.role !== "teacher"}
            required={form.role === "teacher"}
          >
            <option value="">Select class</option>
            {classes.map((c) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="rounded-xl bg-blue-800 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {createMutation.isPending ? "Creating..." : "Create"}
          </button>
        </form>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50 px-5 py-3 text-sm font-bold text-slate-800">User Directory</div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/60">
                {[
                  "Username",
                  "Role",
                  "Assigned Class",
                  "Status",
                  "Actions",
                ].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-[9px] font-bold uppercase tracking-widest text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((user: AdminUser) => (
                <tr key={user.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 text-sm font-semibold text-slate-800">{user.username}</td>
                  <td className="px-4 py-3">{renderRoleBadge(user.role)}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{user.class_name || "-"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${user.is_active ? "border border-green-200 bg-green-50 text-green-700" : "border border-slate-200 bg-slate-100 text-slate-500"}`}>
                      {user.is_active ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setDialog({ type: "toggle", user })}
                        disabled={user.id === currentUserId || updateMutation.isPending}
                        className="rounded-lg border border-slate-200 px-2.5 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        {user.is_active ? "Deactivate" : "Activate"}
                      </button>
                      {user.role === "teacher" && (
                        <button
                          type="button"
                          onClick={() => openReassignDialog(user)}
                          className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700 hover:bg-blue-100"
                        >
                          Reassign Class
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openPasswordDialog(user)}
                        className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700 hover:bg-amber-100"
                      >
                        Reset Password
                      </button>
                      <button
                        type="button"
                        onClick={() => setDialog({ type: "delete", user })}
                        disabled={user.id === currentUserId || deleteMutation.isPending}
                        className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-[10px] font-bold text-red-700 hover:bg-red-100 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400">No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {dialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeDialog();
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            {dialog.type === "toggle" && (
              <>
                <h3 className="text-base font-bold text-slate-900">
                  {dialog.user.is_active ? "Deactivate User" : "Activate User"}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {dialog.user.is_active
                    ? `Are you sure you want to deactivate ${dialog.user.username}?`
                    : `Are you sure you want to activate ${dialog.user.username}?`}
                </p>
                <div className="mt-4 flex gap-2">
                  <button type="button" onClick={closeDialog} className="flex-1 rounded-xl border border-slate-200 bg-slate-50 py-2 text-xs font-semibold text-slate-700">
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={submitToggleActive}
                    disabled={updateMutation.isPending}
                    className="flex-1 rounded-xl bg-blue-800 py-2 text-xs font-bold text-white disabled:opacity-50"
                  >
                    Confirm
                  </button>
                </div>
              </>
            )}

            {dialog.type === "reassign" && (
              <>
                <h3 className="text-base font-bold text-slate-900">Reassign Class</h3>
                <p className="mt-1 text-sm text-slate-500">Select a new class for {dialog.user.username}.</p>
                <select
                  className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  value={dialogClass}
                  onChange={(e) => setDialogClass(e.target.value)}
                >
                  <option value="">Select class</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
                <div className="mt-4 flex gap-2">
                  <button type="button" onClick={closeDialog} className="flex-1 rounded-xl border border-slate-200 bg-slate-50 py-2 text-xs font-semibold text-slate-700">
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={submitReassignClass}
                    disabled={updateMutation.isPending}
                    className="flex-1 rounded-xl bg-blue-800 py-2 text-xs font-bold text-white disabled:opacity-50"
                  >
                    Save
                  </button>
                </div>
              </>
            )}

            {dialog.type === "password" && (
              <>
                <h3 className="text-base font-bold text-slate-900">Reset Password</h3>
                <p className="mt-1 text-sm text-slate-500">Set a new password for {dialog.user.username}.</p>
                <input
                  type="password"
                  className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  placeholder="Minimum 6 characters"
                  value={dialogPassword}
                  onChange={(e) => setDialogPassword(e.target.value)}
                />
                <div className="mt-4 flex gap-2">
                  <button type="button" onClick={closeDialog} className="flex-1 rounded-xl border border-slate-200 bg-slate-50 py-2 text-xs font-semibold text-slate-700">
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={submitResetPassword}
                    disabled={updateMutation.isPending}
                    className="flex-1 rounded-xl bg-blue-800 py-2 text-xs font-bold text-white disabled:opacity-50"
                  >
                    Update
                  </button>
                </div>
              </>
            )}

            {dialog.type === "delete" && (
              <>
                <h3 className="text-base font-bold text-slate-900">Delete User</h3>
                <p className="mt-1 text-sm text-slate-500">This will permanently delete {dialog.user.username}.</p>
                <div className="mt-4 flex gap-2">
                  <button type="button" onClick={closeDialog} className="flex-1 rounded-xl border border-slate-200 bg-slate-50 py-2 text-xs font-semibold text-slate-700">
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={submitDeleteUser}
                    disabled={deleteMutation.isPending}
                    className="flex-1 rounded-xl bg-red-700 py-2 text-xs font-bold text-white disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
