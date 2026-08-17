import { ref, type Ref } from 'vue';
import api from '@/services/api';
import proctoringService from '@/services/proctoringService';
import { PROCTORING_ENABLED } from '@/config/features';

export function useProctoring(
    attemptId: Ref<string | number | null>,
    currentLang: Ref<string>,
    isIntentionallyLeaving: Ref<boolean>,
    showAlert: (msg: string) => Promise<void>,
    navigateSafely: (path: string) => Promise<void>
) {
    const proctoringComplete = ref(sessionStorage.getItem('proctoring_verified') === 'true');
    const proctoringRequired = ref(false);
    const studentId = ref<number | string | null>(null);
    const proctoringSessionId = ref<number | string | null>(
        sessionStorage.getItem('proctoring_session_id') ? Number(sessionStorage.getItem('proctoring_session_id')) : null
    );
    const proctoringSessionToken = ref<string | null>(sessionStorage.getItem('proctoring_session_token') ?? null);

    const enteredExam = ref(false);
    const proctorCameraState = ref<'initializing' | 'ready' | 'error'>('initializing');
    const proctorCameraError = ref('');

    let sessionPollInterval: ReturnType<typeof setInterval> | null = null;

    /**
     * Handles camera readiness and initiates delayed entrance
     */
    const handleCameraReady = (onEnter?: () => void) => {
        proctorCameraState.value = 'ready';
        proctorCameraError.value = '';
        setTimeout(() => {
            handleEnterExam(onEnter);
        }, 2000);
    };

    /**
     * Handles camera initialization error
     */
    const handleCameraError = (errMsg: string) => {
        proctorCameraState.value = 'error';
        proctorCameraError.value = errMsg || 'Failed to start proctoring camera';
    };

    /**
     * Enters exam interface once proctoring / camera is confirmed
     */
    const handleEnterExam = (onEnter?: () => void) => {
        enteredExam.value = true;
        if (onEnter) onEnter();
    };

    /**
     * Handles session interruption / administrative actions
     */
    const handleSessionInterruption = async (messageAr: string, messageEn: string, shouldEndSession = false) => {
        stopSessionPolling();
        await showAlert(currentLang.value === 'ar' ? messageAr : messageEn);

        if (shouldEndSession) {
            await endProctoringSession('terminated_by_proctor');
        }

        isIntentionallyLeaving.value = true;
        await navigateSafely('/skill-selection');
    };

    /**
     * Polls status of current active proctoring session
     */
    const pollSessionStatus = async (getActiveSkillId?: () => number | string | null) => {
        const sessionId = proctoringSessionId.value;
        if (!sessionId || !proctoringRequired.value) return;

        try {
            const res = await proctoringService.getStatus(sessionId);
            const status = res.data?.session?.status;
            const completedSkills = (res.data?.session?.completed_skills || []).map(Number);
            const activeSkillId = getActiveSkillId ? Number(getActiveSkillId()) : null;

            if (status === 'ended' || status === 'cancelled') {
                await handleSessionInterruption(
                    'تم إنهاء جلسة المراقبة من قِبل المشرف.',
                    'Your proctoring session has been ended by the admin.',
                    true
                );
            } else if (status === 'paused') {
                await handleSessionInterruption(
                    'تم إيقاف امتحان هذه المهارة من قِبل المشرف. سيتم توجيهك لاختيار مهارة أخرى.',
                    'This skill exam has been stopped by the admin. You will be redirected to skill selection.',
                    false
                );
            } else if (activeSkillId && completedSkills.includes(activeSkillId)) {
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
     * Starts polling timer for proctoring status
     */
    const startSessionPolling = (getActiveSkillId?: () => number | string | null) => {
        if (sessionPollInterval) return;
        sessionPollInterval = setInterval(() => pollSessionStatus(getActiveSkillId), 8000);
    };

    /**
     * Stops polling timer
     */
    const stopSessionPolling = () => {
        if (sessionPollInterval) {
            clearInterval(sessionPollInterval);
            sessionPollInterval = null;
        }
    };

    /**
     * Saves proctoring session information upon completion
     */
    const handleProctoringComplete = async (sessionData: { session_id: number | string; session_token: string }) => {
        proctoringSessionId.value = sessionData.session_id;
        proctoringSessionToken.value = sessionData.session_token;
        sessionStorage.setItem('proctoring_session_token', sessionData.session_token);
        sessionStorage.setItem('proctoring_session_id', sessionData.session_id.toString());
        localStorage.setItem('active_proctoring_session_id', sessionData.session_id.toString());
        localStorage.setItem('active_proctoring_session_token', sessionData.session_token);
        proctoringComplete.value = true;
    };

    /**
     * Auto-starts or resumes proctoring session
     */
    const autoStartProctoring = async (isDemo = false, fallbackStudentId: number | string | null = null) => {
        if (isDemo && !proctoringRequired.value) {
            proctoringComplete.value = true;
            return;
        }

        if (proctoringRequired.value && !proctoringSessionId.value) {
            const isVerified = sessionStorage.getItem('proctoring_verified') === 'true';
            if (isVerified) {
                try {
                    const savedSessionIdStr = sessionStorage.getItem('proctoring_session_id');
                    const savedSessionId = savedSessionIdStr ? parseInt(savedSessionIdStr) : null;

                    let sId = studentId.value || fallbackStudentId;
                    if (!sId) {
                        console.warn('Student ID is missing in autoStartProctoring, fetching user details...');
                        const userRes = await api.get('/user');
                        studentId.value = userRes.data?.id;
                        sId = userRes.data?.id;
                    }

                    const finalStudentId = sId || fallbackStudentId;
                    if (!finalStudentId || !attemptId.value) {
                        return;
                    }

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
                        proctoringSessionToken.value = response.data.session_token ?? null;
                        sessionStorage.setItem('proctoring_session_id', response.data.session_id.toString());
                        sessionStorage.setItem('proctoring_session_token', response.data.session_token ?? '');
                        localStorage.setItem('active_proctoring_session_id', response.data.session_id.toString());
                        localStorage.setItem('active_proctoring_session_token', response.data.session_token ?? '');
                        proctoringComplete.value = true;
                    }
                } catch (err) {
                    console.error('Failed to auto-start proctoring session:', err);
                }
            }
        }
    };

    /**
     * Ends proctoring session and cleans local storage
     */
    const endProctoringSession = async (reason = 'exam_submitted') => {
        const sessionId = proctoringSessionId.value;
        if (!sessionId) return;

        try {
            await proctoringService.end(sessionId, reason);
        } catch (e) {
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

    /**
     * Sends beacon on beforeunload/pagehide to notify backend of abrupt disconnect
     */
    const handleBeforeUnloadBeacon = () => {
        if (isIntentionallyLeaving.value) return;

        isIntentionallyLeaving.value = true;
        const sessionId = proctoringSessionId.value;
        const token = proctoringSessionToken.value;
        if (!sessionId || !token) return;

        const payload = JSON.stringify({
            close_reason: 'connection_lost',
            session_token: token,
            ended_at: new Date().toISOString(),
        });

        const blob = new Blob([payload], { type: 'application/json' });

        try {
            navigator.sendBeacon(`/api/proctoring/session/${sessionId}/end-beacon`, blob);
        } catch (e) {
            console.warn('Failed to send proctoring beacon via sendBeacon:', e);
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
            }).catch(() => {});
        } catch (e) {
            console.warn('Failed to send proctoring beacon via fetch:', e);
        }
    };

    /**
     * Evaluates partner proctoring rules from /user response
     */
    const evaluateProctoringRequirement = async (user: any): Promise<{ isDemo: boolean; proctoringRequired: boolean }> => {
        studentId.value = user?.id;
        let isUserDemo = (user && ['demo', 'staff'].includes(user.role?.toLowerCase())) || !!user?.student?.is_demo;

        if (!PROCTORING_ENABLED) {
            proctoringRequired.value = false;
            proctoringComplete.value = true;
            return { isDemo: isUserDemo, proctoringRequired: false };
        }

        try {
            const userRes = await api.get('/user');
            studentId.value = userRes.data?.id;
            const fetchedStudent = userRes.data?.student;
            const isStudentDemo = !!fetchedStudent?.is_demo;
            isUserDemo = isUserDemo || isStudentDemo;

            if (isStudentDemo) {
                proctoringRequired.value = !!fetchedStudent?.is_demo_proctored;
            } else {
                const partner = fetchedStudent?.partner;
                if (partner) {
                    if (partner.requires_live_proctoring !== undefined) {
                        proctoringRequired.value = !!partner.requires_live_proctoring;
                    } else if (partner.proctoring_mode) {
                        proctoringRequired.value = partner.proctoring_mode === 'full';
                    } else {
                        proctoringRequired.value = false;
                    }
                } else {
                    proctoringRequired.value = false;
                }
            }

            if (!proctoringRequired.value) {
                proctoringComplete.value = true;
            }
        } catch {
            proctoringRequired.value = false;
            proctoringComplete.value = true;
        }

        return { isDemo: isUserDemo, proctoringRequired: proctoringRequired.value };
    };

    return {
        proctoringRequired,
        proctoringComplete,
        studentId,
        proctoringSessionId,
        proctoringSessionToken,
        enteredExam,
        proctorCameraState,
        proctorCameraError,
        handleCameraReady,
        handleCameraError,
        handleEnterExam,
        handleSessionInterruption,
        pollSessionStatus,
        startSessionPolling,
        stopSessionPolling,
        handleProctoringComplete,
        autoStartProctoring,
        endProctoringSession,
        handleBeforeUnloadBeacon,
        evaluateProctoringRequirement
    };
}
