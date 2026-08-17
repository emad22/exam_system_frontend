import { ref, computed, type Ref } from 'vue';
import api from '@/services/api';
import proctoringService from '@/services/proctoringService';

export interface TimerConfig {
    type?: string;
    globalLimit?: number;
    skillDuration?: number;
    skillStartedAt?: string;
}

export function useExamFlow(
    attemptId: Ref<string | number | null>,
    examId: string | number | undefined,
    skillId: string | number | undefined,
    levelId: string | number | undefined,
    proctoringSessionId: Ref<string | number | null>,
    proctoringRequired: Ref<boolean>,
    enteredExam: Ref<boolean>,
    isIntentionallyLeaving: Ref<boolean>,
    showAlert: (msg: string) => Promise<void>,
    navigateSafely: (path: string) => Promise<void>,
    onAnswersReady?: (qs: any[]) => void,
    onBatchLoaded?: () => void
) {
    const attempt = ref<any>(null);
    const currentSkill = ref<any>(null);
    const currentLevel = ref<any>(null);
    const questions = ref<any[]>([]);
    const currentIndex = ref(0);
    const globalOffset = ref(0);
    const totalSkillQuestions = ref(0);

    const isLoading = ref(true);
    const isStarting = ref(false);
    const isDemo = ref(false);
    const showLevelTransition = ref(false);
    const nextLevelName = ref('');
    const showRetryNotification = ref(false);
    const errorMsg = ref('');
    const timerConfig = ref<TimerConfig | null>(null);

    const isNavigatingBack = ref(false);
    const hasListened = ref(false);
    const listenedQuestions = ref<Set<number | string>>(new Set());
    const listenedPassages = ref<Set<number | string>>(new Set());

    // --- Computed Properties ---
    const currentQ = computed(() => questions.value[currentIndex.value] || null);

    const isFirstQuestionInPassage = computed(() => {
        const q = currentQ.value;
        if (!q) return false;
        const passageId = q?.passage?.id ?? q?.passage_id;
        if (!passageId) return true;
        return !questions.value.slice(0, currentIndex.value).some((item) => (item?.passage?.id ?? item?.passage_id) === passageId);
    });

    const passageGeneralInstructions = computed(() => {
        if (!currentQ.value) return '';
        if (currentQ.value.type === 'speaking_live') return '';
        if (!isFirstQuestionInPassage.value) return '';
        return (currentQ.value?.passage?.general_instructions || currentQ.value?.general_instructions || '').trim();
    });

    const displayInstructions = computed(() => {
        if (!currentQ.value) return '';
        return currentQ.value.instructions || 'Choose The Correct Answer';
    });

    const displayNumber = computed(() => globalOffset.value + currentIndex.value + 1);

    const formattedSkillName = computed(() => {
        if (!currentSkill.value?.name) return '';
        const name = currentSkill.value.name.toLowerCase();
        if (name.includes('speaking')) return 'SPEAKING';
        if (name.includes('writing')) return 'WRITING';
        if (name.includes('reading')) return 'READING';
        if (name.includes('listening')) return 'LISTENING';
        if (name.includes('grammar') || name.includes('structure')) return 'STRUCTURE';
        return currentSkill.value.name.toUpperCase();
    });

    const hasStimulusContent = computed(() => {
        if (!currentQ.value) return false;
        const q = currentQ.value;
        const p = q.passage;
        if (q.type === 'writing' || q.type === 'short_answer') {
            const passageHasContent =
                p &&
                ((p.content && p.content.trim().length > 150) ||
                    (p.media_url && p.media_url.toLowerCase().includes('.mp4')) ||
                    (p.media_path && p.media_path.toLowerCase().includes('.mp4')));
            return !!passageHasContent;
        }
        const passageHasContent =
            p &&
            ((p.content && p.content.trim().length > 0) ||
                p.image_url ||
                p.image_path ||
                (p.media_url && p.media_url.toLowerCase().includes('.mp4')) ||
                (p.media_path && p.media_path.toLowerCase().includes('.mp4')));
        const questionHasMedia =
            q.image_url ||
            q.image_path ||
            (q.media_url && q.media_url.toLowerCase().includes('.mp4')) ||
            (q.media_path && q.media_path.toLowerCase().includes('.mp4'));
        return !!(passageHasContent || questionHasMedia);
    });

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
        if (!hasStimulusContent.value) return 'w-full bg-slate-50 min-h-0';
        if (currentQ.value?.type === 'writing' || currentQ.value?.type === 'short_answer') return 'w-full lg:w-[55%] bg-white min-h-0';
        return 'w-full lg:w-2/5 bg-white min-h-0';
    });

    const stimulusPaneClass = computed(() => {
        if (currentQ.value?.type === 'writing' || currentQ.value?.type === 'short_answer') {
            return 'w-full lg:w-[45%] bg-white p-4 flex flex-col h-full transition-all duration-700 min-h-0';
        }
        return 'w-full lg:w-3/5 bg-white p-4 flex flex-col h-full transition-all duration-700 min-h-0';
    });

    const shouldShowContent = computed(() => {
        if (!currentQ.value) return false;
        const audioUrl =
            currentQ.value?.passage?.audio_url ||
            currentQ.value?.passage?.audio_path ||
            currentQ.value?.audio_url ||
            currentQ.value?.audio_path;
        if (!audioUrl) return true;
        return hasListened.value;
    });

    // --- Helper Methods ---
    const cleanHtml = (html: string | null | undefined): string => {
        if (!html) return '';
        let clean = html.replace(/&nbsp;/g, ' ');
        clean = clean.replace(/(\.{3,})\s*([\d\u0660-\u0669]+)/g, '<span class="blank-line-wrapper"><span class="blank-line"></span><span class="blank-badge">$2</span></span>');
        clean = clean.replace(/([\d\u0660-\u0669]+)\s*(\.{3,})/g, '<span class="blank-line-wrapper"><span class="blank-badge">$1</span><span class="blank-line"></span></span>');
        clean = clean.replace(/(\.{3,})/g, '<span class="blank-line"></span>');
        return clean;
    };

    const markCurrentAsListened = () => {
        hasListened.value = true;
        if (currentQ.value?.id) {
            listenedQuestions.value.add(currentQ.value.id);
        }
        if (currentQ.value?.passage?.id) {
            listenedPassages.value.add(currentQ.value.passage.id);
        }
    };

    const prevQuestion = () => {
        if (currentIndex.value > 0) {
            isNavigatingBack.value = true;
            currentIndex.value--;
        }
    };

    const startNextLevel = () => {
        showLevelTransition.value = false;
    };

    /**
     * Fetches next batch of questions for the ongoing attempt
     */
    const fetchNextBatch = async () => {
        isLoading.value = true;
        questions.value = [];

        try {
            const res = await api.get(`/attempts/${attemptId.value}/next-batch`);
            if (res.data.questions?.length > 0) {
                currentSkill.value = res.data.skill;

                if (proctoringSessionId.value && res.data.skill?.id) {
                    proctoringService.recordSkillEntry(proctoringSessionId.value, res.data.skill.id);
                }

                if (currentLevel.value && res.data.level && res.data.level.id !== currentLevel.value.id) {
                    nextLevelName.value = res.data.level.name;
                }
                currentLevel.value = res.data.level;

                if (res.data.skill_total_questions !== undefined) {
                    totalSkillQuestions.value = res.data.skill_total_questions;
                    globalOffset.value = res.data.skill_global_offset;
                } else {
                    totalSkillQuestions.value = res.data.total_questions;
                }

                questions.value = res.data.questions;
                currentIndex.value = 0;
                hasListened.value = false;

                timerConfig.value = {
                    type: res.data.timer_type,
                    globalLimit: res.data.time_limit,
                    skillDuration: res.data.skill_duration,
                    skillStartedAt: res.data.current_skill_started_at
                };

                if (onAnswersReady) {
                    onAnswersReady(questions.value);
                }

                return { success: true, cheatWarnings: res.data.skill_cheat_warnings || 0 };
            } else {
                errorMsg.value = res.data.error || 'Module content empty.';
                return { success: false };
            }
        } catch (err: any) {
            if (err.response?.status === 404) {
                errorMsg.value = err.response?.data?.error || 'No more questions available for this level.';
            } else {
                errorMsg.value = err.response?.data?.error || 'Assessment segment unavailable.';
            }
            return { success: false };
        } finally {
            isLoading.value = false;
            hasListened.value = false;
            listenedPassages.value.clear();
            if (onBatchLoaded) onBatchLoaded();
            window.scrollTo(0, 0);
        }
    };

    /**
     * Initializes attempt or starts a new exam
     */
    const fetchData = async (autoStartProctoringFn?: () => Promise<void>, onStartTimerFn?: () => void) => {
        isLoading.value = true;
        try {
            if (attemptId.value && attemptId.value !== 'start') {
                const attRes = await api.get(`/attempts/${attemptId.value}`);
                attempt.value = attRes.data;
                if (attempt.value.status === 'completed' || attempt.value.status === 'voided') {
                    await navigateSafely('/skill-selection');
                    return;
                }
                if (autoStartProctoringFn) await autoStartProctoringFn();
                await fetchNextBatch();
                if (!proctoringRequired.value || enteredExam.value) {
                    if (onStartTimerFn) onStartTimerFn();
                }
            } else {
                await beginExam(autoStartProctoringFn, onStartTimerFn);
            }
            isIntentionallyLeaving.value = false;
        } catch (err) {
            errorMsg.value = 'Session initialization failed.';
        } finally {
            isLoading.value = false;
        }
    };

    /**
     * Starts brand new exam session
     */
    const beginExam = async (autoStartProctoringFn?: () => Promise<void>, onStartTimerFn?: () => void) => {
        if (!attemptId.value || attemptId.value === 'start') {
            try {
                isLoading.value = true;
                const payload = { skill_id: skillId, level_id: levelId };
                const res = await api.post(`/exams/${examId}/start`, payload);
                attemptId.value = res.data.attempt.id;
                attempt.value = res.data.attempt;
                if (autoStartProctoringFn) await autoStartProctoringFn();
            } catch (err: any) {
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
            if (onStartTimerFn) onStartTimerFn();
        }
        isIntentionallyLeaving.value = false;
    };

    return {
        attempt,
        currentSkill,
        currentLevel,
        questions,
        currentIndex,
        globalOffset,
        totalSkillQuestions,
        isLoading,
        isStarting,
        isDemo,
        showLevelTransition,
        nextLevelName,
        showRetryNotification,
        errorMsg,
        timerConfig,
        isNavigatingBack,
        hasListened,
        listenedQuestions,
        listenedPassages,
        currentQ,
        isFirstQuestionInPassage,
        passageGeneralInstructions,
        displayInstructions,
        displayNumber,
        formattedSkillName,
        hasStimulusContent,
        hasPassageAudio,
        responsePaneClass,
        stimulusPaneClass,
        shouldShowContent,
        cleanHtml,
        markCurrentAsListened,
        prevQuestion,
        startNextLevel,
        fetchNextBatch,
        fetchData,
        beginExam
    };
}
