import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getNotificationSettings, updateNotificationSettings } from "../api/settings";
import type { NotificationSettings } from "../types";

const EMPTY_FORM: NotificationSettings = {
  smtp_enabled: false,
  sms_enabled: true,
  hybrid_learning_enabled: false,
  smtp_host: "",
  smtp_port: 1025,
  smtp_username: "",
  smtp_password: "",
  smtp_encryption: "tls",
  smtp_from_email: "",
  smtp_from_name: "",
  sms_provider: "console",
  sms_webhook_url: "",
  parent_notifications_enabled: true,
};

export function SetupPage() {
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({ queryKey: ["notification-settings"], queryFn: getNotificationSettings });
  const [form, setForm] = useState<NotificationSettings>(EMPTY_FORM);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    if (settingsQuery.data) {
      setForm(settingsQuery.data);
    }
  }, [settingsQuery.data]);

  const mutation = useMutation({
    mutationFn: (payload: NotificationSettings) => updateNotificationSettings(payload),
    onSuccess: (data) => {
      queryClient.setQueryData(["notification-settings"], data);
      setForm(data);
      setStatus({ ok: true, message: "Notification setup saved." });
    },
    onError: (err: any) => {
      setStatus({ ok: false, message: err?.response?.data?.detail || "Failed to save setup" });
    },
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    mutation.mutate(form);
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">System Setup</h2>
        <p className="mt-0.5 text-sm text-slate-500">Configure hybrid learning and notification channels dynamically at runtime.</p>
      </div>

      {status && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${status.ok ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-700"}`}>
          {status.message}
        </div>
      )}

      <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="md:col-span-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.smtp_enabled}
              onChange={(e) => setForm({ ...form, smtp_enabled: e.target.checked })}
            />
            SMTP enabled
          </label>
          <label className="md:col-span-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.sms_enabled}
              onChange={(e) => setForm({ ...form, sms_enabled: e.target.checked })}
            />
            SMS enabled
          </label>
          <label className="md:col-span-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2.5 text-sm text-violet-800">
            <span className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.hybrid_learning_enabled}
                onChange={(e) => setForm({ ...form, hybrid_learning_enabled: e.target.checked })}
              />
              Hybrid Learning Mode enabled
            </span>
            <p className="mt-1.5 pl-6 text-xs text-violet-700">
              When ON: Assisted and adaptive learning are active. When OFF: classic matching is used.
            </p>
          </label>
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-500">SMTP Host</label>
            <input
              value={form.smtp_host}
              onChange={(e) => setForm({ ...form, smtp_host: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"
              placeholder="localhost"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-500">SMTP Port</label>
            <input
              type="number"
              min={1}
              max={65535}
              value={form.smtp_port}
              onChange={(e) => setForm({ ...form, smtp_port: Number(e.target.value || 0) })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-500">SMTP Username</label>
            <input
              value={form.smtp_username}
              onChange={(e) => setForm({ ...form, smtp_username: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-500">SMTP Password</label>
            <input
              type="password"
              value={form.smtp_password}
              onChange={(e) => setForm({ ...form, smtp_password: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-500">SMTP Encryption</label>
            <select
              value={form.smtp_encryption}
              onChange={(e) => setForm({ ...form, smtp_encryption: e.target.value as "none" | "tls" | "ssl" })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"
            >
              <option value="none">none</option>
              <option value="tls">tls</option>
              <option value="ssl">ssl</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-500">SMTP From Name</label>
            <input
              value={form.smtp_from_name}
              onChange={(e) => setForm({ ...form, smtp_from_name: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"
              placeholder="School Attendance"
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-500">SMTP From Email</label>
            <input
              value={form.smtp_from_email}
              onChange={(e) => setForm({ ...form, smtp_from_email: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"
              placeholder="no-reply@school.local"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-500">SMS Provider</label>
            <select
              value={form.sms_provider}
              onChange={(e) => setForm({ ...form, sms_provider: e.target.value as "console" | "webhook" })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"
            >
              <option value="console">console</option>
              <option value="webhook">webhook</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-500">SMS Webhook URL</label>
            <input
              value={form.sms_webhook_url}
              onChange={(e) => setForm({ ...form, sms_webhook_url: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"
              placeholder="https://example.com/webhook"
            />
          </div>
          <label className="md:col-span-2 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.parent_notifications_enabled}
              onChange={(e) => setForm({ ...form, parent_notifications_enabled: e.target.checked })}
            />
            Parent notifications enabled
          </label>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            disabled={mutation.isPending || settingsQuery.isLoading}
            className="rounded-xl bg-blue-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {mutation.isPending ? "Saving..." : "Save Setup"}
          </button>
        </div>
      </form>
    </section>
  );
}
