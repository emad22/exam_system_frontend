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

const orderingAnswers = computed({
    get: () => props.answer.ordering_answers || [],
    set: (val) => emit('update:answer', { ...props.answer, ordering_answers: val })
});

const currentAvailableWords = computed(() => {
    let available = [...(props.question.options?.map(o => o.option_text) || [])];
    orderingAnswers.value.forEach(word => {
        const idx = available.indexOf(word);
        if (idx !== -1) available.splice(idx, 1);
    });
    return available;
});

const addToOrdering = (word) => {
    if (props.disabled) return;
    const newAnswers = [...orderingAnswers.value];
    newAnswers.push(word);
    orderingAnswers.value = newAnswers;
};

const removeFromOrdering = (idx) => {
    if (props.disabled) return;
    const newAnswers = [...orderingAnswers.value];
    newAnswers.splice(idx, 1);
    orderingAnswers.value = newAnswers;
};
</script>

<template>
    <div class="space-y-8 py-4">
        <!-- Target Area: Sentence Builder -->
        <div class="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 min-h-[140px] flex flex-wrap gap-3 items-center justify-center relative overflow-hidden" dir="rtl">
            
            <!-- Background Decoration -->
            <div class="absolute inset-0 bg-[radial-gradient(#4f46e5_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.03]"></div>

            <template v-if="orderingAnswers.length > 0">
                <button v-for="(word, oIdx) in orderingAnswers" :key="oIdx" 
                    @click="removeFromOrdering(oIdx)" :disabled="disabled"
                    class="px-5 py-2.5 bg-indigo-50 border-2 border-brand-primary text-brand-primary font-black rounded-xl text-base shadow-md hover:scale-105 active:scale-95 transition-all animate-in zoom-in-95 duration-300 relative z-10"
                    v-html="word">
                </button>
            </template>
            <div v-else class="text-slate-300 font-black text-sm uppercase tracking-widest opacity-40">
                <i class="pi pi-pen-to-square"></i> 
            </div>
        </div>

        <!-- Source Area: Available Words -->
        <div class="p-6 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200 flex flex-wrap gap-3 justify-center" dir="rtl">
            <button v-for="(word, wIdx) in currentAvailableWords" :key="wIdx"
                @click="addToOrdering(word)" :disabled="disabled"
                class="px-5 py-2.5 bg-white border border-slate-100 text-slate-600 font-bold rounded-xl text-base hover:border-brand-primary hover:text-brand-primary hover:shadow-xl hover:shadow-indigo-100 transition-all duration-300 shadow-sm active:scale-95"
                v-html="word">
            </button>
        </div>
    </div>
</template>
