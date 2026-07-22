<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '@/services/api';
import StudentHeader from '@/components/StudentHeader.vue';

const route = useRoute();
const router = useRouter();
const attemptId = route.params.id;

const results = ref([]);
const loading = ref(true);
const hasError = ref(false);

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

</script>

<template>
  <div class="min-h-screen bg-slate-50 font-sans text-slate-900">
    <StudentHeader />

    <!-- Loading -->
    <div v-if="loading" class="flex flex-col items-center justify-center min-h-screen space-y-6">
      <div class="w-12 h-12 border-4 border-slate-100 border-t-brand-primary rounded-full animate-spin"></div>
      <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">loading...</p>
    </div>

    <!-- Error -->
    <div v-else-if="hasError" class="max-w-xl mx-auto py-32 text-center space-y-6">
      <div class="text-5xl grayscale opacity-20">⚠️</div>
      <h2 class="text-xl font-black text-slate-700">failed to load results</h2>
      <button @click="router.push('/skill-selection')"
        class="bg-brand-primary text-white px-8 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-brand-primary/20">
        back to skill selection
      </button>
    </div>

    <!-- Results -->
    <div v-else class="max-w-3xl mx-auto px-6 py-16 space-y-16">

      <!-- Header Card -->
      <div
        class="bg-white border border-slate-200 rounded-[3rem] p-12 text-center shadow-xl shadow-slate-200/50 relative overflow-hidden">
        <!-- Decoration side bar style like the intro -->
        <div class="absolute inset-y-0 left-0 w-2 bg-brand-primary"></div>
        <div class="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-bl-[4rem]"></div>

        <div
          class="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center mx-auto mb-8 text-4xl shadow-sm border border-rose-100/50">
          🎓
        </div>

        <div
          class="inline-flex items-center space-x-2 bg-emerald-50 text-emerald-600 border border-emerald-100 px-4 py-1.5 rounded-full mb-6">
          <i class="pi pi-check-circle text-[11px]"></i>
          <span class="text-[9px] font-black uppercase tracking-[0.2em]">session completed successfully</span>
        </div>

        <h1 class="text-3xl md:text-4xl font-black text-slate-800 tracking-tight mb-3">
          <span class="text-brand-primary">well done</span> 
        </h1>
        <p class="text-slate-500 font-medium text-sm max-w-md mx-auto leading-relaxed">
          your result will be sent to the academic entity for review. you will be notified of your final result through the administration.
        </p>
      </div>

      <!-- CTA -->
      <div class="text-center pt-8">
        <button @click="router.push('/skill-selection')"
          class="bg-brand-primary text-white px-14 py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-brand-primary/20 hover:-translate-y-1 hover:shadow-brand-primary/40 active:scale-95 transition-all duration-300">
          back to skill selection
        </button>
      </div>

    </div>
  </div>
</template>
