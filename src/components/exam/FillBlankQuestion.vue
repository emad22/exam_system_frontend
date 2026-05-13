<script setup>
import { ref, computed, nextTick, onMounted, watch } from 'vue';
import VirtualKeyboard from '@/components/VirtualKeyboard.vue';
import { useVirtualKeyboard } from '@/composables/useVirtualKeyboard';

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

const fillBlankAnswers = computed({
    get: () => props.answer.fill_blank_answers || [],
    set: (val) => emit('update:answer', { ...props.answer, fill_blank_answers: val })
});

const focusedInputIndex = ref(0);
const { keyboardLayout, showVirtualKeyboard, toggleKeyboardLayout } = useVirtualKeyboard();
const containerRef = ref(null);

/**
 * A writable computed that represents the currently focused blank's answer.
 * The VirtualKeyboard v-models against this.
 */
const focusedAnswer = computed({
    get: () => fillBlankAnswers.value[focusedInputIndex.value] || '',
    set: (val) => {
        const newAnswers = [...fillBlankAnswers.value];
        newAnswers[focusedInputIndex.value] = val;
        fillBlankAnswers.value = newAnswers;
        // Also sync to the DOM input so it shows the typed character
        if (containerRef.value) {
            const input = containerRef.value.querySelector(`.fb-input-field[data-index="${focusedInputIndex.value}"]`);
            if (input && input.value !== val) input.value = val;
        }
    }
});

/**
 * Pre-processes the HTML to replace markers with actual input tags.
 * IMPORTANT: This must NOT read fillBlankAnswers.value or it will
 * recompute on every keystroke and destroy the focused input element.
 */
const processedHtml = computed(() => {
    let html = props.question.content || '';
    let count = 0;
    return html.replace(/\[\s*input\s*\]|\[\s*\]|(\.|\s|&nbsp;){10,}/gi, () => {
        const input = `<input type="text" class="fb-input-field" data-index="${count}" placeholder="..." ${props.disabled ? 'disabled' : ''} />`;
        count++;
        return input;
    });
});

/**
 * Event delegation for inputs.
 */
const handleInput = (e) => {
    if (e.target.classList.contains('fb-input-field')) {
        const index = parseInt(e.target.dataset.index);
        const newAnswers = [...fillBlankAnswers.value];
        newAnswers[index] = e.target.value;
        fillBlankAnswers.value = newAnswers;
    }
};

/**
 * Event delegation for focus.
 */
const handleFocus = (e) => {
    if (e.target.classList.contains('fb-input-field')) {
        focusedInputIndex.value = parseInt(e.target.dataset.index);
    }
};

/**
 * Sync answers back to DOM inputs if they change from outside (e.g. keyboard)
 */
watch(fillBlankAnswers, (newVal) => {
    if (!containerRef.value) return;
    const inputs = containerRef.value.querySelectorAll('.fb-input-field');
    inputs.forEach((input, i) => {
        if (input.value !== newVal[i]) {
            input.value = newVal[i] || '';
        }
    });
}, { deep: true });

onMounted(() => {
    // Ensure the initial array is prepared
    const matches = (props.question.content || '').match(/\[\s*input\s*\]|\[\s*\]|(\.|\s|&nbsp;){10,}/gi);
    const count = matches ? matches.length : 0;
    if (fillBlankAnswers.value.length < count) {
        const newArr = [...fillBlankAnswers.value];
        for (let i = newArr.length; i < count; i++) {
            newArr[i] = '';
        }
        fillBlankAnswers.value = newArr;
    }
});
</script>

<template>
    <div class="space-y-6 py-4">
        <!-- Content Area with Modern Styling -->
        <div 
            ref="containerRef"
            class="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden rtl-support fill-blank-container"
            dir="auto"
            @input="handleInput"
            @focusin="handleFocus"
        >
            
            <!-- Subtle Accent Gradient -->
            <div class="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -mr-16 -mt-16"></div>

            <!-- Render the HTML with embedded inputs -->
            <div v-html="processedHtml" class="relative z-0 leading-loose"></div>
        </div>

        <!-- Keyboard Controls -->
        <div class="flex items-center gap-3 w-full justify-center bg-slate-50/50 p-2 rounded-2xl border border-slate-100 max-w-xs mx-auto">
            <button @click="toggleKeyboardLayout" class="flex-grow h-10 text-[10px] font-black uppercase tracking-widest px-4 bg-white rounded-xl hover:bg-indigo-50 hover:text-brand-primary border border-slate-100 shadow-sm transition-all">
                {{ keyboardLayout === 'arabic' ? 'English' : 'العربية' }}
            </button>
            <button @click="showVirtualKeyboard = !showVirtualKeyboard" 
                class="w-12 h-10 flex items-center justify-center bg-white rounded-xl border border-slate-100 shadow-sm hover:border-brand-primary transition-all group" 
                :title="showVirtualKeyboard ? 'Hide' : 'Show'">
                <svg viewBox="0 0 24 24" class="w-5 h-5 transition-colors" :class="showVirtualKeyboard ? 'text-brand-primary' : 'text-slate-400'" fill="currentColor">
                    <path d="M20 5H4c-1.1 0-1.99.9-1.99 2L2 17c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-9 3h2v2h-2V8zm0 3h2v2h-2v-2zM8 8h2v2H8V8zm0 3h2v2H8v-2zm-1 2H5v-2h2v2zm0-3H5V8h2v2zm9 7H8v-2h8v2zm0-4h-2v-2h2v2zm0-3h-2V8h2v2zm3 3h-2v-2h2v2zm0-3h-2V8h2v2z"/>
                </svg>
            </button>
        </div>

        <VirtualKeyboard v-if="showVirtualKeyboard && !disabled" 
            v-model="focusedAnswer" 
            :layout="keyboardLayout" 
            class="w-full" />
    </div>
</template>

<style scoped>
@reference "../../index.css";
.fill-blank-container :deep(h1), 
.fill-blank-container :deep(h2), 
.fill-blank-container :deep(h3) {
    @apply mb-4 font-black text-slate-800 leading-tight;
}

.fill-blank-container :deep(p) {
    @apply mb-4;
}

.fill-blank-container :deep(.fb-input-field) {
    @apply w-40 h-10 px-4 bg-slate-50/80 border-b-4 border-slate-200 rounded-t-xl focus:bg-indigo-50 focus:border-brand-primary outline-none transition-all text-brand-primary font-black text-center text-lg inline-block mx-1 align-middle;
}

.fill-blank-container :deep(.fb-input-field:focus) {
    @apply shadow-lg shadow-brand-primary/10 -translate-y-0.5;
}
</style>
