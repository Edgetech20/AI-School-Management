import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChangeEvent, FormEvent, useState } from "react";

import { getClasses } from "../api/classes";
import { createStudent, downloadStudentsImportTemplate, getStudents, importStudentsCsv } from "../api/students";
import { uploadStudentFace } from "../api/face";

// ── Utility: generate avatar initials + colour ──────────────────────────────
const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-purple-100 text-purple-700",
  "bg-pink-100 text-pink-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-sky-100 text-sky-700",
];
function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}
function getAvatarColor(id: number) {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

// ── Face sample badge ────────────────────────────────────────────────────────
function FaceBadge({ samples }: { samples?: number }) {
  if (!samples || samples === 0)
    return <span className="inline-block rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-[10px] font-bold text-red-700">No face</span>;
  if (samples < 3)
    return <span className="inline-block rounded-full border border-yellow-200 bg-yellow-50 px-2.5 py-0.5 text-[10px] font-bold text-yellow-700">{samples} sample{samples > 1 ? "s" : ""}</span>;
  return <span className="inline-block rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-[10px] font-bold text-green-700">{samples} samples</span>;
}

export function StudentsPage() {
  const [form, setForm] = useState({
    name: "",
    class_name: "",
    roll_number: "",
    parent_phone: "",
    parent_email: "",
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploadingStudentId, setUploadingStudentId] = useState<number | null>(null);
  const [uploadStatus, setUploadStatus] = useState<{ message: string; ok: boolean } | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const queryClient = useQueryClient();
  const studentsQuery = useQuery({ queryKey: ["students"], queryFn: getStudents });
  const classesQuery = useQuery({ queryKey: ["classes"], queryFn: getClasses });

  const createMutation = useMutation({
    mutationFn: createStudent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      setForm({ name: "", class_name: "", roll_number: "", parent_phone: "", parent_email: "" });
      setIsModalOpen(false);
    },
  });

  const uploadFaceMutation = useMutation({
    mutationFn: ({ studentId, files }: { studentId: number; files: File[] }) =>
      uploadStudentFace(studentId, files),
    onSuccess: (data: any) => {
      const skipped = Array.isArray(data.skipped_files) ? data.skipped_files.length : 0;
      setUploadStatus({
        ok: true,
        message: `Added ${data.added_samples ?? 0} sample(s). Total: ${data.total_samples ?? 0}${skipped > 0 ? `, Skipped: ${skipped}` : ""}`,
      });
      setUploadingStudentId(null);
      setTimeout(() => setUploadStatus(null), 3000);
    },
    onError: (err: any) => {
      setUploadStatus({ ok: false, message: err.response?.data?.detail || "Upload failed" });
      setUploadingStudentId(null);
    },
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    createMutation.mutate(form);
  }

  function handleFaceUpload(e: ChangeEvent<HTMLInputElement>, studentId: number) {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) {
      setUploadingStudentId(studentId);
      uploadFaceMutation.mutate({ studentId, files });
    }
    e.target.value = "";
  }

  async function handleTemplateDownload() {
    try {
      const blob = await downloadStudentsImportTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "students_import_template.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setUploadStatus({ ok: false, message: "Failed to download sample sheet" });
    }
  }

  async function handleCsvImport(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      const result = await importStudentsCsv(file);
      queryClient.invalidateQueries({ queryKey: ["students"] });
      setUploadStatus({ ok: true, message: `Imported ${result.imported ?? 0}, Skipped ${result.skipped ?? 0}` });
    } catch (err: any) {
      setUploadStatus({ ok: false, message: err.response?.data?.detail || "CSV import failed" });
    } finally {
      setIsImporting(false);
      e.target.value = "";
    }
  }

  const students = studentsQuery.data ?? [];
  const classes = classesQuery.data ?? [];
  const totalStudents = students.length;
  const faceEnrolledCount = students.filter((student) => (student.face_samples ?? 0) > 0).length;
  const pendingEnrollCount = totalStudents - faceEnrolledCount;

  return (
    <section className="space-y-4">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Students</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Upload 3–5 photos per student for best recognition accuracy.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Download template */}
          <button
            type="button"
            onClick={handleTemplateDownload}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Sample Sheet
          </button>

          {/* Import CSV */}
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
            </svg>
            {isImporting ? "Importing..." : "Import CSV"}
            <input type="file" accept=".csv,text/csv" onChange={handleCsvImport} className="hidden" disabled={isImporting} />
          </label>

          {/* Add Student → opens modal */}
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-900 to-blue-700 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-900/25 transition hover:from-blue-800 hover:to-blue-600"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" d="M12 5v14M5 12h14" />
            </svg>
            Add Student
          </button>
        </div>
      </div>

      {/* ── Status toast ── */}
      {uploadStatus && (
        <div className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm ${
          uploadStatus.ok
            ? "border-green-200 bg-green-50 text-green-800"
            : "border-red-200 bg-red-50 text-red-700"
        }`}>
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {uploadStatus.ok
              ? <path strokeLinecap="round" d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3" />
              : <><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>
            }
          </svg>
          {uploadStatus.message}
        </div>
      )}

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: "Total Students", value: totalStudents,
            color: "text-blue-800", bg: "bg-blue-50 border-blue-100",
            icon: <svg className="h-4 w-4 text-blue-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path strokeLinecap="round" d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
          },
          {
            label: "Face Enrolled", value: faceEnrolledCount,
            color: "text-emerald-800", bg: "bg-emerald-50 border-emerald-100",
            icon: <svg className="h-4 w-4 text-emerald-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M7 3H5a2 2 0 0 0-2 2v2M17 3h2a2 2 0 0 1 2 2v2M7 21H5a2 2 0 0 1-2-2v-2M17 21h2a2 2 0 0 0 2-2v-2"/><circle cx="12" cy="11" r="3"/><path strokeLinecap="round" d="M9 17c0-1.657 1.343-3 3-3s3 1.343 3 3"/></svg>,
          },
          {
            label: "Pending Enroll", value: pendingEnrollCount,
            color: "text-amber-800", bg: "bg-amber-50 border-amber-100",
            icon: <svg className="h-4 w-4 text-amber-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4M12 16h.01"/></svg>,
          },
        ].map(({ label, value, color, bg, icon }) => (
          <div key={label} className={`flex items-center gap-3 rounded-2xl border p-3.5 ${bg}`}>
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${bg}`}>
              {icon}
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
              <p className={`text-xl font-extrabold ${color}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Table ── */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3">
          <h3 className="text-sm font-bold text-slate-800">Student Directory</h3>
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-400">
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" />
            </svg>
            Search students...
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/60">
                {["ID", "Name", "Class", "Roll", "Parent Email", "Face Data", "Upload"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id} className="border-t border-slate-50 transition hover:bg-slate-50/70">
                  <td className="px-4 py-3 text-[11px] font-medium text-slate-400">#{String(student.id).padStart(3, "0")}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${getAvatarColor(student.id)}`}>
                        {getInitials(student.name)}
                      </div>
                      <span className="text-xs font-semibold text-slate-800">{student.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                      {student.class_name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{student.roll_number}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{student.parent_email}</td>
                  <td className="px-4 py-3">
                    <FaceBadge samples={student.face_samples} />
                  </td>
                  <td className="px-4 py-3">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => handleFaceUpload(e, student.id)}
                        disabled={uploadingStudentId === student.id}
                        className="hidden"
                      />
                      <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-bold transition ${
                        uploadingStudentId === student.id
                          ? "border-slate-200 bg-slate-50 text-slate-400"
                          : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                      }`}>
                        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                        </svg>
                        {uploadingStudentId === student.id ? "Uploading..." : "Upload"}
                      </span>
                    </label>
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-slate-400">
                    No students yet — click <span className="font-semibold text-blue-700">Add Student</span> to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal ── */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}
        >
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">

            {/* Modal header */}
            <div className="flex items-center justify-between bg-gradient-to-r from-blue-950 to-blue-800 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/20 bg-white/10">
                  <svg className="h-4 w-4 text-blue-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path strokeLinecap="round" d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path strokeLinecap="round" d="M19 8v6M22 11h-6" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Add New Student</p>
                  <p className="text-[10px] text-blue-300">Fill all fields to register</p>
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

            {/* Modal body */}
            <form onSubmit={submit} className="p-6">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Full Name", key: "name", placeholder: "Student name", colSpan: false },
                  { label: "Roll Number", key: "roll_number", placeholder: "Roll no.", colSpan: false },
                  { label: "Parent Phone", key: "parent_phone", placeholder: "+91 XXXXX XXXXX", colSpan: false },
                ].map(({ label, key, placeholder }) => (
                  <div key={key}>
                    <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-widest text-slate-500">
                      {label}
                    </label>
                    <input
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-300 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 hover:border-slate-300"
                      placeholder={placeholder}
                      value={(form as any)[key]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      required
                    />
                  </div>
                ))}

                <div>
                  <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-widest text-slate-500">
                    Class
                  </label>
                  <select
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 hover:border-slate-300"
                    value={form.class_name}
                    onChange={(e) => setForm({ ...form, class_name: e.target.value })}
                    required
                  >
                    <option value="">Select class</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-widest text-slate-500">
                    Parent Email
                  </label>
                  <input
                    type="email"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-300 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 hover:border-slate-300"
                    placeholder="parent@example.com"
                    value={form.parent_email}
                    onChange={(e) => setForm({ ...form, parent_email: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Info hint */}
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5">
                <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                </svg>
                <p className="text-[11px] text-blue-600">
                  After adding, upload <span className="font-semibold">3–5 face photos</span> from the table for accurate recognition.
                </p>
              </div>

              {/* Buttons */}
              <div className="mt-5 flex gap-2.5">
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
                    <>
                      <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Adding...
                    </>
                  ) : (
                    <>
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path strokeLinecap="round" d="M19 8v6M22 11h-6" />
                      </svg>
                      Add Student
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}