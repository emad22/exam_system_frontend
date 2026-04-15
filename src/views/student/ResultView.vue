<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '@/services/api';

const route  = useRoute();
const router = useRouter();
const attemptId = route.params.id;

const results   = ref([]);
const loading   = ref(true);
const hasError  = ref(false);

onMounted(async () => {
  try {
    const res = await api.get(`/attempts/${attemptId}/results`);
    results.value = res.data.skill_results || [];
  } catch (err) {
    console.error('Failed to load results', err);
    hasError.value = true;
  } finally {
    loading.value = false;
  }
});

// Map max_level_reached to a descriptive label (no numeric score)
const levelLabel = (level) => {
  if (level >= 9) return { text: 'متقدم جداً', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' };
  if (level >= 7) return { text: 'متقدم', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' };
  if (level >= 5) return { text: 'متوسط', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' };
  if (level >= 3) return { text: 'مبتدئ متقدم', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' };
  return { text: 'مبتدئ', color: 'text-slate-500', bg: 'bg-slate-50 border-slate-200' };
};
</script>

<template>
  <div class="min-h-screen bg-[#F8FAFC] font-sans text-slate-900">

    <!-- Top accent bar -->
    <div class="h-1.5 w-full bg-[#004a99]"></div>

    <!-- Loading -->
    <div v-if="loading" class="flex flex-col items-center justify-center min-h-screen space-y-6">
      <div class="w-12 h-12 border-4 border-slate-100 border-t-[#004a99] rounded-full animate-spin"></div>
      <p class="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">جاري تحميل النتائج...</p>
    </div>

    <!-- Error -->
    <div v-else-if="hasError" class="max-w-xl mx-auto py-32 text-center space-y-6">
      <div class="text-5xl grayscale opacity-20">⚠️</div>
      <h2 class="text-xl font-black text-slate-700">تعذّر تحميل النتائج</h2>
      <button @click="router.push('/dashboard')" class="bg-[#004a99] text-white px-8 py-3 rounded-2xl font-bold text-sm">
        العودة للوحة التحكم
      </button>
    </div>

    <!-- Results -->
    <div v-else class="max-w-3xl mx-auto px-6 py-16 space-y-16">

      <!-- Header Card -->
      <div class="bg-white border border-slate-100 rounded-[3rem] p-12 text-center shadow-xl shadow-slate-100 relative overflow-hidden">
        <!-- Decoration -->
        <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#004a99] via-indigo-400 to-[#004a99] opacity-60 rounded-t-[3rem]"></div>

        <div class="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto mb-8 text-4xl shadow-sm">
          🎓
        </div>

        <div class="inline-flex items-center space-x-2 bg-emerald-50 text-emerald-600 border border-emerald-100 px-4 py-1.5 rounded-full mb-6">
          <i class="pi pi-check-circle text-[11px]"></i>
          <span class="text-[9px] font-black uppercase tracking-[0.2em]">اكتملت الجلسة بنجاح</span>
        </div>

        <h1 class="text-3xl md:text-4xl font-black text-slate-800 tracking-tight mb-3">
          أُحسنت! لقد أتممت تقييمك
        </h1>
        <p class="text-slate-400 font-medium text-sm max-w-md mx-auto leading-relaxed">
          تم تسجيل إجاباتك وإرسالها إلى الجهة الأكاديمية للمراجعة. ستُبلَّغ بنتيجتك النهائية من خلال الإدارة.
        </p>
      </div>

      <!-- Skill Summary (no numeric scores) -->
      <div v-if="results.length" class="space-y-6">
        <div class="flex items-center space-x-3">
          <div class="w-1.5 h-6 bg-[#004a99] rounded-full"></div>
          <h2 class="text-sm font-black text-slate-700 uppercase tracking-[0.2em]">ملخص المهارات</h2>
        </div>

        <div class="space-y-4">
          <div v-for="skill in results" :key="skill.name"
               class="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex items-center justify-between">

            <div class="flex items-center space-x-4">
              <div class="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-xl">
                {{ skill.name?.toLowerCase().includes('listening') ? '🎧' :
                   skill.name?.toLowerCase().includes('reading') ? '📖' :
                   skill.name?.toLowerCase().includes('writing') ? '✍️' :
                   skill.name?.toLowerCase().includes('speaking') ? '🗣️' : '📋' }}
              </div>
              <div>
                <p class="font-black text-slate-800 text-sm">{{ skill.name }}</p>
                <p class="text-[10px] text-slate-400 font-medium uppercase tracking-widest mt-0.5">وحدة تقييم مكتملة</p>
              </div>
            </div>

            <!-- Level badge — descriptive only, no numeric score -->
            <div :class="levelLabel(skill.level).bg" class="border px-4 py-1.5 rounded-full">
              <span :class="levelLabel(skill.level).color" class="text-[10px] font-black uppercase tracking-widest">
                {{ levelLabel(skill.level).text }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Notice -->
      <div class="bg-blue-50 border border-blue-100 rounded-2xl p-6 flex items-start space-x-4">
        <i class="pi pi-info-circle text-[#004a99] text-lg mt-0.5"></i>
        <div>
          <p class="text-xs font-black text-[#004a99] mb-1 uppercase tracking-widest">ملاحظة للمتقدم</p>
          <p class="text-xs text-slate-500 font-medium leading-relaxed">
            الدرجات التفصيلية والتقرير الأكاديمي الكامل متاح فقط للإدارة والمنسق الأكاديمي. يمكنك التواصل معهم للاستفسار.
          </p>
        </div>
      </div>

      <!-- CTA -->
      <div class="text-center">
        <button @click="router.push('/dashboard')"
          class="bg-[#004a99] text-white px-14 py-5 rounded-3xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-blue-100 hover:-translate-y-1 hover:shadow-blue-200 active:scale-95 transition-all duration-300">
          العودة إلى لوحة المهارات
        </button>
      </div>

    </div>
  </div>
</template>
