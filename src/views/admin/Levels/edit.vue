<script setup>
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';

import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';
import Button from 'primevue/button';
import Card from 'primevue/card';
import Message from 'primevue/message';
import ToggleSwitch from 'primevue/toggleswitch';
import ProgressSpinner from 'primevue/progressspinner';

const router = useRouter();
const route = useRoute();

const skills = ref([]);
const isLoading = ref(true);
const isSaving = ref(false);
const errorMsg = ref('');

const form = ref({
    skill_id: null,
    name: '',
    level_number: 1,
    min_score: 0,
    max_score: 100,
    pass_threshold: 70,
    instructions: '',
    is_active: true
});

onMounted(async () => {
    try {
        const [skillRes, levelRes] = await Promise.all([
            api.get('/admin/skills'),
            api.get(`/admin/levels/${route.params.id}`)
        ]);
        skills.value = skillRes.data;
        form.value = levelRes.data;
    } catch (err) {
        console.error('Failed to load level data', err);
        errorMsg.value = 'Failed to load configuration. It may have been relocated.';
    } finally {
        isLoading.value = false;
    }
});

const updateLevel = async () => {
    isSaving.value = true;
    errorMsg.value = '';

    try {
        await api.patch(`/admin/levels/${route.params.id}`, form.value);
        router.push('/admin/levels');
    } catch (err) {
        console.error(err);
        errorMsg.value = err.response?.data?.message || 'Failed to sync level updates.';
    } finally {
        isSaving.value = false;
    }
};
</script>

<template>
    <AdminLayout>
        <div class="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 mt-6 px-4">

            <!-- Standardized Header -->
            <div class="flex items-center justify-between bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                <div class="flex items-center space-x-6">
                    <Button icon="pi pi-arrow-left" severity="secondary" outlined rounded @click="router.push('/admin/levels')" />
                    <div>
                         <h1 class="text-2xl font-black text-slate-800 tracking-tight lowercase first-letter:uppercase">Modify tier</h1>
                         <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Difficulty Matrix Sync</p>
                    </div>
                </div>
                <div class="hidden md:flex items-center space-x-2 bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-100">
                    <div class="w-2 h-2 bg-emerald-600 rounded-full animate-pulse"></div>
                    <span class="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Live Metadata Reconciliation</span>
                </div>
            </div>

            <div v-if="isLoading" class="flex flex-col items-center justify-center py-32 space-y-4">
                <ProgressSpinner />
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Querying Tier Registry...</p>
            </div>

            <div v-else class="max-w-6xl mx-auto">
                <form @submit.prevent="updateLevel" class="space-y-8">
                    <Message v-if="errorMsg" severity="error" :closable="false" class="mb-4 rounded-2xl">
                        ERROR: {{ errorMsg }}
                    </Message>

                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        
                        <!-- Left Column: Primary Config -->
                        <div class="lg:col-span-2 space-y-8">
                            <Card class="border border-slate-100 shadow-sm rounded-3xl overflow-hidden">
                                <template #content>
                                    <div class="p-4 space-y-8">
                                        <div class="flex items-center space-x-3 mb-2">
                                            <div class="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-100">
                                                <i class="pi pi-pencil text-xs"></i>
                                            </div>
                                            <h3 class="text-sm font-black text-slate-800 uppercase tracking-wider">Sync Specifications</h3>
                                        </div>

                                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div class="flex flex-col">
                                                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Target Module (Skill)</label>
                                                <Select v-model="form.skill_id" :options="skills" optionLabel="name" optionValue="id" class="w-full rounded-xl bg-slate-50 border-slate-100" />
                                            </div>
                                            <div class="flex flex-col">
                                                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Designation Name</label>
                                                <InputText v-model="form.name" required class="w-full rounded-xl bg-slate-50 border-slate-100 focus:border-indigo-500" placeholder="e.g. Intermediate I" />
                                            </div>
                                        </div>

                                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div class="flex flex-col">
                                                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Serial Number (#)</label>
                                                <InputNumber v-model="form.level_number" showButtons :min="1" class="w-full" inputClass="rounded-xl bg-slate-50 border-slate-100" />
                                            </div>
                                            <div class="flex flex-col">
                                                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Instructions Label</label>
                                                <Textarea v-model="form.instructions" rows="1" class="w-full rounded-xl bg-slate-50 border-slate-100" placeholder="Brief guidance summary..." />
                                            </div>
                                        </div>
                                    </div>
                                </template>
                            </Card>

                            <Card class="border border-slate-100 shadow-sm rounded-3xl overflow-hidden">
                                <template #content>
                                    <div class="p-4 space-y-8">
                                        <div class="flex items-center space-x-3 mb-2">
                                            <div class="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                                                <i class="pi pi-chart-bar text-xs"></i>
                                            </div>
                                            <h3 class="text-sm font-black text-slate-800 uppercase tracking-wider">Performance Metrics</h3>
                                        </div>

                                        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div class="flex flex-col">
                                                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Minimum Score</label>
                                                <InputNumber v-model="form.min_score" class="w-full" inputClass="rounded-xl bg-slate-50 border-slate-100 font-bold text-slate-700" />
                                            </div>
                                            <div class="flex flex-col">
                                                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Maximum Score</label>
                                                <InputNumber v-model="form.max_score" class="w-full" inputClass="rounded-xl bg-slate-50 border-slate-100 font-bold text-slate-700" />
                                            </div>
                                            <div class="flex flex-col">
                                                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Pass Threshold (%)</label>
                                                <InputNumber v-model="form.pass_threshold" suffix="%" class="w-full" inputClass="rounded-xl bg-slate-50 border-slate-100 font-black text-indigo-600" />
                                            </div>
                                        </div>
                                    </div>
                                </template>
                            </Card>
                        </div>

                        <!-- Right Column: Settings & Finalization -->
                        <div class="space-y-8">
                            <Card class="border border-slate-100 shadow-sm rounded-3xl overflow-hidden">
                                <template #content>
                                    <div class="p-4 space-y-8">
                                        <div class="flex items-center space-x-3 mb-2">
                                            <div class="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                                                <i class="pi pi-cog text-xs"></i>
                                            </div>
                                            <h3 class="text-sm font-black text-slate-800 uppercase tracking-wider">Deployment</h3>
                                        </div>

                                        <div class="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group transition-all duration-300 hover:bg-white hover:border-indigo-100">
                                            <div class="space-y-0.5">
                                                <p class="text-[11px] font-black text-slate-800 uppercase tracking-tight">Active Matrix</p>
                                                <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Enable Tier Availability</p>
                                            </div>
                                            <ToggleSwitch v-model="form.is_active" />
                                        </div>
                                    </div>
                                </template>
                            </Card>

                            <div class="pt-4">
                                <Button type="submit" label="Commit Updates" icon="pi pi-check" :loading="isSaving" class="w-full py-6 rounded-3xl shadow-lg shadow-indigo-100 text-[10px] font-black tracking-widest uppercase transition-all hover:-translate-y-1" />
                            </div>
                        </div>

                    </div>
                </form>
            </div>
        </div>
    </AdminLayout>
</template>

<style scoped>
:deep(.p-inputtext) {
    padding: 0.8rem 1rem;
    font-size: 0.875rem;
    font-weight: 500;
}

:deep(.p-select) {
    border-radius: 0.75rem;
}

@keyframes slide-in-bottom {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}

.animate-in {
    animation: slide-in-bottom 0.8s ease-out;
}
</style>
