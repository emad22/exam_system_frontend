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
const hasStartedWriting = ref(false); // Controls the active view screens

const textAnswer = computed({
    get: () => props.answer.text_answer || '',
    set: (val) => emit('update:answer', { ...props.answer, text_answer: val })
});

const editorRef = ref(null);
let quillInstance = null;
const forceUpdateCounter = ref(0);

const plainTextContent = computed(() => {
    forceUpdateCounter.value;
    if (quillInstance) {
        return quillInstance.getText().trim();
    }
    return (textAnswer.value || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
});

const wordCount = computed(() => {
    const words = plainTextContent.value.split(/\s+/).filter(w => w.length > 0);
    return words.length;
});

const charCount = computed(() => {
    return plainTextContent.value.replace(/\s+/g, '').length;
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
    await nextTick();
});

// Initialize Quill only when entering the editor view for the first time
watch(hasStartedWriting, async (isWriting) => {
    if (isWriting) {
        await nextTick();
        if (editorRef.value && !quillInstance) {
            quillInstance = new Quill(editorRef.value, {
                theme: 'snow',
                modules: {
                    toolbar: [
                        ['undo', 'redo'],
                        ['bold', 'italic', 'underline'],
                        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                        [{ 'direction': [] }, { 'align': [] }],
                        ['clean']
                    ],
                    keyboard: {
                        bindings: {
                            undo: { key: 'Z', shortKey: true, handler: function() { this.quill.history.undo(); } },
                            redo: { key: 'Y', shortKey: true, handler: function() { this.quill.history.redo(); } }
                        }
                    }
                },
                placeholder: 'Start Writing Here...'
            });

            quillInstance.root.innerHTML = textAnswer.value;

            quillInstance.on('text-change', () => {
                textAnswer.value = quillInstance.root.innerHTML;
                forceUpdateCounter.value++;
            });

            if (props.disabled) {
                quillInstance.enable(false);
            }
        }
        
        // Add custom undo/redo icons
        const toolbar = quillInstance.getModule('toolbar');
        if (toolbar) {
            const undoBtn = toolbar.container.querySelector('.ql-undo');
            const redoBtn = toolbar.container.querySelector('.ql-redo');
            if (undoBtn) undoBtn.innerHTML = '<svg viewBox="0 0 18 18"><path class="ql-fill ql-stroke" d="M8.5,4L5,7.5L8.5,11V8c3.5,0,5,2.5,5,5c0-1-1-5-6-5V4z"></path></svg>';
            if (redoBtn) redoBtn.innerHTML = '<svg viewBox="0 0 18 18"><path class="ql-fill ql-stroke" d="M9.5,4l3.5,3.5L9.5,11V8c-3.5,0-5,2.5-5,5c0-1,1-5,6-5V4z"></path></svg>';
            
            if (undoBtn) undoBtn.addEventListener('click', () => quillInstance.history.undo());
            if (redoBtn) redoBtn.addEventListener('click', () => quillInstance.history.redo());
        }
    }
});

// Sync Keyboard Toggle
watch(showVirtualKeyboard, (newVal) => {
    if (newVal) {
        registerKeyPressListener(handleVirtualKeyboardKeyPress);
    } else {
        unregisterKeyPressListener();
    }
}, { immediate: true });

watch(() => activeTab.value, async (newTab) => {
    if (newTab === 'write' && quillInstance) {
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
    showVirtualKeyboard.value = false; // Ensure keyboard closes totally if we navigate away
});
</script>

<template>
    <div class="writing-question-wrapper" dir="ltr">
        
        <!-- ============================================== -->
        <!-- STATE 1: TOPICS AND INSTRUCTIONS PANEL         -->
        <!-- ============================================== -->
        <div v-show="!hasStartedWriting" class="topics-view animate-in fade-in zoom-in-95 duration-300 w-full" dir="ltr">
            
            <!-- Instructions Banner -->
            <div class="bg-white rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-col overflow-hidden">
                <div class="flex items-center gap-2 p-4 border-b border-slate-100 bg-slate-50/50">
                    <div class="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-sm">
                        <i class="pi pi-info text-xs font-black"></i>
                    </div>
                    <span class="font-black text-slate-800 text-[15px] tracking-wide">Instructions</span>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100 bg-white">
                    <div class="p-6 flex flex-col gap-3 hover:bg-slate-50/30 transition-colors">
                        <div class="flex items-center gap-2 text-blue-700 font-bold text-sm tracking-wide">
                            <i class="pi pi-check-square"></i> 1. Choose ONE topic only.
                        </div>
                        <p class="text-xs text-slate-500 font-semibold leading-relaxed">
                            Select the topic you want to write about from the list.
                        </p>
                    </div>
                    
                    <div class="p-6 flex flex-col gap-3 hover:bg-slate-50/30 transition-colors">
                        <div class="flex items-center gap-2 text-blue-700 font-bold text-sm tracking-wide">
                            <i class="pi pi-pencil"></i> 2. Write your answer.
                        </div>
                        <p class="text-xs text-slate-500 font-semibold leading-relaxed">
                            You may write your answer directly in the text box using the Arabic keyboard.
                        </p>
                    </div>
                    
                    <div class="p-6 flex flex-col gap-3 hover:bg-slate-50/30 transition-colors">
                        <div class="flex items-center gap-2 text-blue-700 font-bold text-sm tracking-wide">
                            <i class="pi pi-cloud-upload"></i> 3. Upload your answer (optional).
                        </div>
                        <p class="text-xs text-slate-500 font-semibold leading-relaxed">
                            You can upload your answer as a file<br>(DOC, DOCX, PDF, PNG, JPG).
                        </p>
                    </div>
                </div>
            </div>

            <!-- Topics Container -->
            <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-10 mb-8 flex flex-col items-center">
                <div class="flex flex-col items-center justify-center gap-1 mb-8">
                    <div class="flex items-center gap-2 font-black text-lg text-slate-800">
                        <span class="font-arabic">موضوعات الكتابة</span>
                        <i class="pi pi-clipboard text-blue-600 text-lg"></i>
                    </div>
                    <span class="text-xs font-black tracking-widest text-[#1e293b] uppercase">Writing Topics</span>
                </div>
                
                <!-- The actual topics from content -->
                <div v-if="question.content" 
                     class="writing-prompt-content w-full"
                     dir="auto" 
                     v-html="cleanHtml(question.content)">
                </div>
            </div>

            <!-- Start Writing Button -->
            <div class="flex justify-center pb-4">
                <button @click="hasStartedWriting = true" 
                        class="bg-[#2563EB] hover:bg-blue-700 active:scale-95 text-white font-black text-xs uppercase tracking-widest px-14 py-4 rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center gap-3">
                    <span>Start Writing</span>
                    <i class="pi pi-pencil"></i>
                </button>
            </div>
        </div>

        <!-- ============================================== -->
        <!-- STATE 2: EDITOR PANEL                          -->
        <!-- ============================================== -->
        <div v-show="hasStartedWriting" class="editor-view flex flex-col w-full h-full animate-in fade-in duration-300" dir="ltr">
            
            <!-- Top Controls (Show Topics + Tabs) -->
            <div class="flex flex-col md:flex-row items-center justify-between mb-4 border-b border-slate-200 pb-2 gap-4">
                
                <!-- Back Button -->
                <button @click="hasStartedWriting = false; showVirtualKeyboard = false" 
                        class="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-bold text-xs uppercase tracking-wider px-3 py-2 rounded-lg hover:bg-slate-100 transition-all self-start md:self-auto">
                    <i class="pi pi-arrow-left"></i> Show Topics
                </button>

                <!-- Tabs -->
                <div class="flex items-center gap-8 px-4">
                    <button @click="activeTab = 'write'"
                        class="pb-3 text-sm font-black flex items-center gap-2 transition-all relative"
                        :class="activeTab === 'write' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'">
                        <i class="pi pi-pen-to-square text-base"></i> Write Text
                        <div v-if="activeTab === 'write'" class="absolute -bottom-2.5 left-0 right-0 h-1 bg-blue-600 rounded-t-full"></div>
                    </button>
                    <button @click="activeTab = 'upload'"
                        class="pb-3 text-sm font-black flex items-center gap-2 transition-all relative"
                        :class="activeTab === 'upload' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'">
                        <i class="pi pi-cloud-upload text-base"></i> Upload File
                        <div v-if="activeTab === 'upload'" class="absolute -bottom-2.5 left-0 right-0 h-1 bg-blue-600 rounded-t-full"></div>
                    </button>
                </div>
                
                <!-- Empty div for centering balance on desktop -->
                <div class="hidden md:block w-[130px]"></div>
            </div>

            <!-- Tab Content: Write -->
            <div v-show="activeTab === 'write'" class="flex flex-col flex-1 min-h-[400px]">
                <div class="editor-container-outer flex-1 border border-slate-200 rounded-t-xl bg-white focus-within:border-blue-500 focus-within:shadow-[0_0_0_1px_#3b82f6] transition-all">
                    <div ref="editorRef" class="quill-rich-editor w-full h-full font-arabic text-right"></div>
                </div>
                
                <!-- Bottom Toolbar (Keyboard Toggle & Counts) -->
                <div class="flex items-center justify-between bg-white border border-t-0 border-slate-200 rounded-b-xl px-4 py-3 shadow-sm">
                    <!-- Keyboard Toggle -->
                    <button 
                        @click="showVirtualKeyboard = !showVirtualKeyboard"
                        class="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-md border transition-all"
                        :class="showVirtualKeyboard 
                                ? 'bg-[#EDF3FF]/30 border-blue-600 outline outline-1 outline-blue-600 text-blue-700 shadow-sm' 
                                : 'bg-transparent border-slate-300 text-slate-700 hover:bg-slate-50'">
                        <i class="pi pi-keyboard text-lg"></i>
                        Arabic Keyboard
                    </button>

                    <!-- Stats / Word Count -->
                    <div class="flex items-center gap-6 text-[11px] font-black uppercase tracking-widest text-slate-500">
                        <span class="flex items-center gap-2">Words: <span class="text-slate-900 border border-slate-200 bg-slate-50 px-2 py-0.5 rounded">{{ wordCount }}</span></span>
                        <span class="flex items-center gap-2">Characters: <span class="text-slate-900 border border-slate-200 bg-slate-50 px-2 py-0.5 rounded">{{ charCount }}</span></span>
                    </div>
                </div>
            </div>

            <!-- Tab Content: Upload -->
            <div v-show="activeTab === 'upload'" class="flex flex-col flex-1 pb-4">
                <FileUpload 
                    class="w-full"
                    :accepted-types="['image', 'document']"
                    :max-size="50 * 1024 * 1024"
                    :disabled="disabled"
                    @file-selected="handleFileSelected"
                    @file-removed="handleFileRemoved" />
            </div>

        </div>
    </div>
</template>

<style scoped>
.writing-question-wrapper {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    width: 100%;
}

.font-arabic {
    font-family: 'Lotus Linotype', 'Myriad Arabic', 'Cairo', 'Inter', system-ui, -apple-system, sans-serif !important;
}

/* Prompt Content Styling to match design */
.writing-prompt-content {
    font-size: 26px; /* slightly smaller than 30px to fit multiple topics nicely */
    line-height: 2 !important;
    color: #1e293b;
    text-align: center;
}

.writing-prompt-content :deep(p),
.writing-prompt-content :deep(div),
.writing-prompt-content :deep(span) {
    font-family: 'Lotus Linotype', 'Myriad Arabic', 'Cairo', 'Inter', system-ui, -apple-system, sans-serif !important;
}

.writing-prompt-content :deep(p) {
    margin-bottom: 0.3rem;
    display: block;
}

/* Base Editor Styles */
.editor-container-outer {
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.quill-rich-editor {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    height: 100%;
}

.editor-container-outer :deep(.ql-toolbar) {
    border: none;
    border-bottom: 1px solid #f1f5f9;
    background: #f8f9fa;
    padding: 8px 12px;
    display: flex;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 4px;
}

.editor-container-outer :deep(.ql-toolbar .ql-formats) {
    margin-right: 0;
    margin-left: 15px;
}

.editor-container-outer :deep(.ql-container) {
    border: none;
    flex: 1;
    overflow-y: auto;
    font-size: 24px; /* Larger font size internally for Arabic typing */
}

.editor-container-outer :deep(.ql-editor) {
    padding: 16px 20px;
    line-height: 1.8;
    min-height: 100%;
    /* Let the editor take over font choices automatically based on the wrapper */
}

.editor-container-outer :deep(.ql-editor.ql-blank::before) {
    left: auto;
    right: 20px;
    font-style: normal;
    color: #94a3b8;
    font-family: inherit;
    content: attr(data-placeholder);
}
</style>
