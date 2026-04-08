<script setup>
import { ref, onMounted } from 'vue';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';

const attempts = ref([]);
const loading = ref(true);
const search = ref('');

const fetchReports = async () => {
    loading.value = true;
    try {
        const res = await api.get('/admin/reports');
        attempts.value = res.data.data || res.data;
    } catch (err) {
        console.error('Failed to load reports', err);
    } finally {
        loading.value = false;
    }
};

const filtered = () => {
    if (!search.value) return attempts.value;
    const q = search.value.toLowerCase();
    return attempts.value.filter(a =>
        `${a.student?.first_name} ${a.student?.last_name}`.toLowerCase().includes(q) ||
        a.exam?.title?.toLowerCase().includes(q)
    );
};

const scoreColor = (score) => {
    if (!score && score !== 0) return 'text-gray-400';
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
};

onMounted(fetchReports);
</script>

<template>
  <AdminLayout>
    <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
            Reports & Results
        </h1>
        <div class="flex space-x-3">
            <input v-model="search" type="text" placeholder="Search student or exam..."
                class="bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-sm w-64">
            <button class="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 shadow-sm transition text-sm">
                Export PDF
            </button>
        </div>
    </div>

    <div v-if="loading" class="text-center py-20">
        <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
    </div>

    <div v-else>
        <div v-if="filtered().length > 0" class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table class="w-full text-left">
                <thead class="bg-gray-50 border-b uppercase text-xs font-bold text-gray-400 tracking-wider">
                    <tr>
                        <th class="p-4 pl-6">Student</th>
                        <th class="p-4">Exam</th>
                        <th class="p-4 text-center">Score</th>
                        <th class="p-4 text-center">Status</th>
                        <th class="p-4 pr-6 text-right">Date</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-50 text-sm">
                    <tr v-for="attempt in filtered()" :key="attempt.id" class="hover:bg-gray-50 transition">
                        <td class="p-4 pl-6 flex items-center gap-3">
                            <div class="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                                {{ attempt.student?.first_name?.[0] || 'S' }}{{ attempt.student?.last_name?.[0] || '' }}
                            </div>
                            <div>
                                <div class="font-bold text-gray-900">{{ attempt.student?.first_name }} {{ attempt.student?.last_name }}</div>
                                <div class="text-xs text-gray-400">{{ attempt.student?.email }}</div>
                            </div>
                        </td>
                        <td class="p-4 font-medium text-gray-700">{{ attempt.exam?.title }}</td>
                        <td class="p-4 text-center">
                            <span :class="scoreColor(attempt.overall_score)" class="text-xl font-black">
                                {{ attempt.overall_score !== null ? attempt.overall_score + '%' : '—' }}
                            </span>
                        </td>
                        <td class="p-4 text-center">
                            <span :class="attempt.status === 'completed' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-yellow-100 text-yellow-700 border-yellow-200'"
                                class="px-2 py-1 rounded-full text-xs font-bold uppercase border">
                                {{ attempt.status }}
                            </span>
                        </td>
                        <td class="p-4 pr-6 text-right text-gray-400 text-xs font-medium">
                            {{ new Date(attempt.created_at).toLocaleDateString('en-GB') }}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div v-else class="bg-white rounded-xl shadow-sm border border-gray-100 p-16 text-center">
            <div class="text-6xl mb-4">📈</div>
            <h3 class="text-xl font-bold text-gray-800 mb-2">No Completed Exams Yet</h3>
            <p class="text-gray-500 max-w-sm mx-auto">Reports will appear here once students complete their placement tests.</p>
        </div>
    </div>
  </AdminLayout>
</template>
