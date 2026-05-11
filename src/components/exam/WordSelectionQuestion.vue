<script setup>
import { computed } from 'vue';

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

// Single-select: store only one word at a time
const selectedWord = computed({
    get: () => props.answer.selected_words?.[0] ?? null,
    set: (val) => emit('update:answer', { ...props.answer, selected_words: val ? [val] : [] })
});

/**
 * Strip HTML tags and decode HTML entities to get plain text,
 * then split into individual words for the click-word interaction.
 */
const stripHtml = (html) => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
};

const currentWords = computed(() => {
    const raw = props.question.content || '';
    const plainText = stripHtml(raw);
    return plainText.match(/[\u0600-\u06FF\w''-]+|[^\u0600-\u06FF\w\s]/gu)?.filter(w => w.trim()) || [];
});

const toggleWord = (word) => {
    if (props.disabled) return;
    // If same word clicked again → deselect; otherwise select the new word
    selectedWord.value = selectedWord.value === word ? null : word;
};
</script>

<template>
    <div class="space-y-4">
        <div class="bg-white p-6 rounded-2xl border border-slate-100 flex flex-wrap gap-x-2 gap-y-3" dir="auto">
            <button v-for="(word, wIdx) in currentWords" :key="wIdx"
                @click="toggleWord(word)" :disabled="disabled"
                class="px-2 py-1 rounded-md transition-all duration-200 font-medium text-lg border-b-2"
                :class="selectedWord === word
                    ? 'border-rose-500 text-rose-600 bg-rose-50 scale-105 shadow-sm'
                    : 'border-transparent text-slate-700 hover:bg-slate-100 hover:border-slate-300'">
                {{ word }}
            </button>
        </div>
    </div>
</template>
