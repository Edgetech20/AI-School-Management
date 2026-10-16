import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { approveReview, getReviewQueue, rejectReview } from "../api/attendance";
import { getStudents } from "../api/students";
import type { Student } from "../types";

export function ReviewQueuePage() {
  const [decisionNote, setDecisionNote] = useState("");
  const [selectedReview, setSelectedReview] = useState<number | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const queryClient = useQueryClient();

  const reviewQuery = useQuery({ queryKey: ["review-queue"], queryFn: getReviewQueue });
  const studentsQuery = useQuery({ queryKey: ["students"], queryFn: getStudents });

  const approveMutation = useMutation({
    mutationFn: ({ reviewId, note }: { reviewId: number; note: string }) => approveReview(reviewId, { note }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["review-queue"] });
      const learningMsg = data?.learning_status 
        ? ` (Encoding: ${data.learning_status.replace(/_/g, " ")})` 
        : "";
      setStatusMsg({ ok: true, text: `Review approved successfully.${learningMsg}` });
      setSelectedReview(null);
      setDecisionNote("");
    },
    onError: () => {
      setStatusMsg({ ok: false, text: "Failed to approve review." });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ reviewId, note }: { reviewId: number; note: string }) => rejectReview(reviewId, { note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["review-queue"] });
      setStatusMsg({ ok: true, text: "Review rejected successfully." });
      setSelectedReview(null);
      setDecisionNote("");
    },
    onError: () => {
      setStatusMsg({ ok: false, text: "Failed to reject review." });
    },
  });

  const handleApprove = (reviewId: number) => {
    approveMutation.mutate({ reviewId, note: decisionNote });
  };

  const handleReject = (reviewId: number) => {
    rejectMutation.mutate({ reviewId, note: decisionNote });
  };

  const rows = reviewQuery.data || [];
  const studentsMap = new Map<number, Student>();
  if (studentsQuery.data) {
    studentsQuery.data.forEach(student => studentsMap.set(student.id, student));
  }

  return (
    <section className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Recognition Review Queue</h1>
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-400">
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="M21 21l-4.35-4.35"/>
          </svg>
          Pending reviews: {rows.length}
        </div>
      </div>

      {/* Adaptive Learning Info */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <div className="flex gap-3">
          <svg className="h-5 w-5 shrink-0 text-blue-600 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 16v-4M12 8h.01"/>
          </svg>
          <div className="text-sm text-blue-900">
            <p className="font-semibold mb-1">✓ Adaptive Learning Active</p>
            <p className="text-xs">When you approve a match, the face image is automatically stored as a new training sample for that student. This improves future recognition accuracy without manual re-uploading.</p>
          </div>
        </div>
      </div>

      {/* Status toast */}
      {statusMsg && (
        <div className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm ${
          statusMsg.ok
            ? "border-green-200 bg-green-50 text-green-800"
            : "border-red-200 bg-red-50 text-red-700"
        }`}>
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {statusMsg.ok
              ? <path strokeLinecap="round" d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3" />
              : <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>
            }
          </svg>
          {statusMsg.text}
        </div>
      )}

      {/* Review Queue Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/60">
                {["Student Name", "Class", "Roll Number", "Event", "Device", "Confidence", "Margin", "Image", "Expires", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.id} className="border-t border-slate-50 transition hover:bg-slate-50/70">
                  <td className="px-4 py-3 text-xs font-semibold text-slate-800">{studentsMap.get(item.student_id)?.name || `ID: ${item.student_id}`}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{studentsMap.get(item.student_id)?.class_name || '-'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{studentsMap.get(item.student_id)?.roll_number || '-'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{item.event_type}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{item.device_id}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{(item.confidence * 100).toFixed(1)}%</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{item.margin.toFixed(4)}</td>
                  <td className="px-4 py-3">
                    {item.image_data ? (
                      <img
                        src={`data:image/jpeg;base64,${item.image_data}`}
                        alt="Captured face"
                        className="w-16 h-16 object-cover rounded border"
                      />
                    ) : (
                      <span className="text-xs text-slate-400">No image</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{new Date(item.expires_at).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    {selectedReview === item.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Optional note"
                          value={decisionNote}
                          onChange={(e) => setDecisionNote(e.target.value)}
                          className="rounded border border-slate-200 px-2 py-1 text-xs"
                        />
                        <button
                          onClick={() => handleApprove(item.id)}
                          className="rounded bg-green-500 px-2 py-1 text-xs text-white hover:bg-green-600"
                          disabled={approveMutation.isPending}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(item.id)}
                          className="rounded bg-red-500 px-2 py-1 text-xs text-white hover:bg-red-600"
                          disabled={rejectMutation.isPending}
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => setSelectedReview(null)}
                          className="rounded bg-gray-500 px-2 py-1 text-xs text-white hover:bg-gray-600"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setSelectedReview(item.id)}
                        className="rounded bg-blue-500 px-3 py-1 text-xs text-white hover:bg-blue-600"
                      >
                        Review
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-sm text-slate-400">
                    No pending reviews.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}