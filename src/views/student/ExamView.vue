<script setup>
import { useModal } from '@/composables/useModal';
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue';
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router';
import api from '@/services/api';
import proctoringService from '@/services/proctoringService';
import { authStorage } from '@/services/authStorage';
import RequirementTester from '@/components/RequirementTester.vue';
import StudentHeader from '@/components/StudentHeader.vue';
import VirtualKeyboard from '@/components/VirtualKeyboard.vue';
import QuestionDispatcher from '@/components/exam/QuestionDispatcher.vue';
import ProctoringInitializer from '@/components/exam/ProctoringInitializer.vue';
import ProctorCamera from '@/components/exam/ProctorCamera.vue';
// NOTE: Proctoring is now controlled per-partner via partner.proctoring_required (fetched from /user API).
// PROCTORING_ENABLED is kept as a master kill-switch override.
import { PROCTORING_ENABLED } from '@/config/features';

// Composables
import { useExamTimer } from '@/composables/useExamTimer';
import { useAntiCheat } from '@/composables/useAntiCheat';
import { useAudioEngine } from '@/composables/useAudioEngine';
import { useMediaUrl } from '@/composables/useMediaUrl';
import { useVirtualKeyboard } from '@/composables/useVirtualKeyboard';
import * as faceapi from '@vladmandic/face-api';

// Pre-load face-api models in the background (non-blocking)
const preloadFaceApiModels = () => {
    // Start loading models in background without awaiting
    Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/models/face-api'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/models/face-api'),
        faceapi.nets.faceRecognitionNet.loadFromUri('/models/face-api'),
    ]).catch(err => console.warn('Face-API models preload failed (non-critical):', err));
};

// Start preloading immediately when component loads (very early)
preloadFaceApiModels();

// Constants
const QUESTION_TYPES_WITHOUT_OPTIONS = ['speaking', 'fill_blank', 'drag_drop', 'word_selection', 'click_word', 'highlight', 'matching', 'ordering', 'writing', 'short_answer'];
const STIMULUS_QUESTION_TYPES = ['writing', 'short_answer'];
const INACTIVITY_TIMEOUT = 1000 * 60 * 1000;
const TIMER_WARNING_THRESHOLD = 300;

const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

const { showAlert } = useModal();

const route = useRoute();
const router = useRouter();
const attemptId = ref(route.params.id);
const examId = route.params.examId;
const skillId = route.params.skillId;
const levelId = route.params.levelId;




let sessionPollInterval = null
const navigateSafely = async (path) => {
    try {
        await router.push(path);
    } catch (err) {
        console.warn('Router push failed, falling back to location.href:', err);
        window.location.href = path;
    }
};

const handleSessionInterruption = async (messageAr, messageEn, shouldEndSession = false) => {
    stopSessionPolling();
    await showAlert(currentLang.value === 'ar' ? messageAr : messageEn);

    if (shouldEndSession) {
        await endProctoringSession('terminated_by_proctor');
    }

    isIntentionallyLeaving.value = true;
    await navigateSafely('/skill-selection');
};


const pollSessionStatus = async () => {
    const sessionId = proctoringSessionId.value
    if (!sessionId || !proctoringRequired.value) return

    try {
        const res = await proctoringService.getStatus(sessionId)
        const status = res.data?.session?.status
        const completedSkills = (res.data?.session?.completed_skills || []).map(Number)
        const activeSkillId = currentSkill.value?.id ?? (skillId ? Number(skillId) : null)

        if (status === 'ended' || status === 'cancelled') {

            await handleSessionInterruption(
                'Your proctoring session has been ended by the admin.',
                true
            );
        } else if (status === 'paused') {

            await handleSessionInterruption(
                'This skill exam has been stopped by the admin. You will be redirected to skill selection.',
                false
            );
        } else if (activeSkillId && completedSkills.includes(activeSkillId)) {
            await handleSessionInterruption(
                'This skill exam has been stopped by the admin. You will be redirected to skill selection.',
                false
            );
        }
    } catch (e) {
        console.warn('Session poll failed:', e)
    }
}

const startSessionPolling = () => {
    if (sessionPollInterval) return
    sessionPollInterval = setInterval(pollSessionStatus, 8000)
}

const stopSessionPolling = () => {
    if (sessionPollInterval) {
        clearInterval(sessionPollInterval)
        sessionPollInterval = null
    }
}








// === PROCTORING STATE ===
const proctoringComplete = ref(sessionStorage.getItem('proctoring_verified') === 'true');
const proctoringRequired = ref(false);
const studentId = ref(null);
const proctoringSessionId = ref(null);
const proctoringSessionToken = ref(sessionStorage.getItem('proctoring_session_token') ?? null); // âœ… Ø£Ø¶Ù Ø§Ù„Ø³Ø·Ø± Ø¯Ù‡
const currentLang = ref(localStorage.getItem('dashboard_lang') || 'en');

const enteredExam = ref(false);
const proctorCameraState = ref('initializing'); // 'initializing', 'ready', 'error'
const proctorCameraError = ref('');

const handleCameraReady = () => {
    proctorCameraState.value = 'ready';
    proctorCameraError.value = '';
    // Automatically transition into the exam after a short delay (2 seconds)
    setTimeout(() => {
        handleEnterExam();
    }, 2000);
};

const handleCameraError = (errMsg) => {
    proctorCameraState.value = 'error';
    proctorCameraError.value = errMsg || 'Failed to start proctoring camera';
};

const handleEnterExam = () => {
    enteredExam.value = true;
    startTimer();
    startSessionPolling();
    playCurrentAudio();
};

const reloadPage = () => {
    window.location.reload();
};

const attempt = ref(null);
const currentSkill = ref(null);
const questions = ref([]);
const currentIndex = ref(0);
const answers = ref([]);
const systemRequirements = ref([]);
const globalOffset = ref(0);
const totalSkillQuestions = ref(0);
const currentLevel = ref(null);

const isLoading = ref(true);
const isStarting = ref(false);
const isSubmittingBatch = ref(false);
const questionSubmitted = ref(false);
const showRetryNotification = ref(false);
const errorMsg = ref('');
const checkedRequirements = ref([]);
const hasListened = ref(false);
const listenedQuestions = ref(new Set());
const listenedPassages = ref(new Set());

const shouldShowContent = computed(() => {
    if (!currentQ.value) return false;
    const audioUrl = currentQ.value?.passage?.audio_url
        || currentQ.value?.passage?.audio_path
        || currentQ.value?.audio_url
        || currentQ.value?.audio_path;
    if (!audioUrl) return true;
    return hasListened.value;
});

const markCurrentAsListened = () => {
    hasListened.value = true;
    if (currentQ.value?.id) {
        listenedQuestions.value.add(currentQ.value.id);
    }
    if (currentQ.value?.passage?.id) {
        listenedPassages.value.add(currentQ.value.passage.id);
    }
};

const isDemo = ref(false);
const showLevelTransition = ref(false);
const nextLevelName = ref('');
const showTimeoutModal = ref(false);
const lastAudioUrl = ref('');
const inactivityTimer = ref(null);
const cheatAttempts = ref([]);
const showExitModal = ref(false);
const showConfirmAnswerModal = ref(false);
const showInactivityModal = ref(false);
const activeTesterReq = ref(null);
const { keyboardLayout, showVirtualKeyboard } = useVirtualKeyboard();
const timerConfig = ref(null);
const lastActivityAt = ref(Date.now());

// Use Composables
const { timeLeftSeconds, formattedTime, isTimeLow, startTimer: initTimer, stopTimer } = useExamTimer();
const {
    cheatWarnings, cheatMessage, showCheatModal, showFinalCheatModal, isIntentionallyLeaving,
    handleVisibilityChange: logCheatWarning, setupAntiCheat, destroyAntiCheat
} = useAntiCheat(attemptId, {
    onFinalWarning: () => {
        cheatAttempts.value.push({
            timestamp: new Date().toISOString(),
            type: 'tab_switching',
            warning_count: cheatWarnings.value
        });
    }
}, proctoringSessionId);

const {
    audioRef, isAudioPlaying, audioProgress, audioCurrentTime, audioDuration, autoplayFailed,
    updateAudioProgress, toggleAudioManual
} = useAudioEngine();

const handleVisibilityChange = () => logCheatWarning(isStarting.value, showTimeoutModal.value);

const startTimer = async () => {
    const user = authStorage.getUser();
    const role = (user?.role || '').toLowerCase();
    isDemo.value = ['demo', 'staff'].includes(role) || !!user?.student?.is_demo;
    if (isDemo.value) return;
    initTimer(timerConfig.value, () => {
        showTimeoutModal.value = true;
    });
};

const canStart = computed(() => {
    const mandatoryIds = systemRequirements.value.filter(r => r.is_mandatory).map(r => r.id);
    return mandatoryIds.every(id => checkedRequirements.value.includes(id));
});

const toggleRequirement = async (req) => {
    if (req.test_type && req.test_type !== 'none' && !checkedRequirements.value.includes(req.id)) {
        activeTesterReq.value = req;
        return;
    }
    const index = checkedRequirements.value.indexOf(req.id);
    if (index === -1) checkedRequirements.value.push(req.id);
    else checkedRequirements.value.splice(index, 1);
};

const handleTestPassed = async (req) => {
    if (!checkedRequirements.value.includes(req.id)) {
        checkedRequirements.value.push(req.id);
    }
    activeTesterReq.value = null;
};

// === PROCTORING HANDLERS ===

const handleProctoringComplete = async (sessionData) => {
    proctoringSessionId.value = sessionData.session_id;
    proctoringSessionToken.value = sessionData.session_token; // âœ… Ø£Ø¶Ù Ø§Ù„Ø³Ø·Ø± Ø¯Ù‡
    sessionStorage.setItem('proctoring_session_token', sessionData.session_token); // âœ… ÙˆØ¯Ù‡
    sessionStorage.setItem('proctoring_session_id', sessionData.session_id.toString()); // âœ… FIX: Ø¯Ù‡ Ø§Ù„Ù„ÙŠ ÙƒØ§Ù† Ù†Ø§Ù‚Øµ
    localStorage.setItem('active_proctoring_session_id', sessionData.session_id.toString());
    localStorage.setItem('active_proctoring_session_token', sessionData.session_token);
    proctoringComplete.value = true;
    startSessionPolling()
};

const autoStartProctoring = async () => {
    // Demo users who don't require proctoring should skip this entirely
    if (isDemo.value && !proctoringRequired.value) {
        proctoringComplete.value = true;
        return;
    }

    if (proctoringRequired.value && !proctoringSessionId.value) {
        const isVerified = sessionStorage.getItem('proctoring_verified') === 'true';
        if (isVerified) {
            try {
                // Check if identity verification already created a session
                const savedSessionId = sessionStorage.getItem('proctoring_session_id');

                let sId = studentId.value || attempt.value?.student_id;
                if (!sId) {
                    console.warn('Student ID is missing in autoStartProctoring, fetching user details...');
                    const userRes = await api.get('/user');
                    studentId.value = userRes.data?.id;
                    sId = userRes.data?.id;
                }

                const finalStudentId = sId || attempt.value?.student_id;
                if (!finalStudentId) {
                    throw new Error('Student ID could not be resolved');
                }

                // 1. Initiate proctoring session (passing savedSessionId to link exam_attempt_id)
                const response = await proctoringService.initiate(attemptId.value, finalStudentId, savedSessionId);

                if (response.data.success) {
                    const status = response.data.status;
                    if (status === 'paused' || status === 'ended' || status === 'cancelled') {
                        console.warn(`Proctoring session is ${status}, redirecting student.`);
                        isIntentionallyLeaving.value = true;
                        await navigateSafely('/skill-selection');
                        return;
                    }

                    await proctoringService.start(response.data.session_id);
                    proctoringSessionId.value = response.data.session_id;
                    proctoringSessionToken.value = response.data.session_token; // âœ… Ù„Ùˆ Ø§Ù„Ù€ backend Ø¨ÙŠØ¨Ø¹ØªÙ‡
                    sessionStorage.setItem('proctoring_session_id', response.data.session_id.toString());
                    sessionStorage.setItem('proctoring_session_token', response.data.session_token ?? ''); // âœ…
                    localStorage.setItem('active_proctoring_session_id', response.data.session_id.toString());
                    localStorage.setItem('active_proctoring_session_token', response.data.session_token ?? '');
                    proctoringComplete.value = true;
                    startSessionPolling()
                }
            } catch (err) {
                console.error('Failed to auto-start proctoring session:', err);
                // Fallback: if auto-initiate fails, let the user complete it via the UI modal
            }
        }
    }
};



// NEW: END PROCTORING SESSION
const endProctoringSession = async (reason = 'exam_submitted') => {
    const sessionId = proctoringSessionId.value;
    if (!sessionId) return;

    try {
        await proctoringService.end(sessionId, reason);
    } catch (e) {
        // Session may already be ended by admin â€” clean up local state anyway
        console.error('Failed to end proctoring session:', e);
    }

    proctoringSessionId.value = null;
    proctoringSessionToken.value = null;
    sessionStorage.removeItem('proctoring_session_id');
    sessionStorage.removeItem('proctoring_session_token');
    sessionStorage.removeItem('proctoring_verified');
    localStorage.removeItem('active_proctoring_session_id');
    localStorage.removeItem('active_proctoring_session_token');
};


const fetchData = async () => {
    isLoading.value = true;
    try {
        if (attemptId.value && attemptId.value !== 'start') {
            const attRes = await api.get(`/attempts/${attemptId.value}`);
            attempt.value = attRes.data;
            if (attempt.value.status === 'completed' || attempt.value.status === 'voided') {
                await navigateSafely('/skill-selection');
                return;
            }
            await autoStartProctoring();
            await fetchNextBatch();
            if (!proctoringRequired.value || enteredExam.value) {
                startTimer();
                startSessionPolling(); // âœ… Ensure proctoring polling is started for existing attempts
            }
        } else {
            await beginExam();
        }
        isIntentionallyLeaving.value = false; // Reset to false after initial load/redirect
    } catch (err) {
        errorMsg.value = "Session initialization failed.";
    } finally {
        isLoading.value = false;
    }
};

const beginExam = async () => {
    if (!attemptId.value || attemptId.value === 'start') {
        try {
            isLoading.value = true;
            const payload = { skill_id: skillId, level_id: levelId };
            const res = await api.post(`/exams/${examId}/start`, payload);
            attemptId.value = res.data.attempt.id;
            attempt.value = res.data.attempt;
            await autoStartProctoring();
            router.replace(`/exam/${attemptId.value}`);
        } catch (err) {
            await showAlert(err.response?.data?.error || 'Failed to start session');
            isLoading.value = false;
            isIntentionallyLeaving.value = true;
            await navigateSafely('/skill-selection');
            return;
        }
    }
    isStarting.value = false;
    await fetchNextBatch();
    if (!proctoringRequired.value || enteredExam.value) {
        startTimer();
    }
    isIntentionallyLeaving.value = false; // Reset to false after starting is complete
};

const confirmExit = async () => {
    showExitModal.value = false;
    isIntentionallyLeaving.value = true; // 
    try {
        isLoading.value = true;
        await api.post(`/attempts/${attemptId.value}/completion`);
        await navigateSafely('/skill-selection');
    } catch (err) {
        console.error('Error finishing attempt:', err);
        await navigateSafely('/skill-selection');
    }
};

const exitExam = async () => {
    showExitModal.value = true;
};

const isNavigatingBack = ref(false);

onBeforeRouteLeave((to, from) => {
    isIntentionallyLeaving.value = true;
    if (proctoringSessionId.value && skillId) {
        proctoringService.recordSkillExit(proctoringSessionId.value, skillId);
    }
});

const prevQuestion = async () => {
    if (currentIndex.value > 0) {
        isNavigatingBack.value = true;
        currentIndex.value--;
    }
};

const startNextLevel = async () => {
    showLevelTransition.value = false;
};

const fetchNextBatch = async () => {
    isLoading.value = true;
    if (audioRef.value) {
        audioRef.value.pause();
        audioRef.value.currentTime = 0;
    }
    isAudioPlaying.value = false;
    lastAudioUrl.value = '';
    questions.value = [];
    try {
        const res = await api.get(`/attempts/${attemptId.value}/next-batch`);
        // alert(res.data.total_questions);
        if (res.data.questions?.length > 0) {
            currentSkill.value = res.data.skill;

            if (proctoringSessionId.value && res.data.skill?.id) {
                proctoringService.recordSkillEntry(proctoringSessionId.value, res.data.skill.id);
            }

            if (currentLevel.value && res.data.level && res.data.level.id !== currentLevel.value.id) {
                nextLevelName.value = res.data.level.name;
                // showLevelTransition.value = true; // Disabled because shaimaa commented out the modal in template, preventing audio lock
                // globalOffset.value = 0; shaimaa commented this
            }
            currentLevel.value = res.data.level;

            //  totalSkillQuestions.value = res.data.total_questions; //shaimaa commented this

            if (res.data.skill_total_questions !== undefined) {
                totalSkillQuestions.value = res.data.skill_total_questions;
                globalOffset.value = res.data.skill_global_offset;
            } else {
                totalSkillQuestions.value = res.data.total_questions;
            }
            questions.value = res.data.questions;
            currentIndex.value = 0;
            questionSubmitted.value = false;
            hasListened.value = false;
            timerConfig.value = {
                type: res.data.timer_type,
                globalLimit: res.data.time_limit,
                skillDuration: res.data.skill_duration,
                skillStartedAt: res.data.current_skill_started_at
            };
            cheatWarnings.value = res.data.skill_cheat_warnings || 0;
            answers.value = questions.value.map(q => ({
                question_id: q.id,
                option_id: null,
                text_answer: '',
                recorded_file: null,
                is_media_uploaded: false,
                drag_drop_answers: [],
                selected_words: [],
                fill_blank_answers: [],
                matching_answers: {},
                ordering_answers: [],
                highlight_answers: []
            }));
            questions.value.forEach((q, idx) => {
                const content = q.content || '';
                if (q.type === 'drag_drop') {
                    const slotCount = (content.match(/\.{10,}|\[\s*target\s*\]|\[\s*\]/gi) || []).length;
                    answers.value[idx].drag_drop_answers = Array(slotCount).fill(null);
                } else if (q.type === 'word_selection' || q.type === 'click_word') {
                    answers.value[idx].selected_words = [];
                } else if (q.type === 'fill_blank') {
                    const slotCount = (content.match(/\[\s*input\s*\]|\[\s*\]/gi) || []).length;
                    answers.value[idx].fill_blank_answers = Array(slotCount).fill('');
                } else if (q.type === 'matching') {
                    answers.value[idx].matching_answers = {};
                } else if (q.type === 'ordering') {
                    answers.value[idx].ordering_answers = [];
                } else if (q.type === 'highlight') {
                    answers.value[idx].highlight_answers = [];
                } else if (q.type === 'short_answer') {
                    answers.value[idx].text_answer = '';
                }
            });
        } else {
            errorMsg.value = res.data.error || "Module content empty.";
        }
    } catch (err) {
        if (err.response?.status === 404) {
            errorMsg.value = err.response?.data?.error || "No more questions available for this level.";
        } else {
            errorMsg.value = err.response?.data?.error || "Assessment segment unavailable.";
        }
    } finally {
        isLoading.value = false;
        questionSubmitted.value = false;
        hasListened.value = false;
        listenedPassages.value.clear();
        isAudioPlaying.value = false;
        audioProgress.value = 0;
        audioCurrentTime.value = '0:00';
        audioDuration.value = '0:00';
        if (audioRef.value) {
            audioRef.value.pause();
            audioRef.value.currentTime = 0;
        }
        resetInactivityTimer();
        window.scrollTo(0, 0);
    }
};

const VALIDATORS = {
    mcq: (ans) => !!ans.option_id,
    true_false: (ans) => !!ans.option_id,
    speaking: (ans) => !!ans.recorded_file,
    writing: (ans) => !!(ans.text_answer && ans.text_answer.trim().length > 0) || !!ans.recorded_file,
    drag_drop: (ans) => ans.drag_drop_answers.every(a => a !== null && a !== ''),
    fill_blank: (ans) => ans.fill_blank_answers.every(a => a && a.trim().length > 0),
    matching: (ans, q) => Object.keys(ans.matching_answers).length === q.options.filter(o => o.is_correct).length,
    ordering: (ans, q) => ans.ordering_answers.length === q.options.length,
    highlight: (ans) => ans.highlight_answers.length > 0,
    short_answer: (ans) => ans.text_answer && ans.text_answer.trim().length > 0,
    click_word: (ans) => ans.selected_words.length > 0,
    word_selection: (ans) => ans.selected_words.length > 0,
};

const submitAnswer = async () => {
    const ans = answers.value[currentIndex.value];
    const q = currentQ.value;
    const isValid = VALIDATORS[q.type] ? VALIDATORS[q.type](ans, q) : !!ans.text_answer;
    if (!isValid) {
        showConfirmAnswerModal.value = true;
        return;
    }
    questionSubmitted.value = true;
};

const advanceQuestion = async () => {
    const prevAns = answers.value[currentIndex.value];
    const prevQ = currentQ.value;

    if (currentIndex.value < questions.value.length - 1) {
        saveCurrentAnswerDraft(prevAns, prevQ); // non-blocking background draft save
        currentIndex.value++;
        questionSubmitted.value = false;
        hasListened.value = false;
        window.scrollTo(0, 0);
    } else {
        await saveCurrentAnswerDraft(prevAns, prevQ); // await last draft before submitting
        await submitCurrentBatch();
    }
};

const saveCurrentAnswerDraft = async (ansToSave = null, qToSave = null) => {
    if (isStarting.value) return;
    const ans = ansToSave || answers.value[currentIndex.value];
    const q = qToSave || currentQ.value;
    if (!ans || !q) return;
    try {
        const formData = new FormData();
        formData.append('question_id', ans.question_id);
        if (ans.option_id) formData.append('option_id', ans.option_id);
        if (ans.text_answer) formData.append('text_answer', ans.text_answer);
        if (ans.recorded_file && !ans.is_media_uploaded) {
            const fileName = ans.recorded_file.name || 'voice.webm';
            formData.append('audio_file', ans.recorded_file, fileName);
        }
        const arrayFields = {
            selected_words: ans.selected_words,
            drag_drop_answers: ans.drag_drop_answers,
            fill_blank_answers: ans.fill_blank_answers,
            ordering_answers: ans.ordering_answers,
            highlight_answers: ans.highlight_answers
        };
        Object.entries(arrayFields).forEach(([fieldName, value]) => {
            if (value && Array.isArray(value) && value.length > 0) {
                value.forEach((val, vIdx) => {
                    formData.append(`${fieldName}[${vIdx}]`, val || '');
                });
            }
        });
        if (ans.matching_answers && Object.keys(ans.matching_answers).length > 0) {
            formData.append('matching_answers', JSON.stringify(ans.matching_answers));
        }
        await api.post(`/attempts/${attemptId.value}/save-answer`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        if (ans.recorded_file) {
            ans.is_media_uploaded = true;
        }
    } catch (err) {
        console.warn('Failed to save answer draft', err);
    }
};

const submitCurrentBatch = async (isTimeout = false) => {
    if (isSubmittingBatch.value) return;
    isSubmittingBatch.value = true;
    try {
        const formData = new FormData();
        answers.value.forEach((ans, index) => {
            formData.append(`answers[${index}][question_id]`, ans.question_id);
            if (ans.option_id) formData.append(`answers[${index}][option_id]`, ans.option_id);
            if (ans.text_answer) formData.append(`answers[${index}][text_answer]`, ans.text_answer);
            if (ans.recorded_file && !ans.is_media_uploaded) {
                const fileName = ans.recorded_file.name || 'voice.webm';
                formData.append(`answers[${index}][audio_file]`, ans.recorded_file, fileName);
            }
            const arrayFields = {
                selected_words: ans.selected_words,
                drag_drop_answers: ans.drag_drop_answers,
                fill_blank_answers: ans.fill_blank_answers,
                ordering_answers: ans.ordering_answers,
                highlight_answers: ans.highlight_answers
            };
            Object.entries(arrayFields).forEach(([fieldName, value]) => {
                if (value && Array.isArray(value) && value.length > 0) {
                    value.forEach((val, vIdx) => {
                        formData.append(`answers[${index}][${fieldName}][${vIdx}]`, val || '');
                    });
                }
            });
            if (ans.matching_answers && Object.keys(ans.matching_answers).length > 0) {
                formData.append(`answers[${index}][matching_answers]`, JSON.stringify(ans.matching_answers));
            }
        });
        const res = await api.post(`/attempts/${attemptId.value}/submit-batch`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        if (isTimeout) {
            if (inactivityTimer.value) clearTimeout(inactivityTimer.value);
            try {
                await api.post(`/attempts/${attemptId.value}/timeout`, { skill_id: currentSkill.value?.id });
            } catch (err) {
                console.warn('Failed to mark timeout', err);
            }
            await navigateSafely('/skill-selection');
            return;
        }
        if (res.data.finished_exam) {
            isIntentionallyLeaving.value = true; // âœ… Ø£Ø¶Ù Ø¯Ù‡
            if (cheatAttempts.value.length > 0) {
                try {
                    await api.post(`/attempts/${attemptId.value}/cheat-report`, {
                        total_warnings: cheatWarnings.value,
                        attempts: cheatAttempts.value
                    });
                } catch (err) {
                    console.warn('Failed to send cheat report', err);
                }
            }
            // await endProctoringSession('exam_submitted');
            await navigateSafely(`/exam/${attemptId.value}/result`);
        } else if (res.data.next_step === 'dashboard') {
            await navigateSafely('/skill-selection');
        } else {
            if (res.data.retry_attempt) {
                showRetryNotification.value = true;
            } else {
                showRetryNotification.value = false;
            }
            await fetchNextBatch();
        }
    } catch (err) {
        console.error('Submission failed', err);
        if (isTimeout) {
            await navigateSafely('/skill-selection');
        } else {
            showAlert('Data transmission error. Try again.');
        }
    } finally {
        isSubmittingBatch.value = false;
    }
};

const handleTimeout = async () => {
    isIntentionallyLeaving.value = true; // âœ… Ø£Ø¶Ù Ø¯Ù‡
    // await endProctoringSession('time_ended');
    await submitCurrentBatch(true);
};

const currentQ = computed(() => questions.value[currentIndex.value] || null);
const isFirstQuestionInPassage = computed(() => {
    const q = currentQ.value;
    if (!q) return false;
    const passageId = q?.passage?.id ?? q?.passage_id;
    if (!passageId) return true;
    return !questions.value.slice(0, currentIndex.value).some(item => (item?.passage?.id ?? item?.passage_id) === passageId);
});
const passageGeneralInstructions = computed(() => {
    if (!currentQ.value) return '';
    if (!isFirstQuestionInPassage.value) return '';
    return (currentQ.value?.passage?.general_instructions || currentQ.value?.general_instructions || '').trim();
});

const displayInstructions = computed(() => {
    if (!currentQ.value) return '';
    return currentQ.value.instructions || 'Choose The Correct Answer';
});

const displayNumber = computed(() => globalOffset.value + currentIndex.value + 1);
const wordCount = computed(() => (answers.value[currentIndex.value]?.text_answer || '').trim().split(/\s+/).filter(w => w).length);

const isQuestionTypeWithoutOptions = (type) => QUESTION_TYPES_WITHOUT_OPTIONS.includes(type);

const isCurrentAnswerValid = computed(() => {
    if (!currentQ.value || !answers.value[currentIndex.value]) return false;
    const ans = answers.value[currentIndex.value];
    const q = currentQ.value;
    return VALIDATORS[q.type] ? VALIDATORS[q.type](ans, q) : !!ans.text_answer;
});

watch(() => answers.value[currentIndex.value], (newVal, oldVal) => {
    // Only reset confirmation if the actual answer content changed (not just upload-status flags)
    if (newVal && oldVal && newVal.question_id === oldVal.question_id) {
        // Ignore changes to is_media_uploaded â€” this is set after upload on CONFIRM, not a real edit
        const contentChanged = (
            newVal.option_id !== oldVal.option_id ||
            newVal.text_answer !== oldVal.text_answer ||
            newVal.recorded_file !== oldVal.recorded_file ||
            JSON.stringify(newVal.drag_drop_answers) !== JSON.stringify(oldVal.drag_drop_answers) ||
            JSON.stringify(newVal.selected_words) !== JSON.stringify(oldVal.selected_words) ||
            JSON.stringify(newVal.fill_blank_answers) !== JSON.stringify(oldVal.fill_blank_answers) ||
            JSON.stringify(newVal.matching_answers) !== JSON.stringify(oldVal.matching_answers) ||
            JSON.stringify(newVal.ordering_answers) !== JSON.stringify(oldVal.ordering_answers) ||
            JSON.stringify(newVal.highlight_answers) !== JSON.stringify(oldVal.highlight_answers)
        );
        if (contentChanged) {
            questionSubmitted.value = false;
        }
    }
}, { deep: true });

watch(() => cheatWarnings.value, (newCount, oldCount) => {
    if (newCount > oldCount) {
        cheatAttempts.value.push({
            timestamp: new Date().toISOString(),
            type: 'tab_switching',
            warning_number: newCount
        });
    }
});

const cleanHtml = (html) => {
    if (!html) return '';
    let clean = html.replace(/&nbsp;/g, ' ');
    clean = clean.replace(/(\.{3,})\s*([\d\u0660-\u0669]+)/g, '<span class="blank-line-wrapper"><span class="blank-line"></span><span class="blank-badge">$2</span></span>');
    clean = clean.replace(/([\d\u0660-\u0669]+)\s*(\.{3,})/g, '<span class="blank-line-wrapper"><span class="blank-badge">$1</span><span class="blank-line"></span></span>');
    clean = clean.replace(/(\.{3,})/g, '<span class="blank-line"></span>');
    return clean;
};

const { resolveUrl } = useMediaUrl();

const playCurrentAudio = () => {
    if (isLoading.value || showLevelTransition.value || showRetryNotification.value || isStarting.value || !proctoringComplete.value || (proctoringRequired.value && !enteredExam.value)) {
        if (audioRef.value) {
            audioRef.value.pause();
            audioRef.value.currentTime = 0;
            lastAudioUrl.value = '';
        }
        return;
    }

    if (isNavigatingBack.value) {
        isNavigatingBack.value = false;
        if (audioRef.value) {
            audioRef.value.pause();
            audioRef.value.currentTime = 0;
            lastAudioUrl.value = '';
        }
        isAudioPlaying.value = false;
        return;
    }

    const audioUrl = currentQ.value?.passage?.audio_url || currentQ.value?.passage?.audio_path || currentQ.value?.audio_url || currentQ.value?.audio_path;
    if (audioUrl) {
        const resolved = resolveUrl(audioUrl);
        if (resolved === lastAudioUrl.value) {
            return;
        }
        lastAudioUrl.value = resolved;
        nextTick(() => {
            if (audioRef.value) {
                audioRef.value.pause();
                audioRef.value.load();
                audioRef.value.play()
                    .then(() => {
                        autoplayFailed.value = false;
                        isAudioPlaying.value = true;
                    })
                    .catch(err => {
                        if (err.name === 'AbortError') {
                            return;
                        }
                        console.warn('Autoplay blocked by browser. User interaction required.', err);
                        autoplayFailed.value = true;
                        isAudioPlaying.value = false;
                    });
            } else {
                setTimeout(() => {
                    if (audioRef.value) {
                        audioRef.value.pause();
                        audioRef.value.load();
                        audioRef.value.play()
                            .then(() => {
                                autoplayFailed.value = false;
                                isAudioPlaying.value = true;
                            })
                            .catch(err => {
                                if (err.name === 'AbortError') {
                                    return;
                                }
                                console.warn('Autoplay blocked by browser in fallback. User interaction required.', err);
                                autoplayFailed.value = true;
                                isAudioPlaying.value = false;
                            });
                    } else {
                        autoplayFailed.value = true;
                    }
                }, 150);
            }
        });
    } else {
        lastAudioUrl.value = '';
        autoplayFailed.value = false;
        isAudioPlaying.value = false;
        if (audioRef.value) {
            audioRef.value.pause();
            audioRef.value.currentTime = 0;
        }
    }
};

watch(currentQ, (newQ) => {
    if (!newQ) return;
    autoplayFailed.value = false;
    audioProgress.value = 0;
    audioCurrentTime.value = '0:00';
    audioDuration.value = '0:00';

    // Check if user already listened to this question or the associated passage fully
    const isPassage = !!(newQ.passage?.audio_url || newQ.passage?.audio_path);
    if (newQ.id && listenedQuestions.value.has(newQ.id)) {
        hasListened.value = true;
    } else if (isPassage && newQ.passage?.id && listenedPassages.value.has(newQ.passage.id)) {
        hasListened.value = true;
    } else {
        hasListened.value = false;
    }

    if (newQ && newQ.id) {
        api.patch(`/attempts/${attemptId.value}/progress`, { question_id: newQ.id })
            .catch(err => console.warn('Progress update failed', err));
    }
    playCurrentAudio();
});

watch(isLoading, (loading) => {
    if (!loading) {
        playCurrentAudio();
    }
});

watch(proctoringComplete, (complete) => {
    if (complete) {
        playCurrentAudio();
    }
});

watch(showLevelTransition, (inTransition) => {
    if (!inTransition) {
        playCurrentAudio();
    }
});

const hasStimulusContent = computed(() => {
    if (!currentQ.value) return false;
    const q = currentQ.value;
    const p = q.passage;
    if (q.type === 'writing' || q.type === 'short_answer') {
        const passageHasContent = p && (
            (p.content && p.content.trim().length > 150) ||
            (p.media_url && p.media_url.toLowerCase().includes('.mp4')) ||
            (p.media_path && p.media_path.toLowerCase().includes('.mp4'))
        );
        return !!passageHasContent;
    }
    const passageHasContent = p && (
        (p.content && p.content.trim().length > 0) ||
        p.image_url || p.image_path ||
        (p.media_url && p.media_url.toLowerCase().includes('.mp4')) ||
        (p.media_path && p.media_path.toLowerCase().includes('.mp4'))
    );
    const questionHasMedia = (q.image_url || q.image_path) ||
        (q.media_url && q.media_url.toLowerCase().includes('.mp4')) ||
        (q.media_path && q.media_path.toLowerCase().includes('.mp4'));
    return !!(passageHasContent || questionHasMedia);
});

// True when current question/passage has an audio track
const hasPassageAudio = computed(() => {
    if (!currentQ.value) return false;
    return !!(
        currentQ.value.passage?.audio_url ||
        currentQ.value.passage?.audio_path ||
        currentQ.value.audio_url ||
        currentQ.value.audio_path
    );
});

const responsePaneClass = computed(() => {
    // Always full width on small screens; split only on large screens (lg)
    if (!hasStimulusContent.value) return 'w-full bg-slate-50 min-h-0';
    if (currentQ.value?.type === 'writing' || currentQ.value?.type === 'short_answer') return 'w-full lg:w-[55%] bg-white min-h-0';
    return 'w-full lg:w-2/5 bg-white min-h-0';
});

const stimulusPaneClass = computed(() => {
    // Make stimulus pane responsive as well
    if (currentQ.value?.type === 'writing' || currentQ.value?.type === 'short_answer') return 'w-full lg:w-[45%] bg-white p-4 flex flex-col h-full transition-all duration-700 min-h-0';
    return 'w-full lg:w-3/5 bg-white p-4 flex flex-col h-full transition-all duration-700 min-h-0';
});

// --- INACTIVITY LOGIC ---
const resetInactivityTimer = () => {
    if (inactivityTimer.value) clearTimeout(inactivityTimer.value);
    lastActivityAt.value = Date.now();
    if (!isDemo.value && !isLoading.value && questions.value.length > 0) {
        inactivityTimer.value = setTimeout(() => {
            showInactivityModal.value = true;
            setTimeout(() => {
                handleTimeout();
            }, 5000);
        }, INACTIVITY_TIMEOUT);
    }
};

const updateActivity = debounce(resetInactivityTimer, 500);

// const handleBeforeUnload = async () => {
//     isIntentionallyLeaving.value = true;
// };



const handleBeforeUnloadBeacon = () => {
    // âœ… Ù„Ùˆ Ø§Ù„Ø·Ø§Ù„Ø¨ Ø®Ø±Ø¬ Ø¨Ø´ÙƒÙ„ Ø·Ø¨ÙŠØ¹ÙŠ (exit/finish)ØŒ Ù…Ø¨Ø¹ØªØ´ beacon
    if (isIntentionallyLeaving.value) return

    isIntentionallyLeaving.value = true
    const sessionId = proctoringSessionId.value
    const token = proctoringSessionToken.value
    if (!sessionId || !token) return

    const payload = JSON.stringify({
        close_reason: 'connection_lost',
        session_token: token,
        ended_at: new Date().toISOString(),
    })

    const blob = new Blob([payload], { type: 'application/json' })

    try {
        navigator.sendBeacon(`/api/proctoring/session/${sessionId}/end-beacon`, blob)
    } catch (e) {
        console.warn('Failed to send proctoring beacon via sendBeacon:', e)
    }

    try {
        fetch(`/api/proctoring/session/${sessionId}/end-beacon`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Session-Token': token,
            },
            body: payload,
            keepalive: true,
        }).catch(() => { })
    } catch (e) {
        console.warn('Failed to send proctoring beacon via fetch:', e)
    }
}



onMounted(async () => {
    const user = authStorage.getUser();
    studentId.value = user?.id;
    isDemo.value = (user && ['demo', 'staff'].includes(user.role?.toLowerCase())) || !!user?.student?.is_demo;

    // Determine if proctoring is required for this student's partner.
    // PROCTORING_ENABLED is a master kill-switch â€” if false, proctoring is always skipped.
    if (!PROCTORING_ENABLED) {
        proctoringRequired.value = false;
        proctoringComplete.value = true;
    } else {
        try {
            const userRes = await api.get('/user');
            studentId.value = userRes.data?.id;
            const fetchedStudent = userRes.data?.student;
            const isStudentDemo = !!fetchedStudent?.is_demo;
            isDemo.value = isDemo.value || isStudentDemo;

            if (isStudentDemo) {
                proctoringRequired.value = !!fetchedStudent?.is_demo_proctored;
            } else {
                proctoringRequired.value = !!fetchedStudent?.partner?.proctoring_required;
            }

            if (!proctoringRequired.value) {
                // Partner doesn't require proctoring â€” skip initializer
                proctoringComplete.value = true;
            }
        } catch {
            // On error, fail safe: skip proctoring
            proctoringRequired.value = false;
            proctoringComplete.value = true;
        }
    }

    await fetchData();
    setupAntiCheat();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnloadBeacon)
    window.addEventListener('pagehide', handleBeforeUnloadBeacon)

    const debouncedUpdateActivity = debounce(updateActivity, 500);
    document.addEventListener('mousemove', debouncedUpdateActivity);
    document.addEventListener('keydown', debouncedUpdateActivity);
    document.addEventListener('click', debouncedUpdateActivity);
    resetInactivityTimer();
});

onUnmounted(() => {
    stopSessionPolling()
    stopTimer();
    if (inactivityTimer.value) clearTimeout(inactivityTimer.value);
    if (audioRef.value) {
        audioRef.value.pause();
        audioRef.value.src = "";
    }
    destroyAntiCheat();
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('beforeunload', handleBeforeUnloadBeacon)
    window.removeEventListener('pagehide', handleBeforeUnloadBeacon)
    handleBeforeUnloadBeacon()
    document.removeEventListener('mousemove', updateActivity);
    document.removeEventListener('keydown', updateActivity);
    document.removeEventListener('click', updateActivity);
    // endProctoringSession('connection_lost').catch(e =>
    //     console.error('Failed to end proctoring session on unmount:', e)
    // )
});
</script>

<template>
    <div class="h-screen bg-white font-sans text-slate-900 flex flex-col overflow-hidden">

        <!-- === PROCTORING INITIALIZER MODAL === -->
        <!-- Shown when partner requires proctoring and it hasn't been completed yet -->
        <template v-if="proctoringRequired && !proctoringComplete && !isDemo">
            <ProctoringInitializer :attempt-id="attemptId" :student-id="studentId" :exam-id="examId"
                @complete="handleProctoringComplete" />
        </template>

        <!-- === EXAM VIEW (Hidden during proctoring) === -->
        <template v-else>
            <StudentHeader />

            <audio ref="audioRef"
                :src="currentQ ? resolveUrl(currentQ.passage?.audio_url || currentQ.passage?.audio_path || currentQ.audio_url || currentQ.audio_path) : ''"
                @play="isAudioPlaying = true" @pause="isAudioPlaying = false" @ended="markCurrentAsListened"
                @timeupdate="updateAudioProgress" class="hidden">
            </audio>

            <!-- Exam Interface Container: Hidden when proctor checking is active -->
            <template v-if="!proctoringRequired || enteredExam">
                <header v-if="!isStarting && currentSkill"
                    class="bg-slate-800 text-white shadow-md min-h-16 px-2 sm:px-4 md:px-6 shrink-0 flex items-center"
                    dir="ltr">
                    <div class="max-w-[1600px] w-full mx-auto flex justify-between items-center py-2 md:py-0 gap-1.5">
                        <div class="flex items-center shrink-0 max-w-[180px] sm:max-w-none overflow-auto gap-3">
                            <div class="flex flex-col items-start text-left">
                                <div class="flex items-center">
                                    <span
                                        class="text-[10px] sm:text-xs md:text-mm font-black uppercase tracking-wider text-slate-400 truncate">
                                        {{ currentSkill?.name }}
                                    </span>
                                </div>
                            </div>
                            <!-- Proctoring Status Badge -->
                            <div v-if="proctoringRequired && !isDemo"
                                class="flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded text-rose-400 font-black text-[8px] sm:text-[9px] uppercase tracking-widest shrink-0">
                                <span class="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                                <i class="pi pi-shield text-[8px]"></i>
                                <span>{{ currentLang === 'ar' ? '' : 'Proctored' }}</span>
                            </div>
                        </div>
                        <div class="flex items-center gap-1 sm:gap-2 md:gap-3 flex-wrap sm:flex-nowrap justify-end">
                            <!-- <button @click="prevQuestion"
                            :class="currentIndex > 0 ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-slate-800 text-slate-500 cursor-not-allowed'"
                            class="h-8 sm:h-9 md:h-10 px-2 sm:px-3 md:px-6 rounded-lg font-black text-[10px] sm:text-xs md:text-sm transition-all shadow-lg flex items-center gap-1"
                            :title="currentIndex > 0 ? 'Previous' : ''">
                            <i class="pi pi-chevron-left text-[10px]"></i>
                            <span class="hidden sm:inline">PREVIOUS</span>
                        </button> -->

                            <span
                                class="text-[10px] sm:text-xs md:text-sm font-black text-slate-500 shrink-0 select-none">
                                {{ displayNumber }} / {{ totalSkillQuestions }}
                            </span>

                            <button @click="submitAnswer" :disabled="!isCurrentAnswerValid || questionSubmitted"
                                class="h-8 sm:h-9 md:h-10 px-2 sm:px-3 md:px-6 bg-brand-primary text-white rounded-lg font-black text-[10px] sm:text-xs md:text-sm hover:bg-brand-primary/90 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                title="Confirm">
                                <i class="pi pi-thumbs-up text-xs"></i>
                                <span class="hidden sm:inline">CONFIRM</span>
                            </button>

                            <button @click="advanceQuestion" :disabled="!questionSubmitted || isSubmittingBatch"
                                class="h-8 sm:h-9 md:h-10 px-2 sm:px-3 md:px-6 bg-emerald-600 text-white rounded-lg font-black text-[10px] sm:text-xs md:text-sm hover:bg-emerald-500 transition-all shadow-lg flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Next">
                                <span v-if="isSubmittingBatch" class="flex items-center gap-1">
                                    <i class="pi pi-spin pi-spinner text-[10px]"></i>
                                    <span class="hidden sm:inline">Saving...</span>
                                </span>
                                <template v-else>
                                    <span class="hidden sm:inline">NEXT</span>
                                    <i class="pi pi-chevron-right text-[10px]"></i>
                                </template>
                            </button>

                            <div v-if="!isDemo && timerConfig && timerConfig.skillDuration > 0" :class="[
                                'h-8 sm:h-9 md:h-10 flex items-center gap-1 px-1 sm:px-2 md:px-5 rounded-lg border transition-colors shrink-0',
                                timeLeftSeconds < 300 ? 'bg-rose-900/50 border-rose-500 text-rose-300 animate-pulse' : 'bg-slate-900/50 border-slate-700 text-white'
                            ]">
                                <span
                                    class="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 rounded bg-white/5 flex items-center justify-center shrink-0">
                                    <i class="pi pi-clock text-[9px] sm:text-[10px] md:text-xs"
                                        :class="timeLeftSeconds < 300 ? 'text-rose-400' : 'text-slate-400'"></i>
                                </span>
                                <span
                                    class="text-[10px] sm:text-xs md:text-lg font-black tabular-nums tracking-tighter">
                                    {{ formattedTime }}
                                </span>
                            </div>

                            <div class="flex items-center rounded-lg transition-colors">
                                <button @click="exitExam"
                                    class="h-8 sm:h-9 md:h-10 flex items-center gap-1 px-2 sm:px-3 md:px-6 bg-slate-700/50 hover:bg-rose-600/80 text-slate-300 hover:text-white rounded-lg transition-all text-[10px] sm:text-xs md:text-sm font-black shadow-lg"
                                    title="Exit">
                                    <span class="hidden md:inline">EXIT</span>
                                    <i class="pi pi-sign-out inline-block scale-x-[1]"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                <!-- Sub-header for Level Name -->
                <!-- shaimaa commented this -->
                <!-- <div v-if="!isStarting && currentSkill && !currentSkill.name?.toLowerCase().includes('writ')"
                class="bg-white border-b border-slate-200 h-10 px-8 flex justify-end items-center shrink-0 z-20">
                <div class="flex items-center space-x-3 space-x-reverse">
                    <div class="px-3 py-1 bg-slate-100 rounded-md border border-slate-200">
                        <span class="text-xs font-black text-slate-600 uppercase tracking-wider">{{ currentLevel?.name
                            }}</span>
                    </div>
                </div>
            </div> -->

                <main class="flex-1 min-h-0 flex flex-col overflow-hidden relative">

                    <!-- Retry Notification Overlay -->
                    <div v-if="showRetryNotification"
                        class="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-6">
                        <div class="bg-white rounded-lg p-10 max-w-xl w-full shadow-2xl border border-slate-200 text-center"
                            dir="rtl">
                            <div
                                class="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl">
                                <i class="pi pi-refresh"></i>
                            </div>
                            <h3 class="text-xl font-black text-slate-900 tracking-tight mb-4 uppercase">System
                                Notification
                            </h3>
                            <p class="text-slate-600 text-base font-medium leading-relaxed mb-8">
                                You did not meet the minimum score requirement. A second evaluation cycle with new
                                content
                                is about to
                                begin...
                            </p>
                            <button @click="showRetryNotification = false"
                                class="w-full py-4 bg-slate-800 text-white rounded font-bold uppercase text-xs tracking-widest hover:bg-slate-700 transition-all">
                                Start New Attempt
                            </button>
                        </div>
                    </div>

                    <!-- Level Transition Modal -->
                    <!-- shaimaa commented this -->
                    <!-- <div v-if="showLevelTransition"
                    class="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-6">
                    <div
                        class="bg-white rounded-3xl p-12 max-w-2xl w-full shadow-2xl border border-slate-200 text-center animate-in zoom-in-95 duration-300">
                        <div
                            class="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-3xl">
                            <i class="pi pi-check-circle"></i>
                        </div>
                        <h3 class="text-3xl font-black text-slate-900 tracking-tight mb-4">Well done! You have completed
                            the level
                        </h3>
                        <p class="text-slate-600 text-lg font-medium leading-relaxed mb-10">
                            You are now ready to move to the next level: <br />
                            <span class="text-brand-primary font-black text-2xl mt-2 block">{{ nextLevelName }}</span>
                        </p>
                        <button @click="startNextLevel"
                            class="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-sm tracking-widest hover:bg-brand-primary transition-all shadow-xl shadow-slate-200">
                            Start Next Level
                        </button>
                    </div>
                </div> -->

                    <!-- Loading -->
                    <div v-if="isLoading" class="flex flex-col items-center justify-center py-40">
                        <div class="w-10 h-10 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin">
                        </div>
                        <p class="mt-6 text-sm font-bold text-slate-500 uppercase tracking-widest">Loading...</p>
                    </div>

                    <!-- Error State -->
                    <div v-else-if="errorMsg" class="max-w-xl mx-auto py-32 text-center space-y-8" dir="rtl">
                        <div
                            class="w-20 h-20 bg-rose-50 text-rose-600 rounded-[2rem] flex items-center justify-center mx-auto text-3xl shadow-lg shadow-rose-100">
                            <i class="pi pi-exclamation-circle"></i>
                        </div>
                        <div class="space-y-2">
                            <h2 class="text-2xl font-black text-slate-800 uppercase tracking-tight">System Notification
                            </h2>
                            <p class="text-slate-500 font-medium leading-relaxed">{{ errorMsg }}</p>
                        </div>
                        <button @click="navigateSafely('/skill-selection')"
                            class="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-brand-primary transition-all active:scale-95">
                            Back to Dashboard
                        </button>
                    </div>

                    <!-- ============================================================ -->
                    <!-- CASE 1: Passage WITH audio â†’ Full-screen sequential layout   -->
                    <!-- Phase A (!shouldShowContent): audio + general instructions   -->
                    <!-- Phase B (shouldShowContent):  questions only                 -->
                    <!-- ============================================================ -->
                    <div v-else-if="currentQ && hasPassageAudio"
                        class="flex-1 min-h-0 border-t border-slate-300 animate-in fade-in duration-500 flex flex-col overflow-y-auto bg-white">

                        <!-- Phase A: Audio + General Instructions (full screen) -->
                        <template v-if="!shouldShowContent">
                            <div
                                class="max-w-3xl mx-auto w-full flex flex-col gap-6 p-8 animate-in fade-in duration-500">

                                <!-- General Instructions Banner -->
                                <div v-if="passageGeneralInstructions"
                                    class="p-5 bg-amber-50 border border-amber-200 rounded-2xl shadow-sm" dir="auto">
                                    <div class="flex items-start gap-3">
                                        <div
                                            class="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0 mt-0.5">
                                            <i class="pi pi-info-circle text-base"></i>
                                        </div>
                                        <p class="text-base font-semibold text-amber-900 leading-relaxed"
                                            v-html="cleanHtml(passageGeneralInstructions)"></p>
                                    </div>
                                </div>

                                <!-- Audio Player (large, centered) -->
                                <div class="bg-slate-50 rounded-2xl border border-slate-200 shadow-inner p-6">
                                    <div class="flex items-center gap-3 mb-4" dir="rtl">
                                        <div
                                            class="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-brand-primary">
                                            <i class="pi pi-volume-up text-base"
                                                :class="isAudioPlaying ? 'animate-pulse' : ''"></i>
                                        </div>
                                        <span
                                            class="text-sm font-black text-slate-500 uppercase tracking-widest">Audio</span>
                                    </div>

                                    <!-- Autoplay failed banner -->
                                    <div v-if="autoplayFailed && !isAudioPlaying && !hasListened"
                                        class="mb-4 flex items-center justify-between p-3 bg-rose-50 border border-rose-200 rounded-xl animate-in fade-in slide-in-from-top-2 duration-500">
                                        <div class="flex items-center gap-2">
                                            <i class="pi pi-exclamation-triangle text-rose-500 text-sm"></i>
                                            <span class="text-sm font-bold text-rose-700">Click to start
                                                listening</span>
                                        </div>
                                        <button @click="toggleAudioManual"
                                            class="px-5 py-2 bg-rose-600 text-white rounded-lg text-sm font-black hover:bg-rose-700 transition-all shadow-sm">
                                            Play audio
                                        </button>
                                    </div>

                                    <!-- Progress bar -->
                                    <div class="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                        <div class="bg-brand-primary h-full transition-all duration-150 ease-linear"
                                            :style="{ width: audioProgress + '%' }"></div>
                                    </div>
                                    <div class="flex justify-between mt-2 text-xs font-bold text-slate-400 font-mono">
                                        <span class="text-brand-primary">{{ audioCurrentTime }}</span>
                                        <span>{{ audioDuration }}</span>
                                    </div>
                                </div>

                                <!-- Waiting message -->
                                <div class="flex flex-col items-center justify-center py-6 text-center space-y-3">
                                    <div
                                        class="w-14 h-14 bg-brand-primary/5 rounded-[1.25rem] flex items-center justify-center text-brand-primary animate-bounce">
                                        <i class="pi pi-headphones text-2xl"></i>
                                    </div>
                                    <p class="text-sm font-semibold text-slate-500"></p>
                                    <p class="text-xs text-slate-400 italic">Listen to the full audio to unlock the
                                        questions</p>
                                </div>
                            </div>
                        </template>

                        <!-- Phase B: Questions only (full screen, after audio listened) -->
                        <template v-else>
                            <div class="flex-1 overflow-y-auto">
                                <div class="max-w-4xl mx-auto w-full flex flex-col p-6 animate-in fade-in duration-500"
                                    :class="['writing', 'short_answer', 'fill_blank'].includes(currentQ?.type) ? 'gap-3' : 'gap-5'">

                                    <div v-if="currentQ.content && !isQuestionTypeWithoutOptions(currentQ.type)"
                                        :class="['text-lg font-black text-slate-900 leading-snug rtl-support', 'interactive-content-area']"
                                        v-html="cleanHtml(currentQ.content)" dir="auto">
                                    </div>

                                    <div v-if="!['writing', 'short_answer'].includes(currentQ.type)"
                                        class="bg-slate-50 border border-slate-100 p-3 rounded-lg" dir="rtl">
                                        <p class="text-[10px] font-bold text-slate-600 leading-relaxed" dir="auto"
                                            v-html="displayInstructions"></p>
                                    </div>

                                    <QuestionDispatcher v-if="currentQ && answers[currentIndex]" :key="currentQ.id"
                                        :question="currentQ" v-model:answer="answers[currentIndex]" :disabled="false"
                                        :hasStimulusContent="false" />
                                </div>
                            </div>

                            <!-- Virtual Keyboard -->
                            <transition name="slide-up">
                                <div v-if="showVirtualKeyboard && answers[currentIndex] && (currentQ.type === 'writing' || currentQ.type === 'short_answer')"
                                    class="w-full border-t border-slate-200 bg-slate-50 shrink-0 z-40 py-1.5 px-3">
                                    <div class="max-w-4xl mx-auto">
                                        <VirtualKeyboard v-model="answers[currentIndex].text_answer" layout="arabic" />
                                    </div>
                                </div>
                            </transition>
                        </template>
                    </div>

                    <!-- ============================================================ -->
                    <!-- CASE 2: Passage WITHOUT audio → 45/55 Split Screen           -->
                    <!-- Left pane (lg:w-[45%]): question + answers + instructions    -->
                    <!-- Right pane (lg:w-[55%]): passage text                        -->
                    <!-- ============================================================ -->
                    <div v-else-if="currentQ && hasStimulusContent"
                        class="flex flex-col-reverse lg:flex-row bg-white border-t border-slate-200 flex-1 min-h-0 overflow-hidden animate-in fade-in duration-500">

                        <!-- Questions Pane (Left side) — 45% -->
                        <div
                            class="w-full lg:w-[45%] bg-white flex flex-col h-full border-t lg:border-t-0 lg:border-r border-slate-200/80 overflow-y-auto p-4 md:p-5 space-y-2">

                            <!-- Static Instruction (Read carefully...) at the top -->
                            <div v-if="!['writing', 'short_answer'].includes(currentQ.type)"
                                class="flex items-center gap-2 bg-slate-50 px-4 py-2.5 rounded-lg border border-slate-100 w-fit text-xs font-semibold select-none"
                                dir="ltr">
                                <i class="pi pi-book text-sm text-[#2563EB]"></i>
                                <span class="text-slate-800">Read carefully then answer the questions</span>
                            </div>

                            <div class="flex flex-col min-h-0 space-y-2">
                                <!-- Question Content -->
                                <div v-if="currentQ.content && !isQuestionTypeWithoutOptions(currentQ.type)"
                                    class="text-[25px] font-normal leading-snug rtl-support text-slate-800 text-right block question-title-text"
                                    v-html="cleanHtml(currentQ.content)" dir="auto">
                                </div>

                                <!-- Choices / options -->
                                <QuestionDispatcher v-if="currentQ && answers[currentIndex]" :key="currentQ.id"
                                    :question="currentQ" v-model:answer="answers[currentIndex]" :disabled="false"
                                    :hasStimulusContent="true" />
                            </div>

                            <!-- Virtual Keyboard -->
                            <transition name="slide-up">
                                <div v-if="showVirtualKeyboard && answers[currentIndex] && (currentQ.type === 'writing' || currentQ.type === 'short_answer')"
                                    class="w-full border-t border-slate-200 bg-slate-50 shrink-0 z-40 py-1.5 px-3">
                                    <VirtualKeyboard v-model="answers[currentIndex].text_answer" layout="arabic" />
                                </div>
                            </transition>
                        </div>

                        <!-- Stimulus Pane (passage - Right side) — 55% -->
                        <div
                            class="w-full lg:w-[55%] bg-white flex flex-col min-h-0 h-full overflow-y-auto passage-scrollbar-container p-4 md:p-5 lg:p-6">
                            <div class="flex-grow prose prose-slate max-w-none">
                                <div v-if="currentQ.passage"
                                    class="space-y-4 mb-6 pb-6 border-b border-slate-100 border-dashed">
                                    <!-- Passage Title: RTL with icon on its right end -->
                                    <div v-if="currentQ.passage.title" class="flex items-center gap-2 mb-3" dir="rtl">
                                        <i class="pi pi-file-edit text-slate-400 text-lg shrink-0"></i>
                                        <h3 class="text-[25px] font-bold text-slate-800 leading-snug" dir="rtl">{{
                                            currentQ.passage.title }}
                                        </h3>
                                    </div>
                                    <div v-if="currentQ.passage.image_url || currentQ.passage.image_path"
                                        class="w-full mb-4 flex justify-center">
                                        <img :src="resolveUrl(currentQ.passage.image_url || currentQ.passage.image_path)"
                                            class="rounded-xl shadow-md border border-slate-100"
                                            :class="!currentQ.passage.image_width && !currentQ.passage.image_height ? 'w-full h-auto' : 'max-w-full'"
                                            :style="currentQ.passage.image_width || currentQ.passage.image_height ? {
                                                width: currentQ.passage.image_width ? `${currentQ.passage.image_width}px` : 'auto',
                                                height: currentQ.passage.image_height ? `${currentQ.passage.image_height}px` : 'auto'
                                            } : {}" />
                                    </div>
                                    <div v-if="currentQ.passage.content"
                                        class="text-[25px] text-slate-700 leading-[1.8] font-normal text-justify ql-content rtl-support"
                                        v-html="cleanHtml(currentQ.passage.content)" dir="auto">
                                    </div>
                                </div>
                                <!-- Video in stimulus -->
                                <div v-if="(currentQ.media_url || currentQ.media_path) && (currentQ.media_url || currentQ.media_path).includes('.mp4')"
                                    class="flex flex-col items-center justify-center py-4">
                                    <video :src="resolveUrl(currentQ.media_url || currentQ.media_path)" controls
                                        autoplay @ended="markCurrentAsListened"
                                        class="w-full rounded-xl shadow-lg"></video>
                                </div>
                                <!-- Image in stimulus -->
                                <div v-if="currentQ.image_url || currentQ.image_path"
                                    class="w-full flex justify-center py-4">
                                    <img :src="resolveUrl(currentQ.image_url || currentQ.image_path)"
                                        class="rounded-xl shadow-lg border border-white"
                                        :class="!currentQ.image_width && !currentQ.image_height ? 'max-w-full h-auto' : 'max-w-full'"
                                        :style="currentQ.image_width || currentQ.image_height ? {
                                            width: currentQ.image_width ? `${currentQ.image_width}px` : 'auto',
                                            height: currentQ.image_height ? `${currentQ.image_height}px` : 'auto'
                                        } : {}" />
                                </div>
                            </div>
                        </div>

                    </div>

                    <!-- ============================================================ -->
                    <!-- CASE 3: No passage content â†’ Single full-width pane          -->
                    <!-- ============================================================ -->
                    <div v-else-if="currentQ" class="flex flex-col border-t border-slate-300 animate-in fade-in duration-500 flex-1 min-h-0 bg-slate-50">
                        <div class="flex-1 overflow-y-auto">
                            <div class="max-w-5xl mx-auto w-full flex flex-col transition-all duration-300"
                                :class="currentQ && (currentQ.type === 'writing' || currentQ.type === 'short_answer') ? 'my-2 p-4' : 'my-4 p-6'">

                                <div :class="[ 'flex flex-col', ['writing', 'short_answer', 'fill_blank'].includes(currentQ?.type) ? 'space-y-2' : 'space-y-4']">

                                    <!-- Instructions Banner (matches design in image 2) -->
                                    <div v-if="!['writing', 'short_answer'].includes(currentQ.type)"
                                        class="flex items-start gap-3 border border-slate-200 rounded-xl px-4 py-3 shadow-sm bg-[#f4f7fb]"
                                        dir="ltr">
                                        <div
                                            class="w-8 h-8 rounded-full bg-[#2563EB] flex items-center justify-center shrink-0 mt-0.5">
                                            <i class="pi pi-info text-white text-sm font-black"></i>
                                        </div>
                                        <div class="flex flex-col gap-0.5">
                                            <span class="text-sm font-black text-slate-900">Instructions</span>
                                            <span class="text-sm text-slate-600 leading-snug"
                                                v-html="displayInstructions"></span>
                                        </div>
                                    </div>

                                    <!-- Question Content inside a white box -->
                                    <div v-if="currentQ.content && !isQuestionTypeWithoutOptions(currentQ.type)"
                                        class="rounded-xl px-5 py-4 rtl-support interactive-content-area bg-white border border-slate-200 shadow-sm"
                                        style="border-width: 1.5px; font-size: 30px; font-weight: 400; color: #1e293b; line-height: 1.7;"
                                        v-html="cleanHtml(currentQ.content)" dir="auto">
                                    </div>

                                    <QuestionDispatcher v-if="currentQ && answers[currentIndex]" :key="currentQ.id"
                                        :question="currentQ" v-model:answer="answers[currentIndex]" :disabled="false"
                                        :hasStimulusContent="false" />
                                </div>

                                <div v-if="!['writing', 'short_answer'].includes(currentQ.type)"
                                    class="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                                    <span class="text-[8px] font-bold text-slate-300 uppercase tracking-widest"></span>
                                </div>
                            </div>
                        </div>

                        <!-- Virtual Keyboard -->
                        <transition name="slide-up">
                            <div v-if="showVirtualKeyboard && answers[currentIndex] && (currentQ.type === 'writing' || currentQ.type === 'short_answer')"
                                class="w-full border-t border-slate-200 bg-slate-50 shrink-0 z-40 py-1.5 px-3">
                                <div class="max-w-5xl mx-auto">
                                    <VirtualKeyboard v-model="answers[currentIndex].text_answer" layout="arabic" />
                                </div>
                            </div>
                        </transition>
                    </div>
                </main>


                <!-- Timeout Modal -->
                <div v-if="showTimeoutModal"
                    class="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div
                        class="bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full p-10 text-center space-y-6 border border-slate-100 animate-in zoom-in-95 duration-300">
                        <div
                            class="w-24 h-24 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-2 border-4 border-rose-100/50">
                            <i class="pi pi-clock text-4xl text-rose-500 animate-pulse"></i>
                        </div>
                        <div class="space-y-2">
                            <h2 class="text-3xl font-black text-slate-900 tracking-tight"> TIMEOUT! </h2>
                            <p class="text-slate-500 font-bold leading-relaxed">The time allocated for this part of the
                                exam
                                has
                                expired. Your answers will be saved and you will be directed automatically.</p>
                        </div>
                        <button @click="handleTimeout"
                            class="w-full py-5 bg-brand-primary text-white rounded-2xl font-black text-lg hover:bg-brand-primary/90 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-indigo-100">
                            OK
                        </button>
                    </div>
                </div>

                <!-- Exit Confirmation Modal -->
                <div v-if="showExitModal"
                    class="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div
                        class="bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full p-10 text-center space-y-6 border border-slate-100 animate-in zoom-in-95 duration-300">
                        <div
                            class="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-2 border-4 border-amber-100/50">
                            <i class="pi pi-exclamation-triangle text-4xl text-amber-500"></i>
                        </div>
                        <div class="space-y-2">
                            <h2 class="text-3xl font-black text-slate-900 tracking-tight">ARE YOU SURE?</h2>
                            <p class="text-slate-500 font-bold leading-relaxed">Are you sure you want to exit? The exam
                                will
                                be ended
                                and your current progress will be saved and you will not be able to return.</p>
                        </div>
                        <div class="grid grid-cols-2 gap-4 pt-2">
                            <button @click="showExitModal = false"
                                class="py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all">
                                CANCEL
                            </button>
                            <button @click="confirmExit"
                                class="py-4 bg-rose-600 text-white rounded-2xl font-black text-sm hover:bg-rose-700 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-rose-100">
                                CONFIRM EXIT
                            </button>
                        </div>
                    </div>
                </div>

                <!-- System Requirement Tester Modal -->
                <RequirementTester v-if="activeTesterReq" :requirement="activeTesterReq" @close="activeTesterReq = null"
                    @passed="handleTestPassed" />

                <!-- Confirm Answer Modal -->
                <div v-if="showConfirmAnswerModal"
                    class="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div
                        class="bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full p-10 text-center space-y-6 border border-slate-100 animate-in zoom-in-95 duration-300">
                        <div
                            class="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-2 border-4 border-amber-100/50">
                            <i class="pi pi-exclamation-triangle text-4xl text-amber-500"></i>
                        </div>
                        <div class="space-y-2">
                            <h2 class="text-3xl font-black text-slate-900 tracking-tight">Please complete the task
                                before
                                continuing.
                            </h2>
                            <p class="text-slate-500 font-bold leading-relaxed">Please complete the task before
                                continuing.
                            </p>
                        </div>
                        <div class="grid grid-cols-1 gap-4 pt-2">
                            <button @click="showConfirmAnswerModal = false"
                                class="py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all">
                                ok
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Cheat Warning Modal -->
                <div v-if="showCheatModal"
                    class="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div
                        class="bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full p-10 text-center space-y-6 border border-slate-100 animate-in zoom-in-95 duration-300">
                        <div
                            class="w-24 h-24 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-2 border-4 border-rose-100/50">
                            <i class="pi pi-shield text-4xl text-rose-500"></i>
                        </div>
                        <div class="space-y-2">
                            <h2 class="text-3xl font-black text-slate-900 tracking-tight uppercase">{{
                                cheatMessage.title }}</h2>
                            <p class="text-slate-500 font-bold leading-relaxed">{{ cheatMessage.body }}</p>
                            <div class="pt-2">
                                <p class="text-rose-600 font-black text-lg">Warning {{ cheatWarnings }} </p>
                            </div>
                        </div>
                        <div class="grid grid-cols-1 gap-4 pt-2">
                            <button @click="showCheatModal = false"
                                class="py-4 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-slate-800 transition-all shadow-lg">
                                Understood, I will adhere to the instructions
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Inactivity Modal -->
                <div v-if="showInactivityModal"
                    class="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div
                        class="bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full p-10 text-center space-y-6 border border-slate-100 animate-in zoom-in-95 duration-300">
                        <div
                            class="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-2 border-4 border-amber-100/50">
                            <i class="pi pi-clock text-4xl text-amber-500"></i>
                        </div>
                        <div class="space-y-2">
                            <h2 class="text-3xl font-black text-slate-900 tracking-tight uppercase">Inactivity Alert
                            </h2>
                            <p class="text-slate-500 font-bold leading-relaxed">You have been inactive for too long.
                                Your
                                session will
                                be terminated in a few seconds.</p>
                        </div>
                    </div>
                </div>

            </template>

            <!-- Proctoring Camera Widget -->
            <ProctorCamera v-if="proctoringRequired && proctoringSessionId && proctoringComplete"
                :session-id="proctoringSessionId" :student-id="studentId" :is-checking="!enteredExam"
                @ready="handleCameraReady" @error="handleCameraError" />
        </template>
    </div>
</template>

<style scoped>
.animate-in {
    animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes shrink {
    from {
        width: 100%;
    }

    to {
        width: 0%;
    }
}

.custom-scrollbar::-webkit-scrollbar {
    width: 4px;
}

.custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
    background: #E2E8F0;
    border-radius: 10px;
}

.custom-scrollbar-dark::-webkit-scrollbar {
    width: 4px;
}

.custom-scrollbar-dark::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 10px;
}

.custom-scrollbar-dark::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 10px;
}

.w-3\/5 .ql-content :deep(p) {
    margin-bottom: 1.25rem;
    text-indent: 2.5rem;
    line-height: 1.8;
}

.w-3\/5 .ql-content :deep(img),
.w-3\/5 .ql-content :deep(ul),
.w-3\/5 .ql-content :deep(ol) {
    text-indent: 0;
}

.interactive-content-area {
    line-height: 1.8;
    text-indent: 0 !important;
    display: block !important;
    position: relative;
    margin-top: 1rem;
}

.interactive-content-area :deep(*) {
    text-indent: 0 !important;
    display: inline;
}

.interactive-content-area :deep(p) {
    display: block;
    margin-bottom: 0.5rem;
}

/* Slide Up Transition for Virtual Keyboard */
.slide-up-enter-active,
.slide-up-leave-active {
    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
    transform: translateY(100%);
    opacity: 0;
}

:deep(.blank-line-wrapper) {
    display: inline-flex !important;
    align-items: center !important;
    gap: 8px !important;
    vertical-align: middle !important;
    margin: 4px 6px !important;
    direction: ltr !important;
}

:deep(.blank-line) {
    display: inline-block !important;
    border-bottom: 2px dashed #94a3b8 !important;
    width: 150px !important;
    height: 18px !important;
    vertical-align: middle !important;
    margin: 0 4px !important;
}

:deep(.blank-badge) {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    width: 24px !important;
    height: 24px !important;
    border-radius: 50% !important;
    background-color: var(--brand-primary, #e11d48) !important;
    color: white !important;
    font-size: 12px !important;
    font-weight: 900 !important;
    font-family: sans-serif !important;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15) !important;
}

/* Hide all scrollbars visually from any child div inside the exam (except passage scrollbar) */
:deep(div:not(.passage-scrollbar-container)) {
    scrollbar-width: none !important;
    -ms-overflow-style: none !important;
}

:deep(div:not(.passage-scrollbar-container)::-webkit-scrollbar) {
    display: none !important;
}

/* Passage scrollbar — override the hide-all rule above */
.passage-scrollbar-container {
    scrollbar-width: thin !important;
    scrollbar-color: #94a3b8 #e2e8f0 !important;
    overflow-y: auto !important;
}

.passage-scrollbar-container::-webkit-scrollbar {
    width: 8px !important;
    display: block !important;
    visibility: visible !important;
}

.passage-scrollbar-container::-webkit-scrollbar-track {
    background: #e2e8f0 !important;
    border-radius: 9999px !important;
}

.passage-scrollbar-container::-webkit-scrollbar-thumb {
    background: #94a3b8 !important;
    border-radius: 9999px !important;
    min-height: 40px !important;
}

.passage-scrollbar-container::-webkit-scrollbar-thumb:hover {
    background: #64748b !important;
}

/* Force Myriad Arabic / Lotus Linotype / Cairo Sans with normal weight and styling overrides on passage text, questions, and option contents to keep them clean and un-bolded */
.ql-content,
.ql-content :deep(p),
.ql-content :deep(span),
.ql-content :deep(strong),
.ql-content :deep(b),
.rtl-support,
.rtl-support :deep(*),
.question-title-text,
.question-title-text :deep(*),
.interactive-content-area,
.interactive-content-area :deep(*) {
    font-family: 'Myriad Arabic', 'Lotus Linotype', 'Cairo', 'Inter', system-ui, -apple-system, sans-serif !important;
    font-weight: 400 !important;
}

.ql-content :deep(p),
.ql-content :deep(span),
.ql-content :deep(strong),
.ql-content :deep(b) {
    color: #334155 !important;
}

.question-title-text,
.question-title-text :deep(*) {
    color: #1e293b !important;
    /* font-size is controlled by Tailwind utility class on the element */
}
</style>
