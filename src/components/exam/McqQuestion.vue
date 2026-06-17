<script setup>
import { computed, onMounted } from 'vue';
import { useMediaUrl } from '@/composables/useMediaUrl';

const props = defineProps({
    question: { type: Object, required: true },
    answer: { type: Object, required: true },
    disabled: { type: Boolean, default: false }
});

const emit = defineEmits(['update:answer']);
const { resolveUrl } = useMediaUrl();

// ← هنا الصح
// onMounted(() => {
//     console.log('options:', JSON.stringify(props.question.options, null, 2));
// });

const selectedOptionId = computed({
    get: () => props.answer.option_id,
    set: (val) => emit('update:answer', { ...props.answer, option_id: val })
});
</script>

<template>
    <div class="space-y-1 py-1" dir="rtl">
        <button v-for="(opt, oIdx) in question.options" :key="opt.id" @click="selectedOptionId = opt.id"
            :disabled="disabled"
            class="w-[calc(100%-20px)] p-4 rounded-2xl border-2 transition-all duration-300 flex flex-row-reverse items-center gap-4 group relative overflow-hidden"
            :class="selectedOptionId === opt.id
                ? 'border-brand-primary bg-indigo-50/40 ring-4 ring-indigo-500/5 shadow-md'
                : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50 bg-white shadow-sm hover:shadow-md'">

            <!-- Selection dot -->
            <div v-if="selectedOptionId === opt.id"
                class="absolute top-2 left-2 w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse">
            </div>

            <!-- Option Content -->
            <div class="flex items-center gap-3 grow">

                <!-- صورة الاختيار لو موجودة -->
                <img v-if="opt.image_url" :src="resolveUrl(opt.image_url)"
                    class="w-20 h-16 object-cover rounded-xl border border-slate-100 shadow-sm shrink-0" />

                <!-- النص لو موجود -->
                <span v-if="opt.option_text" :dir="opt.dir || 'ltr'"
                    class="font-bold tracking-tight leading-snug text-lg transition-colors duration-300 grow" :class="[
                        selectedOptionId === opt.id ? 'text-indigo-950' : 'text-slate-700 group-hover:text-slate-900',
                        opt.dir === 'rtl' ? 'text-right' : 'text-left'
                    ]">
                    {{ opt.option_text }}
                </span>

                <!-- لو صورة بس بدون نص — نص فاضي يملأ المساحة -->
                <span v-if="!opt.option_text && opt.image_url" class="grow"></span>
            </div>

            <!-- Hover shimmer -->
            <div
                class="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-50/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none">
            </div>
        </button>
    </div>
</template>