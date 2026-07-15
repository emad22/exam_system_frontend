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
    <div class="py-3 space-y-4">

        <!-- Click Icon (no repeated text) -->
        <div class="flex flex-col items-center justify-center py-2">
            <!-- Tap/Click icon SVG matching the reference design 2 -->
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" 
                class="w-[70px] h-[70px] text-[#1e293b]" 
                fill="none" stroke="currentColor" stroke-width="1.3" 
                stroke-linecap="round" stroke-linejoin="round">
                <!-- Hand -->
                <path d="M8 13v-7.5a1.5 1.5 0 0 1 3 0v6.5" />
                <path d="M11 11.5v-2a1.5 1.5 0 1 1 3 0v2.5" />
                <path d="M14 10.5a1.5 1.5 0 1 1 3 0v1.5" />
                <path d="M17 11.5a1.5 1.5 0 1 1 3 0v4.5a6 6 0 0 1 -6 6h-2a6 6 0 0 1 -5.012 -2.7l-.196 -.3c-.312 -.479 -1.407 -2.388 -3.286 -5.728a1.5 1.5 0 0 1 .536 -2.022a1.867 1.867 0 0 1 2.28 .28l1.47 1.47" />
                <!-- Ripples -->
                <path d="M6 7.5a4.5 4.5 0 0 1 7.5 -3" />
                <path d="M3.5 5.5a7.5 7.5 0 0 1 12 -4" />
            </svg>
        </div>

        <!-- Question Content Box — light gray background, large font, Myriad Arabic -->
        <div
            ref="containerRef"
            class="rounded-2xl px-8 py-6  word-selection-container relative overflow-hidden"
            style="
                background-color: #f8f9fa;
                border: 1px solid #eaecef;
                font-family: 'Myriad Arabic', 'Lotus Linotype', 'Cairo', 'Inter', system-ui, -apple-system, sans-serif;
                font-size: 30px;
                font-weight: 400;
                color: #1e293b;
                line-height: 1.9;
                text-align: right;
                direction: rtl;
                cursor: default;
            "
            dir="auto"
            @click="handleContainerClick"
            v-html="processedHtml">
        </div>

    </div>
</template>

<style scoped>
@reference "../../index.css";

.word-selection-container :deep(.clickable-word) {
    font-family: 'Myriad Arabic', 'Lotus Linotype', 'Cairo', 'Inter', system-ui, -apple-system, sans-serif !important;
    font-size: 30px !important;
    font-weight: 400 !important;
    padding: 0 3px;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
    display: inline-block;
    color: #1e293b;
    margin: 0;
}

.word-selection-container :deep(.clickable-word:hover) {
    background-color: #e2e8f0;
    color: #0f172a;
}

.word-selection-container :deep(.clickable-word.is-selected) {
    color: #dc2626;
    background-color: #fff1f2;
    border-bottom: 2.5px solid #dc2626;
    transform: scale(1.08);
    font-weight: 600 !important;
}

/* Preserve rich-text structure */
.word-selection-container :deep(p) {
    margin-bottom: 0.5rem;
    line-height: 1.9;
}

.word-selection-container :deep(h1),
.word-selection-container :deep(h2),
.word-selection-container :deep(h3) {
    margin-bottom: 1rem;
    font-weight: 700;
    color: #1e293b;
}
</style>
