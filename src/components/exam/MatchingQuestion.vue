<script setup>
import { ref, computed } from 'vue';

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

const matchingAnswers = computed({
    get: () => props.answer.matching_answers || {},
    set: (val) => emit('update:answer', { ...props.answer, matching_answers: val })
});

const selectedMatchSource = ref(null);

const toggleMatchSource = (sourceId) => {
    if (selectedMatchSource.value === sourceId) selectedMatchSource.value = null;
    else selectedMatchSource.value = sourceId;
};

const isAlreadyMatched = (targetText) => {
    return Object.values(matchingAnswers.value).includes(targetText);
};

const completeMatch = (targetText) => {
    if (!selectedMatchSource.value || isAlreadyMatched(targetText) || props.disabled) return;
    const newAnswers = { ...matchingAnswers.value };
    newAnswers[selectedMatchSource.value] = targetText;
    matchingAnswers.value = newAnswers;
    selectedMatchSource.value = null;
};

const currentMatchingLeft = computed(() => {
    return props.question.options.filter(o => o.option_text.includes('|')).map(o => ({
        id: o.id,
        option_text: o.option_text.split('|')[0].trim()
    }));
});

const currentMatchingRight = computed(() => {
    const targets = [];
    props.question.options.forEach(o => {
        if (o.option_text.includes('|')) {
            targets.push(o.option_text.split('|')[1].trim());
        } else {
            targets.push(o.option_text.trim());
        }
    });
    return [...new Set(targets)].map(t => ({ id: t, option_text: t }));
});
</script>

<template>
    <div class="py-4 space-y-8">
        <div class="grid grid-cols-2 gap-8 relative">
            
            <!-- Connection Lines Placeholder (Optional: Could be implemented with SVG for true premium feel) -->
            <div class="absolute inset-0 pointer-events-none flex items-center justify-center">
                <i class="pi pi-link text-slate-100 text-6xl opacity-20"></i>
            </div>

            <!-- Left Side: Source Items -->
            <div class="space-y-4 relative z-8">
                <h4 class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 text-right px-2">القائمة الأولى</h4>
                <button v-for="opt in currentMatchingLeft" :key="opt.id"
                    @click="toggleMatchSource(opt.id)" :disabled="disabled"
                    class="w-[90%] lg:w-[85%] mx-auto p-4 lg:p-5 rounded-2xl border-2 transition-all duration-300 text-base font-bold text-slate-600 flex justify-between items-center group relative overflow-hidden block"
                    :class="[
                        selectedMatchSource === opt.id 
                            ? 'border-brand-primary bg-indigo-50/50 shadow-xl shadow-indigo-100 scale-105 z-20' 
                            : (matchingAnswers[opt.id] 
                                ? 'border-emerald-100 bg-emerald-50/20 opacity-80' 
                                : 'border-slate-100 bg-white hover:border-slate-300 shadow-sm')
                    ]">
                    
                    <div v-if="matchingAnswers[opt.id]" class="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] shrink-0 ml-4">
                        <i class="pi pi-check"></i>
                    </div>

                    <span class="text-right w-full" dir="auto">{{ opt.option_text }}</span>
                    
                    <!-- Selection Indicator -->
                    <div v-if="selectedMatchSource === opt.id" class="w-2 h-8 bg-brand-primary absolute left-10 rounded-r-lg"></div>
                </button>
            </div>

            <!-- Right Side: Target Items -->
            <div class="space-y-4 relative z-8">
                <h4 class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 text-right px-2">القائمة الثانية</h4>
                <button v-for="opt in currentMatchingRight" :key="opt.id"
                    @click="completeMatch(opt.id)"
                    :disabled="disabled || !selectedMatchSource || isAlreadyMatched(opt.id)"
                    class="w-[90%] lg:w-[85%] mx-auto p-4 lg:p-5 rounded-2xl border-2 transition-all duration-300 text-base font-bold text-slate-600 text-right group relative overflow-hidden block"
                    :class="[
                        isAlreadyMatched(opt.id) 
                            ? 'bg-slate-50 border-slate-100 opacity-40 grayscale' 
                            : (selectedMatchSource 
                                ? 'border-brand-primary/30 bg-white hover:bg-brand-primary hover:text-white hover:scale-105 shadow-md' 
                                : 'border-slate-100 bg-white shadow-sm')
                    ]">
                    
                    <span dir="auto" class="block w-full">{{ opt.option_text }}</span>

                    <!-- Matched Indicator -->
                    <div v-if="isAlreadyMatched(opt.id)" class="absolute top-2 left-2 text-[10px] text-slate-400">
                        <i class="pi pi-link"></i>
                    </div>
                </button>
            </div>
        </div>

        <!-- Reset Progress Button (Subtle) -->
        <div v-if="Object.keys(matchingAnswers).length > 0 && !disabled" class="flex justify-center pt-4">
            <button @click="matchingAnswers = {}" class="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-500 transition-colors flex items-center gap-2">
                <i class="pi pi-refresh"></i> إعادة الضبط
            </button>
        </div>
    </div>
</template>
