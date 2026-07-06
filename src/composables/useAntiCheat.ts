import { ref, onUnmounted } from 'vue';
// @ts-ignore
import api from '@/services/api';

export function useAntiCheat(attemptId: any, options: { onFinalWarning: () => void }, proctoringSessionId?: any) {
    const cheatWarnings = ref(0);
    const showCheatModal = ref(false);
    const showFinalCheatModal = ref(false);
    const isIntentionallyLeaving = ref(false);

    const handleVisibilityChange = async (isStarting: boolean, showTimeoutModal: boolean) => {
        if (document.visibilityState === 'hidden' && !isStarting && !showTimeoutModal && !isIntentionallyLeaving.value) {
            cheatWarnings.value++;

            try {
                await api.post(`/attempts/${attemptId.value}/warnings`);
            } catch (err) {
                console.error('Failed to log cheat warning', err);
            }

            // Report tab_switched violation if proctoring session is active
            if (proctoringSessionId && proctoringSessionId.value) {
                try {
                    await api.post(`/proctoring/session/${proctoringSessionId.value}/violation`, {
                        violation_type: 'tab_switched',
                        severity: 'medium',
                        description: 'قام الطالب بالانتقال إلى تبويب آخر أو تصغير المتصفح' // in english 
                        
                    });
                } catch (err) {
                    console.error('Failed to report tab_switched violation:', err);
                }
            }

            // We no longer terminate the skill automatically.
            // Just show the cheat warning modal so the student knows it was recorded.
            showCheatModal.value = true;
        }
    };

    const preventCopyPaste = async (e: Event) => {
        e.preventDefault();

        // Report copy_paste violation if proctoring session is active
        if (proctoringSessionId && proctoringSessionId.value) {
            let description = '';
            if (e.type === 'copy') {
                description = 'محاولة الطالب القيام بعملية نسخ';
            } else if (e.type === 'cut') {
                description = 'محاولة الطالب القيام بعملية قص';
            } else if (e.type === 'paste') {
                description = 'محاولة الطالب القيام بعملية لصق';
            } else if (e.type === 'contextmenu') {
                description = 'محاولة الطالب فتح القائمة الجانبية (النقر بزر الماوس الأيمن)';
            } else {
                description = `محاولة الطالب إجراء عملية غير مسموح بها (${e.type})`;
            }

            try {
                await api.post(`/proctoring/session/${proctoringSessionId.value}/violation`, {
                    violation_type: 'copy_paste',
                    severity: 'medium',
                    description: description
                });
            } catch (err) {
                console.error('Failed to report copy_paste violation:', err);
            }
        }
        return false;
    };

    const handleWindowBlur = async () => {
        if (!isIntentionallyLeaving.value && proctoringSessionId && proctoringSessionId.value) {
            try {
                await api.post(`/proctoring/session/${proctoringSessionId.value}/violation`, {
                    violation_type: 'browser_opened',
                    severity: 'medium',
                    description: 'فقد المتصفح التركيز (ربما قام الطالب بفتح تطبيق آخر أو نافذة أخرى)'
                });
            } catch (err) {
                console.error('Failed to report browser_opened violation:', err);
            }
        }
    };

    const setupAntiCheat = () => {
        document.addEventListener('copy', preventCopyPaste);
        document.addEventListener('cut', preventCopyPaste);
        document.addEventListener('paste', preventCopyPaste);
        document.addEventListener('contextmenu', preventCopyPaste);
        window.addEventListener('blur', handleWindowBlur);
    };

    const destroyAntiCheat = () => {
        document.removeEventListener('copy', preventCopyPaste);
        document.removeEventListener('cut', preventCopyPaste);
        document.removeEventListener('paste', preventCopyPaste);
        document.removeEventListener('contextmenu', preventCopyPaste);
        window.removeEventListener('blur', handleWindowBlur);
    };

    onUnmounted(() => {
        destroyAntiCheat();
    });

    return {
        cheatWarnings,
        showCheatModal,
        showFinalCheatModal,
        isIntentionallyLeaving,
        handleVisibilityChange,
        setupAntiCheat,
        destroyAntiCheat
    };
}
