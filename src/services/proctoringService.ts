import api from './api';

/**
 * خدمة المراقبة - توحيد جميع استدعاءات API المتعلقة بالمراقبة
 */

export const proctoringService = {
    /**
     * بدء جلسة المراقبة
     */
    async initiate(examAttemptId: number | string, studentId: number | string, sessionId?: number | null) {
        return api.post('/proctoring/session/initiate', {
            exam_attempt_id: examAttemptId,
            student_id: studentId,
            session_id: sessionId ? parseInt(String(sessionId)) : null
        });
    },

    /**
     * بدء جلسة المراقبة (تفعيل الجلسة)
     */
    async start(sessionId: number | string) {
        return api.post(`/proctoring/session/${sessionId}/start`);
    },

    /**
     * إنهاء جلسة المراقبة
     */
    async end(sessionId: number | string, closeReason: string = 'exam_submitted') {
        return api.post(`/proctoring/session/${sessionId}/end`, {
            close_reason: closeReason
        });
    },

    /**
     * التحقق من حالة الجلسة
     */
    async getStatus(sessionId: number | string) {
        return api.get(`/proctoring/session/${sessionId}`);
    },

    /**
     * تسجيل دخول الطالب إلى مهارة معينة
     */
    async recordSkillEntry(sessionId: number | string, skillId: number | string) {
        return api.post(`/proctoring/session/${sessionId}/skill`, {
            skill_id: skillId
        }).catch(e => {
            console.warn('Failed to record skill entry:', e);
        });
    },

    /**
     * تسجيل خروج الطالب من مهارة معينة
     */
    async recordSkillExit(sessionId: number | string, skillId: number | string) {
        return api.post(`/proctoring/session/${sessionId}/skill/exit`, {
            skill_id: skillId
        }).catch(e => {
            console.warn('Failed to record skill exit:', e);
        });
    }
};

export default proctoringService;
