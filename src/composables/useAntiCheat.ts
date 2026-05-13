import { ref, onUnmounted } from 'vue';
// @ts-ignore
import api from '@/services/api';

export function useAntiCheat(attemptId: any, options: { onFinalWarning: () => void }) {
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

            // We no longer terminate the skill automatically.
            // Just show the cheat warning modal so the student knows it was recorded.
            showCheatModal.value = true;
        }
    };

    const preventCopyPaste = (e: Event) => {
        e.preventDefault();
        return false;
    };

    const setupAntiCheat = () => {
        document.addEventListener('copy', preventCopyPaste);
        document.addEventListener('paste', preventCopyPaste);
        document.addEventListener('contextmenu', preventCopyPaste);
    };

    const destroyAntiCheat = () => {
        document.removeEventListener('copy', preventCopyPaste);
        document.removeEventListener('paste', preventCopyPaste);
        document.removeEventListener('contextmenu', preventCopyPaste);
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
