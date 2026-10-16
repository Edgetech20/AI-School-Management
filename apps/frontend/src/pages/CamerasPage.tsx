import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createCamera, getCameras } from "../api/cameras";

export function CamerasPage() {
  const queryClient = useQueryClient();
  const camerasQuery = useQuery({ queryKey: ["cameras"], queryFn: getCameras });
  const [form, setForm] = useState({
    device_id: "",
    name: "",
    location: "",
    ip_address: "",
    port: "",
    stream_url: "",
    stream_username: "",
    stream_password: "",
    usage_tag: "both" as "check_in" | "check_out" | "both",
    is_active: true,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);

  const createMutation = useMutation({
    mutationFn: createCamera,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cameras"] });
      setForm({
        device_id: "", name: "", location: "",
        ip_address: "", port: "", stream_url: "",
        stream_username: "", stream_password: "",
        usage_tag: "both", is_active: true,
      });
      setIsModalOpen(false);
    },
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    createMutation.mutate({
      ...form,
      ip_address:      form.ip_address.trim()      || null,
      port:            form.port.trim() ? Number(form.port) : null,
      stream_url:      form.stream_url.trim()      || null,
      stream_username: form.stream_username.trim() || null,
      stream_password: form.stream_password.trim() || null,
    });
  }

  const cameras      = camerasQuery.data ?? [];
  const activeCount  = cameras.filter((c) => c.is_active).length;
  const inactiveCount = cameras.filter((c) => !c.is_active).length;

  const USAGE_OPTIONS: { value: "both" | "check_in" | "check_out"; label: string }[] = [
    { value: "both",      label: "Both"       },
    { value: "check_in",  label: "Check-In"   },
    { value: "check_out", label: "Check-Out"  },
  ];

  return (
    <section className="space-y-4">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Camera Mapping</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Map device IDs to physical locations for multi-location tracking.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-900 to-blue-700 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-900/25 transition hover:from-blue-800 hover:to-blue-600"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" d="M12 5v14M5 12h14" />
          </svg>
          Add Camera
        </button>
      </div>

      {/* ── Stat strip ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total",    value: cameras.length, bg: "bg-blue-50 border-blue-100",   text: "text-blue-800"  },
          { label: "Active",   value: activeCount,    bg: "bg-green-50 border-green-100", text: "text-green-800" },
          { label: "Inactive", value: inactiveCount,  bg: "bg-red-50 border-red-100",     text: "text-red-800"   },
        ].map(({ label, value, bg, text }) => (
          <div key={label} className={`rounded-2xl border p-3.5 ${bg}`}>
            <p className={`text-[9px] font-bold uppercase tracking-widest ${text} opacity-70`}>{label}</p>
            <p className={`text-2xl font-extrabold ${text}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── Camera cards ── */}
      {cameras.length > 0 && (
        <div className="grid gap-3 md:grid-cols-3">
          {cameras.map((cam) => (
            <div key={cam.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className={`flex items-center justify-between px-4 py-3 ${cam.is_active ? "bg-gradient-to-r from-blue-950 to-blue-800" : "bg-gradient-to-r from-slate-700 to-slate-600"}`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10">
                    <svg className={`h-4 w-4 ${cam.is_active ? "text-blue-200" : "text-slate-300"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <circle cx="12" cy="12" r="3" /><path strokeLinecap="round" d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-bold truncate ${cam.is_active ? "text-white" : "text-slate-200"}`}>{cam.name}</p>
                    <p className={`font-mono text-[10px] truncate ${cam.is_active ? "text-blue-300" : "text-slate-400"}`}>{cam.device_id}</p>
                  </div>
                </div>
                <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[9px] font-bold ${cam.is_active ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800"}`}>
                  {cam.is_active ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-4 py-2">
                <svg className="h-3 w-3 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" d="M17.657 16.657A8 8 0 1 1 5.383 4.383M17.657 16.657L22 21M17.657 16.657l-4.243-4.243" />
                </svg>
                <span className="text-xs text-slate-500">{cam.location}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
                <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                  {cam.usage_tag === "check_in" ? "Check-In" : cam.usage_tag === "check_out" ? "Check-Out" : "Both"}
                </span>
                {cam.ip_address && (
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[10px] text-slate-600">
                    {cam.ip_address}{cam.port ? `:${cam.port}` : ""}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Table ── */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
          <h3 className="text-sm font-bold text-slate-800">All Cameras</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/60">
                {["ID", "Device ID", "Name", "Location", "Feed", "Usage", "Status"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-[9px] font-bold uppercase tracking-widest text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cameras.map((row) => (
                <tr key={row.id} className="border-t border-slate-50 transition hover:bg-slate-50/70">
                  <td className="px-4 py-3 text-[11px] font-medium text-slate-400">#{String(row.id).padStart(3, "0")}</td>
                  <td className="px-4 py-3 font-mono text-xs text-blue-700">{row.device_id}</td>
                  <td className="px-4 py-3 text-xs font-semibold text-slate-800">{row.name}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{row.location}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">
                    {row.stream_url || (row.ip_address ? `${row.ip_address}${row.port ? `:${row.port}` : ""}` : "—")}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">{row.usage_tag}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${row.is_active ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800"}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${row.is_active ? "bg-green-500" : "bg-red-400"}`} />
                      {row.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
              {cameras.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-slate-400">
                    No cameras yet — click <span className="font-semibold text-blue-700">Add Camera</span> to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══════════════════════════════════════
          ── Modal (fixed viewport, never overflows) ──
          ══════════════════════════════════════ */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}
        >
          {/* Modal shell — flex column so header+footer are sticky, body scrolls */}
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">

            {/* ── Fixed header ── */}
            <div className="flex shrink-0 items-center justify-between bg-gradient-to-r from-blue-950 to-blue-800 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/20 bg-white/10">
                  <svg className="h-4 w-4 text-blue-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <circle cx="12" cy="12" r="3" /><path strokeLinecap="round" d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Add New Camera</p>
                  <p className="text-[10px] text-blue-300">Register a device to a location</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-white transition hover:bg-white/20"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* ── Scrollable body ── */}
            <form onSubmit={submit} className="flex flex-1 flex-col overflow-hidden">
              <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">

                {/* Section: Basic Info */}
                <div>
                  <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    Basic Info <span className="text-red-400">*</span> Required
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-widest text-slate-500">
                        Camera Name <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Main Gate Cam"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        required
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-300 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 hover:border-slate-300"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-widest text-slate-500">
                          Device ID <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. gate-main"
                          value={form.device_id}
                          onChange={(e) => setForm({ ...form, device_id: e.target.value })}
                          required
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-300 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 hover:border-slate-300"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-widest text-slate-500">
                          Location <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Main Entrance"
                          value={form.location}
                          onChange={(e) => setForm({ ...form, location: e.target.value })}
                          required
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-300 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 hover:border-slate-300"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-slate-100" />

                {/* Section: Network Config */}
                <div>
                  <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    Network Config <span className="font-normal normal-case tracking-normal text-slate-300">(optional)</span>
                  </p>
                  <div className="space-y-3">
                    <div className="grid grid-cols-[1fr_90px] gap-3">
                      <div>
                        <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-widest text-slate-500">IP Address</label>
                        <input
                          type="text"
                          placeholder="192.168.1.120"
                          value={form.ip_address}
                          onChange={(e) => setForm({ ...form, ip_address: e.target.value })}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-mono text-sm text-slate-800 placeholder-slate-300 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 hover:border-slate-300"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-widest text-slate-500">Port</label>
                        <input
                          type="number"
                          placeholder="554"
                          value={form.port}
                          onChange={(e) => setForm({ ...form, port: e.target.value })}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-mono text-sm text-slate-800 placeholder-slate-300 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 hover:border-slate-300"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-widest text-slate-500">Stream URL</label>
                      <input
                        type="text"
                        placeholder="rtsp://..."
                        value={form.stream_url}
                        onChange={(e) => setForm({ ...form, stream_url: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-mono text-sm text-slate-800 placeholder-slate-300 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 hover:border-slate-300"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-widest text-slate-500">Username</label>
                        <input
                          type="text"
                          placeholder="optional"
                          value={form.stream_username}
                          onChange={(e) => setForm({ ...form, stream_username: e.target.value })}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-300 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 hover:border-slate-300"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-widest text-slate-500">Password</label>
                        <input
                          type="password"
                          placeholder="optional"
                          value={form.stream_password}
                          onChange={(e) => setForm({ ...form, stream_password: e.target.value })}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-300 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 hover:border-slate-300"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-slate-100" />

                {/* Section: Settings */}
                <div>
                  <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">Settings</p>
                  <div className="space-y-3">

                    {/* Usage tag — segmented control */}
                    <div>
                      <label className="mb-2 block text-[9px] font-bold uppercase tracking-widest text-slate-500">Usage Tag</label>
                      <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1">
                        {USAGE_OPTIONS.map(({ value, label }) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setForm({ ...form, usage_tag: value })}
                            className={`rounded-lg py-2 text-[11px] font-bold transition ${
                              form.usage_tag === value
                                ? "bg-blue-700 text-white shadow-sm"
                                : "text-slate-500 hover:text-slate-700"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Active toggle */}
                    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div>
                        <p className="text-xs font-semibold text-slate-700">Active on creation</p>
                        <p className="text-[10px] text-slate-400">Camera immediately accepts recognition events</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, is_active: !form.is_active })}
                        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${form.is_active ? "bg-blue-700" : "bg-slate-300"}`}
                      >
                        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${form.is_active ? "translate-x-5" : "translate-x-0.5"}`} />
                      </button>
                    </div>

                  </div>
                </div>
              </div>

              {/* ── Fixed footer ── */}
              <div className="flex shrink-0 gap-2.5 border-t border-slate-100 bg-white px-6 py-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex flex-[2] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-900 to-blue-700 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-900/25 transition hover:from-blue-800 hover:to-blue-600 disabled:opacity-50"
                >
                  {createMutation.isPending ? (
                    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                  ) : (
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" d="M12 5v14M5 12h14"/>
                    </svg>
                  )}
                  {createMutation.isPending ? "Adding..." : "Add Camera"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}