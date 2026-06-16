<script setup>
import { computed, ref, onMounted, watch } from 'vue';

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

const containerRef = ref(null);

/**
 * Recursively wraps text nodes in HTML with clickable spans.
 */
const wrapWordsInHtml = (html) => {
    if (!html) return '';
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    const walk = (node) => {
        if (node.nodeType === 3) { // Text node
            const text = node.textContent;
            const words = text.match(/[\u0600-\u06FF\w''-]+|[^\u0600-\u06FF\w\s]/gu) || [];
            const fragment = document.createDocumentFragment();
            
            words.forEach(word => {
                const span = document.createElement('span');
                span.className = 'clickable-word';
                span.dataset.word = word;
                span.textContent = word;
                
                // Add reactive classes if selected
                if (selectedWord.value === word) {
                    span.classList.add('is-selected');
                }
                
                fragment.appendChild(span);
                fragment.appendChild(document.createTextNode(' '));
            });
            node.parentNode.replaceChild(fragment, node);
        } else {
            // Need to copy children because we might replace them
            const children = Array.from(node.childNodes);
            children.forEach(child => walk(child));
        }
    };
    
    walk(doc.body);
    return doc.body.innerHTML;
};

const processedHtml = computed(() => wrapWordsInHtml(props.question.content));

const handleContainerClick = (e) => {
    if (props.disabled) return;
    const target = e.target.closest('.clickable-word');
    if (target) {
        const word = target.dataset.word;
        selectedWord.value = selectedWord.value === word ? null : word;
    }
};
</script>

<template>
    <div class="py-4 space-y-6">
        <!-- Main Content Area with Modern Typography -->
        <div ref="containerRef" 
            class="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden rtl-support word-selection-container" 
            dir="auto"
            @click="handleContainerClick"
            v-html="processedHtml">
        </div>

        <!-- Hint / Instructions (Subtle) -->
        <!-- <div class="flex items-center justify-center gap-2 text-slate-400">
            <i class="pi pi-info-circle text-[10px]"></i>
            <span class="text-[10px] font-black uppercase tracking-widest">Click words in order</span>
        </div> -->
    </div>
</template>

<style scoped>
@reference "../../index.css";

.word-selection-container :deep(.clickable-word) {
    @apply px-1.5 py-0.5 rounded-lg cursor-pointer transition-all duration-300 font-bold inline-block;
    @apply text-slate-700 hover:bg-slate-50 hover:text-slate-900;
}

.word-selection-container :deep(.clickable-word.is-selected) {
    @apply text-rose-600 bg-rose-50 scale-110 shadow-md shadow-rose-200/50 z-10;
    @apply border-b-2 border-rose-500;
}

/* Ensure rich text styles are preserved */
.word-selection-container :deep(h1), 
.word-selection-container :deep(h2), 
.word-selection-container :deep(h3) {
    @apply mb-4 font-black text-slate-800 leading-tight;
}

.word-selection-container :deep(p) {
    @apply mb-4 leading-relaxed;
}
</style>
