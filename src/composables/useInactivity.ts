import { ref } from 'vue';

/**
 * useInactivity - إدارة كشف عدم النشاط والمهلة الزمنية
 */
export const useInactivity = (onTimeout) => {
    // States
    const inactivityTimer = ref(null);
    const lastActivityAt = ref(null);
    const showInactivityModal = ref(false);

    // Constants
    const INACTIVITY_TIMEOUT = 1000 * 60 * 1000; // 60 minutes

    /**
     * إعادة تعيين مؤقت عدم النشاط
     */
    const resetInactivityTimer = () => {
        if (inactivityTimer.value) {
            clearTimeout(inactivityTimer.value);
        }

        lastActivityAt.value = new Date();

        inactivityTimer.value = setTimeout(() => {
            showInactivityModal.value = true;
            if (onTimeout) {
                onTimeout();
            }
        }, INACTIVITY_TIMEOUT);
    };

    /**
     * تحديث النشاط (يتم استدعاؤها عند أي تفاعل المستخدم)
     */
    const updateActivity = () => {
        resetInactivityTimer();
    };

    /**
     * إيقاف مؤقت عدم النشاط (عند الخروج)
     */
    const stopInactivityTimer = () => {
        if (inactivityTimer.value) {
            clearTimeout(inactivityTimer.value);
            inactivityTimer.value = null;
        }
    };

    return {
        // States
        inactivityTimer,
        lastActivityAt,
        showInactivityModal,

        // Methods
        resetInactivityTimer,
        updateActivity,
        stopInactivityTimer,

        // Constants
        INACTIVITY_TIMEOUT
    };
};
