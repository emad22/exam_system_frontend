<script setup>
import { computed, ref, onBeforeUnmount, watch } from 'vue';
import { useMediaUrl } from '@/composables/useMediaUrl';

const props = defineProps({
    question: { type: Object, required: true },
    answer:   { type: Object, required: true },
    disabled: { type: Boolean, default: false }
});

const emit = defineEmits(['update:answer']);
const { resolveUrl } = useMediaUrl();

const selectedOptionId = computed({
    get: () => props.answer.option_id,
    set: (val) => emit('update:answer', { ...props.answer, option_id: val })
});

/* ── layout detection ── */
// كل الاختيارات صور بدون نص → grid
const isImageGrid = computed(() =>
    props.question.options.length > 0 &&
    props.question.options.every(o => o.image_url && !o.option_text)
);

// أي اختيار فيه صوت → layout الصوت
const hasSoundOptions = computed(() =>
    props.question.options.some(o => o.sound_url)
);

/* ── audio playback ── */
const playingId  = ref(null);
const currentAudio = ref(null);

function playSound(opt) {
    if (!opt.sound_url) {
        selectedOptionId.value = opt.id;
        return;
    }

    // لو نفس الزرار → وقّف
    if (playingId.value === opt.id) {
        currentAudio.value?.pause();
        currentAudio.value = null;
        playingId.value = null;
        return;
    }

    // وقّف اللي شغّال
    currentAudio.value?.pause();

    selectedOptionId.value = opt.id;
    const audio = new Audio(resolveUrl(opt.sound_url));
    currentAudio.value = audio;
    playingId.value = opt.id;

    audio.play().catch(() => {});
    audio.onended = () => { playingId.value = null; currentAudio.value = null; };
    audio.onerror = () => { playingId.value = null; currentAudio.value = null; };
}

onBeforeUnmount(() => {
    currentAudio.value?.pause();
    currentAudio.value = null;
});

// ─── إيقاف الصوت وإعادة الضبط عند تغيير السؤال (مثلاً عند الانتقال بين المستويات) ───
watch(
    () => props.question?.id,
    (newId, oldId) => {
        if (newId !== oldId) {
            currentAudio.value?.pause();
            currentAudio.value = null;
            playingId.value = null;
        }
    }
);
</script>

<template>
    <div dir="rtl">

        <!-- ══════════════════════════════════════
             LAYOUT 1 — Image-only grid
        ══════════════════════════════════════ -->
        <div v-if="isImageGrid"
             class="grid gap-3 py-1"
             :class="question.options.length <= 2 ? 'grid-cols-2' : 'grid-cols-2'">

            <button v-for="(opt, oIdx) in question.options" :key="opt.id"
                @click="selectedOptionId = opt.id"
                :disabled="disabled"
                class="relative rounded-2xl overflow-hidden border-2 transition-all duration-300 group shadow-sm"
                style="aspect-ratio: 4/3;"
                :class="selectedOptionId === opt.id
                    ? 'border-brand-primary ring-4 ring-indigo-500/25 shadow-lg scale-[1.02]'
                    : 'border-slate-200 hover:border-indigo-400 hover:shadow-lg hover:scale-[1.02]'">

                <!-- الصورة -->
                <img :src="resolveUrl(opt.image_url)"
                     class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                     :alt="`option ${oIdx + 1}`" />

                <!-- overlay عند hover -->
                <div class="absolute inset-0 bg-gradient-to-t from-indigo-900/50 via-transparent to-transparent
                            opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                </div>

                <!-- overlay عند الاختيار -->
                <div v-if="selectedOptionId === opt.id"
                     class="absolute inset-0 bg-indigo-500/10 pointer-events-none">
                </div>

                <!-- علامة الصح لما يتاختار -->
                <div v-if="selectedOptionId === opt.id"
                     class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                            w-12 h-12 rounded-full bg-brand-primary/90 flex items-center justify-center shadow-xl">
                    <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
                    </svg>
                </div>

                <!-- رقم الاختيار (A B C D) -->
                <div class="absolute top-2 right-2 w-7 h-7 rounded-full text-xs font-black
                            flex items-center justify-center shadow-md transition-all duration-300"
                     :class="selectedOptionId === opt.id
                        ? 'bg-brand-primary text-white scale-110'
                        : 'bg-white/85 text-slate-600 group-hover:bg-white'">
                    {{ String.fromCharCode(65 + oIdx) }}
                </div>
            </button>
        </div>

        <!-- ══════════════════════════════════════
             LAYOUT 2 — Sound options
        ══════════════════════════════════════ -->
        <div v-else-if="hasSoundOptions"
             class="grid grid-cols-2 gap-3 py-1">

            <button v-for="(opt, oIdx) in question.options" :key="opt.id"
                @click="playSound(opt)"
                :disabled="disabled"
                class="relative rounded-2xl border-2 p-5 transition-all duration-300 group
                       flex flex-col items-center gap-3 overflow-hidden"
                :class="selectedOptionId === opt.id
                    ? 'border-brand-primary bg-indigo-50/60 shadow-md ring-4 ring-indigo-500/10'
                    : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50 bg-white shadow-sm hover:shadow-md'">

                <!-- دائرة الأيقونة -->
                <div class="relative w-16 h-16 rounded-full flex items-center justify-center
                            transition-all duration-300 shrink-0"
                     :class="selectedOptionId === opt.id
                        ? 'bg-brand-primary shadow-lg shadow-indigo-300/50'
                        : 'bg-slate-100 group-hover:bg-indigo-100'">

                    <!-- حلقات النبض لما بيشتغل -->
                    <template v-if="playingId === opt.id">
                        <span class="absolute inset-0 rounded-full bg-brand-primary/30 animate-ping"></span>
                        <span class="absolute inset-[-5px] rounded-full border-2 border-brand-primary/20 animate-pulse"></span>
                    </template>

                    <!-- أيقونة إيقاف مؤقت -->
                    <svg v-if="playingId === opt.id"
                         class="w-7 h-7 text-white relative z-10"
                         fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                    </svg>

                    <!-- أيقونة تشغيل -->
                    <svg v-else
                         class="w-7 h-7 relative z-10 transition-colors duration-300"
                         :class="selectedOptionId === opt.id ? 'text-white' : 'text-slate-500 group-hover:text-indigo-500'"
                         fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                    </svg>
                </div>

                <!-- نص الاختيار أو حرفه -->
                <div class="text-sm font-bold text-center leading-tight transition-colors duration-300 whitespace-normal break-words"
                      :class="selectedOptionId === opt.id
                        ? 'text-indigo-700'
                        : 'text-slate-500 group-hover:text-indigo-500'"
                      v-html="opt.option_text || `اختيار ${String.fromCharCode(65 + oIdx)}`">
                </div>

                <!-- علامة الاختيار -->
                <div v-if="selectedOptionId === opt.id"
                     class="absolute top-2 left-2 w-5 h-5 rounded-full bg-brand-primary
                            flex items-center justify-center shadow-md">
                    <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
                    </svg>
                </div>

                <!-- shimmer -->
                <div class="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-50/20 to-transparent
                            translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none">
                </div>
            </button>
        </div>

        <!-- ══════════════════════════════════════
             LAYOUT 3 — Default (text / mixed)
        ══════════════════════════════════════ -->
        <div v-else class="space-y-1 py-1 overflow-x-hidden">

            <button v-for="(opt, oIdx) in question.options" :key="opt.id"
                @click="selectedOptionId = opt.id"
                :disabled="disabled"
                class="w-full p-4 rounded-2xl border-2 transition-all duration-300
                       flex flex-row-reverse items-center gap-4 group relative overflow-hidden"
                :class="selectedOptionId === opt.id
                    ? 'border-brand-primary bg-indigo-50/40 ring-4 ring-indigo-500/5 shadow-md'
                    : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50 bg-white shadow-sm hover:shadow-md'">

                <!-- Selection dot -->
                <div v-if="selectedOptionId === opt.id"
                    class="absolute top-2 left-2 w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse">
                </div>

                <!-- Option Content -->
                <div class="flex items-center gap-3 grow">

                    <!-- صورة الاختيار لو موجودة مع نص -->
                    <img v-if="opt.image_url" :src="resolveUrl(opt.image_url)"
                        class="w-20 h-16 object-cover rounded-xl border border-slate-100 shadow-sm shrink-0" />

                    <!-- النص لو موجود -->
                    <div v-if="opt.option_text" :dir="opt.dir || 'ltr'"
                        class="font-bold tracking-tight leading-snug text-lg transition-colors duration-300 grow whitespace-normal break-words"
                        :class="[
                            selectedOptionId === opt.id ? 'text-indigo-950' : 'text-slate-700 group-hover:text-slate-900',
                            opt.dir === 'rtl' ? 'text-right' : 'text-left'
                        ]"
                        v-html="opt.option_text">
                    </div>

                    <!-- لو صورة بس بدون نص — grow فاضي -->
                    <span v-if="!opt.option_text && opt.image_url" class="grow"></span>
                </div>

                <!-- Hover shimmer -->
                <div class="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-50/10 to-transparent
                            translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none">
                </div>
            </button>
        </div>

    </div>
</template>