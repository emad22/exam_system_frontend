<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import api from '@/services/api';

const router = useRouter();
const parentCode = ref('');
const error = ref(null);
const loading = ref(false);
const studentData = ref(null);

const checkResults = async () => {
    if(!parentCode.value) {
        error.value = "Please enter a valid Parent Code.";
        return;
    }

    loading.value = true;
    error.value = null;

    try {
        const res = await api.post('/parent/results', { parent_code: parentCode.value });
        studentData.value = res.data;
    } catch (err) {
        error.value = "Invalid Parent Code or no results found.";
    } finally {
        loading.value = false;
    }
};

const formatTime = (dateStr) => {
    return new Date(dateStr).toLocaleString();
};

const navigateToLogin = () => {
    router.push('/login');
};
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div v-if="!studentData" class="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
          <div class="bg-indigo-600 p-8 text-center text-white relative">
              <button @click="navigateToLogin" class="absolute top-4 left-4 text-white opacity-70 hover:opacity-100 text-sm font-medium transition">
                  ← Back
              </button>
              <h1 class="text-3xl font-bold mt-4">Parent Portal</h1>
              <p class="text-indigo-100 mt-2">Track your child's progress</p>
          </div>
          <div class="p-8">
              <form @submit.prevent="checkResults">
                  <div class="mb-6">
                      <label class="block text-gray-700 font-medium mb-2" for="code">Parent Code</label>
                      <input id="code" type="text" v-model="parentCode" class="w-full border-2 border-gray-200 rounded-lg p-3 focus:outline-none focus:border-indigo-500 font-mono tracking-widest text-center uppercase" placeholder="PRNT-123456" />
                  </div>
                  
                  <div v-if="error" class="mb-4 text-red-600 bg-red-50 p-3 rounded-lg text-sm rounded-md font-medium text-center">
                      {{ error }}
                  </div>

                  <button type="submit" :disabled="loading" class="w-full bg-indigo-600 text-white font-bold p-3 rounded-lg hover:bg-indigo-700 transition flex items-center justify-center">
                      <span v-if="loading" class="animate-spin h-5 w-5 mr-3 border-2 border-white border-t-transparent rounded-full"></span>
                      View Results
                  </button>
              </form>
          </div>
      </div>

      <!-- Results View -->
      <div v-if="studentData" class="max-w-4xl w-full bg-white rounded-2xl shadow-xl p-8">
          <div class="flex justify-between items-start mb-8 pb-8 border-b">
              <div>
                  <h2 class="text-3xl font-bold text-gray-800">{{ studentData.student_name }}'s Academic Report</h2>
                  <p class="text-gray-500 mt-1">Current Level: <span class="font-bold text-indigo-600">{{ studentData.student_level || 'Mapping in progress' }}</span></p>
              </div>
              <button @click="studentData = null" class="bg-gray-100 text-gray-600 px-4 py-2 hover:bg-gray-200 rounded-lg font-medium transition">
                  Change Code
              </button>
          </div>
          
          <div v-if="studentData.attempts.length === 0" class="text-center py-10 bg-gray-50 rounded-xl">
             <div class="text-gray-400 text-6xl mb-4">📭</div>
             <p class="text-gray-500 font-medium text-lg">No completed exam attempts yet.</p>
          </div>

          <div v-else class="space-y-4">
              <div v-for="(attempt, index) in studentData.attempts" :key="attempt.id" class="border rounded-xl p-6 hover:shadow-md transition bg-gray-50">
                  <div class="flex justify-between items-center mb-4">
                      <div>
                          <h3 class="text-xl font-bold text-gray-800">{{ attempt.exam.title }}</h3>
                          <p class="text-sm text-gray-500">Completed: {{ formatTime(attempt.finished_at) }}</p>
                      </div>
                      <div class="text-center">
                          <div class="text-3xl font-black text-indigo-600">{{ attempt.overall_score || 0 }}</div>
                          <div class="text-xs uppercase font-bold text-gray-400 tracking-wider mt-1">Total Score</div>
                      </div>
                  </div>

                  <!-- Details can be expanded here based on reports data -->
                  <div class="bg-indigo-50 p-4 rounded-lg flex items-center justify-between">
                     <span class="text-sm font-medium text-indigo-800">Proctoring Status Verified</span>
                     <button class="bg-indigo-600 text-white text-xs px-3 py-1 font-bold rounded hover:bg-indigo-700">Download PDF</button>
                  </div>
              </div>
          </div>
      </div>
  </div>
</template>
