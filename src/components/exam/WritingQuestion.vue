<script setup>
import { computed, onMounted, onUnmounted, ref, watch, nextTick } from 'vue';
import { useVirtualKeyboard } from '@/composables/useVirtualKeyboard';
import { useMediaUrl } from '@/composables/useMediaUrl';
import FileUpload from '@/components/FileUpload.vue';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';

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

const { resolveUrl } = useMediaUrl();

const emit = defineEmits(['update:answer']);

const activeTab = ref('write'); // 'write' or 'upload'

const textAnswer = computed({
    get: () => props.answer.text_answer || '',
    set: (val) => emit('update:answer', { ...props.answer, text_answer: val })
});

const editorRef = ref(null);
let quillInstance = null;
const forceUpdateCounter = ref(0);

const wordCount = computed(() => {
    // Force re-evaluation when counter changes
    forceUpdateCounter.value;
    
    let plainText = '';
    if (quillInstance) {
        plainText = quillInstance.getText().trim();
    } else {
        plainText = (textAnswer.value || '')
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }
    // Filter out newline characters only and count words
    const words = plainText.split(/\s+/).filter(w => w.length > 0);
    return words.length;
});

const cleanHtml = (html) => {
    if (!html) return '';
    let clean = html.replace(/&nbsp;/g, ' ');
    clean = clean.replace(/(\.{3,})\s*([\d\u0660-\u0669]+)/g, '<span class="blank-line-wrapper"><span class="blank-line"></span><span class="blank-badge">$2</span></span>');
    clean = clean.replace(/([\d\u0660-\u0669]+)\s*(\.{3,})/g, '<span class="blank-line-wrapper"><span class="blank-badge">$1</span><span class="blank-line"></span></span>');
    clean = clean.replace(/(\.{3,})/g, '<span class="blank-line"></span>');
    return clean;
};

const { 
    showVirtualKeyboard, 
    registerKeyPressListener,
    unregisterKeyPressListener
} = useVirtualKeyboard();
const keyboardLayout = 'arabic';

const handleVirtualKeyboardKeyPress = (button) => {
    if (!quillInstance) return;

    // Focus editor first so there is a selection range
    quillInstance.focus();
    let range = quillInstance.getSelection();
    if (!range) {
        const length = quillInstance.getLength();
        quillInstance.setSelection(length - 1);
        range = quillInstance.getSelection();
    }

    const index = range.index;

    if (button === '{bksp}') {
        if (index > 0) {
            quillInstance.deleteText(index - 1, 1);
            quillInstance.setSelection(index - 1);
        }
    } else if (button === '{enter}') {
        quillInstance.insertText(index, '\n');
        quillInstance.setSelection(index + 1);
    } else if (button === '{space}') {
        quillInstance.insertText(index, ' ');
        quillInstance.setSelection(index + 1);
    } else if (button === '{tab}') {
        quillInstance.insertText(index, '\t');
        quillInstance.setSelection(index + 1);
    } else if (button.startsWith('{') && button.endsWith('}')) {
        // Ignore control codes like Shift or Lock which simple-keyboard handles internally
    } else {
        quillInstance.insertText(index, button);
        quillInstance.setSelection(index + button.length);
    }
    
    // Update parent and trigger word count update
    textAnswer.value = quillInstance.root.innerHTML;
    forceUpdateCounter.value++;
};

const handleFileSelected = (file) => {
    emit('update:answer', { ...props.answer, recorded_file: file });
};

const handleFileRemoved = () => {
    emit('update:answer', { ...props.answer, recorded_file: null });
};

onMounted(async () => {
    // Wait for DOM to be ready
    await nextTick();
    
    // Initialize Quill editor
    if (editorRef.value && !quillInstance) {
        quillInstance = new Quill(editorRef.value, {
            theme: 'snow',
            modules: {
                toolbar: [
                    ['bold', 'italic', 'underline'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    [{ 'direction': 'rtl' }],
                    ['clean']
                ]
            },
            placeholder: 'ابدأ الكتابة هنا...'
        });

        // Set initial HTML value
        quillInstance.root.innerHTML = textAnswer.value;

        // Sync Quill changes to parent textAnswer and trigger word count update
        quillInstance.on('text-change', () => {
            textAnswer.value = quillInstance.root.innerHTML;
            forceUpdateCounter.value++;
        });

        if (props.disabled) {
            quillInstance.enable(false);
        }
    }

    // Register active global keyboard keypress listener
    registerKeyPressListener(handleVirtualKeyboardKeyPress);
});

watch(() => activeTab.value, async (newTab) => {
    if (newTab === 'write' && quillInstance) {
        // Refocus Quill when switching back to write tab
        await nextTick();
        quillInstance.focus();
    }
});

watch(() => props.disabled, (newVal) => {
    if (quillInstance) {
        quillInstance.enable(!newVal);
    }
});

watch(() => textAnswer.value, (newVal) => {
    if (quillInstance && newVal !== quillInstance.root.innerHTML) {
        quillInstance.root.innerHTML = newVal || '';
    }
});

onUnmounted(() => {
    unregisterKeyPressListener();
});
</script>

<template>
    <div class="writing-question-wrapper" dir="rtl">
        
        <!-- Prompt Section: Side-by-Side in Single Column Mode -->
        <div :class="['prompt-section', !hasStimulusContent ? 'side-by-side' : 'stacked']">
            
            <!-- Right side / Content Pane: Title, Badge, Text content -->
            <div class="prompt-text-pane">
                <!-- 1. Passage Title (only in single-column mode) -->
                <h3 v-if="!hasStimulusContent && question.passage?.title" class="passage-title" v-html="question.passage.title"></h3>

                <!-- 2. Instructions Badge -->
                <div v-if="question.instructions" class="writing-instructions-badge">
                    <span class="w-2 h-2 rounded-full bg-brand-primary animate-pulse"></span>
                    <span v-html="question.instructions"></span>
                </div>

                <!-- 3. Question Prompt/Content -->
                <div v-if="question.content" 
                     class="writing-prompt-content ql-content" 
                     v-html="cleanHtml(question.content)">
                </div>

                <!-- 5. Passage Content (only in single-column mode) -->
                <div v-if="!hasStimulusContent && question.passage?.content" 
                     class="passage-short-content ql-content" 
                     v-html="cleanHtml(question.passage.content)">
                </div>
            </div>

            <!-- Left side / Image Pane (only in single-column mode) -->
            <div v-if="!hasStimulusContent && (question.image_url || question.image_path || question.passage?.image_url || question.passage?.image_path)" 
                 class="prompt-image-pane">
                <div class="image-prompt-container">
                    <img 
                        :src="resolveUrl(question.image_url || question.image_path || question.passage?.image_url || question.passage?.image_path)" 
                        alt="Prompt Image"
                        class="prompt-image"
                    />
                </div>
            </div>

        </div>

        <!-- Premium Tab Selector -->
        <div class="tab-selector">
            <button 
                @click="activeTab = 'write'"
                :class="[
                    'tab-button',
                    activeTab === 'write' && 'tab-button-active'
                ]"
                :disabled="disabled">
                <i class="pi pi-pen-to-square"></i>
                <span>Write Text</span>
            </button>
            <button 
                @click="activeTab = 'upload'"
                :class="[
                    'tab-button',
                    activeTab === 'upload' && 'tab-button-active'
                ]"
                :disabled="disabled">
                <i class="pi pi-cloud-upload"></i>
                <span>File Upload</span>
            </button>
        </div>

        <!-- Tab Content: Write Text -->
        <div v-show="activeTab === 'write'" class="tab-content">
            <!-- Rich Text Editor Container -->
            <div class="editor-container-outer">
                <div ref="editorRef" class="quill-rich-editor"></div>
            </div>

            <!-- Toolbar -->
            <div class="writing-toolbar">
                <!-- Stats -->
                <div class="toolbar-stats">
                    <div class="stat-badge">
                        <i class="pi pi-align-right"></i>
                        <span>Words: {{ wordCount }}</span>
                    </div>
                </div>

                <!-- Keyboard Controls (Toggle only, no language switch) -->
                <div class="toolbar-controls">
                    <button
                        @click="showVirtualKeyboard = !showVirtualKeyboard"
                        class="kb-toggle-btn"
                        :class="{ active: showVirtualKeyboard }"
                        title="Virtual keyboard"
                    >
                        <i class="pi pi-keyboard"></i>
                    </button>
                </div>
            </div>
        </div>

        <!-- Tab Content: Upload File -->
        <div v-show="activeTab === 'upload'" class="tab-content">
            <FileUpload 
                :accepted-types="['image', 'document']"
                :max-size="50 * 1024 * 1024"
                :disabled="disabled"
                @file-selected="handleFileSelected"
                @file-removed="handleFileRemoved" />
        </div>
    </div>
</template>

<style scoped>
.writing-question-wrapper {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    gap: 6px;
    padding: 2px 0;
    width: 100%;
}

/* Prompt Section styling */
.prompt-section {
    width: 100%;
    transition: all 0.3s ease;
}

.prompt-section.side-by-side {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 6px 12px;
    background: #f8fafc;
    border: 1px solid #f1f5f9;
    border-radius: 12px;
    margin-bottom: 1px;
}

.prompt-section.stacked {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.prompt-text-pane {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
    text-align: right;
}

.prompt-image-pane {
    flex-shrink: 0;
    max-width: 160px;
    display: flex;
    justify-content: center;
    align-items: center;
}

.passage-title {
    font-size: 1.1rem;
    font-weight: 900;
    color: #0f172a;
    margin-bottom: 1px;
    text-align: right;
    line-height: 1.3;
}

.writing-instructions-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 8px;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-size: 10px;
    font-weight: 700;
    color: #475569;
    align-self: flex-start;
    margin-bottom: 1px;
    line-height: 1.3;
}

.writing-prompt-content {
    font-size: 1.05rem;
    line-height: 2.2;
    font-weight: 600;
    color: #1e293b;
    width: 100%;
    margin-bottom: 1px;
    text-align: right;
}

.writing-prompt-content :deep(p) {
    margin-bottom: 0.15rem;
    display: block;
}

.writing-prompt-content :deep(.blank-line-wrapper) {
    display: inline-flex !important;
    align-items: center !important;
    gap: 8px !important;
    vertical-align: middle !important;
    margin: 4px 6px !important;
    direction: ltr !important;
}

.writing-prompt-content :deep(.blank-line) {
    display: inline-block !important;
    border-bottom: 2px dashed #94a3b8 !important;
    width: 150px !important;
    height: 18px !important;
    vertical-align: middle !important;
    margin: 0 4px !important;
}

.writing-prompt-content :deep(.blank-badge) {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    width: 24px !important;
    height: 24px !important;
    border-radius: 50% !important;
    background-color: var(--brand-primary, #e11d48) !important;
    color: white !important;
    font-size: 12px !important;
    font-weight: 900 !important;
    font-family: sans-serif !important;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15) !important;
}

.passage-short-content {
    font-size: 1rem;
    line-height: 1.5;
    color: #334155;
    width: 100%;
    margin-bottom: 1px;
    text-align: right;
}

/* Tab Selector Styling */
.tab-selector {
    display: flex;
    gap: 0.5rem;
    padding: 0.375rem;
    background: #f1f5f9;
    border-radius: 1rem;
    width: 100%;
}

.tab-button {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    border: none;
    border-radius: 0.75rem;
    background: transparent;
    color: #64748b;
    font-size: 0.875rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.3s ease;
}

.tab-button:hover:not(:disabled) {
    color: #475569;
    background: rgba(255, 255, 255, 0.5);
}

.tab-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.tab-button-active {
    background: white;
    color: var(--brand-primary, #e11d48);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.tab-content {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    gap: 0.375rem;
    animation: fadeInUp 0.3s ease-out;
}

@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(4px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* Rich Editor Outer styling */
.editor-container-outer {
    border: 2px solid #e2e8f0;
    border-radius: 12px;
    background: #ffffff;
    overflow: hidden;
    box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.04);
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 80px;
    width: 100%;
    transition: border-color 0.2s, box-shadow 0.2s;
}

.quill-rich-editor {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    height: 100%;
}

.editor-container-outer:focus-within {
    border-color: var(--brand-primary, #4f46e5);
    box-shadow: inset 0 2px 8px rgba(79, 70, 229, 0.06), 0 0 0 3px rgba(79, 70, 229, 0.08);
}

.editor-container-outer :deep(.ql-toolbar.ql-snow) {
    border: none;
    border-bottom: 1px solid #f1f5f9;
    background: #f8fafc;
    padding: 4px 8px;
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
}

.editor-container-outer :deep(.ql-container.ql-snow) {
    border: none;
    flex: 1;
    overflow-y: auto;
    font-size: 1.1rem;
    font-family: inherit;
}

.editor-container-outer :deep(.ql-editor) {
    padding: 8px 12px;
    line-height: 1.5;
    text-align: right;
    min-height: 100%;
    direction: rtl;
}

.editor-container-outer :deep(.ql-editor.ql-blank::before) {
    left: auto;
    right: 12px;
    font-style: normal;
    color: #94a3b8;
    content: attr(data-placeholder);
}

.writing-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 5px 8px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
}

.toolbar-stats {
    display: flex;
    align-items: center;
    gap: 6px;
}

.stat-badge {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 3px 8px;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-size: 10px;
    font-weight: 800;
    color: #475569;
    letter-spacing: 0.04em;
}

.stat-badge i {
    font-size: 9px;
    color: #94a3b8;
}

.stat-badge.target {
    background: #eef2ff;
    border-color: #c7d2fe;
    color: var(--brand-primary, #4f46e5);
}

.stat-badge.target i {
    color: var(--brand-primary, #4f46e5);
}

.toolbar-controls {
    display: flex;
    align-items: center;
    gap: 4px;
}

.kb-lang-btn {
    height: 28px;
    padding: 0 10px;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-size: 10px;
    font-weight: 800;
    color: #475569;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.15s;
}

.kb-lang-btn:hover {
    border-color: var(--brand-primary, #4f46e5);
    color: var(--brand-primary, #4f46e5);
}

.kb-toggle-btn {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-size: 12px;
    color: #94a3b8;
    cursor: pointer;
    transition: all 0.15s;
}

.kb-toggle-btn:hover {
    border-color: var(--brand-primary, #4f46e5);
    color: var(--brand-primary, #4f46e5);
}

.kb-toggle-btn.active {
    background: var(--brand-primary, #4f46e5);
    border-color: var(--brand-primary, #4f46e5);
    color: #fff;
}

.image-prompt-container {
    width: 100%;
    display: flex;
    justify-content: center;
}

.prompt-image {
    max-width: 100%;
    max-height: 85px; /* Scaled down from 120px to save significant vertical height */
    border-radius: 10px;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.06);
    border: 2px solid #ffffff;
    transition: transform 0.2s ease-in-out;
}

.prompt-image:hover {
    transform: scale(1.03);
}
</style>

