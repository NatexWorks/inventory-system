"use client";

import { useEffect, useRef, useState } from "react";
import { MdCameraAlt, MdFlashOn, MdFlipCameraIos, MdOutlineQrCodeScanner, MdStop } from "react-icons/md";
import { BarcodeFormat } from "@zxing/library";
import { BrowserMultiFormatOneDReader } from "@zxing/browser";

const LAST_CAMERA_KEY = "inventory-saas:last-camera";

// The scanner is optimized for the formats we actually use in inventory workflows.
const ZXING_FORMATS = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.CODE_128,
];

// BarcodeDetector uses string format names rather than ZXing enums.
const BARCODE_DETECTOR_FORMATS = ["ean_13", "ean_8", "upc_a", "code_128"];

// A centered band reduces the amount of image data we decode while keeping 1D barcode scanning accurate.
const ROI_WIDTH_RATIO = 0.68;
const ROI_HEIGHT_RATIO = 0.24;
const MAX_SCAN_WIDTH = 640;
const MIN_SCAN_INTERVAL_MS = 60;
const DUPLICATE_SUPPRESSION_MS = 1500;

function detectSupport() {
  return (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    !!navigator.mediaDevices?.enumerateDevices
  );
}

function isLikelyTouchDevice() {
  if (typeof navigator === "undefined" || typeof window === "undefined") {
    return false;
  }

  return Boolean(
    navigator.maxTouchPoints > 0 ||
      window.matchMedia?.("(pointer: coarse)")?.matches ||
      window.matchMedia?.("(hover: none)")?.matches
  );
}

function getInitialCameraValue() {
  if (typeof window === "undefined") {
    return "mode:environment";
  }

  if (isLikelyTouchDevice()) {
    return "mode:environment";
  }

  try {
    return window.localStorage.getItem(LAST_CAMERA_KEY) || "mode:environment";
  } catch {
    return "mode:environment";
  }
}

function cameraLabel(value, index, device) {
  if (value === "mode:environment") return "Rear camera";
  if (value === "mode:user") return "Front camera";
  return device?.label || `Camera ${index + 1}`;
}

function normalizeCode(value) {
  return String(value || "").trim();
}

function isRecoverableScanError(error) {
  const name = error?.name;
  return name === "NotFoundException" || name === "ChecksumException" || name === "FormatException" || name === "NotFoundError";
}

function getScanRectangle(videoWidth, videoHeight) {
  const width = Math.max(1, Math.round(videoWidth * ROI_WIDTH_RATIO));
  const height = Math.max(1, Math.round(videoHeight * ROI_HEIGHT_RATIO));
  const x = Math.max(0, Math.round((videoWidth - width) / 2));
  const y = Math.max(0, Math.round((videoHeight - height) / 2));

  return { x, y, width, height };
}

function pickBestDetection(detections) {
  if (!Array.isArray(detections) || detections.length === 0) {
    return null;
  }

  const preferred = detections.find((entry) => BARCODE_DETECTOR_FORMATS.includes(entry?.format));
  return normalizeCode(preferred?.rawValue || detections[0]?.rawValue || "");
}

function buildHighResolutionCandidates(cameraValue) {
  const cameraSelectors = [];
  const forceRearCamera = isLikelyTouchDevice();

  if (!forceRearCamera && cameraValue.startsWith("device:")) {
    const deviceId = cameraValue.replace("device:", "");
    cameraSelectors.push(
      { deviceId: { exact: deviceId } },
      { facingMode: { ideal: "environment" } },
      { facingMode: { ideal: "user" } }
    );
  } else {
    const preferredFacingMode = forceRearCamera ? "environment" : cameraValue === "mode:user" ? "user" : "environment";
    const fallbackFacingMode = preferredFacingMode === "user" ? "environment" : "user";
    cameraSelectors.push({ facingMode: { ideal: preferredFacingMode } });

    if (!forceRearCamera) {
      cameraSelectors.push({ facingMode: { ideal: fallbackFacingMode } });
    }
  }

  const commonCameraAttempts = [
    {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30, max: 30 },
    },
    {
      width: { ideal: 960 },
      height: { ideal: 540 },
      frameRate: { ideal: 24, max: 30 },
    },
    {
      frameRate: { ideal: 24, max: 30 },
    },
  ];

  return cameraSelectors.flatMap((cameraSelector) =>
    commonCameraAttempts.map((extra) => ({
      audio: false,
      video: {
        ...cameraSelector,
        ...extra,
        aspectRatio: { ideal: 16 / 9 },
        // Browsers that support it can crop-scale the source to the requested frame size.
        resizeMode: "crop-and-scale",
      },
    }))
  );
}

function pickSupportedDetectorFormats() {
  if (typeof window === "undefined" || typeof window.BarcodeDetector === "undefined") {
    return [];
  }

  return BARCODE_DETECTOR_FORMATS;
}

export default function BarcodeCameraScanner({ onScan, onStatus, className = "" }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const trackRef = useRef(null);
  const readerRef = useRef(null);
  const detectorRef = useRef(null);
  const scanLoopRef = useRef({ frameId: null, timeoutId: null });
  const frameCanvasRef = useRef(null);
  const frameContextRef = useRef(null);
  const onScanRef = useRef(onScan);
  const onStatusRef = useRef(onStatus);
  const sessionRef = useRef(0);
  const isRunningRef = useRef(false);
  const isProcessingRef = useRef(false);
  const lastAttemptAtRef = useRef(0);
  const lastSuccessfulScanRef = useRef({ code: "", at: 0 });
  const cleanupTimerRef = useRef(null);

  const [supported] = useState(() => detectSupport());
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [devices, setDevices] = useState([]);
  const [cameraValue, setCameraValue] = useState(() => getInitialCameraValue());
  const [touchDevice] = useState(() => isLikelyTouchDevice());
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [status, setStatus] = useState({ type: "idle", message: "Camera scanner ready" });

  useEffect(() => {
    onScanRef.current = onScan;
    onStatusRef.current = onStatus;
  }, [onScan, onStatus]);

  useEffect(() => {
    if (!supported || readerRef.current) {
      return undefined;
    }

    const reader = new BrowserMultiFormatOneDReader();
    reader.possibleFormats = ZXING_FORMATS;
    readerRef.current = reader;

    return () => {
      readerRef.current = null;
    };
  }, [supported]);

  function clearScheduledScan() {
    if (scanLoopRef.current.frameId !== null && typeof videoRef.current?.cancelVideoFrameCallback === "function") {
      videoRef.current.cancelVideoFrameCallback(scanLoopRef.current.frameId);
    } else if (scanLoopRef.current.frameId !== null && typeof window !== "undefined" && typeof window.cancelAnimationFrame === "function") {
      window.cancelAnimationFrame(scanLoopRef.current.frameId);
    }

    if (scanLoopRef.current.timeoutId !== null) {
      window.clearTimeout(scanLoopRef.current.timeoutId);
    }

    scanLoopRef.current = { frameId: null, timeoutId: null };
  }

  function stopStreamOnly() {
    clearScheduledScan();
    isRunningRef.current = false;
    isProcessingRef.current = false;
    lastAttemptAtRef.current = 0;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    trackRef.current = null;
    setTorchAvailable(false);
    setTorchEnabled(false);
  }

  function stopCamera(nextStatus = { type: "idle", message: "Camera stopped" }, options = {}) {
    if (cleanupTimerRef.current) {
      clearTimeout(cleanupTimerRef.current);
      cleanupTimerRef.current = null;
    }

    stopStreamOnly();
    setOpen(false);
    setLoading(false);
    setStatus(nextStatus);

    if (options.announce !== false) {
      onStatusRef.current?.(nextStatus.message);
    }
  }

  async function enumerateCameras() {
    try {
      const availableDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = availableDevices.filter((device) => device.kind === "videoinput");
      setDevices(videoDevices);

      if (cameraValue.startsWith("device:")) {
        const selectedId = cameraValue.replace("device:", "");
        const stillExists = videoDevices.some((device) => device.deviceId === selectedId);
        if (!stillExists && videoDevices[0]) {
          setCameraValue(`device:${videoDevices[0].deviceId}`);
        }
      }
    } catch (error) {
      console.error("[BarcodeCameraScanner] Failed to enumerate cameras", error);
    }
  }

  async function applyTrackEnhancements(track) {
    if (!track) {
      return;
    }

    const capabilities = track.getCapabilities?.() || {};
    const supportedConstraints = navigator.mediaDevices?.getSupportedConstraints?.() || {};

    setTorchAvailable(Boolean(capabilities.torch));

    // Autofocus is not guaranteed on every Android device, so we try once and silently continue if unsupported.
    const focusModes = Array.isArray(capabilities.focusMode) ? capabilities.focusMode : [];
    if (supportedConstraints.focusMode && focusModes.includes("continuous")) {
      try {
        await track.applyConstraints({ advanced: [{ focusMode: "continuous" }] });
      } catch {
        // Some browsers expose the capability but reject the constraint. We keep scanning instead of failing hard.
      }
    }
  }

  async function attachStreamToVideo(stream) {
    if (!videoRef.current) {
      throw new Error("Video element unavailable");
    }

    videoRef.current.srcObject = stream;
    await videoRef.current.play().catch((error) => {
      if (error?.name !== "AbortError") {
        throw error;
      }
    });
  }

  async function openCameraStream() {
    const cameraCandidates = buildHighResolutionCandidates(cameraValue);
    let lastError = null;

    for (const constraints of cameraCandidates) {
      try {
        return await navigator.mediaDevices.getUserMedia(constraints);
      } catch (error) {
        lastError = error;

        // Permission errors should not fall through to the fallback chain.
        if (error?.name === "NotAllowedError" || error?.name === "SecurityError") {
          throw error;
        }
      }
    }

    throw lastError || new Error("Unable to access camera");
  }

  async function createDetectorIfAvailable() {
    if (typeof window === "undefined" || typeof window.BarcodeDetector === "undefined") {
      return null;
    }

    const detectorFormats = pickSupportedDetectorFormats();
    if (detectorFormats.length === 0) {
      return null;
    }

    try {
      const supportedFormats = typeof window.BarcodeDetector.getSupportedFormats === "function"
        ? await window.BarcodeDetector.getSupportedFormats()
        : detectorFormats;
      const activeFormats = detectorFormats.filter((format) => supportedFormats.includes(format));

      if (activeFormats.length === 0) {
        return null;
      }

      return new window.BarcodeDetector({ formats: activeFormats });
    } catch (error) {
      console.warn("[BarcodeCameraScanner] BarcodeDetector unavailable, falling back to ZXing", error);
      return null;
    }
  }

  function getFrameCanvas(width, height) {
    if (!frameCanvasRef.current) {
      frameCanvasRef.current = document.createElement("canvas");
    }

    const canvas = frameCanvasRef.current;
    const targetWidth = Math.max(2, Math.min(MAX_SCAN_WIDTH, Math.round(width)));
    const targetHeight = Math.max(2, Math.round((height / width) * targetWidth));

    if (canvas.width !== targetWidth) {
      canvas.width = targetWidth;
    }

    if (canvas.height !== targetHeight) {
      canvas.height = targetHeight;
    }

    if (!frameContextRef.current) {
      frameContextRef.current = canvas.getContext("2d", { willReadFrequently: true });
    }

    return canvas;
  }

  function drawRoiFrame() {
    const video = videoRef.current;

    if (!video || !video.videoWidth || !video.videoHeight) {
      return null;
    }

    const { x, y, width, height } = getScanRectangle(video.videoWidth, video.videoHeight);
    const canvas = getFrameCanvas(width, height);
    const context = frameContextRef.current;

    if (!context) {
      return null;
    }

    context.drawImage(video, x, y, width, height, 0, 0, canvas.width, canvas.height);
    return canvas;
  }

  function reportSuccess(code) {
    const normalizedCode = normalizeCode(code);
    if (!normalizedCode) {
      return;
    }

    const now = performance.now();
    const previous = lastSuccessfulScanRef.current;
    if (previous.code === normalizedCode && now - previous.at < DUPLICATE_SUPPRESSION_MS) {
      return;
    }

    lastSuccessfulScanRef.current = { code: normalizedCode, at: now };
    setStatus({ type: "success", message: `Detected ${normalizedCode}` });
    onStatusRef.current?.(`Detected ${normalizedCode}`);
    onScanRef.current?.(normalizedCode);
    if (touchDevice && typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate([40, 30, 40]);
    }

    if (typeof window !== "undefined") {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          const context = new AudioCtx();
          const oscillator = context.createOscillator();
          const gainNode = context.createGain();
          oscillator.type = "sine";
          oscillator.frequency.value = 880;
          gainNode.gain.value = 0.04;
          oscillator.connect(gainNode);
          gainNode.connect(context.destination);
          oscillator.start();
          oscillator.stop(context.currentTime + 0.08);
          oscillator.onended = () => {
            context.close().catch(() => {});
          };
        }
      } catch {
        // Feedback should never block the scan result.
      }
    }

    stopCamera({ type: "success", message: `Detected ${normalizedCode}` }, { announce: false });
  }

  async function scanOnce(sessionId) {
    if (!isRunningRef.current || sessionId !== sessionRef.current || isProcessingRef.current) {
      return;
    }

    const video = videoRef.current;
    if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !video.videoWidth || !video.videoHeight) {
      return;
    }

    const now = performance.now();
    if (now - lastAttemptAtRef.current < MIN_SCAN_INTERVAL_MS) {
      return;
    }

    lastAttemptAtRef.current = now;
    isProcessingRef.current = true;

    try {
      const canvas = drawRoiFrame();
      if (!canvas) {
        return;
      }

      if (detectorRef.current) {
        const detections = await detectorRef.current.detect(canvas);
        const code = pickBestDetection(detections);
        if (code) {
          reportSuccess(code);
          return;
        }
      } else if (readerRef.current) {
        const result = readerRef.current.decodeFromCanvas(canvas);
        const code = normalizeCode(result?.getText?.());
        if (code) {
          reportSuccess(code);
          return;
        }
      }
    } catch (error) {
      if (!isRecoverableScanError(error)) {
        console.warn("[BarcodeCameraScanner] Scan error", error);
      }
    } finally {
      isProcessingRef.current = false;
    }
  }

  function scheduleNextScan(sessionId) {
    if (!isRunningRef.current || sessionId !== sessionRef.current) {
      return;
    }

    clearScheduledScan();

    const video = videoRef.current;
    if (video && typeof video.requestVideoFrameCallback === "function") {
      scanLoopRef.current.frameId = video.requestVideoFrameCallback(() => {
        void scanOnce(sessionId).then(() => {
          scheduleNextScan(sessionId);
        });
      });
      return;
    }

    scanLoopRef.current.timeoutId = window.setTimeout(() => {
      void scanOnce(sessionId).then(() => {
        scheduleNextScan(sessionId);
      });
    }, MIN_SCAN_INTERVAL_MS);
  }

  async function startScanner() {
    if (!supported || loading) {
      return;
    }

    const sessionId = sessionRef.current + 1;
    sessionRef.current = sessionId;
    stopStreamOnly();
    isRunningRef.current = true;
    isProcessingRef.current = false;
    lastAttemptAtRef.current = 0;
    clearScheduledScan();

    try {
      setOpen(true);
      setLoading(true);
      setStatus({ type: "starting", message: "Starting camera..." });
      onStatusRef.current?.("Starting camera...");

      const stream = await openCameraStream();
      if (sessionId !== sessionRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      trackRef.current = stream.getVideoTracks()[0] || null;

      await applyTrackEnhancements(trackRef.current);
      await attachStreamToVideo(stream);
      await enumerateCameras();

      if (sessionId !== sessionRef.current) {
        return;
      }

      detectorRef.current = await createDetectorIfAvailable();
      if (detectorRef.current) {
        setStatus({ type: "ready", message: "Browser detector active" });
        onStatusRef.current?.("Browser detector active");
      } else {
        setStatus({ type: "ready", message: "ZXing fallback active" });
        onStatusRef.current?.("ZXing fallback active");
      }

      scheduleNextScan(sessionId);
    } catch (error) {
      console.error("[BarcodeCameraScanner] Camera start failed", error);
      detectorRef.current = null;
      stopStreamOnly();

      const message =
        error?.name === "NotAllowedError"
          ? "Camera permission denied"
          : error?.name === "NotFoundError"
            ? "No usable camera found"
            : error?.name === "OverconstrainedError"
              ? "Requested camera settings are not supported"
              : error?.message || "Unable to access camera";

      const type =
        error?.name === "NotAllowedError"
          ? "permission-denied"
          : error?.name === "NotFoundError"
            ? "unavailable"
            : "error";

      setStatus({ type, message });
      onStatusRef.current?.(message);

      if (error?.name === "NotAllowedError" || error?.name === "NotFoundError") {
        setOpen(false);
      }
    } finally {
      if (sessionId === sessionRef.current) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    if (!open || !supported) {
      return undefined;
    }

    let cancelled = false;
    const startTimer = window.setTimeout(() => {
      void startScanner().finally(() => {
        if (cancelled) {
          stopStreamOnly();
        }
      });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(startTimer);
      if (cleanupTimerRef.current) {
        clearTimeout(cleanupTimerRef.current);
      }

      cleanupTimerRef.current = window.setTimeout(() => {
        stopStreamOnly();
        cleanupTimerRef.current = null;
      }, 120);
    };
    // `cameraValue` intentionally restarts the scanner so a new camera selection takes effect immediately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, supported, cameraValue]);

  useEffect(() => {
    return () => {
      if (cleanupTimerRef.current) {
        clearTimeout(cleanupTimerRef.current);
        cleanupTimerRef.current = null;
      }

      sessionRef.current += 1;
      stopStreamOnly();
      detectorRef.current = null;
      readerRef.current = null;
      frameCanvasRef.current = null;
      frameContextRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function persistCamera(value) {
    setCameraValue(value);
    try {
      window.localStorage.setItem(LAST_CAMERA_KEY, value);
    } catch {
      console.warn("[BarcodeCameraScanner] Failed to persist selected camera");
    }
  }

  async function toggleTorch() {
    const track = trackRef.current;
    const capabilities = track?.getCapabilities?.() || {};

    if (!track || !capabilities.torch) {
      return;
    }

    const nextValue = !torchEnabled;
    try {
      await track.applyConstraints({ advanced: [{ torch: nextValue }] });
      setTorchEnabled(nextValue);
      onStatusRef.current?.(nextValue ? "Torch enabled" : "Torch disabled");
    } catch (error) {
      onStatusRef.current?.(error?.message || "Torch unavailable");
    }
  }

  function statusTone() {
    switch (status.type) {
      case "success":
      case "ready":
      case "starting":
        return "border-emerald-200 bg-emerald-50 text-emerald-700";
      case "permission-denied":
        return "border-rose-200 bg-rose-50 text-rose-700";
      case "unavailable":
      case "error":
        return "border-amber-200 bg-amber-50 text-amber-700";
      default:
        return "border-slate-200 bg-slate-50 text-slate-600";
    }
  }

  const unsupportedMessage = !supported
    ? "Your browser does not support live camera scanning."
    : status.message;

  return (
    <div className={`rounded-3xl border border-slate-200 bg-white ${className}`}>
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <MdCameraAlt className="text-lg text-indigo-600" />
          <h3 className="font-semibold text-slate-900">Camera Scanner</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-200"
          >
            <MdOutlineQrCodeScanner />
            {open ? "Scanning" : "Start Camera"}
          </button>
          {open ? (
            <button
              type="button"
              onClick={() => stopCamera({ type: "idle", message: "Camera stopped" })}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
            >
              <MdStop />
              Stop
            </button>
          ) : null}
        </div>
      </div>

      <div className="space-y-4 p-4">
        {!supported ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {unsupportedMessage} Manual barcode entry still works.
          </div>
        ) : null}

        {open && supported ? (
          <>
            {!touchDevice ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <label className="text-sm font-medium text-slate-600">Camera</label>
                <div className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <MdFlipCameraIos className="text-slate-400" />
                  <select
                    value={cameraValue}
                    onChange={(event) => persistCamera(event.target.value)}
                    className="w-full bg-transparent text-sm text-slate-700 outline-none"
                  >
                    <option value="mode:environment">Rear camera</option>
                    <option value="mode:user">Front camera</option>
                    {devices.map((device, index) => (
                      <option key={device.deviceId} value={`device:${device.deviceId}`}>
                        {cameraLabel(`device:${device.deviceId}`, index, device)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                Rear camera auto-selected for faster mobile scanning.
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={toggleTorch}
                disabled={!torchAvailable}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <MdFlashOn className={torchEnabled ? "text-amber-500" : "text-slate-400"} />
                {torchEnabled ? "Torch on" : "Torch off"}
              </button>
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-black">
              <div className="relative aspect-[4/3] w-full">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute inset-0 h-full w-full object-cover"
                />

                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute inset-x-0 top-0 h-[31%] bg-black/35" />
                  <div className="absolute inset-x-0 bottom-0 h-[31%] bg-black/35" />
                  <div className="absolute left-[9%] right-[9%] top-[31%] h-[38%] rounded-3xl border-2 border-emerald-400/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.0)]">
                    <div className="absolute left-0 top-0 h-8 w-8 rounded-tl-3xl border-l-4 border-t-4 border-emerald-300" />
                    <div className="absolute right-0 top-0 h-8 w-8 rounded-tr-3xl border-r-4 border-t-4 border-emerald-300" />
                    <div className="absolute bottom-0 left-0 h-8 w-8 rounded-bl-3xl border-b-4 border-l-4 border-emerald-300" />
                    <div className="absolute bottom-0 right-0 h-8 w-8 rounded-br-3xl border-b-4 border-r-4 border-emerald-300" />
                  </div>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-[11px] font-semibold tracking-wide text-white">
                    Align the barcode inside the center frame
                  </div>
                </div>
              </div>
            </div>

            <div className={`rounded-2xl border px-4 py-3 text-sm ${statusTone()}`}>
              {loading ? "Opening camera..." : status.message}
            </div>
          </>
        ) : open && !supported ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            Browser unsupported. Use manual barcode input or a supported browser.
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            Start the camera scanner to scan with a phone camera or an external USB webcam.
          </div>
        )}
      </div>
    </div>
  );
}
