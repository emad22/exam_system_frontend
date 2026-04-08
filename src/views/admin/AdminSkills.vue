<script setup>
import { ref, onMounted } from 'vue';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';

const skills = ref([]);
const loading = ref(true);

const fetchSkills = async () => {
    loading.value = true;
    try {
        const res = await api.get('/admin/skills');
        skills.value = res.data;
    } catch (err) {
        console.error('Failed to load skills', err);
    } finally {
        loading.value = false;
    }
};

const deleteSkill = async (id) => {
    if (!confirm('Are you sure you want to delete this skill? This will affect all bound questions.')) return;
    try {
        await api.delete(`/admin/skills/${id}`);
        skills.value = skills.value.filter(s => s.id !== id);
    } catch (err) {
        alert(err.response?.data?.error || 'Failed to delete skill.');
    }
};

onMounted(fetchSkills);
</script>

<template>
  <AdminLayout>
    <div class="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <!-- Header -->
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center space-y-6 md:space-y-0">
            <div>
                 <h1 class="text-3xl font-black text-slate-800 tracking-tight">Manage Skills</h1>
                 <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">Manage skills and their levels</p>
            </div>
            <router-link to="/admin/skills/create" class="bg-indigo-600 text-white font-black text-[10px] tracking-widest uppercase px-8 py-3.5 rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all">
                Add Skill +
            </router-link>
        </div>

        <div v-if="loading" class="flex flex-col items-center justify-center py-32 space-y-4">
            <div class="w-12 h-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Loading skills...</p>
        </div>

        <div v-else>
            <!-- Skills Grid -->
            <div v-if="skills.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div v-for="skill in skills" :key="skill.id"
                    class="premium-card p-10 group overflow-hidden relative">
                    
                    <!-- Decorative Background Element -->
                    <div class="absolute -right-8 -top-8 w-32 h-32 bg-indigo-50/50 rounded-full transition-transform duration-700 group-hover:scale-150"></div>
                    
                    <div class="relative z-10 flex flex-col h-full">
                        <div class="flex items-start justify-between mb-8">
                            <div class="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-3xl group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 transform group-hover:rotate-6">
                                {{ skill.icon || '🧠' }}
                            </div>
                            <div class="flex flex-col items-end">
                                 <div class="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-1">Questions Count</div>
                                 <span class="text-xs font-black text-slate-800 bg-white border border-slate-100 px-3 py-1 rounded-lg shadow-sm">
                                     {{ skill.questions_count || 0 }} Questions
                                 </span>
                            </div>
                        </div>

                        <h3 class="text-2xl font-black text-slate-800 mb-2 tracking-tight uppercase leading-tight">{{ skill.name }}</h3>
                        <p class="text-sm text-slate-400 font-medium mb-10 min-h-[48px] leading-relaxed italic">{{ skill.description || 'Skill waiting for description.' }}</p>
                        
                        <div class="mt-auto space-y-4 pt-6 border-t border-slate-50">
                            <router-link :to="`/admin/skills/${skill.id}/levels`"
                                class="w-full flex items-center justify-center text-[10px] font-black uppercase tracking-[0.2em] bg-indigo-600 text-white hover:bg-indigo-700 px-6 py-4 rounded-2xl shadow-xl shadow-indigo-100 transition-all duration-300 transform active:scale-95">
                                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                Manage Levels
                            </router-link>
                            <div class="flex justify-between items-center px-2">
                                <span class="text-[9px] text-slate-300 font-black tracking-[0.2em] uppercase">Skill ID: #{{ String(skill.id).padStart(3, '0') }}</span>
                                <button @click="deleteSkill(skill.id)"
                                    class="text-[9px] font-black text-rose-300 hover:text-rose-500 transition-colors uppercase tracking-[0.2em]">
                                    DELETE SKILL
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Empty State -->
            <div v-else class="bg-white rounded-[4rem] shadow-[0_32px_120px_rgba(0,0,0,0.02)] border border-slate-100 p-24 text-center group">
                <div class="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 text-5xl group-hover:rotate-12 transition-all duration-500">🧠</div>
                <h3 class="text-3xl font-black text-slate-800 mb-4 tracking-tight uppercase">No Skills Added</h3>
                <p class="text-slate-400 font-medium max-w-sm mx-auto mb-12 text-sm leading-relaxed italic">
                    Add your first skill to start evaluating students.
                </p>
                <router-link to="/admin/skills/create" class="inline-block bg-indigo-600 text-white font-black py-5 px-12 rounded-2xl shadow-xl shadow-indigo-100 hover:shadow-indigo-200 hover:bg-indigo-700 transition transform hover:-translate-y-1 active:scale-95 uppercase tracking-widest text-xs">
                    Add First Skill ➜
                </router-link>
            </div>
        </div>
    </div>
  </AdminLayout>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
    display: none;
}
</style>
