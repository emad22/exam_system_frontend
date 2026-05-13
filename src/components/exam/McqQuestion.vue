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

const selectedOptionId = computed({
    get: () => props.answer.option_id,
    set: (val) => emit('update:answer', { ...props.answer, option_id: val })
});
</script>

<template>
    <div class="space-y-3 py-2" dir="rtl">
        <button v-for="(opt, oIdx) in question.options" :key="opt.id"
            @click="selectedOptionId = opt.id" 
            :disabled="disabled"
            class="w-full p-4 rounded-2xl border-2 transition-all duration-300 flex flex-row-reverse items-center gap-4 group relative overflow-hidden"
            :class="selectedOptionId === opt.id
                ? 'border-brand-primary bg-indigo-50/40 ring-4 ring-indigo-500/5 shadow-md scale-[1.01]'
                : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50 bg-white shadow-sm hover:shadow-md'">
            
            <!-- Selection Indicator Dot (Top Right) -->
            <div v-if="selectedOptionId === opt.id" 
                class="absolute top-2 left-2 w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse">
            </div>

            <!-- Option Letter/Icon -->
            <div class="w-10 h-10 rounded-xl border-2 flex items-center justify-center shrink-0 transition-all duration-300 shadow-sm"
                :class="selectedOptionId === opt.id
                    ? 'bg-brand-primary border-brand-primary text-white scale-110 shadow-lg shadow-indigo-200 rotate-0'
                    : 'bg-slate-50 border-slate-100 text-slate-400 group-hover:border-slate-200 group-hover:bg-white'">
                <span v-if="selectedOptionId !== opt.id"
                    class="text-sm font-black tracking-tight">{{ String.fromCharCode(65 + oIdx) }}</span>
                <i v-else class="pi pi-check text-xs font-black"></i>
            </div>

            <!-- Option Content -->
            <div class="flex flex-col items-start grow text-right">
                <span class="font-bold tracking-tight leading-snug text-lg transition-colors duration-300"
                    :class="selectedOptionId === opt.id ? 'text-indigo-950' : 'text-slate-700 group-hover:text-slate-900'"
                    dir="auto">{{ opt.option_text }}</span>
            </div>

            <!-- Hover Effect Background -->
            <div class="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-50/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none"></div>
        </button>
    </div>
</template>
