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

const { keyboardLayout, showVirtualKeyboard, toggleKeyboardLayout } = useVirtualKeyboard();
</script>

<template>
    <div class="space-y-6 py-4">
        <!-- Input Area with Premium Styling -->
        <div class="bg-white p-12 rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-200/50 flex flex-col items-center gap-8 relative overflow-hidden">
            
            <!-- Background Decoration -->
            <div class="absolute -top-24 -left-24 w-48 h-48 bg-brand-primary/5 rounded-full blur-3xl"></div>
            <div class="absolute -bottom-24 -right-24 w-48 h-48 bg-brand-primary/5 rounded-full blur-3xl"></div>

            <div class="w-full max-w-md relative group">
                <input v-model="textAnswer" :disabled="disabled" type="text"
                    class="w-full px-8 py-5 bg-slate-50 border-b-4 border-slate-200 rounded-t-2xl text-2xl font-black text-slate-800 text-center focus:bg-indigo-50/50 focus:border-brand-primary outline-none transition-all shadow-inner"
                    placeholder="اكتب إجابتك هنا..." dir="auto" />
                
                <!-- Input Glow -->
                <div class="absolute inset-0 bg-brand-primary/10 blur-2xl opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none"></div>
            </div>
            
            <!-- Controls Grid -->
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

            <!-- Virtual Keyboard -->
            <VirtualKeyboard v-if="showVirtualKeyboard && !disabled" 
                v-model="textAnswer" 
                :layout="keyboardLayout" 
                class="w-full animate-in slide-in-from-bottom-4 duration-500" />
        </div>
    </div>
</template>
