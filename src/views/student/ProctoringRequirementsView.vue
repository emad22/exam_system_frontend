<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import StudentHeader from '@/components/StudentHeader.vue';
import api from '@/services/api';
import { authStorage } from '@/services/authStorage';
import { shouldBlockLocalFaceMismatch } from '@/utils/identityVerification';
import * as faceapi from '@vladmandic/face-api';


const router = useRouter();



// ─── Steps ────────────────────────────────────────────────────────
// 0: System Check  1: Camera & Mic  2: Identity  3: Review  4: Ready
const currentStep = ref(0);

const steps = [
    { label: 'System Check', icon: 'pi pi-desktop' },
    { label: 'Camera & Mic', icon: 'pi pi-camera' },
    { label: 'Identity', icon: 'pi pi-id-card' },
    { label: 'Review', icon: 'pi pi-file-check' },
    { label: 'Ready', icon: 'pi pi-check-circle' },
];

// ═══════════════════════════════════════════════════════════════════
// STEP 0 — System Requirements
// ═══════════════════════════════════════════════════════════════════
const sysChecks = ref({
    browser: { passed: false, message: '', icon: 'pi pi-globe' },
    internet: { passed: false, message: '', icon: 'pi pi-wifi' },
    microphone: { passed: false, message: '', icon: 'pi pi-microphone' },
    camera: { passed: false, message: '', icon: 'pi pi-camera' },
    storage: { passed: false, message: '', icon: 'pi pi-database' },
});
const internetProgress = ref(0);
const sysLoading = ref(false);

const allSysOk = computed(() => Object.values(sysChecks.value).every(c => c.passed));

const runSystemChecks = async () => {
    sysLoading.value = true;
    const ua = navigator.userAgent;
    const ok = /Chrome|Firefox|Edg/.test(ua);
    sysChecks.value.browser = { passed: ok, message: ok ? 'Browser compatible ✓' : 'Use Chrome / Firefox / Edge', icon: 'pi pi-globe' };
    try {
        const t0 = performance.now();
        // await fetch('https://www.cloudflare.com', { method: 'HEAD', mode: 'no-cors', cache: 'no-cache' });
        const ms = performance.now() - t0;
        internetProgress.value = Math.min(100, Math.max(50, 100 - (ms - 200) / 30));
        sysChecks.value.internet = { passed: ms < 5000, message: 'Connection excellent ✓', icon: 'pi pi-wifi' };
    } catch { internetProgress.value = 80; sysChecks.value.internet = { passed: true, message: 'Connection available ✓', icon: 'pi pi-wifi' }; }
    try { const s = await navigator.mediaDevices.getUserMedia({ audio: true }); s.getTracks().forEach(t => t.stop()); sysChecks.value.microphone = { passed: true, message: 'Microphone detected ✓', icon: 'pi pi-microphone' }; }
    catch { sysChecks.value.microphone = { passed: false, message: 'Microphone not available', icon: 'pi pi-microphone' }; }
    try { const s = await navigator.mediaDevices.getUserMedia({ video: true }); s.getTracks().forEach(t => t.stop()); sysChecks.value.camera = { passed: true, message: 'Camera detected ✓', icon: 'pi pi-camera' }; }
    catch { sysChecks.value.camera = { passed: false, message: 'Camera not available', icon: 'pi pi-camera' }; }
    try { const { quota, usage } = await navigator.storage.estimate(); const a = quota - usage; sysChecks.value.storage = { passed: a > 50 * 1024 * 1024, message: `Storage: ${(a / 1024 / 1024).toFixed(0)} MB ✓`, icon: 'pi pi-database' }; }
    catch { sysChecks.value.storage = { passed: true, message: 'Storage available ✓', icon: 'pi pi-database' }; }
    sysLoading.value = false;
};

// ═══════════════════════════════════════════════════════════════════
// STEP 1 — Camera & Mic Live Test
// ═══════════════════════════════════════════════════════════════════
const videoEl = ref(null);
const cameraActive = ref(false);
const micActive = ref(false);
const audioLevel = ref(0);
const cameraError = ref('');
const micError = ref('');
let camStream = null, audioCtx = null, rafId = null;

const camMicReady = computed(() => cameraActive.value && micActive.value);

const startCamera = async () => {
    cameraError.value = '';
    try { camStream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } }); if (videoEl.value) videoEl.value.srcObject = camStream; cameraActive.value = true; }
    catch { cameraError.value = 'Could not access camera. Please allow permission.'; }
};

const startMic = async () => {
    micError.value = '';
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const src = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser(); analyser.fftSize = 256;
        src.connect(analyser); micActive.value = true;
        const data = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => { analyser.getByteFrequencyData(data); audioLevel.value = Math.min(100, Math.round((data.reduce((a, b) => a + b, 0) / data.length / 128) * 100)); rafId = requestAnimationFrame(tick); };
        tick();
    } catch { micError.value = 'Could not access microphone. Please allow permission.'; }
};

const stopCamMic = () => {
    if (camStream) { camStream.getTracks().forEach(t => t.stop()); camStream = null; }
    if (audioCtx) { audioCtx.close(); audioCtx = null; }
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    cameraActive.value = false; micActive.value = false; audioLevel.value = 0;
};

// ═══════════════════════════════════════════════════════════════════
// STEP 2 — Identity Verification
// ═══════════════════════════════════════════════════════════════════
const faceVideoEl = ref(null);
const capturedFace = ref(null);
const uploadedId = ref(null);
const idNumber = ref('');
const isCapturing = ref(false);
const isVerifying = ref(false);
const verifyError = ref('');
const verifySuccess = ref(false);
const isIdentityBypassed = ref(false);
let faceStream = null;

const faceModelsLoaded = ref(false);
const faceLoadingError = ref('');
// hide the ID Number display card when the ID-number check is disabled
const showIdNumberCard = ref(false);

// Ordered status badges that match the step sequence

const stepBadgeStatus = computed(() => [
    { id: 'system', passed: allSysOk.value, label: 'System OK ✓', style: 'emerald' },
    { id: 'cam', passed: camMicReady.value, label: 'Camera & Mic ✓', style: 'emerald' },
    { id: 'identity', passed: verifySuccess.value, label: 'Identity Verified ✓', style: 'emerald' },
]);

// OCR and ID comparison
const isExtractingId = ref(false);
const extractedIdNumber = ref('');
const ocrError = ref('');
const idMatchStatus = ref(''); // 'matching', 'not-matching', 'verified'

// Live face-vs-ID comparison results (computed right after upload)
const isFaceComparingWithId = ref(false);
const idFaceMatchScore = ref(null);   // 0-100 percentage
const idFaceDistance = ref(null);     // euclidean distance (lower = better)
const idFaceStatus = ref('');         // 'matched' | 'mismatch' | 'no_face'

// const canVerify = computed(() => capturedFace.value && idNumber.value.trim().length >= 3);
const canVerify = computed(() =>
    capturedFace.value &&
    uploadedId.value &&
    idNumber.value.trim().length >= 3
);
const identityDone = computed(() => verifySuccess.value);

const loadIdentityBypassState = async () => {
    const storedUser = authStorage.getUser();
    const storedBypass = storedUser?.student?.bypass_identity_verification;
    if (typeof storedBypass === 'boolean') {
        isIdentityBypassed.value = storedBypass;
        return;
    }

    try {
        const { data } = await api.get('/user');
        const bypassFromProfile = data?.student?.bypass_identity_verification;
        isIdentityBypassed.value = !!bypassFromProfile;
        if (data?.student) {
            authStorage.setUser(data);
        }
    } catch (error) {
        console.warn('Unable to load identity bypass state:', error);
    }
};

const startFaceCamera = async () => {
    try { faceStream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } }); if (faceVideoEl.value) faceVideoEl.value.srcObject = faceStream; }
    catch (e) { verifyError.value = 'Cannot access camera for face capture.'; }
};





// ── OCR: extract ID number via backend (Gemini API key stays server-side) ──────
const extractIdFromImage = async (imageBase64) => {
    try {
        const { data } = await api.post('/proctoring/extract-id', { id_image: imageBase64 });
        return {
            success: data?.success ?? false,
            extracted_id: data?.extracted_id ?? null,
            message: data?.message ?? null,
        };
    } catch (e) {
        console.error('OCR failed:', e);
        return {
            success: false,
            extracted_id: null,
            message: 'Unable to reach the ID extraction service right now.',
        };
    }
};


const runFaceComparison = async () => {
    if (!capturedFace.value || !uploadedId.value) return;
    isFaceComparingWithId.value = true;
    try {
        if (!faceModelsLoaded.value) await loadFaceModels();
        const [capturedDesc, idDesc] = await Promise.all([
            getFaceDescriptor(capturedFace.value),
            getFaceDescriptor(uploadedId.value),
        ]);
        if (!capturedDesc) { idFaceStatus.value = 'no_face'; }
        else if (!idDesc) { idFaceStatus.value = 'no_face'; }
        else {
            const dist = faceapi.euclideanDistance(capturedDesc, idDesc);
            idFaceDistance.value = parseFloat(dist.toFixed(3));
            idFaceMatchScore.value = Math.round((1 - Math.min(dist, 1)) * 100);
            idFaceStatus.value = dist < 0.6 ? 'matched' : 'mismatch';
        }
    } catch (err) {
        console.warn('Face comparison error:', err);
        idFaceStatus.value = 'no_face';
    } finally {
        isFaceComparingWithId.value = false;
    }
};

// Helper: resize + compress a base64/blob image to a smaller JPEG
const compressImage = (src, maxW = 640, maxH = 480, quality = 0.75) => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            let { width, height } = img;
            const ratio = Math.min(maxW / width, maxH / height, 1);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            canvas.getContext('2d').drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve(src); // fallback: return original
        img.src = src;
    });
};

const capturePhoto = async () => {
    if (!faceVideoEl.value) return;
    isCapturing.value = true;
    const canvas = document.createElement('canvas');
    // Keep full resolution for face-api detection accuracy
    canvas.width = faceVideoEl.value.videoWidth || 640;
    canvas.height = faceVideoEl.value.videoHeight || 480;
    canvas.getContext('2d').drawImage(faceVideoEl.value, 0, 0);
    // Store full-res for local face-api usage
    const fullRes = canvas.toDataURL('image/jpeg', 0.92);
    capturedFace.value = fullRes;
    isCapturing.value = false;

    // Run comparison immediately if ID is already uploaded
    if (uploadedId.value) {
        await runFaceComparison();
    }
};

const retakePhoto = () => {
    capturedFace.value = null;
    verifyError.value = '';
    verifySuccess.value = false;
    idFaceMatchScore.value = null;
    idFaceDistance.value = null;
    idFaceStatus.value = '';
};

const handleIdUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async ev => {
        // Store full-res for local face-api comparison
        uploadedId.value = ev.target.result;
        // Reset previous comparison results
        extractedIdNumber.value = '';
        ocrError.value = '';
        idMatchStatus.value = '';
        idFaceMatchScore.value = null;
        idFaceDistance.value = null;
        idFaceStatus.value = '';

        if (!uploadedId.value) return;

        // ── 1. OCR: Extract ID number from image ──────────────────────────────
        isExtractingId.value = true;
        const extractedResult = await extractIdFromImage(uploadedId.value);
        if (extractedResult?.success && extractedResult.extracted_id) {
            extractedIdNumber.value = extractedResult.extracted_id;
            // Auto-fill the ID number field if empty
            if (!idNumber.value.trim()) {
                idNumber.value = extractedResult.extracted_id;
            }
        } else {
            extractedIdNumber.value = '';
            const fallbackMessage = extractedResult?.message || 'The ID number could not be read from the image. Please enter it manually below.';
            ocrError.value = fallbackMessage;
        }
        isExtractingId.value = false;

        // ── 2. Face Comparison: ID photo vs captured photo ────────────────────
        await runFaceComparison();
    };
    reader.readAsDataURL(file);
};



const stopFaceCamera = () => { if (faceStream) { faceStream.getTracks().forEach(t => t.stop()); faceStream = null; } };

const verifyIdentity = async () => {
    if (!canVerify.value) return;
    isVerifying.value = true;
    verifyError.value = '';
    idMatchStatus.value = '';

    try {
        // 1. تأكد إن الـ models محملة
        if (!faceModelsLoaded.value) {
            await loadFaceModels();
        }

        // 2. احسب descriptor للوجه من الكاميرا
        const faceDesc = await getFaceDescriptor(capturedFace.value);
        if (!faceDesc) {
            verifyError.value = 'No face detected in your photo. Please retake.';
            return;
        }

        let faceVsIdScore = null;
        let faceVsIdDistance = null;
        let ocrMatch = true;

        // 3. لو في صورة ID — قارن الوجه بيها واستخرج الرقم القومي
        if (uploadedId.value) {
            // 3a. OCR extraction and comparison
            await extractIdFromImage(uploadedId.value);

            // 3b. Face comparison between captured photo and ID
            const idDesc = await getFaceDescriptor(uploadedId.value);
            if (!idDesc) {
                verifyError.value = 'No face detected in the ID card image.';
                return;
            }
            faceVsIdDistance = faceapi.euclideanDistance(faceDesc, idDesc);
            faceVsIdScore = Math.round((1 - Math.min(faceVsIdDistance, 1)) * 100);

            // Check if face match is good enough (distance < 0.6 is good)
            if (shouldBlockLocalFaceMismatch({ bypassEnabled: isIdentityBypassed.value, distance: faceVsIdDistance })) {
                verifyError.value = 'Face does not match the ID card image. Please ensure you are the person in the ID.';
                return;
            }
        }

        // 4. ضغط الصور قبل الإرسال للـ backend (تقليل الـ payload)
        // face-api comparison فوق استخدم النسخة الكاملة، هنا بس بنضغط للنت
        const [compressedFace, compressedId] = await Promise.all([
            compressImage(capturedFace.value, 480, 360, 0.7),
            uploadedId.value ? compressImage(uploadedId.value, 800, 600, 0.75) : Promise.resolve(null),
        ]);

        // ابعت للـ backend
        const res = await api.post('/proctoring/verify-identity', {
            face_image: compressedFace,
            id_image: compressedId || null,
            id_number: idNumber.value.trim(),
            face_vs_id_score: faceVsIdScore,
            face_vs_id_distance: faceVsIdDistance,
            ocr_match: ocrMatch,
        });

        if (res.data.verified) {
            verifySuccess.value = true;
            stopFaceCamera();
            if (res.data.session_id) {
                sessionStorage.setItem('proctoring_session_id', res.data.session_id);
            }
        } else {
            verifyError.value = res.data.message || 'Verification failed.';
        }

    } catch (e) {
        verifyError.value = e.response?.data?.message || 'Verification error. Please try again.';
    } finally {
        isVerifying.value = false;
    }
};


const getFaceDescriptor = async (imageSource) => {
    // imageSource ممكن يكون HTMLImageElement أو base64 string
    let img = imageSource;
    if (typeof imageSource === 'string') {
        img = await faceapi.fetchImage(imageSource);
    }
    const detection = await faceapi
        .detectSingleFace(img)
        .withFaceLandmarks()
        .withFaceDescriptor();
    return detection?.descriptor ?? null;
};



const loadFaceModels = async () => {
    try {
        // console.log('Loading face models...');
        const MODEL_URL = '/models';
        await Promise.all([
            faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        faceModelsLoaded.value = true;
        // console.log('Face models loaded ✓');
    } catch (e) {
        faceLoadingError.value = 'Failed to load face models.';
        // console.error('Face model error:', e);
    }
};
// ═══════════════════════════════════════════════════════════════════
// STEP 3 — Review & Confirm
// ═══════════════════════════════════════════════════════════════════
const agreedToRules = ref(false);

// ═══════════════════════════════════════════════════════════════════
// Navigation
// ═══════════════════════════════════════════════════════════════════
const goNext = () => {
    const next = currentStep.value + 1;
    // cleanup/setup on transitions
    if (currentStep.value === 1) stopCamMic();  // leaving cam/mic step
    if (next === 1) { startCamera(); startMic(); }
    if (next === 2) startFaceCamera();
    if (currentStep.value === 2) stopFaceCamera();
    currentStep.value = next;
};

const goBack = () => {
    const prev = currentStep.value - 1;
    if (currentStep.value === 1) stopCamMic();
    if (currentStep.value === 2) stopFaceCamera();
    if (prev === 1) { startCamera(); startMic(); }
    if (prev === 2) startFaceCamera();
    currentStep.value = prev;
};

const proceed = () => {
    sessionStorage.setItem('proctoring_verified', 'true');
    router.push('/skill-selection');
};

onMounted(() => {
    runSystemChecks();
    loadFaceModels(); // ابدأ تحميل الـ models في الخلفية من أول ما الصفحة تفتح
    loadIdentityBypassState();
});
onUnmounted(() => { stopCamMic(); stopFaceCamera(); });
</script>

<template>
    <div class="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
        <StudentHeader />

        <!-- Background blobs -->
        <div class="fixed inset-0 pointer-events-none overflow-hidden z-0">
            <div class="absolute -top-[15%] -right-[10%] w-[45%] h-[45%] bg-violet-500/8 rounded-full blur-[140px]">
            </div>
            <div class="absolute bottom-[10%] -left-[10%] w-[35%] h-[35%] bg-brand-primary/6 rounded-full blur-[120px]">
            </div>
        </div>

        <main class="flex-grow flex items-center justify-center p-4 relative z-10">
            <div class="w-full max-w-6xl">

                <!-- Header + Step Indicators -->
                <div class="mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
                    <div class="flex items-center justify-between mb-4">
                        <div>
                            <p class="text-[10px] font-black text-violet-600 uppercase tracking-[0.4em] mb-1">Proctoring
                                System</p>
                            <h1 class="text-2xl font-black text-slate-900 tracking-tight uppercase">Pre-Exam
                                Verification</h1>
                        </div>
                        <span
                            class="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-slate-200">Step
                            {{ currentStep + 1 }} / {{ steps.length }}</span>
                    </div>

                    <div class="flex items-center gap-2">
                        <template v-for="(step, i) in steps" :key="i">
                            <div class="flex items-center gap-2 flex-1">
                                <div class="flex items-center gap-2 transition-all duration-500"
                                    :class="i <= currentStep ? 'opacity-100' : 'opacity-30'">
                                    <div class="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all duration-500 text-[11px] shadow-lg"
                                        :class="i < currentStep ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-emerald-200' : i === currentStep ? 'bg-gradient-to-br from-violet-600 to-violet-700 text-white shadow-violet-200' : 'bg-white text-slate-400 border border-slate-200'">
                                        <i v-if="i < currentStep" class="pi pi-check text-[10px]"></i>
                                        <i v-else :class="step.icon" class="text-[11px]"></i>
                                    </div>
                                    <span class="text-[9px] font-black uppercase tracking-widest hidden md:block"
                                        :class="i === currentStep ? 'text-violet-600' : i < currentStep ? 'text-emerald-600' : 'text-slate-300'">
                                        {{ step.label }}
                                    </span>
                                </div>
                                <div v-if="i < steps.length - 1"
                                    class="flex-1 h-1 rounded-full transition-all duration-700 mx-1 shadow-sm"
                                    :class="i < currentStep ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 'bg-slate-200'">
                                </div>
                            </div>
                        </template>
                    </div>
                </div>

                <!-- Main Card -->
                <div
                    class="bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-700">
                    <div class="flex flex-col md:flex-row min-h-[600px]">

                        <!-- Left Panel - Enhanced -->
                        <div
                            class="md:w-[40%] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-10 text-white flex flex-col justify-between relative overflow-hidden shrink-0">
                            <div
                                class="absolute top-0 right-0 w-64 h-64 bg-violet-500/15 rounded-full -mr-32 -mt-32 blur-3xl">
                            </div>
                            <div
                                class="absolute bottom-0 left-0 w-48 h-48 bg-brand-primary/15 rounded-full -ml-24 -mb-24 blur-3xl">
                            </div>
                            <div
                                class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-violet-400/5 rounded-full blur-3xl">
                            </div>
                            <div class="relative z-10">
                                <div class="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-10 shadow-2xl border border-white/10 transition-all duration-500 backdrop-blur-sm"
                                    :class="[currentStep === 0 ? 'bg-violet-500/25' : currentStep === 4 ? 'bg-emerald-500/35' : 'bg-white/10']">
                                    <i :class="steps[currentStep].icon"></i>
                                </div>
                                <transition name="fade-slide" mode="out-in">
                                    <div :key="currentStep">
                                        <h2 class="text-4xl font-black tracking-tight uppercase mb-5 leading-[1.1]">
                                            <template v-if="currentStep === 0">System<br />Requirements<br /><span
                                                    class="text-violet-400">Check</span></template>
                                            <template v-else-if="currentStep === 1">Camera &<br />Microphone<br /><span
                                                    class="text-violet-400">Test</span></template>
                                            <template v-else-if="currentStep === 2">Identity<br /><span
                                                    class="text-violet-400">Verification</span></template>
                                            <template v-else-if="currentStep === 3">Review &<br /><span
                                                    class="text-violet-400">Confirm</span></template>
                                            <template v-else>All Set!<br /><span class="text-emerald-400">Ready to
                                                    Start</span></template>
                                        </h2>
                                        <p
                                            class="text-white/60 text-sm font-bold uppercase tracking-widest leading-relaxed">
                                            <template v-if="currentStep === 0">Verifying your system meets the
                                                proctoring requirements for a secure exam experience</template>
                                            <template v-else-if="currentStep === 1">Test your camera and microphone to
                                                ensure they are working properly</template>
                                            <template v-else-if="currentStep === 2">Capture your face photo, upload ID
                                                card and enter your ID number for identity verification</template>
                                            <template v-else-if="currentStep === 3">Review the exam rules and confirm
                                                your agreement before proceeding</template>
                                            <template v-else>Your system is fully verified. Select your exam skill and
                                                begin the assessment</template>
                                        </p>
                                    </div>
                                </transition>
                            </div>
                            <!-- Status badges (ordered to match steps) -->
                            <div class="relative z-10 space-y-3">
                                <div
                                    class="flex items-center gap-3 p-3.5 bg-white/8 rounded-xl border border-white/10 backdrop-blur-sm">
                                    <div
                                        class="w-2 h-2 rounded-full bg-violet-400 animate-pulse shadow-lg shadow-violet-400/50">
                                    </div>
                                    <span
                                        class="text-[10px] font-black uppercase tracking-widest text-white/70">Proctoring
                                        System
                                        Active</span>
                                </div>

                                <template v-for="badge in stepBadgeStatus" :key="badge.id">
                                    <div v-if="badge.passed"
                                        class="flex items-center gap-3 p-3.5 bg-emerald-500/15 rounded-xl border border-emerald-500/30 backdrop-blur-sm">
                                        <div
                                            class="w-2 h-2 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50">
                                        </div>
                                        <span
                                            class="text-[10px] font-black uppercase tracking-widest text-emerald-300">{{
                                                badge.label }}</span>
                                    </div>
                                </template>
                            </div>
                        </div>

                        <!-- Right Panel -->
                        <div class="flex-1 flex flex-col p-6 md:p-10 min-h-0">

                            <!-- ════════ STEP 0: System Requirements ════════ -->
                            <transition name="fade-slide" mode="out-in">
                                <div v-if="currentStep === 0" key="s0" class="flex flex-col flex-1">
                                    <div class="flex items-center justify-between mb-5 shrink-0">
                                        <div>
                                            <h3 class="text-sm font-black text-slate-800 uppercase tracking-tight">
                                                System Requirements
                                            </h3>
                                            <p
                                                class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                                Verifying 5
                                                checks</p>
                                        </div>
                                        <div v-if="sysLoading" class="flex items-center gap-2">
                                            <div
                                                class="w-4 h-4 border-2 border-slate-200 border-t-violet-500 rounded-full animate-spin">
                                            </div>
                                            <span
                                                class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Scanning...</span>
                                        </div>
                                        <span v-else
                                            class="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border"
                                            :class="allSysOk ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-500 border-rose-100'">
                                            {{ allSysOk ? 'All Passed' : 'Issues Found' }}
                                        </span>
                                    </div>
                                    <div class="flex-1 space-y-3 overflow-y-auto">
                                        <div v-for="(check, key) in sysChecks" :key="key"
                                            class="flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-500"
                                            :class="check.passed ? 'border-emerald-100 bg-emerald-50/30' : sysLoading ? 'border-slate-100 bg-slate-50/50' : 'border-rose-100 bg-rose-50/30'">
                                            <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-500"
                                                :class="check.passed ? 'bg-emerald-500 text-white' : sysLoading ? 'bg-slate-100 text-slate-400 animate-pulse' : 'bg-rose-100 text-rose-400'">
                                                <i v-if="check.passed" class="pi pi-check text-xs"></i>
                                                <i v-else :class="check.icon" class="text-xs"></i>
                                            </div>
                                            <div class="flex-1 min-w-0">
                                                <p
                                                    class="text-xs font-black text-slate-800 uppercase tracking-tight capitalize">
                                                    {{ key
                                                    }}</p>
                                                <p v-if="check.message" class="text-[9px] font-bold mt-0.5"
                                                    :class="check.passed ? 'text-emerald-600' : 'text-rose-400'">{{
                                                        check.message }}</p>
                                                <div v-if="key === 'internet' && check.passed"
                                                    class="mt-1.5 h-1 bg-slate-100 rounded-full overflow-hidden">
                                                    <div class="h-full bg-gradient-to-r from-violet-400 to-emerald-400 rounded-full transition-all duration-700"
                                                        :style="{ width: internetProgress + '%' }"></div>
                                                </div>
                                            </div>
                                            <i v-if="check.passed"
                                                class="pi pi-check-circle text-emerald-500 text-sm shrink-0"></i>
                                            <i v-else-if="!sysLoading"
                                                class="pi pi-times-circle text-rose-400 text-sm shrink-0"></i>
                                        </div>
                                    </div>
                                    <div
                                        class="mt-6 pt-5 border-t border-slate-50 shrink-0 flex items-center justify-between">
                                        <button @click="runSystemChecks" :disabled="sysLoading"
                                            class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 border border-slate-200 hover:bg-slate-50 transition-all disabled:opacity-40">
                                            <i class="pi pi-refresh" :class="sysLoading ? 'animate-spin' : ''"></i>
                                            Recheck
                                        </button>
                                        <button @click="goNext" :disabled="!allSysOk"
                                            class="flex items-center gap-3 px-8 py-3.5 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all duration-500 shadow-xl disabled:opacity-30 disabled:cursor-not-allowed disabled:grayscale"
                                            :class="allSysOk ? 'bg-slate-900 text-white hover:bg-violet-600 hover:-translate-y-0.5' : 'bg-slate-100 text-slate-400'">
                                            Next <i class="pi pi-arrow-right text-[10px]"></i>
                                        </button>
                                    </div>
                                </div>
                            </transition>

                            <!-- ════════ STEP 1: Camera & Mic ════════ -->
                            <transition name="fade-slide" mode="out-in">
                                <div v-if="currentStep === 1" key="s1" class="flex flex-col flex-1">
                                    <div class="mb-4 shrink-0">
                                        <h3 class="text-sm font-black text-slate-800 uppercase tracking-tight">Live
                                            Camera & Microphone
                                            Test</h3>
                                        <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                            Both must be
                                            active to continue</p>
                                    </div>
                                    <div class="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <!-- Camera -->
                                        <div class="rounded-2xl border-2 overflow-hidden transition-all duration-500"
                                            :class="cameraActive ? 'border-emerald-200' : 'border-slate-100'">
                                            <div class="relative bg-slate-900 aspect-video">
                                                <video ref="videoEl" autoplay playsinline muted
                                                    class="w-full h-full object-cover"
                                                    :class="cameraActive ? 'opacity-100' : 'opacity-0'"></video>
                                                <div v-if="!cameraActive"
                                                    class="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-500">
                                                    <i class="pi pi-video-off text-3xl"></i><span
                                                        class="text-[9px] font-black uppercase tracking-widest">Camera
                                                        Off</span>
                                                </div>
                                                <div v-if="cameraActive"
                                                    class="absolute top-2 right-2 flex items-center gap-1.5 bg-black/50 px-2 py-1 rounded-full">
                                                    <div class="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse">
                                                    </div>
                                                    <span
                                                        class="text-[8px] font-black text-white uppercase tracking-widest">LIVE</span>
                                                </div>
                                            </div>
                                            <div class="p-4 bg-white flex items-center justify-between">
                                                <div>
                                                    <p
                                                        class="text-[10px] font-black text-slate-700 uppercase tracking-tight">
                                                        Camera</p>
                                                    <p class="text-[8px] font-bold mt-0.5"
                                                        :class="cameraActive ? 'text-emerald-600' : cameraError ? 'text-rose-400' : 'text-slate-400'">
                                                        {{ cameraActive ? 'Active & Working ✓' : cameraError || 'Click to start' }}</p>
                                                </div>
                                                <button @click="startCamera" v-if="!cameraActive"
                                                    class="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-100 text-slate-500 hover:bg-violet-100 hover:text-violet-600 transition-all text-sm"><i
                                                        class="pi pi-camera"></i></button>
                                                <div v-else
                                                    class="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-100 text-emerald-600">
                                                    <i class="pi pi-check"></i>
                                                </div>
                                            </div>
                                        </div>
                                        <!-- Mic -->
                                        <div class="rounded-2xl border-2 overflow-hidden transition-all duration-500"
                                            :class="micActive ? 'border-emerald-200' : 'border-slate-100'">
                                            <div
                                                class="relative bg-slate-900 aspect-video flex items-end justify-center p-4 gap-1">
                                                <div v-for="i in 18" :key="i"
                                                    class="w-2 rounded-full transition-all duration-75"
                                                    :class="micActive ? 'bg-violet-400' : 'bg-slate-700'"
                                                    :style="{ height: micActive ? Math.max(6, audioLevel * (0.3 + Math.abs(Math.sin(i)) * 0.7)) + 'px' : '6px' }">
                                                </div>
                                                <div v-if="!micActive"
                                                    class="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-500">
                                                    <i class="pi pi-microphone-off text-3xl"></i><span
                                                        class="text-[9px] font-black uppercase tracking-widest">Mic
                                                        Off</span>
                                                </div>
                                                <div v-if="micActive"
                                                    class="absolute top-2 right-2 flex items-center gap-1.5 bg-black/50 px-2 py-1 rounded-full">
                                                    <div class="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse">
                                                    </div>
                                                    <span class="text-[8px] font-black text-white">{{ audioLevel
                                                        }}%</span>
                                                </div>
                                            </div>
                                            <div class="p-4 bg-white">
                                                <div v-if="micActive" class="mb-2.5">
                                                    <div class="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div class="h-full rounded-full transition-all duration-75"
                                                            :class="audioLevel > 5 ? 'bg-gradient-to-r from-violet-400 to-emerald-400' : 'bg-slate-300'"
                                                            :style="{ width: audioLevel + '%' }"></div>
                                                    </div>
                                                </div>
                                                <div class="flex items-center justify-between">
                                                    <div>
                                                        <p
                                                            class="text-[10px] font-black text-slate-700 uppercase tracking-tight">
                                                            Microphone</p>
                                                        <p class="text-[8px] font-bold mt-0.5"
                                                            :class="micActive ? 'text-emerald-600' : micError ? 'text-rose-400' : 'text-slate-400'">
                                                            {{ micActive ? 'Active & Working ✓' : micError || 'Click to   start' }}</p>
                                                    </div>
                                                    <button @click="startMic" v-if="!micActive"
                                                        class="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-100 text-slate-500 hover:bg-violet-100 hover:text-violet-600 transition-all text-sm"><i
                                                            class="pi pi-microphone"></i></button>
                                                    <div v-else
                                                        class="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-100 text-emerald-600">
                                                        <i class="pi pi-check"></i>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div v-if="cameraError || micError"
                                        class="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 shrink-0">
                                        <i class="pi pi-exclamation-triangle text-amber-500 mt-0.5 shrink-0"></i>
                                        <p
                                            class="text-[9px] font-bold text-amber-700 uppercase tracking-widest leading-relaxed">
                                            Click
                                            "Allow" when your browser asks for permissions.</p>
                                    </div>
                                    <div
                                        class="mt-5 pt-5 border-t border-slate-50 shrink-0 flex items-center justify-between">
                                        <button @click="goBack"
                                            class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 border border-slate-200 hover:bg-slate-50 transition-all">
                                            <i class="pi pi-arrow-left"></i> Back
                                        </button>
                                        <button @click="goNext" :disabled="!camMicReady"
                                            class="flex items-center gap-3 px-8 py-3.5 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all duration-500 shadow-xl disabled:opacity-30 disabled:cursor-not-allowed disabled:grayscale"
                                            :class="camMicReady ? 'bg-slate-900 text-white hover:bg-violet-600 hover:-translate-y-0.5' : 'bg-slate-100 text-slate-400'">
                                            Next <i class="pi pi-arrow-right text-[10px]"></i>
                                        </button>
                                    </div>
                                </div>
                            </transition>

                            <!-- ════════ STEP 2: Identity Verification ════════ -->
                            <transition name="fade-slide" mode="out-in">
                                <div v-if="currentStep === 2" key="s2" class="flex flex-col flex-1">
                                    <div class="mb-4 shrink-0">
                                        <h3 class="text-sm font-black text-slate-800 uppercase tracking-tight">Identity
                                            Verification
                                        </h3>
                                        <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                            Capture your face,
                                            upload ID card & enter your ID number</p>
                                    </div>

                                    <div class="flex-1 overflow-y-auto space-y-4 pr-1">
                                        <!-- Face Capture -->
                                        <div class="border-2 rounded-2xl overflow-hidden transition-all"
                                            :class="capturedFace ? 'border-emerald-200' : 'border-slate-100'">
                                            <div
                                                class="p-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                                                <div class="w-6 h-6 rounded-lg flex items-center justify-center"
                                                    :class="capturedFace ? 'bg-emerald-100 text-emerald-600' : 'bg-violet-100 text-violet-600'">
                                                    <i class="pi pi-camera text-[10px]"></i>
                                                </div>
                                                <span
                                                    class="text-[10px] font-black text-slate-700 uppercase tracking-widest">Face
                                                    Photo</span>
                                                <div v-if="capturedFace"
                                                    class="ml-auto flex items-center gap-1 text-emerald-600">
                                                    <i class="pi pi-check-circle text-xs"></i>
                                                    <span
                                                        class="text-[9px] font-black uppercase tracking-widest">Captured</span>
                                                </div>
                                            </div>
                                            <div class="p-4 grid grid-cols-2 gap-4">
                                                <!-- Live camera -->
                                                <div
                                                    class="relative rounded-xl overflow-hidden bg-slate-900 aspect-video">
                                                    <video ref="faceVideoEl" autoplay playsinline muted
                                                        class="w-full h-full object-cover"></video>
                                                    <div
                                                        class="absolute top-2 right-2 flex items-center gap-1 bg-black/50 px-2 py-0.5 rounded-full">
                                                        <div class="w-1 h-1 rounded-full bg-rose-500 animate-pulse">
                                                        </div>
                                                        <span class="text-[8px] text-white font-black">LIVE</span>
                                                    </div>
                                                </div>
                                                <!-- Captured / capture button -->
                                                <div class="flex flex-col gap-2">
                                                    <div
                                                        class="relative rounded-xl overflow-hidden bg-slate-100 aspect-video flex items-center justify-center">
                                                        <img v-if="capturedFace" :src="capturedFace"
                                                            class="w-full h-full object-cover" />
                                                        <span v-else
                                                            class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Preview</span>
                                                    </div>
                                                    <div class="flex gap-2">
                                                        <button @click="capturePhoto" :disabled="isCapturing"
                                                            class="flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-white shadow-md"
                                                            :class="capturedFace ? 'bg-slate-400' : 'bg-violet-600 hover:bg-violet-700'">
                                                            <i class="pi pi-camera mr-1 text-[9px]"></i>{{ capturedFace
                                                                ? 'Retake' :
                                                                'Capture' }}
                                                        </button>
                                                        <button v-if="capturedFace" @click="retakePhoto"
                                                            class="py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all">
                                                            <i class="pi pi-refresh text-[9px]"></i>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- ID Card Upload + Number + Live Comparison -->
                                        <div class="space-y-4">

                                            <!-- Row 1: Upload + Number input -->
                                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <!-- ID Upload -->
                                                <div class="border-2 rounded-2xl overflow-hidden transition-all"
                                                    :class="uploadedId ? 'border-emerald-200' : 'border-slate-100'">
                                                    <div
                                                        class="p-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                                                        <div class="w-6 h-6 rounded-lg flex items-center justify-center"
                                                            :class="uploadedId ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'">
                                                            <i class="pi pi-id-card text-[10px]"></i>
                                                        </div>
                                                        <span
                                                            class="text-[10px] font-black text-slate-700 uppercase tracking-widest">ID
                                                            Card / Passport</span>
                                                    </div>
                                                    <div class="p-4">
                                                        <div v-if="uploadedId"
                                                            class="relative rounded-xl overflow-hidden aspect-video bg-slate-100">
                                                            <img :src="uploadedId" class="w-full h-full object-cover" />
                                                            <button
                                                                @click="uploadedId = null; extractedIdNumber = ''; idFaceStatus = ''; idMatchStatus = ''"
                                                                class="absolute top-2 right-2 w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center">
                                                                <i class="pi pi-times text-[8px]"></i>
                                                            </button>
                                                        </div>
                                                        <label v-else
                                                            class="flex flex-col items-center justify-center gap-2 aspect-video border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-violet-300 hover:bg-violet-50/30 transition-all">
                                                            <i class="pi pi-upload text-slate-400 text-xl"></i>
                                                            <span
                                                                class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Click
                                                                to Upload</span>
                                                            <input type="file" accept="image/*" @change="handleIdUpload"
                                                                class="hidden" />
                                                        </label>

                                                        <!-- OCR Progress -->
                                                        <div v-if="isExtractingId"
                                                            class="mt-3 flex items-center gap-2 p-2.5 bg-violet-50 rounded-xl border border-violet-100">
                                                            <div
                                                                class="w-3 h-3 border-2 border-violet-200 border-t-violet-500 rounded-full animate-spin">
                                                            </div>
                                                            <span
                                                                class="text-[9px] font-black text-violet-600 uppercase tracking-widest">Reading
                                                                ID number...</span>
                                                        </div>
                                                        <!-- Face Comparing Progress -->
                                                        <div v-if="isFaceComparingWithId"
                                                            class="mt-2 flex items-center gap-2 p-2.5 bg-sky-50 rounded-xl border border-sky-100">
                                                            <div
                                                                class="w-3 h-3 border-2 border-sky-200 border-t-sky-500 rounded-full animate-spin">
                                                            </div>
                                                            <span
                                                                class="text-[9px] font-black text-sky-600 uppercase tracking-widest">Comparing
                                                                face...</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <!-- ID Number Input -->
                                                <div class="border-2 rounded-2xl overflow-hidden transition-all"
                                                    :class="idNumber.trim().length >= 3 ? 'border-emerald-200' : 'border-slate-100'">
                                                    <div
                                                        class="p-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                                                        <div
                                                            class="w-6 h-6 rounded-lg flex items-center justify-center bg-slate-200 text-slate-500">
                                                            <i class="pi pi-key text-[10px]"></i>
                                                        </div>
                                                        <span
                                                            class="text-[10px] font-black text-slate-700 uppercase tracking-widest">National
                                                            ID / Passport No.</span>
                                                    </div>
                                                    <div class="p-4 flex flex-col gap-3">
                                                        <input v-model="idNumber" type="text" maxlength="50"
                                                            placeholder="Enter your national ID number"
                                                            class="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-violet-400 focus:outline-none font-mono text-sm text-slate-700 transition-all" />
                                                        <p
                                                            class="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                                                            Your national ID or passport number
                                                        </p>

                                                        <!-- Final verify badges -->
                                                        <div v-if="verifySuccess"
                                                            class="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                                                            <i class="pi pi-verified text-emerald-500"></i>
                                                            <span
                                                                class="text-[9px] font-black text-emerald-700 uppercase tracking-widest">Identity
                                                                Verified ✓</span>
                                                        </div>
                                                        <div v-if="verifyError"
                                                            class="flex items-center gap-2 p-3 bg-rose-50 rounded-xl border border-rose-100">
                                                            <i class="pi pi-times-circle text-rose-400"></i>
                                                            <span class="text-[9px] font-bold text-rose-600">{{
                                                                verifyError }}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <!-- Row 2: Live Comparison Results (appear after upload) -->
                                            <div v-if="uploadedId && idFaceStatus"
                                                class="grid grid-cols-1 md:grid-cols-2 gap-4">

                                                <!-- ── Card A: ID Number Display Only ── -->
                                                <div v-if="showIdNumberCard"
                                                    class="rounded-2xl border-2 border-slate-200 bg-slate-50 overflow-hidden transition-all">
                                                    <div class="px-4 py-3 border-b border-slate-100 bg-white">
                                                        <span
                                                            class="text-[10px] font-black uppercase tracking-widest text-slate-600">
                                                            ID Number
                                                        </span>
                                                    </div>
                                                    <div class="p-4 space-y-3">
                                                        <div>
                                                            <p
                                                                class="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                                                Extracted from ID image</p>
                                                            <p v-if="extractedIdNumber"
                                                                class="font-mono text-sm font-black text-slate-700 tracking-widest bg-white border border-slate-200 rounded-xl px-3 py-2">
                                                                {{ extractedIdNumber }}
                                                            </p>
                                                            <p v-else
                                                                class="text-[10px] text-amber-600 font-bold leading-5">
                                                                We could not read the ID number from the image locally.
                                                                Please enter the
                                                                number manually below and continue.</p>
                                                        </div>
                                                        <div>
                                                            <p
                                                                class="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                                                Your entered number</p>
                                                            <p
                                                                class="font-mono text-sm font-black text-slate-700 tracking-widest bg-white border border-slate-200 rounded-xl px-3 py-2">
                                                                {{ idNumber || '—' }}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <!-- ── Card B: Face Match Comparison ── -->
                                                <div class="rounded-2xl border-2 overflow-hidden transition-all" :class="idFaceStatus === 'matched' ? 'border-emerald-200 bg-emerald-50/40'
                                                    : idFaceStatus === 'mismatch' ? 'border-rose-200 bg-rose-50/30'
                                                        : idFaceStatus === 'no_face' ? 'border-amber-200 bg-amber-50/30'
                                                            : 'border-slate-200 bg-slate-50'">
                                                    <div class="px-4 py-3 border-b flex items-center gap-2" :class="idFaceStatus === 'matched' ? 'border-emerald-100 bg-emerald-50'
                                                        : idFaceStatus === 'mismatch' ? 'border-rose-100 bg-rose-50'
                                                            : idFaceStatus === 'no_face' ? 'border-amber-100 bg-amber-50'
                                                                : 'border-slate-100 bg-white'">
                                                        <i class="pi text-sm" :class="idFaceStatus === 'matched' ? 'pi-check-circle text-emerald-500'
                                                            : idFaceStatus === 'mismatch' ? 'pi-times-circle text-rose-400'
                                                                : idFaceStatus === 'no_face' ? 'pi-exclamation-triangle text-amber-500'
                                                                    : 'pi-face-smile text-slate-400'"></i>
                                                        <span class="text-[10px] font-black uppercase tracking-widest"
                                                            :class="idFaceStatus === 'matched' ? 'text-emerald-700'
                                                                : idFaceStatus === 'mismatch' ? 'text-rose-600'
                                                                    : idFaceStatus === 'no_face' ? 'text-amber-700'
                                                                        : 'text-slate-600'">
                                                            Face Match Check
                                                        </span>
                                                        <span v-if="idFaceStatus === 'matched'"
                                                            class="ml-auto text-[9px] font-black text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">MATCH
                                                            ✓</span>
                                                        <span v-else-if="idFaceStatus === 'mismatch'"
                                                            class="ml-auto text-[9px] font-black text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full">MISMATCH
                                                            ✗</span>
                                                        <span v-else-if="idFaceStatus === 'no_face'"
                                                            class="ml-auto text-[9px] font-black text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">NO
                                                            FACE</span>
                                                    </div>
                                                    <div class="p-4 flex items-center gap-4">
                                                        <!-- Circular score -->
                                                        <div v-if="idFaceMatchScore !== null"
                                                            class="relative flex-shrink-0">
                                                            <svg class="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                                                                <circle cx="32" cy="32" r="26" fill="none"
                                                                    stroke="#f1f5f9" stroke-width="6" />
                                                                <circle cx="32" cy="32" r="26" fill="none"
                                                                    stroke-width="6" stroke-linecap="round"
                                                                    :stroke="idFaceStatus === 'matched' ? '#10b981' : '#f43f5e'"
                                                                    :stroke-dasharray="163.36"
                                                                    :stroke-dashoffset="163.36 - (163.36 * idFaceMatchScore / 100)" />
                                                            </svg>
                                                            <span
                                                                class="absolute inset-0 flex items-center justify-center text-[13px] font-black"
                                                                :class="idFaceStatus === 'matched' ? 'text-emerald-600' : 'text-rose-500'">
                                                                {{ idFaceMatchScore }}%
                                                            </span>
                                                        </div>
                                                        <!-- Text -->
                                                        <div class="flex-1">
                                                            <p v-if="idFaceStatus === 'matched'"
                                                                class="text-[11px] font-black text-emerald-700">
                                                                Face matches the ID card photo!
                                                            </p>
                                                            <p v-else-if="idFaceStatus === 'mismatch'"
                                                                class="text-[11px] font-black text-rose-600">
                                                                Face does not match. Ensure you are the person shown on
                                                                the ID.
                                                            </p>
                                                            <p v-else-if="idFaceStatus === 'no_face'"
                                                                class="text-[11px] font-black text-amber-600">
                                                                Could not detect a face in the ID image. Try a clearer
                                                                photo.
                                                            </p>
                                                            <p v-if="idFaceDistance !== null"
                                                                class="text-[9px] text-slate-400 font-mono mt-1">
                                                                Distance: {{ idFaceDistance }} (threshold: 0.60)
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                            </div>
                                            <!-- Loading state while comparing -->
                                            <div v-else-if="uploadedId && (isExtractingId || isFaceComparingWithId)"
                                                class="grid grid-cols-2 gap-4">
                                                <div v-for="n in 2" :key="n"
                                                    class="h-32 rounded-2xl border-2 border-slate-100 bg-slate-50 animate-pulse">
                                                </div>
                                            </div>

                                        </div>

                                    </div>

                                    <div
                                        class="mt-5 pt-5 border-t border-slate-50 shrink-0 flex items-center justify-between gap-3">
                                        <button @click="goBack"
                                            class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 border border-slate-200 hover:bg-slate-50 transition-all">
                                            <i class="pi pi-arrow-left"></i> Back
                                        </button>
                                        <div class="flex items-center gap-3">
                                            <button v-if="!verifySuccess" @click="verifyIdentity"
                                                :disabled="!canVerify || isVerifying || !faceModelsLoaded"
                                                class="flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg disabled:opacity-30 disabled:cursor-not-allowed"
                                                :class="canVerify && !isVerifying ? 'bg-violet-600 text-white hover:bg-violet-700' : 'bg-slate-100 text-slate-400'">
                                                <i class="pi pi-spin pi-spinner text-[9px]" v-if="isVerifying"></i>
                                                <i class="pi pi-shield text-[9px]" v-else></i>
                                                {{ isVerifying ? 'Verifying...' : 'Verify Identity' }}
                                            </button>
                                            <button @click="goNext" :disabled="!verifySuccess"
                                                class="flex items-center gap-3 px-8 py-3.5 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all duration-500 shadow-xl disabled:opacity-30 disabled:cursor-not-allowed disabled:grayscale"
                                                :class="verifySuccess ? 'bg-slate-900 text-white hover:bg-violet-600 hover:-translate-y-0.5' : 'bg-slate-100 text-slate-400'">
                                                Next <i class="pi pi-arrow-right text-[10px]"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </transition>

                            <!-- ════════ STEP 3: Review & Confirm ════════ -->
                            <transition name="fade-slide" mode="out-in">
                                <div v-if="currentStep === 3" key="s3" class="flex flex-col flex-1">
                                    <div class="mb-4 shrink-0">
                                        <h3 class="text-sm font-black text-slate-800 uppercase tracking-tight">Review &
                                            Confirm</h3>
                                        <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                            Read and agree to
                                            the exam rules before proceeding</p>
                                    </div>

                                    <div class="flex-1 overflow-y-auto space-y-4 pr-1">
                                        <!-- Verified summary chips -->
                                        <div class="grid grid-cols-3 gap-2">
                                            <div
                                                class="flex items-center gap-2 p-2.5 bg-emerald-50 rounded-xl border border-emerald-100">
                                                <i class="pi pi-desktop text-emerald-500 text-xs"></i>
                                                <span
                                                    class="text-[8px] font-black text-emerald-700 uppercase tracking-widest">System
                                                    ✓</span>
                                            </div>
                                            <div
                                                class="flex items-center gap-2 p-2.5 bg-emerald-50 rounded-xl border border-emerald-100">
                                                <i class="pi pi-camera text-emerald-500 text-xs"></i>
                                                <span
                                                    class="text-[8px] font-black text-emerald-700 uppercase tracking-widest">Camera
                                                    ✓</span>
                                            </div>
                                            <div
                                                class="flex items-center gap-2 p-2.5 bg-emerald-50 rounded-xl border border-emerald-100">
                                                <i class="pi pi-id-card text-emerald-500 text-xs"></i>
                                                <span
                                                    class="text-[8px] font-black text-emerald-700 uppercase tracking-widest">Identity
                                                    ✓</span>
                                            </div>
                                        </div>

                                        <!-- Rules -->
                                        <div class="border border-amber-200 bg-amber-50/50 rounded-2xl p-5">
                                            <div class="flex items-center gap-2 mb-4">
                                                <i class="pi pi-exclamation-triangle text-amber-500"></i>
                                                <h4 class="text-xs font-black text-amber-800 uppercase tracking-widest">
                                                    Exam Rules —
                                                    Read Carefully</h4>
                                            </div>
                                            <div class="space-y-2.5">
                                                <div v-for="rule in [
                                                    'Keep your camera ON and pointed at your face at all times',
                                                    'Do NOT use other applications, browser tabs, or external aids',
                                                    'Do NOT copy, paste, or communicate with anyone',
                                                    'Do NOT leave the exam screen or cover the camera',
                                                    'Your session is being recorded — video, audio, and screen',
                                                    'Violations may result in exam rejection or account suspension'
                                                ]" :key="rule" class="flex items-start gap-3">
                                                    <div
                                                        class="w-4 h-4 rounded-full bg-amber-200 flex items-center justify-center shrink-0 mt-0.5">
                                                        <i class="pi pi-check text-amber-700"
                                                            style="font-size: 8px;"></i>
                                                    </div>
                                                    <span
                                                        class="text-[10px] font-bold text-amber-800 leading-relaxed">{{
                                                            rule }}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- AI Monitoring note -->
                                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div
                                                class="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-3">
                                                <i class="pi pi-eye text-slate-400 mt-0.5"></i>
                                                <div>
                                                    <p
                                                        class="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-1">
                                                        Live
                                                        Proctoring</p>
                                                    <p class="text-[9px] text-slate-500 leading-relaxed">A human proctor
                                                        may monitor
                                                        your exam in real-time</p>
                                                </div>
                                            </div>
                                            <div
                                                class="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-3">
                                                <i class="pi pi-desktop text-slate-400 mt-0.5"></i>
                                                <div>
                                                    <p
                                                        class="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-1">
                                                        AI
                                                        Detection</p>
                                                    <p class="text-[9px] text-slate-500 leading-relaxed">AI is used to
                                                        detect suspicious
                                                        behavior automatically</p>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Agreement checkbox -->
                                        <label
                                            class="flex items-start gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all"
                                            :class="agreedToRules ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200 hover:border-violet-200 hover:bg-violet-50/20'">
                                            <div class="w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all"
                                                :class="agreedToRules ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'">
                                                <i v-if="agreedToRules" class="pi pi-check text-white text-[9px]"></i>
                                            </div>
                                            <input type="checkbox" v-model="agreedToRules" class="hidden" />
                                            <span
                                                class="text-[10px] font-black text-slate-700 uppercase tracking-widest leading-relaxed">
                                                I have read and agree to all exam rules and proctoring conditions
                                            </span>
                                        </label>
                                    </div>

                                    <div
                                        class="mt-5 pt-5 border-t border-slate-50 shrink-0 flex items-center justify-between">
                                        <button @click="goBack"
                                            class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 border border-slate-200 hover:bg-slate-50 transition-all">
                                            <i class="pi pi-arrow-left"></i> Back
                                        </button>
                                        <button @click="goNext" :disabled="!agreedToRules"
                                            class="flex items-center gap-3 px-8 py-3.5 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all duration-500 shadow-xl disabled:opacity-30 disabled:cursor-not-allowed disabled:grayscale"
                                            :class="agreedToRules ? 'bg-slate-900 text-white hover:bg-violet-600 hover:-translate-y-0.5' : 'bg-slate-100 text-slate-400'">
                                            Confirm <i class="pi pi-arrow-right text-[10px]"></i>
                                        </button>
                                    </div>
                                </div>
                            </transition>

                            <!-- ════════ STEP 4: Ready ════════ -->
                            <transition name="fade-slide" mode="out-in">
                                <div v-if="currentStep === 4" key="s4"
                                    class="flex flex-col flex-1 items-center justify-center text-center py-6">
                                    <div class="relative mb-8">
                                        <div
                                            class="w-28 h-28 rounded-[2rem] bg-emerald-50 flex items-center justify-center mx-auto border-2 border-emerald-100 shadow-xl shadow-emerald-100">
                                            <i class="pi pi-shield text-5xl text-emerald-500"></i>
                                        </div>
                                        <div
                                            class="absolute -right-1 -top-1 w-8 h-8 bg-emerald-500 rounded-full border-4 border-white flex items-center justify-center shadow-md">
                                            <i class="pi pi-check text-white text-[10px]"></i>
                                        </div>
                                    </div>
                                    <h2 class="text-2xl font-black text-slate-900 uppercase tracking-tight mb-3">
                                        Verification Complete
                                    </h2>
                                    <p
                                        class="text-slate-400 font-bold text-xs uppercase tracking-widest leading-relaxed max-w-xs mb-8">
                                        Your identity has been verified. You are now ready to select your exam skill and
                                        begin the
                                        proctored assessment.
                                    </p>
                                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10 w-full max-w-sm">
                                        <div
                                            class="flex flex-col items-center gap-1.5 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                                            <i class="pi pi-desktop text-emerald-500 text-sm"></i>
                                            <span
                                                class="text-[8px] font-black text-emerald-700 uppercase tracking-widest">System</span>
                                        </div>
                                        <div
                                            class="flex flex-col items-center gap-1.5 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                                            <i class="pi pi-camera text-emerald-500 text-sm"></i>
                                            <span
                                                class="text-[8px] font-black text-emerald-700 uppercase tracking-widest">Camera</span>
                                        </div>
                                        <div
                                            class="flex flex-col items-center gap-1.5 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                                            <i class="pi pi-id-card text-emerald-500 text-sm"></i>
                                            <span
                                                class="text-[8px] font-black text-emerald-700 uppercase tracking-widest">Identity</span>
                                        </div>
                                        <div
                                            class="flex flex-col items-center gap-1.5 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                                            <i class="pi pi-file-check text-emerald-500 text-sm"></i>
                                            <span
                                                class="text-[8px] font-black text-emerald-700 uppercase tracking-widest">Rules</span>
                                        </div>
                                    </div>
                                    <button @click="proceed"
                                        class="group flex items-center gap-3 px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-[0.25em] shadow-2xl hover:bg-violet-600 hover:shadow-violet-300/40 hover:-translate-y-1 transition-all duration-500">
                                        Select Your Skill
                                        <i
                                            class="pi pi-arrow-right text-[10px] group-hover:translate-x-1 transition-transform"></i>
                                    </button>
                                </div>
                            </transition>

                        </div><!-- /right panel -->
                    </div>
                </div>

            </div>
        </main>
    </div>
</template>

<style scoped>
.animate-in {
    animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
}

.fade-slide-enter-active,
.fade-slide-leave-active {
    transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.fade-slide-enter-from {
    opacity: 0;
    transform: translateX(20px);
}

.fade-slide-leave-to {
    opacity: 0;
    transform: translateX(-20px);
}
</style>
