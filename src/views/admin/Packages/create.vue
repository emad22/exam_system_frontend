<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';

import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';
import Button from 'primevue/button';
import Card from 'primevue/card';
import Message from 'primevue/message';
import Checkbox from 'primevue/checkbox';

const router = useRouter();

const currentPackage = ref({
    name: '',
    skills_count: 0,
    description: '',
    wp_package_id: '',
    exam_id: null,
    skills: []
});

const exams = ref([]);
const availableSkills = ref([]);
const isSaving = ref(false);
const errorMsg = ref('');

// Auto-sync skill depth with selection
watch(() => currentPackage.value.skills, (newSkills) => {
    currentPackage.value.skills_count = newSkills.length;
}, { deep: true });

const fetchExamsAndSkills = async () => {
    try {
        const [examsRes, skillsRes] = await Promise.all([
            api.get('/admin/exams'),
            api.get('/admin/skills')
        ]);
        exams.value = examsRes.data.data ? examsRes.data.data : examsRes.data;
        availableSkills.value = skillsRes.data;
    } catch (err) {
        console.error('Failed to load data', err);
    }
};

const savePackage = async () => {
    if (!currentPackage.value.name) {
        errorMsg.value = 'Package designation is required.';
        return;
    }
    isSaving.value = true;
    errorMsg.value = '';

    try {
        await api.post('/admin/packages', currentPackage.value);
        router.push('/admin/packages');
    } catch (err) {
        console.error(err);
        errorMsg.value = err.response?.data?.message || 'Failed to initialize the assessment bundle.';
    } finally {
        isSaving.value = false;
    }
};

onMounted(fetchExamsAndSkills);
</script>

<template>
    <AdminLayout>
        <div class="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 mt-6 px-4">

            <!-- Standardized Header -->
            <div class="flex items-center justify-between bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                <div class="flex items-center space-x-6">
                    <Button icon="pi pi-arrow-left" severity="secondary" outlined rounded @click="router.push('/admin/packages')" />
                    <div>
                         <h1 class="text-2xl font-black text-slate-800 tracking-tight lowercase first-letter:uppercase">Initialize bundle</h1>
                         <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Skill matrix provisioning</p>
                    </div>
                </div>
                <div class="hidden md:flex items-center space-x-2 bg-indigo-50 px-4 py-2 rounded-2xl border border-indigo-100">
                    <div class="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></div>
                    <span class="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Assessment Logic Engine</span>
                </div>
            </div>

            <div class="max-w-6xl mx-auto">
                <form @submit.prevent="savePackage" class="space-y-8">
                    <Message v-if="errorMsg" severity="error" :closable="false" class="mb-4 rounded-2xl">
                        ERROR: {{ errorMsg }}
                    </Message>

                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        
                        <!-- Left Column: Core Identity and Skill Selection -->
                        <div class="lg:col-span-2 space-y-8">
                            <Card class="border border-slate-100 shadow-sm rounded-3xl overflow-hidden">
                                <template #content>
                                    <div class="p-4 space-y-8">
                                        <div class="flex items-center space-x-3 mb-2">
                                            <div class="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                                                <i class="pi pi-tag text-xs"></i>
                                            </div>
                                            <h3 class="text-sm font-black text-slate-800 uppercase tracking-wider">Bundle Identity</h3>
                                        </div>

                                        <div class="flex flex-col space-y-2">
                                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">Package Designation</label>
                                            <InputText v-model="currentPackage.name" required class="w-full rounded-xl bg-slate-50 border-slate-100 focus:bg-white transition-all text-sm font-black uppercase" placeholder="e.g. ADULT_ELITE_PLAN" />
                                        </div>

                                        <div class="flex flex-col space-y-2">
                                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">Functional Narrative (Description)</label>
                                            <Textarea v-model="currentPackage.description" rows="3" class="w-full rounded-xl bg-slate-50 border-slate-100 focus:bg-white transition-all text-sm font-medium" placeholder="Describe the purpose of this skill bundle..." />
                                        </div>
                                    </div>
                                </template>
                            </Card>

                            <Card class="border border-slate-100 shadow-sm rounded-3xl overflow-hidden">
                                <template #content>
                                    <div class="p-4 space-y-8">
                                        <div class="flex items-center justify-between mb-2">
                                            <div class="flex items-center space-x-3">
                                                <div class="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                                                    <i class="pi pi-th-large text-xs"></i>
                                                </div>
                                                <h3 class="text-sm font-black text-slate-800 uppercase tracking-wider">Skill Matrix Association</h3>
                                            </div>
                                            <span class="text-[9px] font-black text-indigo-500 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-widest">{{ currentPackage.skills.length }} Selected</span>
                                        </div>

                                        <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
                                            <div v-for="skill in availableSkills" :key="skill.id" 
                                                 class="flex items-center p-3 rounded-2xl border transition-all duration-300 cursor-pointer group"
                                                 :class="currentPackage.skills.includes(skill.short_code) ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-100 hover:bg-white hover:border-slate-200'">
                                                <Checkbox v-model="currentPackage.skills" :inputId="'skill-'+skill.id" :value="skill.short_code" />
                                                <label :for="'skill-'+skill.id" class="ml-3 flex flex-col cursor-pointer">
                                                    <span class="text-[10px] font-black text-slate-700 uppercase tracking-tight leading-none">{{ skill.name }}</span>
                                                    <span class="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1 group-hover:text-indigo-400 transition-colors">{{ skill.short_code }} Module</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </template>
                            </Card>
                        </div>

                        <!-- Right Column: Configurations and Deployment -->
                        <div class="space-y-8">
                            <Card class="border border-slate-100 shadow-sm rounded-3xl overflow-hidden">
                                <template #content>
                                    <div class="p-4 space-y-8">
                                        <div class="flex items-center space-x-3 mb-2">
                                            <div class="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                                                <i class="pi pi-cog text-xs"></i>
                                            </div>
                                            <h3 class="text-sm font-black text-slate-800 uppercase tracking-wider">Specifications</h3>
                                        </div>

                                        <div class="flex flex-col space-y-2">
                                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">Skill Depth Capacity (Autosync)</label>
                                            <InputNumber v-model="currentPackage.skills_count" readonly class="w-full opacity-70" inputClass="rounded-xl bg-slate-100 border-slate-100 font-black text-center text-indigo-600" />
                                            <p class="text-[8px] font-bold text-slate-400 uppercase tracking-widest ml-1 italic leading-none">Mapped to active module selection</p>
                                        </div>

                                        <div class="flex flex-col space-y-2">
                                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">WP Product Integration Key</label>
                                            <InputText v-model="currentPackage.wp_package_id" class="w-full rounded-xl bg-slate-50 border-slate-100 font-black text-slate-400 text-xs tracking-tighter" placeholder="WOO_PRODUCT_ID" />
                                        </div>

                                        <div class="flex flex-col space-y-2 pt-4 border-t border-slate-50">
                                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">Link Assessment Matrix</label>
                                            <Select v-model="currentPackage.exam_id" :options="exams" optionLabel="title" optionValue="id" placeholder="Select Associated Exam" class="w-full rounded-xl bg-slate-50 border-slate-100 text-xs font-bold" showClear>
                                                 <template #option="slotProps">
                                                     <div class="flex flex-col">
                                                         <span class="text-[10px] font-black uppercase tracking-tight">{{ slotProps.option.title }}</span>
                                                         <span class="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{{ slotProps.option.category?.name || 'General' }}</span>
                                                     </div>
                                                 </template>
                                            </Select>
                                        </div>
                                    </div>
                                </template>
                            </Card>

                            <div class="pt-4">
                                <Button type="submit" label="Deploy Assessment Bundle" icon="pi pi-check" :loading="isSaving" class="w-full py-6 rounded-3xl shadow-lg shadow-indigo-100 text-[10px] font-black tracking-widest uppercase transition-all hover:-translate-y-1" />
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

:deep(.p-checkbox .p-checkbox-box) {
    border-radius: 6px;
    border-color: #e2e8f0;
    width: 1.25rem;
    height: 1.25rem;
}

@keyframes slide-in-bottom {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}

.animate-in {
    animation: slide-in-bottom 0.8s ease-out;
}
</style>
