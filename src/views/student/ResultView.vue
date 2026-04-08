<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import api from '@/services/api';

const route = useRoute();
const attemptId = route.params.id;
const results = ref([]);
const totalScore = ref(0);
const loading = ref(true);

onMounted(async () => {
  try {
    const res = await api.get(`/attempts/${attemptId}/results`);
    results.value = res.data.skill_results;
    totalScore.value = res.data.total_score;
  } catch (err) {
    console.error('Failed to load results', err);
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div v-if="loading" class="flex items-center justify-center min-h-screen">
    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>

  <div v-else class="max-w-4xl mx-auto p-6 bg-white shadow-xl rounded-2xl mt-12 overflow-hidden">
    <!-- Result Header -->
    <div class="bg-blue-600 p-8 text-center text-white">
      <h1 class="text-4xl font-bold mb-2">Exam Completed!</h1>
      <p class="text-xl opacity-90">Great job! Here is your proficiency breakdown.</p>
      <div class="mt-6 text-6xl font-black">{{ totalScore }}</div>
      <div class="text-sm uppercase tracking-widest mt-2 font-bold opacity-75">Total Score</div>
    </div>

    <!-- Levels breakdown -->
    <div class="p-8">
      <h2 class="text-2xl font-bold mb-8 text-gray-800">Skill Proficiency Levels (1-9)</h2>
      <div class="space-y-8">
        <div v-for="skill in results" :key="skill.name" class="flex flex-col">
          <div class="flex justify-between items-center mb-2">
            <span class="font-bold text-lg text-gray-700">{{ skill.name }}</span>
            <span class="bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-bold">Level {{ skill.level }}</span>
          </div>
          <!-- Level Progress Visualizer -->
          <div class="flex gap-1 h-3">
            <div v-for="i in 9" :key="i" class="flex-1 rounded-sm transition-all duration-1000" :class="i <= skill.level ? 'bg-blue-600' : 'bg-gray-100'"></div>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="mt-12 flex justify-center">
        <router-link to="/dashboard" class="bg-gray-800 text-white px-10 py-4 rounded-xl font-bold hover:bg-black transition">
          Back to Dashboard
        </router-link>
      </div>
    </div>
  </div>
</template>
