<script setup>
import AudioRecorder from '@/components/AudioRecorder.vue';

const props = defineProps({
    question: {
        type: Object,
        required: true
    },
    answer: {
        type: Object,
        required: true
    },
    disabled: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['update:answer']);

const handleRecording = (blob) => {
    emit('update:answer', { ...props.answer, recorded_file: blob });
};
</script>

<template>
    <div class="space-y-8 py-4">
        <!-- Speaking Area Container -->
        <div class="bg-white p-12 rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-200/40 relative overflow-hidden flex flex-col items-center gap-8">
            
            <!-- Content / Instruction if any -->
            <div v-if="question.content" class="text-center max-w-2xl">
                <div class="text-xl font-bold text-slate-700 leading-relaxed mb-4" v-html="question.content"></div>
                <div class="flex items-center justify-center gap-2 text-slate-400">
                    <i class="pi pi-info-circle text-[10px]"></i>
                    <span class="text-[10px] font-black uppercase tracking-widest">انقر على الميكروفون للبدء</span>
                </div>
            </div>

            <!-- Premium Recorder Integration -->
            <AudioRecorder @recorded="handleRecording"
                class="!bg-slate-50/50 !border-2 !border-slate-100 !shadow-inner !rounded-[2.5rem] w-full max-w-md" 
                :disabled="disabled" />
            
            <!-- Subtle Background Decoration -->
            <div class="absolute -top-24 -right-24 w-64 h-64 bg-rose-500/5 rounded-full blur-3xl"></div>
        </div>
    </div>
</template>
