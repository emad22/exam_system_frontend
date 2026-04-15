<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';

import Card from 'primevue/card';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import ProgressSpinner from 'primevue/progressspinner';

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const selectedStudent = ref(null);
const skills = ref([]);
const packages = ref([]);
const studentId = route.params.id;

const loadData = async () => {
    loading.value = true;
    try {
        const [studentRes, pctRes, skillRes] = await Promise.all([
            api.get(`/admin/students/${studentId}`),
            api.get('/admin/packages'),
            api.get('/admin/skills')
        ]);
        
        selectedStudent.value = studentRes.data;
        packages.value = pctRes.data;
        skills.value = skillRes.data;
    } catch (err) {
        console.error(err);
        alert('Failed to load student data');
        router.push('/admin/students');
    } finally {
        loading.value = false;
    }
};

onMounted(() => {
    loadData();
});
</script>

<template>
    <AdminLayout>
        <div v-if="loading" class="flex flex-col items-center justify-center py-32 space-y-4">
            <ProgressSpinner />
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Querying Database...</p>
        </div>
        <div v-else class="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 mt-6 px-4 md:px-12">
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-6">
                    <Button icon="pi pi-arrow-left" severity="secondary" outlined rounded @click="router.push('/admin/students')" />
                    <div>
                         <h1 class="text-3xl font-black text-slate-800 tracking-tight">Identity Details</h1>
                         <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Read-only student view</p>
                    </div>
                </div>
            </div>

            <Card class="border border-slate-100 shadow-sm rounded-3xl overflow-hidden mt-6 pb-4">
                <template #content>
                    <div class="px-8 py-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0 mb-6 rounded-2xl mx-4 mt-2">
                        <div class="flex items-center space-x-6">
                            <div class="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-3xl font-black shadow-md shadow-indigo-100">
                                {{ selectedStudent.user?.first_name[0] }}
                            </div>
                            <div>
                                <h3 class="text-2xl font-black text-slate-800 tracking-tight">{{ selectedStudent.user?.first_name }} {{ selectedStudent.user?.last_name }}</h3>
                                <div class="flex items-center space-x-3 mt-1.5">
                                    <Tag :value="'Student_ID: ' + (selectedStudent.student_code || 'N/A')" severity="info" class="text-[9px] uppercase tracking-wider" />
                                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Parent_Key: {{ selectedStudent.parent_code || 'NONE' }}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                <div class="p-8 md:p-12 space-y-12">
                    <!-- Data Grid -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <div class="space-y-8">
                            <h4 class="text-xs font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center">
                                <i class="pi pi-user mr-3"></i> Identity Profile
                            </h4>
                            <div class="grid grid-cols-2 gap-6 p-6 bg-slate-50/50 rounded-2xl border border-slate-100">
                                <div v-for="(val, key) in { Email: selectedStudent.user?.email, Phone: selectedStudent.user?.phone || 'N/A', Gender: selectedStudent.user?.gender, Birth: selectedStudent.user?.birth_date || 'N/A' }" :key="key" class="space-y-1">
                                    <label class="text-[10px] font-bold text-slate-400">{{ key }}</label>
                                    <p class="text-sm font-bold text-slate-700 truncate" :title="val">{{ val }}</p>
                                </div>
                            </div>
                            <div class="space-y-1 p-6 bg-slate-50/50 rounded-2xl border border-slate-100">
                                <label class="text-[10px] font-bold text-slate-400">Residential Address</label>
                                <p class="text-sm font-bold text-slate-700 leading-relaxed">{{ selectedStudent.user?.address || 'Unmapped Location' }}, {{ selectedStudent.user?.city || 'No City' }}, {{ selectedStudent.user?.country || 'Earth' }}</p>
                            </div>
                        </div>

                        <div class="space-y-8">
                            <h4 class="text-xs font-black text-emerald-600 uppercase tracking-[0.2em] flex items-center">
                                <i class="pi pi-book mr-3"></i> Academic Sync
                            </h4>
                            <div class="grid grid-cols-2 gap-6 p-6 bg-slate-50/50 rounded-2xl border border-slate-100">
                                <div v-for="(val, key) in { Package: selectedStudent.package?.name || 'Custom', Mode: selectedStudent.exam_type, Type: selectedStudent.student_type || 'General', Source: selectedStudent.registration_source }" :key="key" class="space-y-1">
                                    <label class="text-[10px] font-bold text-slate-400">{{ key }}</label>
                                    <p class="text-sm font-bold text-slate-700">{{ val }}</p>
                                </div>
                            </div>
                            <div class="space-y-4 p-6 bg-slate-50/50 rounded-2xl border border-slate-100">
                                <label class="text-[10px] font-bold text-slate-400">Active Modules</label>
                                <div class="flex flex-wrap gap-2">
                                    <Tag v-for="skillId in selectedStudent.assigned_skills" :key="skillId" :value="skills.find(s => s.id === skillId)?.name || skillId" severity="secondary" class="text-[9px] uppercase tracking-wider" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Footer Stats -->
                    <div class="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 md:p-10 flex justify-around items-center shadow-lg shadow-indigo-200 mt-4 mx-4 md:mx-12">
                        <div class="text-center group">
                            <p class="text-indigo-100 text-xs font-bold uppercase tracking-widest mb-2"><i class="pi pi-trophy mr-1"></i> Attempts</p>
                            <p class="text-white text-4xl font-black">{{ selectedStudent.attempts_count || 0 }}</p>
                        </div>
                        <div class="w-px h-16 bg-white/20"></div>
                        <div class="text-center group">
                            <p class="text-indigo-100 text-xs font-bold uppercase tracking-widest mb-2"><i class="pi pi-calendar mr-1"></i> Registry Data</p>
                            <p class="text-white text-lg font-bold mt-1">{{ new Date(selectedStudent.created_at).toLocaleDateString() }}</p>
                        </div>
                    </div>
                </div>
                </template>
            </Card>
        </div>
    </AdminLayout>
</template>
