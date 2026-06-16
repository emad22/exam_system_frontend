<script setup>
import { computed, ref } from 'vue';

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

const highlightAnswers = computed({
    get: () => props.answer.highlight_answers || [],
    set: (val) => emit('update:answer', { ...props.answer, highlight_answers: val })
});

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
                if (highlightAnswers.value.includes(word)) {
                    span.classList.add('is-highlighted');
                }
                
                fragment.appendChild(span);
                fragment.appendChild(document.createTextNode(' '));
            });
            node.parentNode.replaceChild(fragment, node);
        } else {
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
        const newAnswers = [...highlightAnswers.value];
        const index = newAnswers.indexOf(word);
        if (index === -1) newAnswers.push(word);
        else newAnswers.splice(index, 1);
        highlightAnswers.value = newAnswers;
    }
};
</script>

<template>
    <div class="py-4 space-y-6">
        <!-- Main Content Area with Premium Styling -->
        <div class="bg-white p-12 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden rtl-support highlight-container"
            dir="auto"
            @click="handleContainerClick"
            v-html="processedHtml">
        </div>

        
    </div>
</template>

<style scoped>
@reference "../../index.css";

.highlight-container :deep(.clickable-word) {
    @apply px-1.5 py-1 rounded-xl cursor-pointer transition-all duration-300 relative inline-block;
    @apply hover:bg-slate-50 hover:text-slate-950;
}

.highlight-container :deep(.clickable-word.is-highlighted) {
    @apply bg-yellow-200/80 text-yellow-950 font-black shadow-lg shadow-yellow-200/50 scale-105 z-10;
}

/* Ensure rich text styles are preserved */
.highlight-container :deep(h1), 
.highlight-container :deep(h2), 
.highlight-container :deep(h3) {
    @apply mb-4 font-black text-slate-800 leading-tight;
}

.highlight-container :deep(p) {
    @apply mb-4 leading-relaxed;
}
</style>
