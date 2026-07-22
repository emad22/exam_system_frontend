<script setup>
import { onMounted } from 'vue';

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

/**
 * بمجرد ما الطالب يدخل على السؤال ده،
 * نعمل emit إن الـ live_status = 'waiting'
 * عشان العملية تتسجل وتبقى صالحة للـ auto-submit عند انتهاء الوقت.
 */
onMounted(() => {
    if (!props.answer?.live_status) {
        emit('update:answer', {
            ...props.answer,
            live_status: 'waiting',
            entered_at: new Date().toISOString(),
        });
    }
});
</script>

<template>
    <div class="space-y-6 py-2">
        <!-- Main Card Container -->
        <div
            class="bg-white p-6 md:p-10 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/30 relative overflow-hidden flex flex-col gap-6">

            <!-- Header Tag -->
            <div class="flex items-center justify-between border-b border-slate-100 pb-4">
                <div class="flex items-center gap-3">
                    <div
                        class="w-10 h-10 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center text-lg font-bold shadow-sm border border-cyan-100">
                        <i class="pi pi-comments"></i>
                    </div>
                    <div>
                        <p class="text-[11px] font-bold text-slate-400 uppercase tracking-widest">SPEAKING</p>
                    </div>
                </div>

                <!-- Live Waiting Badge -->
                <div class="flex items-center gap-2 bg-cyan-50 px-3 py-1.5 rounded-full border border-cyan-200">
                    <span class="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
                    <span class="text-xs font-black text-cyan-700 uppercase tracking-wider">Live Session</span>
                </div>
            </div>

            <!-- Paragraph / Question Content -->
            <div v-if="question.content"
                class="bg-slate-50/80 p-5 md:p-8 rounded-2xl border border-slate-200/60 max-w-3xl w-full mx-auto">
                <div class="text-slate-800 text-base md:text-xl font-bold leading-relaxed ql-content"
                    v-html="question.content">
                </div>
            </div>

            <!-- Informational Banner (no action, purely passive) -->
            <div
                class="w-full max-w-2xl mx-auto bg-slate-900 rounded-[2rem] p-6 md:p-8 text-white flex flex-col items-center justify-center gap-4 min-h-[200px] shadow-2xl border border-slate-800">

                <!-- Icon -->
                <div
                    class="w-20 h-20 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-3xl border border-cyan-500/20 shadow-inner">
                    <i class="pi pi-phone"></i>
                </div>

                <!-- Message -->
                <div class="text-center space-y-2">
                    <h4 class="text-base font-black text-white">في انتظار المقابلة المباشرة</h4>
                    <p class="text-sm text-slate-400 max-w-md leading-relaxed">
                        سيتواصل معك المعلم قريباً لإجراء الاختبار الشفهي المباشر.<br>
                        يرجى البقاء في هذه الصفحة حتى ينتهي الوقت المخصص.
                    </p>
                </div>

                <!-- Pulsing waiting indicator -->
                <div class="flex items-center gap-2 text-cyan-400/70 text-xs font-bold uppercase tracking-widest">
                    <span class="flex gap-1">
                        <span class="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-bounce" style="animation-delay:0ms"></span>
                        <span class="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-bounce" style="animation-delay:150ms"></span>
                        <span class="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-bounce" style="animation-delay:300ms"></span>
                    </span>
                    <span>في الانتظار</span>
                </div>
            </div>

            <!-- Background subtle glow -->
            <div
                class="absolute -bottom-20 -left-20 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none">
            </div>
        </div>
    </div>
</template>
