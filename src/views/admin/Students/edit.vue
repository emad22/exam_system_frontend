<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';

import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Checkbox from 'primevue/checkbox';
import Button from 'primevue/button';
import Card from 'primevue/card';
import ProgressSpinner from 'primevue/progressspinner';
import Password from 'primevue/password';

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const isSaving = ref(false);
const packages = ref([]);
const skills = ref([]);
const studentId = route.params.id;

const editForm = ref({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    gender: 'male',
    birth_date: '',
    address: '',
    city: '',
    country: '',
    religion: '',
    occupation: '',
    student_code: '',
    come_from: '',
    student_type: '',
    year_of_arabic: null,
    not_adaptive: false,
    package_id: '',
    exam_type: 'adult',
    assigned_skills: [],
    password: '',
    is_active: true,
});

const loadData = async () => {
    loading.value = true;
    try {
        const [studentRes, pctRes, skillRes] = await Promise.all([
            api.get(`/admin/students/${studentId}`),
            api.get('/admin/packages'),
            api.get('/admin/skills')
        ]);
        
        packages.value = pctRes.data;
        skills.value = skillRes.data;
        
        const student = studentRes.data;
        editForm.value = {
            first_name: student.user?.first_name || '',
            last_name: student.user?.last_name || '',
            email: student.user?.email || '',
            phone: student.user?.phone || '',
            gender: student.user?.gender || 'male',
            birth_date: student.user?.birth_date || '',
            address: student.user?.address || '',
            city: student.user?.city || '',
            country: student.user?.country || '',
            religion: student.user?.religion || '',
            occupation: student.user?.occupation || '',
            student_code: student.student_code || '',
            come_from: student.come_from || '',
            student_type: student.student_type || '',
            year_of_arabic: student.year_of_arabic,
            not_adaptive: !!student.not_adaptive,
            is_active: !!student.user?.is_active,
            package_id: student.package_id || '',
            exam_type: student.exam_type || 'adult',
            assigned_skills: student.assigned_skills || [],
            password: '',
        };
    } catch (err) {
        console.error(err);
        alert('Failed to load student data');
        router.push('/admin/students');
    } finally {
        loading.value = false;
    }
};

const onPackageChange = () => {
    if (editForm.value.package_id !== '') {
        const selected = packages.value.find(p => p.id === editForm.value.package_id);
        if (selected && selected.skills) {
            editForm.value.assigned_skills = selected.skills.map(s => s.id);
        }
    }
};

const saveStudent = async () => {
    isSaving.value = true;
    try {
        const payload = { ...editForm.value, is_active: editForm.value.is_active ? 1 : 0 };
        await api.patch(`/admin/students/${studentId}`, payload);
        alert('Identity profile updated successfully.');
        router.push('/admin/students');
    } catch (err) {
        alert(err.response?.data?.message || 'Failed to update identity.');
    } finally {
        isSaving.value = false;
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
                         <h1 class="text-3xl font-black text-slate-800 tracking-tight">Sync Entity</h1>
                         <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Manual identity reconciliation</p>
                    </div>
                </div>
            </div>

            <Card class="border border-slate-100 shadow-sm rounded-3xl overflow-hidden mt-6">
                <template #content>
                    <div class="p-4 md:p-10 space-y-12">
                    <!-- Section 1: Core -->
                    <div class="space-y-6">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div class="flex flex-col">
                                <label class="block text-xs font-bold text-slate-500 mb-2 pl-2">Given Name</label>
                                <InputText v-model="editForm.first_name" class="w-full shadow-sm rounded-xl uppercase" placeholder="First Name" />
                            </div>
                            <div class="flex flex-col">
                                <label class="block text-xs font-bold text-slate-500 mb-2 pl-2">Family Name</label>
                                <InputText v-model="editForm.last_name" class="w-full shadow-sm rounded-xl uppercase" placeholder="Last Name" />
                            </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div class="flex flex-col">
                                <label class="block text-xs font-bold text-slate-500 mb-2 pl-2">Identifier (Email)</label>
                                <InputText v-model="editForm.email" type="email" class="w-full shadow-sm rounded-xl" placeholder="email@domain.com" />
                            </div>
                            <div class="flex flex-col">
                                <label class="block text-xs font-bold text-slate-500 mb-2 pl-2">Contact Phone</label>
                                <InputText v-model="editForm.phone" class="w-full shadow-sm rounded-xl" placeholder="+XX XXX XXXX" />
                            </div>
                        </div>
                    </div>

                    <!-- Section 2: Bio -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div class="flex flex-col">
                            <label class="block text-xs font-bold text-slate-500 mb-2 pl-2">Belief System (Religion)</label>
                            <InputText v-model="editForm.religion" class="w-full shadow-sm rounded-xl uppercase" placeholder="Religion" />
                        </div>
                        <div class="flex flex-col">
                            <label class="block text-xs font-bold text-slate-500 mb-2 pl-2">Core Profession</label>
                            <InputText v-model="editForm.occupation" class="w-full shadow-sm rounded-xl uppercase" placeholder="Occupation" />
                        </div>
                    </div>

                    <!-- Section 3: Academic -->
                    <div class="space-y-8 p-8 bg-slate-50/50 rounded-[2.5rem] border border-slate-100">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div class="flex flex-col">
                                <label class="block text-xs font-bold text-slate-500 mb-2 pl-2">Assigned Package</label>
                                <Select v-model="editForm.package_id" 
                                    @change="onPackageChange" 
                                    :options="[{id: '', name: 'Custom Sync'}, ...packages]" 
                                    optionLabel="name" 
                                    optionValue="id" 
                                    class="w-full shadow-sm rounded-xl" />
                            </div>
                            <div class="flex flex-col">
                                <label class="block text-xs font-bold text-slate-500 mb-2 pl-2">Logic Mode</label>
                                <Select v-model="editForm.exam_type" 
                                    :options="[{label:'Adult (18+)', value:'adult'}, {label:'Child (-18)', value:'children'}]" 
                                    optionLabel="label" 
                                    optionValue="value" 
                                    class="w-full shadow-sm rounded-xl" />
                            </div>
                        </div>

                        <div class="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-8 pt-4">
                            <label class="flex items-center cursor-pointer group">
                                <Checkbox v-model="editForm.not_adaptive" :binary="true" />
                                <span class="ml-3 text-xs font-bold text-slate-600">Linear Mode (Non-Adaptive)</span>
                            </label>

                            <label class="flex items-center cursor-pointer group">
                                <Checkbox v-model="editForm.is_active" :binary="true" />
                                <span class="ml-3 text-xs font-bold text-slate-600">Active Status</span>
                            </label>
                        </div>

                        <div>
                            <div class="flex items-center justify-between mb-8 ml-4">
                                <label class="block text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center">
                                    <i class="pi pi-bolt mr-2"></i> Module Assignment Matrix
                                </label>
                                <span class="text-[9px] font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100 flex items-center">
                                    <i class="pi pi-unlock mr-2"></i> Custom Overrides Enabled
                                </span>
                            </div>
                            
                            <p class="text-[10px] font-bold text-slate-400 mb-6 px-4 uppercase tracking-tight italic">Adjusting these modules will directly impact the content of the student's next exam attempt.</p>

                            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <label v-for="skill in skills" :key="skill.id" 
                                    :class="editForm.assigned_skills.includes(skill.id) ? 'border-indigo-600 bg-white shadow-sm' : 'border-slate-100 bg-white'"
                                    class="flex items-center p-5 rounded-2xl border-2 transition-all duration-300 group cursor-pointer hover:border-indigo-200">
                                    <Checkbox :value="skill.id" v-model="editForm.assigned_skills" />
                                    <span class="ml-4 text-xs font-bold text-slate-700 truncate">
                                        {{ skill.name }}
                                    </span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <!-- Password -->
                    <div class="flex flex-col pb-4">
                        <label class="block text-xs font-bold text-slate-500 mb-2 pl-2">Credential Override (Passphrase)</label>
                        <InputText v-model="editForm.password" type="password" placeholder="Leave blank to retain current key" class="w-full shadow-sm rounded-xl font-mono" />
                    </div>
                </div>

                <!-- Footer -->
                <div class="pt-8 border-t border-slate-100 flex justify-end space-x-4">
                    <Button label="Discard" severity="secondary" text @click="router.push('/admin/students')" />
                    <Button label="COMMIT CHANGES" icon="pi pi-check" :loading="isSaving" @click="saveStudent" />
                </div>
                </template>
            </Card>
        </div>
    </AdminLayout>
</template>
