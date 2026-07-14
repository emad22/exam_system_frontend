import { ref, onUnmounted } from 'vue';
// @ts-ignore
import api from '@/services/api';


export function useAntiCheat(attemptId: any, options: { onFinalWarning: () => void }, proctoringSessionId?: any) {
    const cheatWarnings = ref(0);
    const showCheatModal = ref(false);
    const showFinalCheatModal = ref(false);
    const isIntentionallyLeaving = ref(false);
    const cheatMessage = ref({ title: 'Security Alert', body: '' });

    const handleVisibilityChange = async (isStarting: boolean, showTimeoutModal: boolean) => {
        if (document.visibilityState === 'hidden' && !isStarting && !showTimeoutModal && !isIntentionallyLeaving.value) {
            // cheatWarnings.value++;

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
                        description: 'the student switched to another tab or minimized the browser'

                    });
                } catch (err) {
                    console.error('Failed to report tab_switched violation:', err);
                }
            }

            // We no longer terminate the skill automatically.
            // Just show the cheat warning modal so the student knows it was recorded.
            cheatMessage.value = {
                title: 'Warning, you left the exam page',
                body: 'Your attempt to leave the exam page or minimize the browser has been detected. This violation has been recorded and will be reported to the supervisors.'
            };
            showCheatModal.value = true;
        }
    };

    const preventCopyPaste = async (e: Event) => {
        e.preventDefault();

        // cheatWarnings.value++;

        let actionLabel = 'Unauthorized operation';
        if (e.type === 'copy') actionLabel = 'Copying text';
        else if (e.type === 'cut') actionLabel = 'Cutting text';
        else if (e.type === 'paste') actionLabel = 'Pasting text';
        else if (e.type === 'contextmenu') actionLabel = 'Opening context menu';

        // cheatMessage.value = {
        //     title: 'Warning, unauthorized operation',
        //     body: `Attempting to ${actionLabel} is not allowed during the exam. This violation has been recorded.`
        // };
        // showCheatModal.value = true;

        // Report copy_paste violation if proctoring session is active
        if (proctoringSessionId && proctoringSessionId.value) {
            let description = '';
            if (e.type === 'copy') {
                description = 'the student attempted to perform a copy operation';
            } else if (e.type === 'cut') {
                description = 'the student attempted to perform a cut operation';
            } else if (e.type === 'paste') {
                description = 'the student attempted to perform a paste operation';
            } else if (e.type === 'contextmenu') {
                description = 'the student attempted to open the context menu';
            } else {
                description = `the student attempted to perform an unauthorized operation (${e.type})`;
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
        if (!isIntentionallyLeaving.value) {
            // cheatWarnings.value++;
            // cheatMessage.value = {
            //     title: 'Warning, you left the exam page',
            //     body: 'Your attempt to leave the exam page or minimize the browser has been detected. This violation has been recorded and will be reported to the supervisors.'
            // };
            // showCheatModal.value = true;

            if (proctoringSessionId && proctoringSessionId.value) {
                try {
                    await api.post(`/proctoring/session/${proctoringSessionId.value}/violation`, {
                        violation_type: 'browser_opened',
                        severity: 'medium',
                        description: 'the student switched to another application or minimized the browser'
                    });
                } catch (err) {
                    console.error('Failed to report browser_opened violation:', err);
                }
            }
        }
    };

    const handleKeyDown = async (e: KeyboardEvent) => {
        const isDevTools =
            e.key === 'F12' ||
            (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) ||
            (e.ctrlKey && e.key.toUpperCase() === 'U');

        if (!isDevTools) return;

        e.preventDefault();
        // cheatWarnings.value++;
        // cheatMessage.value = {
        //     title: 'Warning, opening developer tools',
        //     body: `Attempting to open developer tools (${e.key}) is not allowed during the exam. This violation has been recorded.`
        // };
        // showCheatModal.value = true;

        if (proctoringSessionId && proctoringSessionId.value) {
            try {
                await api.post(`/proctoring/session/${proctoringSessionId.value}/violation`, {
                    violation_type: 'devtools_opened',
                    severity: 'high',
                    description: `the student attempted to open developer tools (${e.key})`
                });
            } catch (err) {
                console.error('Failed to report devtools violation:', err);
            }
        }
    };

    const setupAntiCheat = () => {
        document.addEventListener('copy', preventCopyPaste);
        document.addEventListener('cut', preventCopyPaste);
        document.addEventListener('paste', preventCopyPaste);
        document.addEventListener('contextmenu', preventCopyPaste);
        window.addEventListener('blur', handleWindowBlur);
        // window.addEventListener('keydown', handleKeyDown);
    };

    const destroyAntiCheat = () => {
        document.removeEventListener('copy', preventCopyPaste);
        document.removeEventListener('cut', preventCopyPaste);
        document.removeEventListener('paste', preventCopyPaste);
        document.removeEventListener('contextmenu', preventCopyPaste);
        window.removeEventListener('blur', handleWindowBlur);
        // window.removeEventListener('keydown', handleKeyDown);
    };

    onUnmounted(() => {
        destroyAntiCheat();
    });

    return {
        cheatWarnings,
        cheatMessage,
        showCheatModal,
        showFinalCheatModal,
        isIntentionallyLeaving,
        handleVisibilityChange,
        setupAntiCheat,
        destroyAntiCheat
    };
}
