import { ref } from 'vue';

export function useAudioEngine() {
    const audioRef = ref<HTMLAudioElement | null>(null);
    const isAudioPlaying = ref(false);
    const audioProgress = ref(0);
    const audioCurrentTime = ref('0:00');
    const audioDuration = ref('0:00');
    const autoplayFailed = ref(false);
    const audioError = ref(false);
    const isAudioLoaded = ref(false);

    const formatAudioTime = (seconds: number) => {
        if (!seconds || isNaN(seconds)) return '0:00';
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const syncAudioState = () => {
        if (audioRef.value) isAudioPlaying.value = !audioRef.value.paused;
    };

    const onLoadedMetadata = () => {
        if (!audioRef.value) return;
        const total = audioRef.value.duration;
        if (total && !isNaN(total)) {
            audioDuration.value = formatAudioTime(total);
            isAudioLoaded.value = true;
            audioError.value = false;
        }
    };

    const updateAudioProgress = () => {
        if (!audioRef.value) return;
        const current = audioRef.value.currentTime;
        const total = audioRef.value.duration;
        if (total && !isNaN(total) && total > 0) {
            audioProgress.value = (current / total) * 100;
            audioCurrentTime.value = formatAudioTime(current);
            audioDuration.value = formatAudioTime(total);
            isAudioLoaded.value = true;
        }
    };

    const toggleAudioManual = async () => {
        if (!audioRef.value) return;
        try {
            audioError.value = false;
            if (audioRef.value.paused) {
                await audioRef.value.play();
                isAudioPlaying.value = true;
                autoplayFailed.value = false;
            } else {
                audioRef.value.pause();
                isAudioPlaying.value = false;
            }
        } catch (err: any) {
            console.error('Audio playback toggle failed:', err);
            autoplayFailed.value = true;
            isAudioPlaying.value = false;
        }
        syncAudioState();
    };

    const onAudioError = (e: any) => {
        const src = audioRef.value?.currentSrc || audioRef.value?.src;
        if (!src || src === window.location.href || src.endsWith('/')) {
            return;
        }
        console.error('Audio element error:', e, 'Source:', src, 'MediaError:', audioRef.value?.error);
        isAudioPlaying.value = false;
        audioError.value = true;
    };

    const playStimulusAudio = async (url: string) => {
        if (!audioRef.value || !url) return;
        audioError.value = false;
        if (audioRef.value.src !== url) {
            audioRef.value.src = url;
            audioRef.value.load();
        }
        try {
            await audioRef.value.play();
            autoplayFailed.value = false;
            isAudioPlaying.value = true;
        } catch (err: any) {
            console.warn('Autoplay blocked:', err);
            autoplayFailed.value = true;
            isAudioPlaying.value = false;
        }
    };

    return {
        audioRef,
        isAudioPlaying,
        audioProgress,
        audioCurrentTime,
        audioDuration,
        autoplayFailed,
        audioError,
        isAudioLoaded,
        syncAudioState,
        onLoadedMetadata,
        updateAudioProgress,
        toggleAudioManual,
        onAudioError,
        playStimulusAudio,
        formatAudioTime
    };
}
