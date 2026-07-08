import { ref } from 'vue';
import type { Ref } from 'vue';
import proctoringService from '@/services/proctoringService';

/**
 * useProctoring - إدارة جلسات المراقبة والتحقق من الحالة
 */
export const useProctoring = (
    showAlert: (msg: string) => Promise<void>,
    navigateSafely: (path: string) => Promise<void>,
    currentLang: Ref<string>,
    skillId: Ref<number | string | null>,
    attemptId?: Ref<number | string | null>
) => {
    // States
    const proctoringRequired = ref(false);
    const proctoringComplete = ref(false);
    const proctoringSessionId = ref<number | string | null>(null);
    const proctoringSessionToken = ref<string | null>(null);
    let sessionPollInterval: ReturnType<typeof setInterval> | null = null;

    /**
     * التعامل مع انقطاع الجلسة والملاحة
     */
    const handleSessionInterruption = async (messageAr: string, messageEn: string, shouldEndSession = false) => {
        stopSessionPolling();
        await showAlert(currentLang.value === 'ar' ? messageAr : messageEn);

        if (shouldEndSession) {
            await endProctoringSession('terminated_by_proctor');
        }

        await navigateSafely('/skill-selection');
    };

    /**
     * التحقق من حالة جلسة المراقبة
     */
    const pollSessionStatus = async () => {
        const sessionId = proctoringSessionId.value;
        if (!sessionId || !proctoringRequired.value) return;

        try {
            const res = await proctoringService.getStatus(sessionId);
            const status = res.data?.session?.status;
            const completedSkills = (res.data?.session?.completed_skills || []).map(Number);
            const currentSkillId = skillId.value ? Number(skillId.value) : null;

            if (status === 'ended' || status === 'cancelled') {
                // Admin ended the session
                await handleSessionInterruption(
                    'تم إنهاء جلسة المراقبة من قِبل المشرف.',
                    'Your proctoring session has been ended by the admin.',
                    true
                );
            } else if (status === 'paused') {
                // Admin paused the current skill exam
                await handleSessionInterruption(
                    'تم إيقاف امتحان هذه المهارة من قِبل المشرف. سيتم توجيهك لاختيار مهارة أخرى.',
                    'This skill exam has been stopped by the admin. You will be redirected to skill selection.',
                    false
                );
            } else if (currentSkillId && completedSkills.includes(currentSkillId)) {
                // Admin ended only this skill (not the entire session)
                await handleSessionInterruption(
                    'تم إنهاء امتحان هذه المهارة من قِبل المشرف. سيتم توجيهك لاختيار مهارة أخرى.',
                    'This skill exam has been stopped by the admin. You will be redirected to skill selection.',
                    false
                );
            }
        } catch (e) {
            console.warn('Session poll failed:', e);
        }
    };

    /**
     * بدء استطلاع حالة الجلسة
     */
    const startSessionPolling = () => {
        if (sessionPollInterval) return;
        sessionPollInterval = setInterval(pollSessionStatus, 8000); // Every 8 seconds
    };

    /**
     * إيقاف استطلاع حالة الجلسة
     */
    const stopSessionPolling = () => {
        if (sessionPollInterval) {
            clearInterval(sessionPollInterval);
            sessionPollInterval = null;
        }
    };

    /**
     * تهيئة جلسة المراقبة تلقائيًا
     */
    const autoStartProctoring = async () => {
        if (!proctoringRequired.value) return;

        try {
            const studentIdFromStorage = localStorage.getItem('student_id');
            const studentId = Number(studentIdFromStorage) || null;

            if (!studentId) {
                console.warn('Cannot start proctoring without student ID');
                return;
            }

            const savedSessionIdStr = sessionStorage.getItem('proctoring_session_id');
            const savedSessionId = savedSessionIdStr ? parseInt(savedSessionIdStr) : null;
            const currentAttemptId = attemptId?.value ?? null;

            const response = await proctoringService.initiate(
                currentAttemptId as number | string,
                studentId,
                savedSessionId
            );

            if (response.data.success) {
                const status = response.data.status;
                if (status === 'paused' || status === 'ended' || status === 'cancelled') {
                    console.warn(`Proctoring session is ${status}, redirecting student.`);
                    return { shouldNavigate: true };
                }

                await proctoringService.start(response.data.session_id);
                proctoringSessionId.value = response.data.session_id;
                proctoringSessionToken.value = response.data.session_token;

                // Store in sessionStorage
                sessionStorage.setItem('proctoring_session_id', response.data.session_id.toString());
                sessionStorage.setItem('proctoring_session_token', response.data.session_token ?? '');

                // Store in localStorage
                localStorage.setItem('active_proctoring_session_id', response.data.session_id.toString());
                localStorage.setItem('active_proctoring_session_token', response.data.session_token ?? '');

                proctoringComplete.value = true;
                startSessionPolling();

                return { shouldNavigate: false };
            }
        } catch (err) {
            console.error('Failed to auto-start proctoring session:', err);
        }

        return { shouldNavigate: false };
    };

    /**
     * إنهاء جلسة المراقبة
     */
    const endProctoringSession = async (reason = 'exam_submitted') => {
        const sessionId = proctoringSessionId.value;
        if (!sessionId) return;

        try {
            await proctoringService.end(sessionId, reason);
        } catch (e) {
            console.error('Failed to end proctoring session:', e);
        }

        // Clean up local state
        proctoringSessionId.value = null;
        proctoringSessionToken.value = null;
        sessionStorage.removeItem('proctoring_session_id');
        sessionStorage.removeItem('proctoring_session_token');
        sessionStorage.removeItem('proctoring_verified');
        localStorage.removeItem('active_proctoring_session_id');
        localStorage.removeItem('active_proctoring_session_token');
    };

    /**
     * معالج إكمال المراقبة
     */
    const handleProctoringComplete = () => {
        proctoringComplete.value = true;
        startSessionPolling();
    };

    return {
        // States
        proctoringRequired,
        proctoringComplete,
        proctoringSessionId,
        proctoringSessionToken,

        // Methods
        pollSessionStatus,
        startSessionPolling,
        stopSessionPolling,
        autoStartProctoring,
        endProctoringSession,
        handleProctoringComplete,
        handleSessionInterruption
    };
};
