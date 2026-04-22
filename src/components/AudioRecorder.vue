<script setup>
import { ref, onUnmounted } from 'vue';
import Button from 'primevue/button';

const props = defineProps({
    isMandatory: { type: Boolean, default: false }
});

const emit = defineEmits(['recorded', 'recording-state-change']);

const isRecording = ref(false);
const recordingTime = ref(0);
const timerInterval = ref(null);
const mediaRecorder = ref(null);
const audioChunks = ref([]);
const audioUrl = ref(null);
const audioBlob = ref(null);

const startRecording = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder.value = new MediaRecorder(stream);
        audioChunks.value = [];

        mediaRecorder.value.ondataavailable = (event) => {
            audioChunks.value.push(event.data);
        };

        mediaRecorder.value.onstop = () => {
            audioBlob.value = new Blob(audioChunks.value, { type: 'audio/webm' });
            audioUrl.value = URL.createObjectURL(audioBlob.value);
            emit('recorded', audioBlob.value);
            
            // Stop all tracks to release microphone
            stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.value.start();
        isRecording.value = true;
        emit('recording-state-change', true);
        
        recordingTime.value = 0;
        timerInterval.value = setInterval(() => {
            recordingTime.value++;
        }, 1000);
    } catch (err) {
        console.error('Microphone access denied:', err);
        alert('Microphone access is required for this task. Please enable it in your browser settings.');
    }
};

const stopRecording = () => {
    if (mediaRecorder.value && isRecording.value) {
        mediaRecorder.value.stop();
        isRecording.value = false;
        emit('recording-state-change', false);
        clearInterval(timerInterval.value);
    }
};

const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

onUnmounted(() => {
    if (timerInterval.value) clearInterval(timerInterval.value);
    if (audioUrl.value) URL.revokeObjectURL(audioUrl.value);
});

defineExpose({
    reset: () => {
        audioUrl.value = null;
        audioBlob.value = null;
        recordingTime.value = 0;
    }
});
</script>

<template>
    <div class="flex flex-col items-center space-y-6 p-8 bg-slate-50 border border-slate-100 rounded-[2.5rem]">
        
        <div class="flex items-center space-x-6">
            <!-- Record Button -->
            <button v-if="!isRecording" @click="startRecording" 
                class="w-20 h-20 rounded-full bg-white border-4 border-slate-100 text-rose-500 flex items-center justify-center hover:border-rose-100 hover:scale-110 transition-all shadow-sm">
                <i class="pi pi-microphone text-2xl"></i>
            </button>
            
            <!-- Stop Button -->
            <button v-else @click="stopRecording" 
                class="w-20 h-20 rounded-full bg-rose-500 text-white flex items-center justify-center animate-pulse scale-110 shadow-xl shadow-rose-200">
                <i class="pi pi-stop-fill text-2xl"></i>
            </button>

            <div class="flex flex-col">
                <span class="text-[10px] font-black uppercase tracking-[0.3em]" 
                    :class="isRecording ? 'text-rose-500' : 'text-slate-400'">
                    {{ isRecording ? 'Transmission Active' : 'Waiting for Input' }}
                </span>
                <span class="text-2xl font-black text-slate-800 tracking-tighter tabular-nums">
                    {{ formatTime(recordingTime) }}
                </span>
            </div>
        </div>

        <!-- Playback Preview -->
        <div v-if="audioUrl" class="w-full space-y-3 animate-in fade-in zoom-in-95 duration-500 pt-4 border-t border-slate-200/50">
            <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest block text-center italic">Recorded Signature Review</span>
            <audio :src="audioUrl" controls class="w-full h-10"></audio>
        </div>

        <div v-if="isRecording" class="flex items-center space-x-1 h-4">
            <div v-for="i in 12" :key="i" 
                class="w-1 bg-rose-500 rounded-full animate-bounce" 
                :style="{ height: `${Math.random() * 100}%`, animationDelay: `${i * 0.1}s` }">
            </div>
        </div>
    </div>
</template>

<style scoped>
.animate-in {
    animation: fadeIn 0.5s ease-out;
}
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}
</style>
