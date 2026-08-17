import { ref, type Ref } from 'vue';

const INACTIVITY_TIMEOUT = 1000 * 60 * 1000; // 1000 minutes or configured threshold

export function debounce<T extends (...args: any[]) => void>(func: T, wait: number): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    return function executedFunction(...args: Parameters<T>) {
        const later = () => {
            if (timeout) clearTimeout(timeout);
            func(...args);
        };
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

export function useInactivity(
    isDemo: Ref<boolean>,
    isLoading: Ref<boolean>,
    hasQuestions: Ref<boolean>,
    onTimeout: () => Promise<void> | void
) {
    const showInactivityModal = ref(false);
    const lastActivityAt = ref(Date.now());
    const inactivityTimer = ref<ReturnType<typeof setTimeout> | null>(null);

    const resetInactivityTimer = () => {
        if (inactivityTimer.value) {
            clearTimeout(inactivityTimer.value);
            inactivityTimer.value = null;
        }
        lastActivityAt.value = Date.now();

        if (!isDemo.value && !isLoading.value && hasQuestions.value) {
            inactivityTimer.value = setTimeout(() => {
                showInactivityModal.value = true;
                setTimeout(() => {
                    onTimeout();
                }, 5000);
            }, INACTIVITY_TIMEOUT);
        }
    };

    const debouncedUpdateActivity = debounce(resetInactivityTimer, 500);

    const setupInactivityListeners = () => {
        document.addEventListener('mousemove', debouncedUpdateActivity);
        document.addEventListener('keydown', debouncedUpdateActivity);
        document.addEventListener('click', debouncedUpdateActivity);
        resetInactivityTimer();
    };

    const cleanupInactivityListeners = () => {
        if (inactivityTimer.value) {
            clearTimeout(inactivityTimer.value);
            inactivityTimer.value = null;
        }
        document.removeEventListener('mousemove', debouncedUpdateActivity);
        document.removeEventListener('keydown', debouncedUpdateActivity);
        document.removeEventListener('click', debouncedUpdateActivity);
    };

    return {
        showInactivityModal,
        lastActivityAt,
        resetInactivityTimer,
        setupInactivityListeners,
        cleanupInactivityListeners
    };
}
