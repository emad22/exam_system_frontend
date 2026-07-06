<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import * as faceapi from '@vladmandic/face-api';
import api from '@/services/api';

const props = defineProps({
  sessionId: {
    type: [String, Number],
    required: true
  },
  studentId: {
    type: [String, Number],
    required: true
  }
});

const videoRef = ref(null);
const isLoading = ref(true);
const statusMessage = ref('loading face detection system...');  // جاري تحميل نظام التحقق من الوجه...   in english
const hasError = ref(false);
const warningMessage = ref('');
const isBlinking = ref(false);

let stream = null;
let detectionInterval = null;

// Face matching
const FACE_MATCH_THRESHOLD = 0.5; // Euclidean distance threshold (lower = stricter)
let faceMatcher = null; // faceapi.FaceMatcher built from registered descriptor

// Track anomaly duration for violation reporting
let noFaceDuration = 0;
let multipleFaceDuration = 0;
let faceSwapDuration = 0;
let lastViolationReported = null; // 'none', 'face_not_visible', 'multiple_faces', 'face_swap'

// Optimize database load by tracking request pacing
let lastNormalLogSent = 0; // Timestamp of last normal face-log sent
let lastAnomalyLogSent = 0; // Timestamp of last anomaly face-log sent
let lastState = 'normal'; // 'normal' or 'anomaly'


onMounted(async () => {
  try {
    statusMessage.value = 'loading face detection model...';
    // Load all required models: detector + landmarks + recognition
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri('/models/face-api'),
      faceapi.nets.faceLandmark68Net.loadFromUri('/models/face-api'),
      faceapi.nets.faceRecognitionNet.loadFromUri('/models/face-api'),
    ]);

    // Try to load the student's registered face descriptor from the session
    try {
      const { data } = await api.get(`/proctoring/session/${props.sessionId}/descriptor`);
      if (data?.face_image_url) {
        // Fetch image via axios (CORS-safe) instead of direct <img> load
        const imageResponse = await api.get(data.face_image_url, {
          responseType: 'blob',
          baseURL: '', // use absolute URL as-is, don't prepend api baseURL
        });
        const objectUrl = URL.createObjectURL(imageResponse.data);

        const img = new Image();
        img.src = objectUrl;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = () => reject(new Error('Failed to load registered face image'));
        });

        const detected = await faceapi
          .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.3 }))
          .withFaceLandmarks()
          .withFaceDescriptor();

        URL.revokeObjectURL(objectUrl); // free memory

        if (detected?.descriptor) {
          const labeled = new faceapi.LabeledFaceDescriptors('student', [detected.descriptor]);
          faceMatcher = new faceapi.FaceMatcher([labeled], FACE_MATCH_THRESHOLD);
          // console.log('Face matcher ready ✅');
        } else {
          console.warn('Could not extract descriptor from registered face image; face matching disabled.');
        }
      }
    } catch (descErr) {
      // Descriptor not available — face matching will be skipped silently
      console.warn('Face matching disabled:', descErr?.message ?? descErr);
    }

    statusMessage.value = 'Starting camera...';
    // Start webcam
    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 320, height: 240, frameRate: { max: 15 } },
      audio: false
    });

    if (videoRef.value) {
      videoRef.value.srcObject = stream;
      videoRef.value.onloadedmetadata = () => {
        videoRef.value.play();
        isLoading.value = false;
        startDetection();
      };
    }
  } catch (err) {
    console.error('Error initializing proctor camera:', err);
    hasError.value = true;
    statusMessage.value = 'failed to start camera or load face detection model.';
  }
});

onUnmounted(() => {
  stopDetection();
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
});

function startDetection() {
  detectionInterval = setInterval(async () => {
    if (!videoRef.value || videoRef.value.paused || videoRef.value.ended) return;

    try {
      const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.35 });

     

      // When face matching is enabled, we need full landmarks + descriptor pipeline
      let detections;
      if (faceMatcher) {
        detections = await faceapi
          .detectAllFaces(videoRef.value, options)
          .withFaceLandmarks()
          .withFaceDescriptors();
      } else {
        detections = await faceapi.detectAllFaces(videoRef.value, options);
      }

      const faceCount = detections.length;

      let primaryConfidence = null;
      if (faceCount > 0) {
        // .detection exists on both plain Detection and WithFaceDescriptor
        primaryConfidence = (detections[0].detection ?? detections[0]).score;
      }

      const faceLost = faceCount === 0;
      const multipleFaces = faceCount > 1;

      // ── Face matching ─────────────────────────────────────────────────────────
      let faceSwap = false;
      if (faceMatcher && faceCount === 1) {
        const result = faceMatcher.findBestMatch(detections[0].descriptor);
        // If the best match label is 'unknown', the face doesn't belong to the student
        faceSwap = result.label === 'unknown';
      }
      // ─────────────────────────────────────────────────────────────────────────

      // Capture screenshot when any anomaly is detected
      let screenshot = null;
      if (faceLost || multipleFaces || faceSwap) {
        screenshot = captureScreenshot();
      }

      const isAnomaly = faceLost || multipleFaces || faceSwap;
      const currentState = isAnomaly ? 'anomaly' : 'normal';
      let shouldSendLog = false;
      const nowTime = Date.now();

      if (currentState === 'normal') {
        if (lastState !== 'normal') {
          shouldSendLog = true; // State transition: anomaly -> normal
        } else if (nowTime - lastNormalLogSent >= 20000) {
          shouldSendLog = true; // 20-second heartbeat
        }
      } else {
        if (lastState !== 'anomaly') {
          shouldSendLog = true; // State transition: normal -> anomaly
        } else if (nowTime - lastAnomalyLogSent >= 10000) {
          shouldSendLog = true; // Throttle anomalies to once every 10 seconds
        }
      }

      lastState = currentState;

      if (shouldSendLog) {
        if (currentState === 'normal') {
          lastNormalLogSent = nowTime;
        } else {
          lastAnomalyLogSent = nowTime;
        }

        // Send face log
        api.post(`/proctoring/session/${props.sessionId}/face-log`, {
          face_count: faceCount,
          primary_face_confidence: primaryConfidence,
          secondary_face_detected: multipleFaces,
          face_lost: faceLost,
          screenshot: screenshot
        }).catch(err => console.error('Failed to send face log:', err));
      }

      // ── State machine ─────────────────────────────────────────────────────────
      if (faceLost) {
        noFaceDuration += 2.0;
        multipleFaceDuration = Math.max(0, multipleFaceDuration - 2.0);
        faceSwapDuration = Math.max(0, faceSwapDuration - 2.0);
        warningMessage.value = 'Warning: face not detected in front of camera!';
        isBlinking.value = true;

        if (noFaceDuration >= 4.0 && lastViolationReported !== 'face_not_visible') {
          reportViolation('face_not_visible', 'high', 'face not detected in front of camera for more than 4 seconds.', screenshot);
          lastViolationReported = 'face_not_visible';
        }

      } else if (multipleFaces) {
        multipleFaceDuration += 2.0;
        noFaceDuration = Math.max(0, noFaceDuration - 2.0);
        faceSwapDuration = Math.max(0, faceSwapDuration - 2.0);
        warningMessage.value = 'Warning: more than one face detected in front of camera!';
        isBlinking.value = true;

        if (multipleFaceDuration >= 4.0 && lastViolationReported !== 'multiple_faces') {
          reportViolation('multiple_faces', 'high', 'more than one face detected in front of camera for more than 4 seconds.', screenshot);
          lastViolationReported = 'multiple_faces';
        }

      } else if (faceSwap) {
        faceSwapDuration += 2.0;
        noFaceDuration = Math.max(0, noFaceDuration - 2.0);
        multipleFaceDuration = Math.max(0, multipleFaceDuration - 2.0);
        warningMessage.value = 'Warning: detected face does not match student identity!';
        isBlinking.value = true;

        if (faceSwapDuration >= 4.0 && lastViolationReported !== 'face_swap') {
          reportViolation('face_swap', 'high', 'detected face does not match student identity for more than 4 seconds.', screenshot);
          lastViolationReported = 'face_swap';
        }

      } else {
        // Normal state — decay all counters
        noFaceDuration = Math.max(0, noFaceDuration - 2.0);
        multipleFaceDuration = Math.max(0, multipleFaceDuration - 2.0);
        faceSwapDuration = Math.max(0, faceSwapDuration - 2.0);

        if (noFaceDuration === 0 && multipleFaceDuration === 0 && faceSwapDuration === 0) {
          warningMessage.value = '';
          isBlinking.value = false;
          lastViolationReported = null;
        }
      }
      // ─────────────────────────────────────────────────────────────────────────

    } catch (err) {
      console.error('Face detection run error:', err);
    }
  }, 2000);
}

function stopDetection() {
  if (detectionInterval) {
    clearInterval(detectionInterval);
  }
}

function captureScreenshot() {
  try {
    if (!videoRef.value) return null;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.value.videoWidth || 320;
    canvas.height = videoRef.value.videoHeight || 240;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.value, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.5); // base64 at 50% quality
  } catch (err) {
    console.error('Failed to capture screenshot:', err);
    return null;
  }
}

async function reportViolation(type, severity, description, screenshot) {
  try {
    await api.post(`/proctoring/session/${props.sessionId}/violation`, {
      violation_type: type,
      severity: severity,
      description: description,
      evidence: screenshot ? [screenshot] : []
    });
  } catch (err) {
    console.error('Failed to report face violation:', err);
  }
}
</script>

<template>
  <div
    class="proctor-camera-widget fixed bottom-4 right-4 z-50 overflow-hidden rounded-2xl border border-white/20 bg-black/40 p-2 shadow-2xl backdrop-blur-md transition-all duration-300 hover:scale-105"
    :class="{ 'border-red-500/10 bg-red-950/20 shadow-red-500/20': isBlinking }">
    <div class="relative w-56 h-40 md:w-72 md:h-52 rounded-xl overflow-hidden bg-slate-950">
      <video ref="videoRef" autoplay muted playsinline class="w-full h-full object-cover scale-x-[-1]"></video>

      <!-- Loading / Error overlay -->
      <div v-if="isLoading || hasError"
        class="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 p-3 text-center text-xs text-white">
        <div v-if="isLoading && !hasError" class="relative flex items-center justify-center mb-2">
          <div class="w-6 h-6 rounded-full border-2 border-white/20 border-t-white animate-spin"></div>
        </div>
        <svg v-if="hasError" class="w-8 h-8 text-red-500 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span class="text-[10px] leading-tight font-medium font-sans text-slate-300">{{ statusMessage }}</span>
      </div>

      <!-- Warning message overlay -->
      <div v-if="warningMessage"
        class="absolute bottom-0 inset-x-0 bg-red-600/90 text-white text-[10px] font-sans font-medium text-center py-1 px-1 animate-pulse">
        {{ warningMessage }}
      </div>

      <!-- Record Indicator -->
      <div v-if="!isLoading && !hasError"
        class="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm border border-white/10">
        <span class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
        <span class="text-[9px] text-white font-medium uppercase font-sans tracking-wide">REC</span>
      </div>
    </div>
  </div>
</template>
