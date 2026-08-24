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

const cleanHtml = (html) => {
    if (!html) return '';
    let clean = html.replace(/&nbsp;/g, ' ');
    clean = clean.replace(/(\.{3,})\s*([\d\u0660-\u0669]+)/g, '<span class="blank-line-wrapper"><span class="blank-line"></span><span class="blank-badge">$2</span></span>');
    clean = clean.replace(/([\d\u0660-\u0669]+)\s*(\.{3,})/g, '<span class="blank-line-wrapper"><span class="blank-badge">$1</span><span class="blank-line"></span></span>');
    clean = clean.replace(/(\.{3,})/g, '<span class="blank-line"></span>');
    return clean;
};

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
            text_answer: props.answer?.text_answer || 'Live Session',
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

                <!-- Live Waiting Badge -->
                <div class="flex items-center gap-2 bg-cyan-50 px-3 py-1.5 rounded-full border border-cyan-200">
                    <span class="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
                    <span class="text-xs font-black text-cyan-700 uppercase tracking-wider">Live Session</span>
                </div>
            </div>

            <!-- Question Content -->
            <div v-if="question.content"
                class="bg-white p-5 md:p-8 rounded-2xl border border-slate-200/60 max-w-3xl w-full mx-auto ql-content rtl-support" dir="auto">
                <div class="speaking-prompt-content ql-content rtl-support"
                    v-html="cleanHtml(question.content)">
                </div>
            </div>

            <!-- Background subtle glow -->
            <div
                class="absolute -bottom-20 -left-20 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none">
            </div>
        </div>
    </div>
</template>

<style scoped>
.speaking-prompt-content {
    font-size: 22px;
    line-height: 1.8;
    color: #1e293b;
}

.speaking-prompt-content :deep(p),
.speaking-prompt-content :deep(div),
.speaking-prompt-content :deep(span),
.speaking-prompt-content :deep(li),
.speaking-prompt-content :deep(h1),
.speaking-prompt-content :deep(h2),
.speaking-prompt-content :deep(h3) {
    font-family: 'Lotus Linotype', 'Myriad Arabic', 'Cairo', 'Inter', system-ui, -apple-system, sans-serif;
}

.speaking-prompt-content :deep(p) {
    margin-bottom: 0.5rem;
}
</style>
