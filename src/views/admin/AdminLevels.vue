<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';

const route = useRoute();
const skillId = route.params.id;

const skill = ref(null);
const loading = ref(true);
const isSaving = ref(false);

const fetchData = async () => {
    loading.value = true;
    try {
        const res = await api.get(`/admin/skills/${skillId}/levels`);
        skill.value = res.data;
    } catch (err) {
        console.error('Failed to load levels', err);
    } finally {
        loading.value = false;
    }
};

const updateLevel = async (level) => {
    isSaving.value = true;
    try {
        await api.patch(`/admin/levels/${level.id}`, {
            pass_threshold: level.pass_threshold,
            max_score: level.max_score,
            name: level.name,
            min_score: level.min_score
        });
        // Success feedback (subtle)
        console.log('Updated level', level.id);
    } catch (err) {
        alert('Failed to update level.');
    } finally {
        isSaving.value = false;
    }
};

onMounted(fetchData);
</script>

<template>
  <AdminLayout>
    <div v-if="loading" class="flex flex-col items-center justify-center py-20">
        <div class="w-12 h-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
        <p class="text-slate-400 font-bold text-xs uppercase tracking-widest">Loading Config...</p>
    </div>

    <div v-else-if="skill" class="max-w-5xl mx-auto pb-20">
        <!-- Breadcrumbs & Header -->
        <div class="flex items-center space-x-4 mb-8">
            <router-link to="/admin/skills" class="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-100 hover:shadow-sm transition font-bold text-xl">
                ←
            </router-link>
            <div>
                <div class="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                    <router-link to="/admin/skills" class="hover:text-indigo-500 transition">Skills</router-link>
                    <span>/</span>
                    <span class="text-indigo-600">{{ skill.name }}</span>
                </div>
                <h1 class="text-3xl font-black text-slate-800 tracking-tight">Adaptive Leveling Matrix</h1>
            </div>
        </div>

        <!-- Matrix Table -->
        <div class="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
            <div class="p-8 border-b border-slate-50 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h3 class="text-lg font-bold text-slate-800">Dynamic Decision Logic</h3>
                    <p class="text-sm text-slate-500">Define the passing threshold and score ranges for the 9 ACTFL levels.</p>
                </div>
                <div class="flex items-center space-x-2 bg-indigo-50 px-4 py-2 rounded-2xl border border-indigo-100">
                    <span class="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
                    <span class="text-xs font-black text-indigo-700 uppercase tracking-widest">{{ isSaving ? 'Saving Changes...' : 'Autosave Enabled' }}</span>
                </div>
            </div>

            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50/30">
                            <th class="p-6 pl-10 border-b border-slate-50">#</th>
                            <th class="p-6 border-b border-slate-50">Level Name</th>
                            <th class="p-6 border-b border-slate-50 text-center">Score Range</th>
                            <th class="p-6 border-b border-slate-50 text-center" style="width: 300px;">Pass Threshold (%)</th>
                            <th class="p-6 pr-10 border-b border-slate-50 text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-50">
                        <tr v-for="level in skill.levels" :key="level.id" class="hover:bg-slate-50/50 transition duration-150 group">
                            <td class="p-6 pl-10">
                                <div class="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-black text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                    {{ level.level_number }}
                                </div>
                            </td>
                            <td class="p-6">
                                <input v-model="level.name" @blur="updateLevel(level)" 
                                       class="bg-transparent border-none focus:ring-0 p-0 text-sm font-bold text-slate-700 w-full placeholder-slate-300 focus:text-indigo-600 transition">
                            </td>
                            <td class="p-6">
                                <div class="flex items-center justify-center space-x-2">
                                    <input v-model="level.min_score" @blur="updateLevel(level)" type="number" class="w-16 bg-slate-100/50 border-none rounded-lg px-2 py-1 text-center text-xs font-bold text-slate-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition">
                                    <span class="text-slate-300 font-bold">→</span>
                                    <input v-model="level.max_score" @blur="updateLevel(level)" type="number" class="w-16 bg-slate-100/50 border-none rounded-lg px-2 py-1 text-center text-xs font-bold text-slate-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition">
                                </div>
                            </td>
                            <td class="p-6">
                                <div class="flex items-center space-x-4">
                                    <input type="range" v-model.number="level.pass_threshold" @change="updateLevel(level)" min="0" max="100" 
                                           class="flex-1 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600">
                                    <span class="w-12 text-right font-black text-indigo-600 text-sm">{{ level.pass_threshold }}%</span>
                                </div>
                            </td>
                            <td class="p-6 pr-10 text-right">
                                <div :class="level.pass_threshold > 80 ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600'" 
                                     class="inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase border border-opacity-50">
                                    {{ level.pass_threshold > 80 ? 'Rigorous' : (level.pass_threshold > 50 ? 'Balanced' : 'Learning') }}
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Bottom Guidance -->
        <div class="mt-12 flex flex-col items-center text-center">
            <div class="w-12 h-1 w-24 bg-slate-200 rounded-full mb-6"></div>
            <p class="text-slate-400 text-xs font-medium max-w-sm leading-relaxed uppercase tracking-widest space-y-2">
                <span>Adaptive exams will stop the current skill once a student fails to hit the threshold.</span>
                <span class="block mt-2 text-indigo-400 opacity-70">Changes take effect immediately for all active attempts.</span>
            </p>
        </div>
    </div>
  </AdminLayout>
</template>

<style scoped>
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
</style>
