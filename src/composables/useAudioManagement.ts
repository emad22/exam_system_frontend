import { ref, nextTick } from 'vue';
import { useMediaUrl } from './useMediaUrl';

/**
 * useAudioManagement - إدارة تشغيل الصوتيات والمسارات
 */
export const useAudioManagement = (currentQuestion, isLoading, showLevelTransition, showRetryNotification, isStarting, proctoringComplete) => {
    // States
    const audioRef = ref(null);
    const isAudioPlaying = ref(false);
    const autoplayFailed = ref(false);
    const hasListened = ref(false);
    const lastAudioUrl = ref('');
    const audioProgress = ref(0);
    const audioCurrentTime = ref('0:00');
    const audioDuration = ref('0:00');

    const { resolveUrl } = useMediaUrl();

    /**
     * تشغيل الصوت الحالي
     */
    const playCurrentAudio = () => {
        // Don't play if in loading/transition state
        if (isLoading.value || showLevelTransition.value || showRetryNotification.value || isStarting.value || !proctoringComplete.value) {
            if (audioRef.value) {
                audioRef.value.pause();
                audioRef.value.currentTime = 0;
                lastAudioUrl.value = '';
            }
            return;
        }

        // Reset flag if navigating back
        if (isNavigatingBack.value) {
            isNavigatingBack.value = false;
            if (audioRef.value) {
                audioRef.value.pause();
                audioRef.value.currentTime = 0;
                lastAudioUrl.value = '';
            }
            isAudioPlaying.value = false;
            return;
        }

        const audioUrl = currentQuestion.value?.passage?.audio_url || 
                        currentQuestion.value?.passage?.audio_path || 
                        currentQuestion.value?.audio_url || 
                        currentQuestion.value?.audio_path;

        if (audioUrl) {
            const resolved = resolveUrl(audioUrl);
            if (resolved === lastAudioUrl.value) {
                return; // Already playing this audio
            }

            lastAudioUrl.value = resolved;

            nextTick(() => {
                if (audioRef.value) {
                    playAudio();
                } else {
                    // Fallback: try again after a delay
                    setTimeout(() => {
                        if (audioRef.value) {
                            playAudio();
                        } else {
                            autoplayFailed.value = true;
                        }
                    }, 150);
                }
            });
        } else {
            lastAudioUrl.value = '';
            autoplayFailed.value = false;
            isAudioPlaying.value = false;
            if (audioRef.value) {
                audioRef.value.pause();
                audioRef.value.currentTime = 0;
            }
        }
    };

    /**
     * تشغيل الصوت الفعلي
     */
    const playAudio = () => {
        if (!audioRef.value) return;

        audioRef.value.pause();
        audioRef.value.load();
        audioRef.value.play()
            .then(() => {
                autoplayFailed.value = false;
                isAudioPlaying.value = true;
            })
            .catch(err => {
                if (err.name === 'AbortError') {
                    return;
                }
                console.warn('Autoplay blocked by browser. User interaction required.', err);
                autoplayFailed.value = true;
                isAudioPlaying.value = false;
            });
    };

    /**
     * إيقاف الصوت
     */
    const stopAudio = () => {
        if (audioRef.value) {
            audioRef.value.pause();
            audioRef.value.currentTime = 0;
            isAudioPlaying.value = false;
        }
    };

    /**
     * تحديث تقدم الصوت
     */
    const updateAudioProgress = () => {
        if (!audioRef.value) return;

        audioProgress.value = (audioRef.value.currentTime / audioRef.value.duration) * 100;
        audioCurrentTime.value = formatTime(audioRef.value.currentTime);
        audioDuration.value = formatTime(audioRef.value.duration);
    };

    /**
     * تنسيق الوقت (MM:SS)
     */
    const formatTime = (seconds) => {
        if (!seconds || isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    /**
     * إعادة تعيين حالة الصوت
     */
    const resetAudioState = () => {
        stopAudio();
        audioProgress.value = 0;
        audioCurrentTime.value = '0:00';
        audioDuration.value = '0:00';
        hasListened.value = false;
        lastAudioUrl.value = '';
    };

    return {
        // States
        audioRef,
        isAudioPlaying,
        autoplayFailed,
        hasListened,
        lastAudioUrl,
        audioProgress,
        audioCurrentTime,
        audioDuration,

        // Methods
        playCurrentAudio,
        stopAudio,
        updateAudioProgress,
        resetAudioState,
        formatTime
    };
};
