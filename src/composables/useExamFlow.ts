import { ref, computed } from 'vue';
import api from '@/services/api';
import proctoringService from '@/services/proctoringService';

/**
 * useExamFlow - إدارة تدفق الامتحان والأسئلة والمستويات
 */
export const useExamFlow = (attemptId, examId, isStarting, isLoading, proctoringSessionId) => {
    // States
    const attempt = ref(null);
    const currentSkill = ref(null);
    const currentLevel = ref(null);
    const questions = ref([]);
    const totalSkillQuestions = ref(0);
    const globalOffset = ref(0);
    const nextLevelName = ref('');
    const showLevelTransition = ref(false);
    const showRetryNotification = ref(false);
    const timerConfig = ref(null);
    const errorMsg = ref('');
    const isDemo = ref(false);

    /**
     * جلب بيانات الامتحان الأساسية
     */
    const fetchData = async () => {
        isLoading.value = true;
        try {
            if (attemptId.value && attemptId.value !== 'start') {
                const attRes = await api.get(`/attempts/${attemptId.value}`);
                attempt.value = attRes.data;
                if (attempt.value.status === 'completed' || attempt.value.status === 'voided') {
                    return { shouldNavigate: true };
                }
                await fetchNextBatch();
            } else {
                return { shouldNavigate: false }; // Will be handled by beginExam
            }
        } catch (err) {
            errorMsg.value = "Session initialization failed.";
            return { shouldNavigate: false };
        } finally {
            isLoading.value = false;
        }
    };

    /**
     * بدء امتحان جديد
     */
    const beginExam = async (skillId, levelId) => {
        if (!attemptId.value || attemptId.value === 'start') {
            try {
                isLoading.value = true;
                const payload = { skill_id: skillId, level_id: levelId };
                const res = await api.post(`/exams/${examId}/start`, payload);
                attemptId.value = res.data.attempt.id;
                attempt.value = res.data.attempt;
                return { success: true, attemptId: attemptId.value };
            } catch (err) {
                return { success: false, error: err.response?.data?.error || 'Failed to start session' };
            } finally {
                isLoading.value = false;
            }
        }
        return { success: true };
    };

    /**
     * جلب مجموعة الأسئلة التالية
     */
    const fetchNextBatch = async () => {
        isLoading.value = true;
        try {
            const res = await api.get(`/attempts/${attemptId.value}/next-batch`);
            if (res.data.questions?.length > 0) {
                currentSkill.value = res.data.skill;

                // Record skill entry in proctoring
                if (proctoringSessionId.value && res.data.skill?.id) {
                    proctoringService.recordSkillEntry(proctoringSessionId.value, res.data.skill.id);
                }

                // Handle level transition
                if (currentLevel.value && res.data.level && res.data.level.id !== currentLevel.value.id) {
                    nextLevelName.value = res.data.level.name;
                }
                currentLevel.value = res.data.level;

                // Set total questions count
                if (res.data.skill_total_questions !== undefined) {
                    totalSkillQuestions.value = res.data.skill_total_questions;
                    globalOffset.value = res.data.skill_global_offset;
                } else {
                    totalSkillQuestions.value = res.data.total_questions;
                }

                questions.value = res.data.questions;

                // Initialize timer config
                timerConfig.value = {
                    type: res.data.timer_type,
                    globalLimit: res.data.time_limit,
                    skillDuration: res.data.skill_duration,
                    skillStartedAt: res.data.current_skill_started_at
                };

                isDemo.value = res.data.is_demo || false;

                return { success: true };
            } else {
                errorMsg.value = res.data.error || "Module content empty.";
                return { success: false };
            }
        } catch (err) {
            if (err.response?.status === 404) {
                errorMsg.value = err.response?.data?.error || "No more questions available for this level.";
            } else {
                errorMsg.value = err.response?.data?.error || "Assessment segment unavailable.";
            }
            return { success: false };
        } finally {
            isLoading.value = false;
        }
    };

    /**
     * الانتقال إلى المستوى التالي
     */
    const startNextLevel = () => {
        showLevelTransition.value = false;
    };

    // Computed properties
    const currentQuestion = computed(() => questions.value.length > 0 ? questions.value : null);

    return {
        // States
        attempt,
        currentSkill,
        currentLevel,
        questions,
        totalSkillQuestions,
        globalOffset,
        nextLevelName,
        showLevelTransition,
        showRetryNotification,
        timerConfig,
        errorMsg,
        isDemo,
        
        // Methods
        fetchData,
        beginExam,
        fetchNextBatch,
        startNextLevel,
        
        // Computed
        currentQuestion
    };
};
