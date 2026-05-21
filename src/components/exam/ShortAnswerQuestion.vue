<script setup>
import { computed } from 'vue';
import { useVirtualKeyboard } from '@/composables/useVirtualKeyboard';
import { useMediaUrl } from '@/composables/useMediaUrl';

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
    },
    hasStimulusContent: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['update:answer']);

const textAnswer = computed({
    get: () => props.answer.text_answer || '',
    set: (val) => emit('update:answer', { ...props.answer, text_answer: val })
});

const { resolveUrl } = useMediaUrl();

const cleanHtml = (html) => {
    if (!html) return '';
    return html.replace(/&nbsp;/g, ' ');
};

const { keyboardLayout, showVirtualKeyboard, toggleKeyboardLayout } = useVirtualKeyboard();
</script>

<template>
    <div class="short-answer-wrapper space-y-6 py-4" dir="rtl">
        <!-- 1. Passage Title (only in single-column mode) -->
        <h3 v-if="!hasStimulusContent && question.passage?.title" class="passage-title">
            {{ question.passage.title }}
        </h3>

        <!-- 2. Instructions Badge (always show here) -->
        <div v-if="question.instructions" class="short-instructions-badge">
            <span class="w-2 h-2 rounded-full bg-brand-primary animate-pulse"></span>
            <span>{{ question.instructions }}</span>
        </div>

        <!-- 3. Question Prompt/Content (always show here) -->
        <div v-if="question.content" 
             class="short-prompt-content ql-content" 
             v-html="cleanHtml(question.content)">
        </div>

        <!-- 4. Image Prompt (only in single-column mode) -->
        <div v-if="!hasStimulusContent && (question.image_url || question.image_path || question.passage?.image_url || question.passage?.image_path)" 
             class="image-prompt-container">
            <img 
                :src="resolveUrl(question.image_url || question.image_path || question.passage?.image_url || question.passage?.image_path)" 
                alt="Prompt Image"
                class="prompt-image"
            />
        </div>

        <!-- Input Area with Premium Styling -->
        <div class="bg-white p-6 md:p-12 rounded-3xl md:rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-200/50 flex flex-col items-center gap-4 md:gap-8 relative overflow-hidden">
            
            <!-- Background Decoration -->
            <div class="absolute -top-24 -left-24 w-48 h-48 bg-brand-primary/5 rounded-full blur-3xl"></div>
            <div class="absolute -bottom-24 -right-24 w-48 h-48 bg-brand-primary/5 rounded-full blur-3xl"></div>

            <div class="w-full max-w-md relative group">
                <input v-model="textAnswer" :disabled="disabled" type="text"
                    class="w-full px-6 py-4 md:px-8 md:py-5 bg-slate-50 border-b-4 border-slate-200 rounded-t-2xl text-xl md:text-2xl font-black text-slate-800 text-center focus:bg-indigo-50/50 focus:border-brand-primary outline-none transition-all shadow-inner"
                    placeholder="اكتب إجابتك هنا..." dir="auto" />
                
                <!-- Input Glow -->
                <div class="absolute inset-0 bg-brand-primary/10 blur-2xl opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none"></div>
            </div>
            
            <!-- Controls Grid (toggles global docked keyboard) -->
            <div class="flex items-center gap-3 w-full justify-center bg-slate-50/50 p-2 rounded-2xl border border-slate-100 max-w-xs transition-all hover:shadow-md">
                <button @click="toggleKeyboardLayout" class="flex-grow h-11 text-[10px] font-black uppercase tracking-widest px-4 bg-white rounded-xl hover:bg-indigo-50 hover:text-brand-primary border border-slate-100 shadow-sm transition-all active:scale-95">
                    {{ keyboardLayout === 'arabic' ? 'English' : 'العربية' }}
                </button>
                <button @click="showVirtualKeyboard = !showVirtualKeyboard" 
                    class="w-14 h-11 flex items-center justify-center bg-white rounded-xl border border-slate-100 shadow-sm hover:border-brand-primary transition-all group active:scale-95" 
                    :title="showVirtualKeyboard ? 'Hide' : 'Show'">
                    <svg viewBox="0 0 24 24" class="w-6 h-6 transition-colors" :class="showVirtualKeyboard ? 'text-brand-primary' : 'text-slate-400'" fill="currentColor">
                        <path d="M20 5H4c-1.1 0-1.99.9-1.99 2L2 17c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-9 3h2v2h-2V8zm0 3h2v2h-2v-2zM8 8h2v2H8V8zm0 3h2v2H8v-2zm-1 2H5v-2h2v2zm0-3H5V8h2v2zm9 7H8v-2h8v2zm0-4h-2v-2h2v2zm0-3h-2V8h2v2zm3 3h-2v-2h2v2zm0-3h-2V8h2v2z"/>
                    </svg>
                </button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.short-answer-wrapper {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 4px 0;
    width: 100%;
}

.passage-title {
    font-size: 1.35rem;
    font-weight: 900;
    color: #0f172a;
    margin-bottom: 4px;
    text-align: right;
    line-height: 1.4;
}

.short-instructions-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 700;
    color: #475569;
    align-self: flex-start;
    margin-bottom: 8px;
    line-height: 1.4;
}

.short-prompt-content {
    font-size: 1.15rem;
    line-height: 2;
    font-weight: 600;
    color: #1e293b;
    width: 100%;
    margin-bottom: 8px;
    text-align: right;
}

.short-prompt-content :deep(p) {
    margin-bottom: 0.5rem;
    display: block;
}

.image-prompt-container {
    width: 100%;
    max-width: 450px;
    display: flex;
    justify-content: center;
    margin: 0 auto;
}

.prompt-image {
    max-width: 100%;
    max-height: 280px;
    border-radius: 16px;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
    border: 4px solid #ffffff;
    transition: transform 0.2s ease-in-out;
}

.prompt-image:hover {
    transform: scale(1.02);
}
</style>

