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

// Helper to strip HTML tags from option text for internal checks or abbreviations
const stripHtml = (value) => {
    if (!value) return '';
    return value.replace(/<[^>]*>/g, '').trim();
};

// Helper to determine if an option is "True" or "False" based on text or common patterns
const getOptionType = (opt) => {
    const text = stripHtml(opt.option_text).toLowerCase();
    if (text === 'true' || text === 'صواب' || text === 'صح') return 'true';
    if (text === 'false' || text === 'خطأ' || text === 'خطا') return 'false';
    return 'default';
};

const getOptionAbbreviation = (opt) => {
    const text = stripHtml(opt.option_text);
    return text ? text.charAt(0) : '';
};
</script>

<template>
    <div class="grid grid-cols-2 gap-4 py-4" dir="rtl">
        <button v-for="opt in question.options" :key="opt.id"
            @click="selectedOptionId = opt.id" 
            :disabled="disabled"
            class="relative flex flex-col items-center justify-center p-8 rounded-2xl border-2 transition-all duration-300 group overflow-hidden"
            :class="[
                selectedOptionId === opt.id
                    ? (getOptionType(opt) === 'true' 
                        ? 'border-emerald-500 bg-emerald-50/50 ring-4 ring-emerald-500/10 ' 
                        : getOptionType(opt) === 'false'
                            ? 'border-rose-500 bg-rose-50/50 ring-4 ring-rose-500/10 '
                            : 'border-brand-primary bg-indigo-50/50 ring-4 ring-indigo-500/10 ')
                    : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50 bg-white shadow-sm'
            ]">
            
            <!-- Background Accent for Selected -->
            <div v-if="selectedOptionId === opt.id" 
                class="absolute -top-12 -right-12 w-24 h-24 rounded-full opacity-10"
                :class="getOptionType(opt) === 'true' ? 'bg-emerald-500' : (getOptionType(opt) === 'false' ? 'bg-rose-500' : 'bg-brand-primary')">
            </div>

            <!-- Icon Circle -->
            <div class="w-16 h-16 rounded-2xl border-2 flex items-center justify-center mb-4 transition-all duration-300 shadow-sm"
                :class="[
                    selectedOptionId === opt.id
                        ? (getOptionType(opt) === 'true' 
                            ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-200 rotate-0' 
                            : getOptionType(opt) === 'false'
                                ? 'bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-200 rotate-0'
                                : 'bg-brand-primary border-brand-primary text-white shadow-lg shadow-indigo-200 rotate-0')
                        : 'bg-slate-50 border-slate-100 text-slate-300 group-hover:border-slate-200'
                ]">
                <template v-if="getOptionType(opt) === 'true'">
                    <i class="pi pi-check text-2xl font-black"></i>
                </template>
                <template v-else-if="getOptionType(opt) === 'false'">
                    <i class="pi pi-times text-2xl font-black"></i>
                </template>
                <template v-else>
                    <span class="text-xl font-black">{{ getOptionAbbreviation(opt) }}</span>
                </template>
            </div>

            <!-- Option Text -->
            <span class="font-black text-xl tracking-tight transition-colors duration-300"
                :class="selectedOptionId === opt.id ? 'text-slate-900' : 'text-slate-500 group-hover:text-slate-700'"
                v-html="opt.option_text">
            </span>

            <!-- Subtle "Selected" Badge -->
            <div v-if="selectedOptionId === opt.id" 
                class="mt-3 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest"
                :class="getOptionType(opt) === 'true' ? 'bg-emerald-100 text-emerald-700' : (getOptionType(opt) === 'false' ? 'bg-rose-100 text-rose-700' : 'bg-indigo-100 text-indigo-700')">
                Selected
            </div>
        </button>
    </div>
</template>

<style scoped>
.pi {
    line-height: 1;
}
</style>
