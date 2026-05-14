<script setup>
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue';
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router';
import api from '@/services/api';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import AudioRecorder from '@/components/AudioRecorder.vue';
import RequirementTester from '@/components/RequirementTester.vue';
import StudentHeader from '@/components/StudentHeader.vue';
import VirtualKeyboard from '@/components/VirtualKeyboard.vue';
import QuestionDispatcher from '@/components/exam/QuestionDispatcher.vue';

// Composables
import { useExamTimer } from '@/composables/useExamTimer';
import { useAntiCheat } from '@/composables/useAntiCheat';
import { useAudioEngine } from '@/composables/useAudioEngine';

const route = useRoute();
const router = useRouter();
const attemptId = ref(route.params.id);
const examId = route.params.examId;
const skillId = route.params.skillId;
const levelId = route.params.levelId;

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
const isRetryAttempt = ref(false);
const showRetryNotification = ref(false);
const errorMsg = ref('');
const checkedRequirements = ref([]);
const autoVerifiedIds = ref([]);
const hasListened = ref(false);
const isDemo = ref(false);
const showLevelTransition = ref(false);
const nextLevelName = ref('');
const showTimeoutModal = ref(false);
const lastAudioUrl = ref('');
// Modals managed locally or by composables
const showExitModal = ref(false);
const showConfirmAnswerModal = ref(false);
const showInactivityModal = ref(false);
const activeTesterReq = ref(null);
const keyboardLayout = ref('arabic');
const showVirtualKeyboard = ref(true);
const timerConfig = ref(null);
const lastActivityAt = ref(Date.now());

const toggleKeyboardLayout = () => {
    keyboardLayout.value = keyboardLayout.value === 'arabic' ? 'english' : 'arabic';
};

const focusedInputIndex = ref(0);

// Use Composables
const { timeLeftSeconds, formattedTime, isTimeLow, startTimer: initTimer, stopTimer } = useExamTimer();
const {
    cheatWarnings, showCheatModal, showFinalCheatModal, isIntentionallyLeaving,
    handleVisibilityChange: logCheatWarning, setupAntiCheat, destroyAntiCheat
} = useAntiCheat(attemptId, { onFinalWarning: () => handleTimeout() });

const {
    audioRef, isAudioPlaying, audioProgress, audioCurrentTime, audioDuration, autoplayFailed,
    syncAudioState, updateAudioProgress, toggleAudioManual, onAudioError, playStimulusAudio
} = useAudioEngine();

const handleVisibilityChange = () => logCheatWarning(isStarting.value, showTimeoutModal.value);

const startTimer = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    const role = (user?.role || '').toLowerCase();
    isDemo.value = ['demo', 'staff'].includes(role);
    if (isDemo.value) return;

    initTimer(timerConfig.value, () => {
        showTimeoutModal.value = true;
    });
};

const canStart = computed(() => {
    const mandatoryIds = systemRequirements.value.filter(r => r.is_mandatory).map(r => r.id);
    return mandatoryIds.every(id => checkedRequirements.value.includes(id));
});

const toggleRequirement = (req) => {
    if (autoVerifiedIds.value.includes(req.id)) return;

    // If it has an interactive test, open the tester instead of just checking it
    if (req.test_type && req.test_type !== 'none' && !checkedRequirements.value.includes(req.id)) {
        activeTesterReq.value = req;
        return;
    }

    const index = checkedRequirements.value.indexOf(req.id);
    if (index === -1) checkedRequirements.value.push(req.id);
    else checkedRequirements.value.splice(index, 1);
};

const handleTestPassed = (req) => {
    if (!checkedRequirements.value.includes(req.id)) {
        checkedRequirements.value.push(req.id);
    }
    activeTesterReq.value = null;
};



const fetchData = async () => {
    isLoading.value = true;
    try {
        if (attemptId.value && attemptId.value !== 'start') {
            const attRes = await api.get(`/attempts/${attemptId.value}`);
            attempt.value = attRes.data;
            if (attempt.value.status === 'completed' || attempt.value.status === 'voided') {
                router.push('/skill-selection');
                return;
            }
            await fetchNextBatch();
            startTimer();
        } else {
            await beginExam();
        }
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
            const payload = {
                skill_id: skillId,
                level_id: levelId
            };
            const res = await api.post(`/exams/${examId}/start`, payload);
            attemptId.value = res.data.attempt.id;
            attempt.value = res.data.attempt;

            // Update URL silently so refresh works
            router.replace(`/exam/${attemptId.value}`);
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to start session');
            isLoading.value = false;
            return;
        }
    }

    isStarting.value = false;
    await fetchNextBatch();
    startTimer();
};

const confirmExit = async () => {
    showExitModal.value = false;
    try {
        isLoading.value = true;
        await api.post(`/attempts/${attemptId.value}/completion`);
        router.push('/skill-selection');
    } catch (err) {
        console.error('Error finishing attempt:', err);
        router.push('/skill-selection');
    }
};

const exitExam = () => {
    showExitModal.value = true;
};

const isNavigatingBack = ref(false);

onBeforeRouteLeave((to, from) => {
    isIntentionallyLeaving.value = true;
});

const prevQuestion = () => {
    if (currentIndex.value > 0) {
        isNavigatingBack.value = true;
        currentIndex.value--;
    }
};

const startNextLevel = () => {
    showLevelTransition.value = false;
    // Trigger audio playback now that the student is ready
    nextTick(() => {
        if (audioRef.value) {
            const audioUrl = currentQ.value?.passage?.audio_url || currentQ.value?.passage?.audio_path || currentQ.value?.audio_url || currentQ.value?.audio_path;
            if (audioUrl) {
                audioRef.value.play().catch(err => {
                    console.warn('Manual play failed after transition:', err);
                });
            }
        }
    });
};

const fetchNextBatch = async () => {
    isLoading.value = true;

    // EXPLICITLY stop any playing audio BEFORE fetching new questions
    if (audioRef.value) {
        audioRef.value.pause();
        audioRef.value.currentTime = 0;
    }
    isAudioPlaying.value = false;

    questions.value = []; // Safety clear
    try {
        const res = await api.get(`/attempts/${attemptId.value}/next-batch`);
        if (res.data.questions?.length > 0) {
            currentSkill.value = res.data.skill;
            // Show level transition if level changed
            if (currentLevel.value && res.data.level && res.data.level.id !== currentLevel.value.id) {
                nextLevelName.value = res.data.level.name;
                showLevelTransition.value = true;
                globalOffset.value = 0; // Reset counter for the new level
            }

            currentLevel.value = res.data.level;
            totalSkillQuestions.value = res.data.total_questions;
            questions.value = res.data.questions;
            currentIndex.value = 0;
            questionSubmitted.value = false;
            hasListened.value = false;

            // Populate timer configuration
            timerConfig.value = {
                type: res.data.timer_type,
                globalLimit: res.data.time_limit,
                skillDuration: res.data.skill_duration,
                skillStartedAt: res.data.current_skill_started_at
            };

            // Set skill-specific cheat warnings
            cheatWarnings.value = res.data.skill_cheat_warnings || 0;

            answers.value = questions.value.map(q => {
                const base = {
                    question_id: q.id,
                    option_id: null,
                    text_answer: '',
                    recorded_file: null,
                    // Initialize ALL complex fields as empty/null to ensure reactivity
                    drag_drop_answers: [],
                    selected_words: [],
                    fill_blank_answers: [],
                    matching_answers: {},
                    ordering_answers: [],
                    highlight_answers: []
                };
                return base;
            });

            // Populate extra state based on type
            questions.value.forEach((q, idx) => {
                const content = q.content || '';
                if (q.type === 'drag_drop') {
                    // Support [target], [ ], or []
                    const slotCount = (content.match(/\.{10,}|\[\s*target\s*\]|\[\s*\]/gi) || []).length;
                    answers.value[idx].drag_drop_answers = Array(slotCount).fill(null);
                } else if (q.type === 'word_selection' || q.type === 'click_word') {
                    answers.value[idx].selected_words = [];
                } else if (q.type === 'fill_blank') {
                    // Support [input], [ ], or []
                    const slotCount = (content.match(/\[\s*input\s*\]|\[\s*\]/gi) || []).length;
                    answers.value[idx].fill_blank_answers = Array(slotCount).fill('');
                } else if (q.type === 'matching') {
                    answers.value[idx].matching_answers = {};
                } else if (q.type === 'ordering') {
                    // Start with an empty sequence for the Sentence Builder UI
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
        // Reset interactive states for the new batch
        questionSubmitted.value = false;
        hasListened.value = false;
        isAudioPlaying.value = false;
        audioProgress.value = 0;
        audioCurrentTime.value = '0:00';
        audioDuration.value = '0:00';
        if (audioRef.value) {
            audioRef.value.pause();
            audioRef.value.currentTime = 0;
        }

        window.scrollTo(0, 0);
    }
};

const VALIDATORS = {
    mcq: (ans) => !!ans.option_id,
    true_false: (ans) => !!ans.option_id,
    speaking: (ans) => !!ans.recorded_file,
    drag_drop: (ans) => ans.drag_drop_answers.every(a => a !== null && a !== ''),
    fill_blank: (ans) => ans.fill_blank_answers.every(a => a && a.trim().length > 0),
    matching: (ans, q) => Object.keys(ans.matching_answers).length === q.options.filter(o => o.is_correct).length,
    ordering: (ans, q) => ans.ordering_answers.length === q.options.length,
    highlight: (ans) => ans.highlight_answers.length > 0,
    short_answer: (ans) => ans.text_answer && ans.text_answer.trim().length > 0,
    click_word: (ans) => ans.selected_words.length > 0,
    word_selection: (ans) => ans.selected_words.length > 0,
};

const submitAnswer = () => {
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
    // Save current answer as a draft before moving
    await saveCurrentAnswerDraft();

    if (currentIndex.value < questions.value.length - 1) {
        currentIndex.value++;
        questionSubmitted.value = false;
        hasListened.value = false;
        window.scrollTo(0, 0);
    } else {
        await submitCurrentBatch();
    }
};

const saveCurrentAnswerDraft = async () => {
    if (isStarting.value || !currentQ.value) return;

    const ans = answers.value[currentIndex.value];
    if (!ans) return;

    try {
        const payload = {
            question_id: ans.question_id,
            option_id: ans.option_id,
            text_answer: ans.text_answer,
            selected_words: ans.selected_words,
            drag_drop_answers: ans.drag_drop_answers,
            fill_blank_answers: ans.fill_blank_answers,
            ordering_answers: ans.ordering_answers,
            highlight_answers: ans.highlight_answers,
            matching_answers: ans.matching_answers
        };

        // Note: We don't send files (audio) here to keep it lightweight. 
        // Audio is still sent via the final submitBatch.
        await api.post(`/attempts/${attemptId.value}/save-answer`, payload);
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
            if (ans.recorded_file) formData.append(`answers[${index}][audio_file]`, ans.recorded_file, 'voice.webm');

            // --- OPTIMIZATION: Use a map for complex array fields ---
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
            await api.post(`/attempts/${attemptId.value}/timeout`, {
                skill_id: currentSkill.value?.id
            });
            router.push('/skill-selection');
            return;
        }

        if (res.data.finished_exam) router.push(`/exam/${attemptId.value}/result`);
        else if (res.data.next_step === 'dashboard') router.push('/skill-selection');
        else {
            // Handle retry notification logic
            if (res.data.retry_attempt) {
                isRetryAttempt.value = true;
                showRetryNotification.value = true;
                globalOffset.value = 0; // Reset counter for retry
            } else {
                isRetryAttempt.value = false;
                showRetryNotification.value = false;
                globalOffset.value += questions.value.length;
            }

            await fetchNextBatch();
        }
    } catch (err) {
        console.error('Submission failed', err);
        if (isTimeout) {
            router.push('/skill-selection');
        } else {
            alert('Data transmission error. Try again.');
        }
    } finally {
        isSubmittingBatch.value = false;
    }
};

const handleTimeout = async () => {
    await submitCurrentBatch(true);
};

const currentQ = computed(() => questions.value[currentIndex.value] || null);
const displayNumber = computed(() => globalOffset.value + currentIndex.value + 1);
const wordCount = computed(() => (answers.value[currentIndex.value]?.text_answer || '').trim().split(/\s+/).filter(w => w).length);

const shouldShowQuestion = computed(() => {
    return !!currentQ.value; // Show immediately if a question exists
});

const isCurrentAnswerValid = computed(() => {
    if (!currentQ.value || !answers.value[currentIndex.value]) return false;
    const ans = answers.value[currentIndex.value];
    const q = currentQ.value;
    return VALIDATORS[q.type] ? VALIDATORS[q.type](ans, q) : !!ans.text_answer;
});

// Reset confirmation when answer changes
watch(() => answers.value[currentIndex.value], (newVal, oldVal) => {
    // Only reset if it's the same question being modified
    if (newVal && oldVal && newVal.question_id === oldVal.question_id) {
        questionSubmitted.value = false;
    }
}, { deep: true });

const cleanHtml = (html) => {
    if (!html) return '';
    // Replace non-breaking spaces with normal spaces to allow wrapping
    return html.replace(/&nbsp;/g, ' ');
};

const resolveUrl = (path) => {
    if (!path) return null;

    if (/^https?:\/\//.test(path)) {
        return path;
    }

    let baseUrl = import.meta.env.VITE_API_BASE_URL;

    if (!baseUrl) {
        const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);

        baseUrl = isLocal
            ? 'http://localhost:8000/api'
            : `${window.location.origin}/api`;
    }

    const origin = new URL(baseUrl).origin;

    return `${origin}/storage/${path.replace(/^storage\//, '').replace(/^\/+/, '')}`;
};

const getSkillIcon = (name) => {
    name = name?.toLowerCase() || '';
    if (name.includes('listening')) return '🎧';
    if (name.includes('reading')) return '📖';
    if (name.includes('writing')) return '✍️';
    if (name.includes('speaking')) return '🗣️';
    return '🎯';
};

// Auto-play media when question changes and update progress
watch(currentQ, (newQ) => {
    if (!newQ) return;

    autoplayFailed.value = false;

    // Reset audio progress when question changes
    audioProgress.value = 0;
    audioCurrentTime.value = '0:00';
    audioDuration.value = '0:00';

    if (newQ && newQ.id) {
        // Update last_seen_question_id in background
        api.patch(`/attempts/${attemptId.value}/progress`, { question_id: newQ.id })
            .catch(err => console.warn('Progress update failed', err));
    }

    // CRITICAL: Do not play if level transition, retry, or start screen is showing
    if (showLevelTransition.value || showRetryNotification.value || isStarting.value) {
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
        return;
    }

    const audioUrl = newQ?.passage?.audio_url || newQ?.passage?.audio_path || newQ?.audio_url || newQ?.audio_path;

    if (audioUrl) {
        // --- OPTIMIZATION: Only reload if the source changed ---
        if (audioUrl === lastAudioUrl.value) {
            return;
        }
        lastAudioUrl.value = audioUrl;

        nextTick(() => {
            if (audioRef.value) {
                audioRef.value.load(); // Force reload for new source
                audioRef.value.play().catch(err => {
                    console.warn('Autoplay blocked by browser. User interaction required.', err);
                    autoplayFailed.value = true;
                });
            }
        });
    } else {
        lastAudioUrl.value = '';
        autoplayFailed.value = false;
    }
});

const hasStimulusContent = computed(() => {
    if (!currentQ.value) return false;
    const q = currentQ.value;
    const p = q.passage;

    // A passage counts as stimulus only if it has text or visual media
    const passageHasContent = p && (
        (p.content && p.content.trim().length > 0) ||
        p.image_url || p.image_path ||
        (p.media_url && p.media_url.toLowerCase().includes('.mp4')) ||
        (p.media_path && p.media_path.toLowerCase().includes('.mp4'))
    );

    // Question counts as stimulus only if it has visual media (Audio stays in response pane)
    const questionHasMedia = (q.image_url || q.image_path) ||
        (q.media_url && q.media_url.toLowerCase().includes('.mp4')) ||
        (q.media_path && q.media_path.toLowerCase().includes('.mp4'));

    return !!(passageHasContent || questionHasMedia);
});

// --- INACTIVITY LOGIC ---
const updateActivity = () => {
    lastActivityAt.value = Date.now();
};

let inactivityInterval = null;
const checkInactivity = () => {
    const inactiveSeconds = (Date.now() - lastActivityAt.value) / 1000;
    if (inactiveSeconds > 300) { // 5 minutes
        showInactivityModal.value = true;
        setTimeout(() => {
            handleTimeout();
        }, 5000); // Give 5 seconds then terminate
    }
};

const handleBeforeUnload = () => {
    isIntentionallyLeaving.value = true;
};

onMounted(async () => {
    const user = JSON.parse(localStorage.getItem('user'));
    isDemo.value = user && ['demo', 'staff'].includes(user.role?.toLowerCase());
    await fetchData();

    // Initialize Anti-Cheat
    setupAntiCheat();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Inactivity tracking
    document.addEventListener('mousemove', updateActivity);
    document.addEventListener('keydown', updateActivity);
    document.addEventListener('click', updateActivity);
    // inactivityInterval = setInterval(checkInactivity, 30000);
});

onUnmounted(() => {
    stopTimer();
    if (inactivityInterval) clearInterval(inactivityInterval);

    // Cleanup Audio
    if (audioRef.value) {
        audioRef.value.pause();
        audioRef.value.src = "";
    }

    // Remove Anti-Cheat
    destroyAntiCheat();
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('beforeunload', handleBeforeUnload);
    document.removeEventListener('mousemove', updateActivity);
    document.removeEventListener('keydown', updateActivity);
    document.removeEventListener('click', updateActivity);
});
</script>

<template>
    <div class="h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden flex flex-col">
        <StudentHeader />

        <header v-if="!isStarting && currentSkill" class="bg-slate-800 text-white shadow-md h-20 px-6 shrink-0"
            dir="ltr">
            <div class="max-w-[1600px] mx-auto h-full flex justify-between items-center">

                <!-- Left Side: Skill Info -->
                <div class="flex items-center">

                    <div class="flex flex-col items-start text-left">
                        <div class="flex items-center mb-0.5">
                            <span class="text-mm font-black uppercase tracking-wider text-slate-400">{{
                                currentSkill?.name }}</span>
                        </div>
                    </div>

                </div>

                <!-- Right Side: Navigation & Timer -->
                <div class="flex items-center gap-3">
                    <button @click="prevQuestion"
                        :class="currentIndex > 0 ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-slate-800 text-slate-500 cursor-not-allowed'"
                        class="h-10 px-8 rounded-lg font-black text-sm transition-all shadow-lg flex items-center gap-2">
                        <i class="pi pi-chevron-left text-[10px]"></i> <span>PREVIOUS</span>
                    </button>
                    <span class="text-sm font-black text-slate-500">{{ displayNumber }} / {{ totalSkillQuestions
                        }}</span>
                    <button @click="submitAnswer" :disabled="!isCurrentAnswerValid || questionSubmitted"
                        class="h-10 px-8 bg-brand-primary text-white rounded-lg font-black text-sm hover:bg-brand-primary/90 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                        <i class="pi pi-thumbs-up text-xs"></i>
                        <span>CONFIRM</span>
                    </button>

                    <button @click="advanceQuestion" :disabled="!questionSubmitted || isSubmittingBatch"
                        class="h-10 px-8 bg-emerald-600 text-white rounded-lg font-black text-sm hover:bg-emerald-500 transition-all shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                        <span v-if="isSubmittingBatch" class="flex items-center gap-2">
                            <i class="pi pi-spin pi-spinner text-[10px]"></i> Saving...
                        </span>
                        <template v-else>
                            <span>NEXT</span> <i class="pi pi-chevron-right text-[10px]"></i>
                        </template>
                    </button>

                    <!-- Timer -->
                    <div v-if="!isDemo && timerConfig && timerConfig.skillDuration > 0"
                        :class="['h-10 flex items-center gap-3 px-5 rounded-lg border transition-colors', timeLeftSeconds < 300 ? 'bg-rose-900/50 border-rose-500 text-rose-300 animate-pulse' : 'bg-slate-900/50 border-slate-700 text-white']">
                        <span class="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center shrink-0">
                            <i class="pi pi-clock text-xs"
                                :class="timeLeftSeconds < 300 ? 'text-rose-400' : 'text-slate-400'"></i>
                        </span>
                        <span class="text-lg font-black tabular-nums tracking-tighter">{{ formattedTime }}</span>
                    </div>
                    <div
                        class="flex items-center rounded-lg transition-colors">
                        <button @click="exitExam"
                            class="h-10 flex items-center gap-3 px-6 bg-slate-700/50 hover:bg-rose-600/80 text-slate-300 hover:text-white rounded-lg transition-all text-sm font-black shadow-lg">
                            <span>EXIT</span>
                            <i class="pi pi-sign-out inline-block scale-x-[1]"></i>
                        </button>
                    </div>

                </div>
            </div>
        </header>

        <!--  Sub-header for Level Name -->
        <div v-if="!isStarting && currentSkill"
            class="bg-white border-b border-slate-200 h-10 px-8 flex justify-end items-center shrink-0 z-20">
            <div class="flex items-center space-x-3 space-x-reverse">

                <div class="px-3 py-1 bg-slate-100 rounded-md border border-slate-200">
                    <span class="text-xs font-black text-slate-600 uppercase tracking-wider">{{ currentLevel?.name
                        }}</span>
                </div>
            </div>
        </div>

        <main class="flex-grow overflow-hidden relative">

            <!-- Retry Notification Overlay -->
            <div v-if="showRetryNotification"
                class="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-6">
                <div class="bg-white rounded-lg p-10 max-w-xl w-full shadow-2xl border border-slate-200 text-center"
                    dir="rtl">
                    <div
                        class="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl">
                        <i class="pi pi-refresh"></i>
                    </div>
                    <h3 class="text-xl font-black text-slate-900 tracking-tight mb-4 uppercase">System Notification</h3>
                    <p class="text-slate-600 text-base font-medium leading-relaxed mb-8">
                        You did not meet the minimum score requirement. A second evaluation cycle with new content is
                        about to
                        begin...
                    </p>
                    <button @click="showRetryNotification = false"
                        class="w-full py-4 bg-slate-800 text-white rounded font-bold uppercase text-xs tracking-widest hover:bg-slate-700 transition-all">
                        Start New Attempt
                    </button>
                </div>
            </div>

            <!-- Level Transition Modal -->
            <div v-if="showLevelTransition"
                class="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-6">
                <div
                    class="bg-white rounded-3xl p-12 max-w-2xl w-full shadow-2xl border border-slate-200 text-center animate-in zoom-in-95 duration-300">
                    <div
                        class="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-3xl">
                        <i class="pi pi-check-circle"></i>
                    </div>
                    <h3 class="text-3xl font-black text-slate-900 tracking-tight mb-4">Well done! You have completed the
                        level
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
            </div>

            <!-- Loading -->
            <div v-if="isLoading" class="flex flex-col items-center justify-center py-40">
                <div class="w-10 h-10 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
                <p class="mt-6 text-sm font-bold text-slate-500 uppercase tracking-widest">Loading...</p>
            </div>



            <!-- Error State -->
            <div v-else-if="errorMsg" class="max-w-xl mx-auto py-32 text-center space-y-8" dir="rtl">
                <div
                    class="w-20 h-20 bg-rose-50 text-rose-600 rounded-[2rem] flex items-center justify-center mx-auto text-3xl shadow-lg shadow-rose-100">
                    <i class="pi pi-exclamation-circle"></i>
                </div>
                <div class="space-y-2">
                    <h2 class="text-2xl font-black text-slate-800 uppercase tracking-tight">System Notification</h2>
                    <p class="text-slate-500 font-medium leading-relaxed">{{ errorMsg }}</p>
                </div>
                <button @click="router.push('/skill-selection')"
                    class="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-brand-primary transition-all active:scale-95">
                    Back to Dashboard
                </button>
            </div>



            <!-- Exam Split Screen (Dynamic Layout) -->
            <div v-else-if="currentQ"
                class="flex flex-row h-full gap-px bg-slate-300 border-t border-slate-300 animate-in fade-in duration-500 overflow-hidden">

                <!-- Right Side: Response (Question and Choices) - Now on the Left Side of the viewport -->
                <div :class="hasStimulusContent ? 'w-2/5 bg-white' : 'w-full bg-slate-50'"
                    class="flex flex-col h-full border-r border-slate-200 shadow-inner animate-in slide-in-from-left-8 duration-700 overflow-hidden">
                    <div
                        :class="hasStimulusContent ? 'w-full p-4' : 'max-w-5xl mx-auto w-full bg-white my-4 rounded-2xl shadow-xl border border-slate-100 p-6 flex flex-col max-h-[calc(100vh-120px)] overflow-hidden'">
                        <!-- Audio Player Integrated (One-time playback, no controls) -->
                        <div v-if="currentQ.passage?.audio_url || currentQ.passage?.audio_path || currentQ.audio_url || currentQ.audio_path"
                            class="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200 shadow-inner">
                            <div class="flex items-center gap-3 mb-2" dir="rtl">
                                <div
                                    class="w-6 h-6 rounded bg-white shadow-sm flex items-center justify-center text-brand-primary text-[10px]">
                                    <i class="pi pi-volume-up" :class="isAudioPlaying ? 'animate-pulse' : ''"></i>
                                </div>
                                <span class="text-[20px] font-black text-slate-400 uppercase tracking-widest"></span>
                            </div>

                            <audio ref="audioRef"
                                :src="resolveUrl(currentQ.passage?.audio_url || currentQ.passage?.audio_path || currentQ.audio_url || currentQ.audio_path)"
                                @play="isAudioPlaying = true" @pause="isAudioPlaying = false"
                                @ended="hasListened = true" @timeupdate="updateAudioProgress" class="hidden"></audio>

                            <!-- Fallback UI for Autoplay Blocked -->
                            <div v-if="autoplayFailed && !isAudioPlaying && !hasListened"
                                class="mt-2 flex items-center justify-between p-2 bg-rose-50 border border-rose-200 rounded-lg animate-in fade-in slide-in-from-top-2 duration-500">
                                <div class="flex items-center gap-2">
                                    <i class="pi pi-exclamation-triangle text-rose-500 text-xs"></i>
                                    <span class="text-[10px] font-bold text-rose-700">Click to start listening</span>
                                </div>
                                <button @click="toggleAudioManual"
                                    class="px-4 py-1.5 bg-rose-600 text-white rounded-md text-[10px] font-black hover:bg-rose-700 transition-all shadow-sm">
                                    Play audio
                                </button>
                            </div>

                            <!-- Custom Progress Bar (Non-interactive) -->
                            <div class="w-full bg-slate-200 h-1 rounded-full overflow-hidden mt-1">
                                <div class="bg-brand-primary h-full transition-all duration-150 ease-linear"
                                    :style="{ width: audioProgress + '%' }"></div>
                            </div>
                            <div class="flex justify-between mt-1.5 text-[8px] font-bold text-slate-400 font-mono">
                                <span class="text-brand-primary">{{ audioCurrentTime }}</span>
                                <span>{{ audioDuration }}</span>
                            </div>
                        </div>

                        <div class="flex-grow flex flex-col space-y-4 overflow-hidden">
                            <div v-if="currentQ.content && !['fill_blank', 'drag_drop', 'word_selection', 'click_word', 'highlight', 'matching', 'ordering'].includes(currentQ.type)"
                                class="text-lg font-black text-slate-900 leading-snug interactive-content-area rtl-support"
                                v-html="cleanHtml(currentQ.content)" dir="auto">
                            </div>
                           

                            <div class="bg-slate-50 border border-slate-100 p-3 rounded-lg" dir="rtl">
                                <p class="text-[10px] font-bold text-slate-600 leading-relaxed" dir="auto">
                                    {{ currentQ.instructions || 'Choose The Correct Answer'
                                    }}
                                </p>
                            </div>

                            <QuestionDispatcher v-if="currentQ && answers[currentIndex]" :question="currentQ"
                                v-model:answer="answers[currentIndex]" :disabled="false" />
                        </div>

                        <div class="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                            <span class="text-[8px] font-bold text-slate-300 uppercase tracking-widest"></span>
                        </div>
                    </div>
                </div>

                <!-- Left Side: Stimulus Pane (Material) - Only show if content exists -->
                <div v-if="hasStimulusContent"
                    class="w-3/5 bg-white p-4 overflow-y-auto custom-scrollbar flex flex-col h-full transition-all duration-700">
                    <div class="flex items-center space-x-2 space-x-reverse mb-4 pb-2 border-b border-slate-100"
                        dir="rtl">
                        <i class="pi pi-file-edit text-slate-400"></i>
                        <span class="text-xs font-bold text-slate-500 uppercase tracking-widest"> </span>
                    </div>

                    <div class="flex-grow prose prose-slate max-w-none">
                        <!-- 1. Passage Content -->
                        <div v-if="currentQ.passage"
                            class="space-y-4 mb-6 pb-6 border-b border-slate-100 border-dashed">
                            <h3 v-if="currentQ.passage.title"
                                class="text-xl font-black text-slate-900 tracking-tight leading-tight" dir="auto">{{
                                    currentQ.passage.title }}</h3>
                            <div v-if="currentQ.passage.image_url || currentQ.passage.image_path" class="w-full mb-4">
                                <img :src="resolveUrl(currentQ.passage.image_url || currentQ.passage.image_path)"
                                    class="w-full h-auto rounded-xl shadow-md border border-slate-100" />
                            </div>
                            <div v-if="currentQ.passage.content"
                                class="text-lg text-slate-700 leading-relaxed font-serif text-justify ql-content rtl-support"
                                v-html="cleanHtml(currentQ.passage.content)" dir="auto"></div>
                        </div>

                        <!-- 2. Videos -->
                        <div v-if="(currentQ.media_url || currentQ.media_path) && (currentQ.media_url || currentQ.media_path).includes('.mp4')"
                            class="flex flex-col items-center justify-center py-4">
                            <video :src="resolveUrl(currentQ.media_url || currentQ.media_path)" controls autoplay
                                @ended="hasListened = true" class="w-full rounded-xl shadow-lg"></video>
                        </div>

                        <!-- 3. Question Image -->
                        <div v-if="currentQ.image_url || currentQ.image_path" class="w-full flex justify-center py-4">
                            <img :src="resolveUrl(currentQ.image_url || currentQ.image_path)"
                                class="max-w-full h-auto rounded-xl shadow-lg border border-white" />
                        </div>
                    </div>
                </div>
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
                        has expired.
                        Your answers will be saved and you will be directed automatically.</p>
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
                    <p class="text-slate-500 font-bold leading-relaxed">Are you sure you want to exit? The exam will be
                        ended and your current progress will be saved and you will not be able to return.</p>
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

        <!-- showConfirmAnswerModal -->
        <div v-if="showConfirmAnswerModal"
            class="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div
                class="bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full p-10 text-center space-y-6 border border-slate-100 animate-in zoom-in-95 duration-300">
                <div
                    class="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-2 border-4 border-amber-100/50">
                    <i class="pi pi-exclamation-triangle text-4xl text-amber-500"></i>
                </div>
                <div class="space-y-2">
                    <h2 class="text-3xl font-black text-slate-900 tracking-tight">Please complete the task before
                        continuing.</h2>
                    <p class="text-slate-500 font-bold leading-relaxed">Please complete the task before continuing.</p>
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
                    <!-- instruction in english lang -->
                    <h2 class="text-3xl font-black text-slate-900 tracking-tight uppercase">Security Alert</h2>
                    <p class="text-slate-500 font-bold leading-relaxed">Please do not leave the exam page or switch
                        tabs.
                        The exam will be automatically terminated if you try again.</p>
                    <div class="pt-2">
                        <p class="text-rose-600 font-black text-lg">Warning {{ cheatWarnings }} of 3</p>
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
                    <h2 class="text-3xl font-black text-slate-900 tracking-tight uppercase">Inactivity Alert</h2>
                    <p class="text-slate-500 font-bold leading-relaxed">You have been inactive for too long. Your
                        session will
                        be terminated in a few seconds.</p>
                </div>
            </div>
        </div>
        <!-- Final Cheat Termination Modal -->
        <div v-if="showFinalCheatModal"
            class="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-rose-950/80 backdrop-blur-md animate-in fade-in duration-300">
            <div
                class="bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full p-10 text-center space-y-6 border border-rose-100 animate-in zoom-in-95 duration-300">
                <div
                    class="w-24 h-24 bg-rose-600 rounded-full flex items-center justify-center mx-auto mb-2 border-4 border-rose-400">
                    <i class="pi pi-lock text-4xl text-white"></i>
                </div>
                <div class="space-y-2">
                    <h2 class="text-3xl font-black text-rose-600 tracking-tight uppercase">Exam Terminated</h2>
                    <p class="text-slate-700 font-bold leading-relaxed">Repeated cheating attempts detected (tab
                        switching). The
                        exam is now terminated.</p>
                </div>
                <div class="pt-4">
                    <div class="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div class="bg-rose-600 h-full animate-shrink-width"
                            style="animation: shrink 5s linear forwards;">
                        </div>
                    </div>
                    <p class="text-[10px] font-black text-slate-400 mt-2 uppercase tracking-widest">Redirecting to
                        dashboard...
                    </p>
                </div>
            </div>
        </div>

    </div>
</template>

<style>
@keyframes shrink {
    from {
        width: 100%;
    }

    to {
        width: 0%;
    }
}

.animate-shrink-width {
    transform-origin: left;
}
</style>

<style scoped>
.animate-in {
    animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
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

/* Academic Paragraph Styling - Scope ONLY to stimulus pane */
.w-3\/5 .ql-content :deep(p) {
    margin-bottom: 1.25rem;
    text-indent: 2.5rem;
    line-height: 1.8;
}

/* Ensure images and other elements don't get indented */
.w-3\/5 .ql-content :deep(img),
.w-3\/5 .ql-content :deep(ul),
.w-3\/5 .ql-content :deep(ol) {
    text-indent: 0;
}

/* Fix Interactive Content Area - Avoid forced inline overlap */
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
    /* Keep words inline for selection types */
}

/* Specific fix for p tags inside interactive area */
.interactive-content-area :deep(p) {
    display: block;
    margin-bottom: 0.5rem;
}
</style>
