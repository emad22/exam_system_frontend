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

const dragDropAnswers = computed({
    get: () => props.answer.drag_drop_answers || [],
    set: (val) => emit('update:answer', { ...props.answer, drag_drop_answers: val })
});

const parsedDragDropContent = (content) => {
    if (!content) return [];
    return content.split(/\.{10,}|\[\s*target\s*\]|\[\s*\]/gi);
};

const onDragStart = (event, option) => {
    if (props.disabled) return;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('option', JSON.stringify(option));
};

const onDrop = (event, slotIdx) => {
    if (props.disabled) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';

    try {
        const data = event.dataTransfer.getData('option');
        if (!data) return;
        const option = JSON.parse(data);

        const newAnswers = [...dragDropAnswers.value];
        newAnswers[slotIdx] = option.option_text;
        dragDropAnswers.value = newAnswers;
    } catch (err) {
        console.error('Drop processing failed:', err);
    }
};

const clearSlot = (slotIdx) => {
    if (props.disabled) return;
    const newAnswers = [...dragDropAnswers.value];
    newAnswers[slotIdx] = null;
    dragDropAnswers.value = newAnswers;
};
</script>

<template>
    <div class="space-y-8 py-4">
        <!-- Main Content Area with Glassmorphism -->
        <div class="bg-white/80 backdrop-blur-sm p-8 rounded-[2rem] border border-slate-100 leading-[2.8] text-lg font-medium text-slate-800 shadow-xl shadow-slate-200/50 relative overflow-hidden rtl-support"
            dir="auto">

            <!-- Subtle Background Pattern -->
            <div
                class="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#4f46e5_1px,transparent_1px)] [background-size:20px_20px]">
            </div>

            <template v-for="(part, pIdx) in parsedDragDropContent(question.content)" :key="pIdx">
                <span v-html="part" class="relative z-10"></span>
                <span v-if="pIdx < parsedDragDropContent(question.content).length - 1" @dragover.prevent
                    @dragenter.prevent @drop="onDrop($event, pIdx)"
                    class="inline-flex items-center justify-center min-w-[120px] h-9 mx-1 px-4 rounded-lg border-2 border-dashed transition-all relative top-1.5 group"
                    :class="dragDropAnswers[pIdx]
                        ? 'bg-indigo-50 border-brand-primary border-solid text-brand-primary font-black text-sm shadow-sm'
                        : 'bg-white border-slate-300 shadow-inner text-xl font-black text-slate-400 hover:border-brand-primary hover:bg-slate-50'">
                    <span v-html="dragDropAnswers[pIdx] || '..........'"></span>
                    <button v-if="dragDropAnswers[pIdx] && !disabled" @click="clearSlot(pIdx)"
                        class="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-rose-500 text-white rounded-full flex items-center justify-center text-[7px] shadow-sm">
                        <i class="pi pi-times"></i>
                    </button>
                </span>
            </template>
        </div>
        <div class="flex flex-wrap gap-2 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
            <div v-for="opt in question.options" :key="opt.id" draggable="true" @dragstart="onDragStart($event, opt)"
                class="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-600 cursor-grab hover:bg-brand-primary hover:text-white transition-all shadow-sm"
                v-html="opt.option_text">
            </div>
        </div>
    </div>
</template>
