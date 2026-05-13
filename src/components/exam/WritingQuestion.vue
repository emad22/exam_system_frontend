<script setup>
import { computed } from 'vue';
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

const textAnswer = computed({
    get: () => props.answer.text_answer || '',
    set: (val) => emit('update:answer', { ...props.answer, text_answer: val })
});

const wordCount = computed(() => {
    const text = textAnswer.value || '';
    return text.trim() ? text.trim().split(/\s+/).length : 0;
});

const { keyboardLayout, showVirtualKeyboard, toggleKeyboardLayout } = useVirtualKeyboard();
</script>

<template>
    <div class="space-y-6 py-4" dir="rtl">
        <!-- Writing Area with Premium Styling -->
        <div class="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/40 relative overflow-hidden group">
            
            <!-- Glass Textarea -->
            <textarea v-model="textAnswer" :disabled="disabled"
                class="w-full bg-slate-50/50 border-2 border-slate-100 rounded-3xl p-8 text-xl font-medium focus:bg-indigo-50/30 focus:border-brand-primary transition-all min-h-[300px] outline-none shadow-inner leading-relaxed resize-none relative z-10"
                placeholder="ابدأ الكتابة هنا..."></textarea>
            
            <!-- Floating Background Decoration -->
            <div class="absolute -bottom-24 -left-24 w-64 h-64 bg-brand-primary/5 rounded-full blur-3xl group-focus-within:bg-brand-primary/10 transition-colors"></div>

            <!-- Integrated Toolbar -->
            <div class="mt-6 flex flex-wrap justify-between items-center gap-4 relative z-10">
                <!-- Stats Badges -->
                <div class="flex items-center gap-3">
                    <div class="px-4 py-2 bg-slate-100 rounded-xl flex items-center gap-3">
                        <i class="pi pi-align-right text-[10px] text-slate-400"></i>
                        <span class="text-[10px] font-black uppercase tracking-widest text-slate-600">الكلمات: {{ wordCount }}</span>
                    </div>
                    <div class="px-4 py-2 bg-indigo-50 rounded-xl flex items-center gap-3 border border-indigo-100/50">
                        <i class="pi pi-flag text-[10px] text-brand-primary"></i>
                        <span class="text-[10px] font-black uppercase tracking-widest text-brand-primary">المستهدف: {{ question.min_words || 0 }} - {{ question.max_words || '∞' }}</span>
                    </div>
                </div>

                <!-- Keyboard Controls -->
                <div class="flex items-center gap-2">
                    <button @click="toggleKeyboardLayout" class="h-10 px-6 bg-white border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-brand-primary hover:border-brand-primary shadow-sm transition-all active:scale-95">
                        {{ keyboardLayout === 'arabic' ? 'English' : 'العربية' }}
                    </button>
                    <button @click="showVirtualKeyboard = !showVirtualKeyboard" 
                        class="w-12 h-10 flex items-center justify-center bg-white border border-slate-100 rounded-xl shadow-sm hover:border-brand-primary transition-all group active:scale-95"
                        :class="showVirtualKeyboard ? 'border-brand-primary text-brand-primary' : 'text-slate-400'">
                        <i class="pi pi-keyboard text-lg"></i>
                    </button>
                </div>
            </div>

            <!-- Virtual Keyboard -->
            <VirtualKeyboard v-if="showVirtualKeyboard && !disabled" 
                v-model="textAnswer" 
                :layout="keyboardLayout"
                class="mt-8 animate-in slide-in-from-bottom-6 duration-500" />
        </div>
    </div>
</template>
