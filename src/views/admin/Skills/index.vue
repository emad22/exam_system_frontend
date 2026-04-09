<script setup>
import { ref, onMounted, computed } from 'vue';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';

const skills = ref([]);
const loading = ref(true);
const searchQuery = ref('');

const filteredSkills = computed(() => {
    if (!searchQuery.value) return skills.value;
    const query = searchQuery.value.toLowerCase();
    return skills.value.filter(s => s.name.toLowerCase().includes(query));
});

// Edit Logic
const showEditModal = ref(false);
const editingSkill = ref({ id: null, name: '' });
const isSaving = ref(false);

const openEditModal = (skill) => {
    editingSkill.value = { 
        id: skill.id, 
        name: skill.name
    };
    showEditModal.value = true;
};

const updateSkill = async () => {
    if (!editingSkill.value.name) return;
    isSaving.value = true;
    try {
        await api.patch(`/admin/skills/${editingSkill.value.id}`, {
            name: editingSkill.value.name
        });
        showEditModal.value = false;
        fetchSkills(); // Refresh list
    } catch (err) {
        alert(err.response?.data?.message || 'Failed to update skill.');
    } finally {
        isSaving.value = false;
    }
};

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
        fetchSkills(); // Refresh to ensure correct counts
    } catch (err) {
        alert(err.response?.data?.error || 'Failed to delete skill.');
    }
};

onMounted(fetchSkills);
</script>

<template>
    <AdminLayout>
        <div class="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
            <!-- Header -->
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center space-y-6 md:space-y-0">
                <div>
                    <h1 class="text-3xl font-black text-slate-800 tracking-tight">Manage Skills</h1>
                    <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">Manage skills and their levels</p>
                </div>
                <router-link to="/admin/skills/create"
                    class="bg-indigo-600 text-white px-6 py-3 rounded-xl shadow hover:bg-indigo-700 transition font-bold text-sm">
                    Add Skill +
                </router-link>
            </div>

            <div v-if="loading" class="flex flex-col items-center justify-center py-32 space-y-4">
                <div class="w-12 h-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Loading skills...</p>
            </div>

            <div v-else>
                <!-- Search & Results Container -->
                <div v-if="skills.length > 0 || searchQuery" class="bg-white rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden">
                    
                    <!-- Search Bar -->
                    <div class="p-6 border-b border-slate-50 bg-slate-50/30">
                        <div class="relative w-full max-w-md">
                            <svg class="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                            </svg>
                            <input v-model="searchQuery" type="text" placeholder="Search modules by name..."
                                class="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs uppercase tracking-widest focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all placeholder:text-slate-300 font-bold text-slate-700 shadow-sm">
                        </div>
                    </div>

                    <div v-if="filteredSkills.length > 0" class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50/50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-black text-slate-400 uppercase tracking-widest">ID</th>
                                    <th class="px-6 py-3 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Module Name</th>
                                    <th class="px-6 py-3 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Levels</th>
                                    <th class="px-6 py-3 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Questions Count</th>
                                    <th class="px-6 py-3 text-right text-xs font-black text-slate-400 uppercase tracking-widest">Actions</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-100">
                                <tr v-for="skill in filteredSkills" :key="skill.id" class="hover:bg-slate-50/50 transition-colors">
                                    <td class="px-6 py-4 text-sm text-gray-500">#{{ String(skill.id).padStart(3, '0') }}</td>
                                    <td class="px-6 py-4 text-sm font-medium text-gray-900 uppercase font-black tracking-tight">{{ skill.name }}</td>
                                    <td class="px-6 py-4 text-sm">
                                        <span class="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-indigo-100">{{ skill.levels_count || 0 }} Levels</span>
                                    </td>
                                    <td class="px-6 py-4 text-sm">
                                        <span class="bg-slate-50 text-slate-400 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-100">{{ skill.questions_count || 0 }} Questions</span>
                                    </td>
                                    <td class="px-6 py-4 text-right space-x-2">
                                        <router-link :to="`/admin/skills/${skill.id}/levels`"
                                            class="bg-white border border-slate-200 text-slate-500 font-black text-[9px] tracking-widest uppercase px-4 py-2 rounded-xl hover:border-indigo-100 hover:text-indigo-600 transition shadow-sm inline-block">
                                            Manage Levels
                                        </router-link>
                                        <button @click="openEditModal(skill)"
                                            class="bg-white border border-slate-200 text-slate-500 font-black text-[9px] tracking-widest uppercase px-4 py-2 rounded-xl hover:border-indigo-100 hover:text-indigo-600 transition shadow-sm inline-block">
                                            Edit
                                        </button>
                                        <button @click="deleteSkill(skill.id)"
                                            class="bg-rose-50 border border-rose-100 text-rose-400 font-black text-[9px] tracking-widest uppercase px-4 py-2 rounded-xl hover:bg-rose-500 hover:text-white transition">
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <!-- Empty Search -->
                    <div v-else class="p-20 text-center">
                        <div class="text-4xl mb-4 text-slate-200">🔍</div>
                        <h4 class="text-lg font-black text-slate-400 uppercase tracking-widest">No matching skills found</h4>
                        <p class="text-xs text-slate-300 font-bold mt-2">Try adjusting your search query</p>
                    </div>
                </div>

                <!-- Empty Global State -->
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

        <!-- Edit Skill Modal -->
        <div v-if="showEditModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div class="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 border border-slate-100">
                <!-- Header -->
                <div class="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
                    <div>
                        <h3 class="text-xl font-black text-slate-800 tracking-tight uppercase">Update Skill Profile</h3>
                        <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Refining Academic Module</p>
                    </div>
                    <button @click="showEditModal = false" class="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-50">
                        ✕
                    </button>
                </div>

                <!-- Form Body -->
                <div class="p-8 space-y-6">
                    <div class="space-y-2">
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Module Identity (Name)</label>
                        <input v-model="editingSkill.name" type="text"
                            class="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-black text-slate-700 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none">
                    </div>
                </div>

                <!-- Footer -->
                <div class="px-8 py-6 bg-slate-50/50 border-t border-slate-50 flex justify-end space-x-3">
                    <button @click="showEditModal = false" :disabled="isSaving"
                        class="px-6 py-3 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-all">Cancel</button>
                    <button @click="updateSkill" :disabled="isSaving"
                        class="bg-indigo-600 text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-100 disabled:opacity-50 transition-all">
                        {{ isSaving ? 'Persisting...' : 'Commit Updates' }}
                    </button>
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
