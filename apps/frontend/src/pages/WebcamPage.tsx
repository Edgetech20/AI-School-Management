import { useCallback, useEffect, useRef, useState } from "react";
import { recognizeFacesFromFrame, RecognitionResponse, recognizeFacesFromMappedCamera } from "../api/face";
import { getCameras } from "../api/cameras";
import { useQuery } from "@tanstack/react-query";

const STATUS_STYLES: Record<string, string> = {
  Pending:    "bg-indigo-50 border-indigo-200 text-indigo-800",
  Present:    "bg-green-50 border-green-200 text-green-800",
  Late:       "bg-yellow-50 border-yellow-200 text-yellow-800",
  "Half-day": "bg-sky-50 border-sky-200 text-sky-800",
  Absent:     "bg-red-50 border-red-200 text-red-800",
};

export function WebcamPage() {
  const videoRef       = useRef<HTMLVideoElement>(null);
  const imageRef       = useRef<HTMLImageElement>(null);
  const canvasRef      = useRef<HTMLCanvasElement>(null);
  const intervalRef    = useRef<number | null>(null);
  const isProcessingRef = useRef(false);

  const camerasQuery = useQuery({ queryKey: ["cameras"], queryFn: getCameras });

  const [sourceMode, setSourceMode]       = useState<"local" | "mapped">("local");
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [stream, setStream]               = useState<MediaStream | null>(null);
  const [eventType, setEventType]         = useState<"check_in" | "check_out">("check_in");
  const [deviceId, setDeviceId]           = useState("gate-main");
  const [isGateModeActive, setIsGateModeActive] = useState(false);
  const [results, setResults]             = useState<RecognitionResponse[]>([]);
  const [status, setStatus]               = useState<"idle" | "capturing" | "processing">("idle");
  const [error, setError]                 = useState("");

  const cameras = camerasQuery.data ?? [];
  const activeCameras = cameras.filter((c) => c.is_active);
  const selectedCamera = activeCameras.find((c) => String(c.id) === selectedCameraId) ?? null;

  const streamPreviewUrl = selectedCamera?.stream_url || (selectedCamera?.ip_address
    ? `http://${selectedCamera.ip_address}${selectedCamera.port ? `:${selectedCamera.port}` : ""}`
    : "");

  const inferredEventType =
    sourceMode === "mapped" && selectedCamera && selectedCamera.usage_tag !== "both"
      ? selectedCamera.usage_tag
      : eventType;

  // ── Init camera ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (sourceMode !== "local") {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        setStream(null);
      }
      return;
    }

    const initCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        setStream(mediaStream);
        if (videoRef.current) videoRef.current.srcObject = mediaStream;
      } catch {
        setError("Unable to access camera. Please check permissions.");
      }
    };

    initCamera();

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
        videoRef.current.srcObject = null;
      }
    };
  }, [sourceMode]);

  useEffect(() => {
    if (sourceMode !== "mapped") return;
    if (!selectedCameraId && activeCameras.length > 0) {
      const first = activeCameras[0];
      setSelectedCameraId(String(first.id));
      setDeviceId(first.device_id);
      return;
    }
    if (selectedCamera) {
      setDeviceId(selectedCamera.device_id);
    }
  }, [sourceMode, selectedCameraId, activeCameras.length, selectedCamera?.device_id]);

  // ── Capture & recognise ───────────────────────────────────────────────────
  const captureAndRecognize = useCallback(async () => {
    if (isProcessingRef.current) return;
    if (!canvasRef.current) return;

    try {
      isProcessingRef.current = true;
      setStatus("capturing");
      const canvas  = canvasRef.current;
      const context = canvas.getContext("2d");
      if (!context) return;

      if (sourceMode === "mapped") {
        try {
          setStatus("processing");
          const autoMappedType = selectedCamera && selectedCamera.usage_tag !== "both" ? undefined : inferredEventType;
          const res = await recognizeFacesFromMappedCamera(deviceId, autoMappedType);
          setResults((prev) => {
            if (isGateModeActive && res.matches.length === 0 && prev.length > 0 && prev[prev.length - 1].matches.length > 0) {
              return prev;
            }
            return [...prev, res].slice(-5); // Keep last 5
          });
          setError("");
        } catch (err: any) {
          setError(err.response?.data?.detail || "Mapped camera recognition failed");
          setResults([]);
        } finally {
          setStatus("idle");
          isProcessingRef.current = false;
        }
        return;
      } else {
        if (!videoRef.current) {
          setStatus("idle");
          isProcessingRef.current = false;
          return;
        }
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
      }

      canvas.toBlob(
        async (blob) => {
          if (!blob) return;
          try {
            setStatus("processing");
            const file = new File([blob], "frame.jpg", { type: "image/jpeg" });
            const autoMappedType = selectedCamera && selectedCamera.usage_tag !== "both"
              ? undefined
              : inferredEventType;
            const res = await recognizeFacesFromFrame(file, deviceId, autoMappedType);
            setResults((prev) => {
              if (isGateModeActive && res.matches.length === 0 && prev.length > 0 && prev[prev.length - 1].matches.length > 0) {
                return prev;
              }
              return [...prev, res].slice(-5); // Keep last 5
            });
            setError("");
          } catch (err: any) {
            setError(err.response?.data?.detail || "Recognition failed");
            setResults([]);
          } finally {
            setStatus("idle");
            isProcessingRef.current = false;
          }
        },
        "image/jpeg",
        0.95,
      );
    } catch {
      setError("Failed to capture frame.");
      setStatus("idle");
      isProcessingRef.current = false;
    }
  }, [deviceId, inferredEventType, isGateModeActive, sourceMode, selectedCamera?.usage_tag]);

  // ── Gate mode toggle ──────────────────────────────────────────────────────
  const toggleGateMode = () => {
    if (isGateModeActive) {
      if (intervalRef.current) { window.clearInterval(intervalRef.current); intervalRef.current = null; }
      setIsGateModeActive(false);
      return;
    }
    setIsGateModeActive(true);
    captureAndRecognize();
    intervalRef.current = window.setInterval(captureAndRecognize, 1500);
  };

  // ── Status label ─────────────────────────────────────────────────────────
  const statusLabel =
    status === "capturing"  ? "Capturing frame…" :
    status === "processing" ? "Processing…"      :
    isGateModeActive        ? "Gate mode · Live scanning" :
    "Idle · Ready to scan";

  const statusDot = isGateModeActive || status !== "idle" ? "bg-green-500 animate-pulse" : "bg-slate-400";
  const canCapture = sourceMode === "local" ? Boolean(stream) : Boolean(selectedCamera);

  return (
    <section className="space-y-4">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Live Face Recognition</h2>
          <p className="mt-0.5 text-sm text-slate-500">Real-time face detection and attendance logging.</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <span className={`h-2 w-2 rounded-full ${canCapture ? "bg-green-500" : "bg-red-400"}`} />
          <span className="text-xs font-semibold text-slate-500">
            {sourceMode === "local"
              ? stream
                ? "Laptop Camera Active"
                : "No Local Camera"
              : streamPreviewUrl
                ? "Mapped Camera Selected (Preview)"
                : "Mapped Camera Selected (Backend Capture)"}
          </span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">

        {/* ── Left: Camera + Controls (3/5) ── */}
        <div className="flex flex-col gap-3 lg:col-span-3">

          {/* Video feed */}
          <div className="relative aspect-video overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
            {sourceMode === "local" ? (
              <video ref={videoRef} autoPlay playsInline className="h-full w-full object-cover" />
            ) : streamPreviewUrl ? (
              <img
                ref={imageRef}
                src={streamPreviewUrl}
                alt="Mapped camera stream"
                className="h-full w-full object-cover"
                onError={() => setError("Unable to load mapped camera stream. Verify URL and network access.")}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm text-slate-300">
                Select a mapped camera with a valid stream URL
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />

            {/* Scan-corner overlay */}
            {(["tl","tr","bl","br"] as const).map((c) => (
              <div
                key={c}
                className={`absolute h-6 w-6 border-blue-500 ${
                  c === "tl" ? "left-3 top-3 border-l-2 border-t-2 rounded-tl" :
                  c === "tr" ? "right-3 top-3 border-r-2 border-t-2 rounded-tr" :
                  c === "bl" ? "left-3 bottom-3 border-b-2 border-l-2 rounded-bl" :
                               "right-3 bottom-3 border-b-2 border-r-2 rounded-br"
                }`}
              />
            ))}

            {/* Gate mode scan-line */}
            {isGateModeActive && (
              <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-[scan_1.5s_linear_infinite]" />
            )}

            {/* Status pill */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/75 px-3 py-1.5 backdrop-blur-sm">
              <span className={`h-1.5 w-1.5 rounded-full ${statusDot}`} />
              <span className="text-[10px] font-semibold text-slate-200">{statusLabel}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-widest text-slate-500">
                  Source
                </label>
                <select
                  value={sourceMode}
                  onChange={(e) => setSourceMode(e.target.value as "local" | "mapped")}
                  disabled={isGateModeActive}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 disabled:opacity-50"
                >
                  <option value="local">Local Webcam</option>
                  <option value="mapped">Mapped CCTV/IP Camera</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-widest text-slate-500">
                  Mapped Camera
                </label>
                <select
                  value={selectedCameraId}
                  onChange={(e) => setSelectedCameraId(e.target.value)}
                  disabled={isGateModeActive || sourceMode !== "mapped"}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 disabled:opacity-50"
                >
                  <option value="">Select camera...</option>
                  {activeCameras.map((cam) => (
                    <option key={cam.id} value={String(cam.id)}>
                      {cam.name} ({cam.device_id})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-3 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-widest text-slate-500">
                  Event Type
                </label>
                <select
                  value={inferredEventType}
                  onChange={(e) => setEventType(e.target.value as "check_in" | "check_out")}
                  disabled={
                    isGateModeActive ||
                    (sourceMode === "mapped" && selectedCamera?.usage_tag !== "both")
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 disabled:opacity-50"
                >
                  <option value="check_in">Check In (Morning)</option>
                  <option value="check_out">Check Out (Evening)</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-widest text-slate-500">
                  Device / Camera ID
                </label>
                <input
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                  disabled={isGateModeActive || sourceMode === "mapped"}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-300 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 disabled:opacity-50"
                />
              </div>
            </div>

            {sourceMode === "mapped" && selectedCamera?.usage_tag !== "both" && (
              <div className="mb-3 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
                Event type auto-mapped from camera tag: <span className="font-bold">{selectedCamera?.usage_tag}</span>
              </div>
            )}

            {sourceMode === "mapped" && (
              <div className="mb-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                Mapped mode captures frames on backend server, so CORS/RTSP browser limits are bypassed.
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {/* Capture once */}
              <button
                onClick={captureAndRecognize}
                disabled={!canCapture || isGateModeActive || status !== "idle"}
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-900 to-blue-700 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-900/25 transition hover:from-blue-800 hover:to-blue-600 disabled:opacity-40"
              >
                {status !== "idle" ? (
                  <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                ) : (
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="3"/>
                    <path strokeLinecap="round" d="M6.343 6.343A8 8 0 1 0 17.657 17.657"/>
                  </svg>
                )}
                {status === "capturing" ? "Capturing…" : status === "processing" ? "Processing…" : "Capture Once"}
              </button>

              {/* Gate mode */}
              <button
                onClick={toggleGateMode}
                disabled={!canCapture}
                className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold text-white shadow-md transition disabled:opacity-40 ${
                  isGateModeActive
                    ? "bg-gradient-to-r from-red-700 to-red-600 shadow-red-900/20 hover:from-red-600 hover:to-red-500"
                    : "bg-gradient-to-r from-emerald-800 to-emerald-600 shadow-emerald-900/20 hover:from-emerald-700 hover:to-emerald-500"
                }`}
              >
                {isGateModeActive ? (
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="6" y="6" width="12" height="12" rx="1"/>
                  </svg>
                ) : (
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                )}
                {isGateModeActive ? "Stop Gate Mode" : "Start Gate Mode"}
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Results + Guide (2/5) ── */}
        <div className="flex flex-col gap-3 lg:col-span-2">

          {/* Results card */}
          <div className="flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 bg-gradient-to-r from-blue-950 to-blue-800 px-5 py-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10">
                <svg className="h-4 w-4 text-blue-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" d="M7 3H5a2 2 0 0 0-2 2v2M17 3h2a2 2 0 0 1 2 2v2M7 21H5a2 2 0 0 1-2-2v-2M17 21h2a2 2 0 0 0 2-2v-2"/>
                  <circle cx="12" cy="11" r="3"/>
                  <path strokeLinecap="round" d="M9 17c0-1.657 1.343-3 3-3s3 1.343 3 3"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-white">Recognition Results</p>
                <p className="text-[10px] text-blue-300">Latest 5 scans</p>
              </div>
            </div>

            <div className="p-4">
              {results.length > 0 ? (
                <div className="space-y-3">
                  {results.slice(-5).reverse().map((result, scanIdx) => (
                    <div key={scanIdx} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-700">Scan #{results.length - scanIdx}</p>
                        <div className="flex gap-2">
                          <div className="rounded-lg border border-green-200 bg-green-50 px-2 py-1 text-center">
                            <p className="text-[8px] font-bold uppercase tracking-widest text-green-700">Matched</p>
                            <p className="text-sm font-extrabold text-green-800">{result.matched_count}</p>
                          </div>
                          <div className="rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-center">
                            <p className="text-[8px] font-bold uppercase tracking-widest text-blue-700">Detected</p>
                            <p className="text-sm font-extrabold text-blue-800">{result.detected_faces ?? result.matches.length}</p>
                          </div>
                        </div>
                      </div>
                      {result.matches.length > 0 ? (
                        <div className="space-y-1">
                          {result.matches.map((match, idx) => (
                            <div key={idx} className="rounded-lg border border-green-200 bg-green-50 p-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-200 text-[8px] font-bold text-green-800">
                                    {String(match.student_id).slice(-2)}
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-slate-800">{match.student_name || `STU-${match.student_id}`}</p>
                                    <p className="text-[9px] text-slate-500">{match.class_name || `ID ${match.student_id}`}</p>
                                  </div>
                                </div>
                                <span className={`inline-block rounded-full border px-1.5 py-0.5 text-[8px] font-bold ${STATUS_STYLES[match.status] ?? "bg-slate-50 border-slate-200 text-slate-600"}`}>
                                  {match.status}
                                </span>
                              </div>
                              <div className="mt-1 flex items-center gap-2">
                                <div className="h-1 flex-1 overflow-hidden rounded-full bg-green-200">
                                  <div
                                    className="h-full rounded-full bg-green-600 transition-all"
                                    style={{ width: `${(match.confidence * 100).toFixed(0)}%` }}
                                  />
                                </div>
                                <span className="text-[9px] font-bold text-green-700">
                                  {(match.confidence * 100).toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 px-2 py-1.5">
                          <svg className="h-3 w-3 shrink-0 text-yellow-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4M12 16h.01"/>
                          </svg>
                          <p className="text-[10px] font-semibold text-yellow-800">
                            {result.outcome === "no_face"
                              ? "No face detected in frame"
                              : result.outcome === "unknown"
                                ? `Face detected but unknown${result.nearest_candidate ? ` (nearest: ${result.nearest_candidate})` : ""}`
                                : "No matches"}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
                    <svg className="h-6 w-6 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" d="M7 3H5a2 2 0 0 0-2 2v2M17 3h2a2 2 0 0 1 2 2v2M7 21H5a2 2 0 0 1-2-2v-2M17 21h2a2 2 0 0 0 2-2v-2"/>
                      <circle cx="12" cy="11" r="3"/>
                    </svg>
                  </div>
                  <p className="text-xs font-semibold text-slate-400">No results yet</p>
                  <p className="mt-1 text-[11px] text-slate-300">Capture a frame to begin</p>
                </div>
              )}
            </div>
          </div>

          {/* How it works */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <svg className="h-3.5 w-3.5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/>
              </svg>
              <p className="text-xs font-bold text-slate-800">How It Works</p>
            </div>
            <ol className="space-y-2">
              {[
                "Choose source: local webcam or mapped CCTV",
                "If mapped, select active camera with stream URL",
                "Select event type (check-in / check-out)",
                "Face students toward the camera",
                "Start Gate Mode for continuous scanning",
                "Stop mode when the session ends",
              ].map((step, i) => (
                <li key={i} className="flex items-center gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-[9px] font-bold text-blue-700">
                    {i + 1}
                  </span>
                  <span className="text-[11px] text-slate-500">{step}</span>
                </li>
              ))}
            </ol>
          </div>

        </div>
      </div>
    </section>
  );
}