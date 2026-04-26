<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';

import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Checkbox from 'primevue/checkbox';
import Button from 'primevue/button';
import Card from 'primevue/card';
import DatePicker from 'primevue/datepicker';
import Message from 'primevue/message';
import ProgressSpinner from 'primevue/progressspinner';

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const isSaving = ref(false);
const errorMsg = ref('');

const packages = ref([]);
const exams = ref([]);
const skills = ref([]);
const categories = ref([]);
const partners = ref([]);
const studentId = route.params.id;

// Generate a random 6-character alphanumeric password suggestion
const generatePassword = () => {
    return Math.random().toString(36).slice(-6).toUpperCase();
};

const editForm = ref({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    gender: 'male',
    birth_date: null,
    student_code: '',
    password: '', // Kept empty unless changing
    package_id: null,
    exam_category_id: null,
    assigned_skills: [],
    partner_id: null,
    is_active: true,
});

const loadData = async () => {
    loading.value = true;
    try {
        const [studentRes, pctRes, examRes, skillRes, catRes, partnerRes] = await Promise.all([
            api.get(`/admin/students/${studentId}`),
            api.get('/admin/packages'),
            api.get('/admin/exams'),
            api.get('/admin/skills'),
            api.get('/admin/exam-categories'),
            api.get('/admin/partners/active')
        ]);
        
        packages.value = pctRes.data;
        exams.value = examRes.data;
        skills.value = skillRes.data;
        categories.value = catRes.data;
        partners.value = partnerRes.data;
        
        const student = studentRes.data;
        editForm.value = {
            first_name: student.user?.first_name || '',
            last_name: student.user?.last_name || '',
            email: student.user?.email || '',
            phone: student.user?.phone || '',
            gender: student.user?.gender || 'male',
            birth_date: student.user?.birth_date ? new Date(student.user.birth_date) : null,
            student_code: student.student_code || '',
            package_id: student.package_id || null,
            exam_category_id: student.exam_category_id,
            assigned_skills: student.assigned_skills || [],
            partner_id: student.partner_id || null,
            password: '', // Empty initially
            is_active: !!student.user?.is_active,
        };
        reconcilePackageFromSkills();
    } catch (err) {
        console.error(err);
        errorMsg.value = 'Failed to load identity data';
    } finally {
        loading.value = false;
    }
};

// Watch package selection to sync skills and category
watch(() => editForm.value.package_id, (newVal) => {
    if (newVal && newVal !== 4) { // 4 is Custom Pack
        const pkg = packages.value.find(p => p.id === newVal)
        if (pkg) {
            if (pkg.skills) {
                editForm.value.assigned_skills = [...pkg.skills]
            }
            if (pkg.exam_id) {
                const exam = exams.value.find(e => e.id === pkg.exam_id)
                if (exam) {
                    editForm.value.exam_category_id = exam.exam_category_id
                }
            }
        }
    }
})

// Helper to normalize skills for comparison (ID to Code if needed)
const normalizeSkills = (skillList) => {
    return (skillList || [])
        .map(s => {
            if (typeof s === 'number' || !isNaN(s)) {
                const found = skills.value.find(sk => sk.id == s);
                return found ? found.short_code : s;
            }
            return s;
        })
        .map(s => String(s).toUpperCase().trim())
        .sort();
};

const reconcilePackageFromSkills = () => {
    if (packages.value.length === 0) return;
    
    const current = normalizeSkills(editForm.value.assigned_skills).join(',');
    let match = 4; // Default to Custom
    
    for (const pkg of packages.value) {
        if (pkg.id === 4) continue;
        const target = normalizeSkills(pkg.skills).join(',');
        if (target && target === current) {
            match = pkg.id;
            break;
        }
    }
    
    if (editForm.value.package_id !== match) {
        editForm.value.package_id = match;
    }
};

// Watch manual skill changes to switch to appropriate package or custom
watch(() => editForm.value.assigned_skills, () => {
    reconcilePackageFromSkills();
}, { deep: true });

const saveStudent = async () => {
    isSaving.value = true;
    errorMsg.value = '';
    try {
        const payload = { 
            ...editForm.value, 
            is_active: editForm.value.is_active ? 1 : 0 
        };
        // Remove password if empty to prevent updating it to blank
        if (!payload.password) delete payload.password;
        
        await api.patch(`/admin/students/${studentId}`, payload);
        alert('Identity profile updated successfully.');
        router.push('/admin/students');
    } catch (err) {
        errorMsg.value = err.response?.data?.message || 'Failed to update identity.';
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
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Querying Database Matrix...</p>
        </div>

        <div v-else class="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 mt-6 px-4">

            <!-- Header -->
            <div class="flex items-center justify-between bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                <div class="flex items-center space-x-6">
                    <Button icon="pi pi-arrow-left" severity="secondary" outlined rounded @click="router.push('/admin/students')" />
                    <div>
                         <h1 class="text-2xl font-black text-slate-800 tracking-tight lowercase first-letter:uppercase">Sync Identity</h1>
                         <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Manual Profile Reconciliation</p>
                    </div>
                </div>
                <div class="hidden md:flex items-center space-x-4">
                    <div class="flex items-center space-x-2 bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-100" v-if="editForm.is_active">
                        <div class="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                        <span class="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Active Link</span>
                    </div>
                    <div class="flex items-center space-x-2 bg-rose-50 px-4 py-2 rounded-2xl border border-rose-100" v-else>
                        <div class="w-2 h-2 bg-rose-500 rounded-full"></div>
                        <span class="text-[10px] font-black text-rose-600 uppercase tracking-widest">Inactive Link</span>
                    </div>
                </div>
            </div>

            <form @submit.prevent="saveStudent" class="space-y-8">
                <Message v-if="errorMsg" severity="error" :closable="false" class="mb-4">
                    ERROR: {{ errorMsg }}
                </Message>

                <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    <!-- Left Column: Identity & Access -->
                    <div class="lg:col-span-2 space-y-8">
                        <Card class="border border-slate-100 shadow-sm rounded-3xl overflow-hidden">
                            <template #content>
                                <div class="p-4 space-y-8">
                                    <div class="flex items-center space-x-3 mb-2">
                                        <div class="w-8 h-8 rounded-lg bg-brand-primary text-white flex items-center justify-center">
                                            <i class="pi pi-user text-xs"></i>
                                        </div>
                                        <h3 class="text-sm font-black text-slate-800 uppercase tracking-wider">Profile Integrity</h3>
                                    </div>

                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div class="flex flex-col">
                                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">First Name</label>
                                            <InputText v-model="editForm.first_name" required class="w-full rounded-xl bg-slate-50 border-slate-100 focus:bg-white transition-all uppercase" />
                                        </div>
                                        <div class="flex flex-col">
                                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Last Name</label>
                                            <InputText v-model="editForm.last_name" required class="w-full rounded-xl bg-slate-50 border-slate-100 focus:bg-white transition-all uppercase" />
                                        </div>
                                    </div>

                                    <div class="flex flex-col">
                                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Email Address (Identifier)</label>
                                        <InputText v-model="editForm.email" type="email" required class="w-full rounded-xl bg-slate-50 border-slate-100 focus:bg-white transition-all" />
                                    </div>

                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div class="flex flex-col">
                                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Birth Date</label>
                                            <DatePicker v-model="editForm.birth_date" dateFormat="yy-mm-dd" showIcon class="w-full flex-1" inputClass="rounded-xl bg-slate-50 border-slate-100" />
                                        </div>
                                        <div class="flex flex-col">
                                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Gender</label>
                                            <Select v-model="editForm.gender" :options="[{label:'Male', value:'male'}, {label:'Female', value:'female'}]" optionLabel="label" optionValue="value" class="w-full rounded-xl bg-slate-50 border-slate-100" />
                                        </div>
                                    </div>
                                </div>
                            </template>
                        </Card>

                        <!-- Module Discovery Matrix -->
                        <Card class="border border-slate-100 shadow-sm rounded-3xl overflow-hidden animate-in fade-in zoom-in duration-500">
                            <template #content>
                                <div class="p-4 space-y-6">
                                    <div class="flex items-center justify-between mb-4">
                                        <div v-if="editForm.package_id === 4" class="flex items-center space-x-3">
                                            <div class="w-8 h-8 rounded-lg bg-brand-primary text-white flex items-center justify-center">
                                                <i class="pi pi-th-large text-xs"></i>
                                            </div>
                                            <h3 class="text-sm font-black text-slate-800 uppercase tracking-wider">Module Assignment</h3>
                                        </div>
                                        <div v-else class="flex items-center space-x-3">
                                            <div class="w-8 h-8 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center">
                                                <i class="pi pi-lock text-xs"></i>
                                            </div>
                                            <h3 class="text-sm font-black text-slate-400 uppercase tracking-wider">Fixed Module Set</h3>
                                        </div>
                                        <span v-if="editForm.package_id === 4" class="text-[9px] font-black text-brand-primary uppercase tracking-widest bg-rose-50 px-3 py-1 rounded-lg border border-indigo-100 flex items-center">
                                            <i class="pi pi-unlock mr-2 text-[8px]"></i> Custom Allowed
                                        </span>
                                        <span v-else class="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-lg border border-slate-100 flex items-center">
                                            <i class="pi pi-lock mr-2 text-[8px]"></i> Package Controlled
                                        </span>
                                    </div>

                                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <label v-for="skill in skills" :key="skill.id" 
                                            :class="[
                                                editForm.assigned_skills.includes(skill.short_code) ? 'border-brand-primary bg-rose-50/30' : 'border-slate-100 bg-white',
                                                editForm.package_id !== 4 ? 'opacity-70 grayscale-[0.5] cursor-not-allowed' : 'cursor-pointer'
                                            ]"
                                            class="flex items-center p-4 rounded-2xl border-2 transition-all duration-300 group">
                                            <Checkbox :value="skill.short_code" v-model="editForm.assigned_skills" :disabled="editForm.package_id !== 4" />
                                            <span class="ml-4 text-xs font-bold text-slate-700 truncate">
                                                {{ skill.name }}
                                            </span>
                                        </label>
                                    </div>
                                </div>
                            </template>
                        </Card>
                    </div>

                    <!-- Right Column: Context & Security -->
                    <div class="space-y-8">
                        <Card class="border border-slate-100 shadow-sm rounded-3xl overflow-hidden">
                            <template #content>
                                <div class="p-4 space-y-8">
                                    <div class="flex items-center space-x-3 mb-2">
                                        <div class="w-8 h-8 rounded-lg bg-brand-primary text-white flex items-center justify-center">
                                            <i class="pi pi-cog text-xs"></i>
                                        </div>
                                        <h3 class="text-sm font-black text-slate-800 uppercase tracking-wider">Classification</h3>
                                    </div>

                                    <div class="flex flex-col">
                                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Assigned Partner</label>
                                        <Select v-model="editForm.partner_id" :options="partners" optionLabel="partner_name" optionValue="id" class="w-full rounded-xl bg-slate-50 border-slate-100" />
                                    </div>

                                    <div class="flex flex-col">
                                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Curriculum Package</label>
                                        <Select v-model="editForm.package_id" 
                                            :options="packages" 
                                            optionLabel="name" 
                                            optionValue="id" 
                                            placeholder="Select a package..."
                                            class="w-full rounded-xl bg-slate-50 border-slate-100" />
                                    </div>

                                    <div class="flex flex-col">
                                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Identification Code</label>
                                        <InputText v-model="editForm.student_code" class="w-full rounded-xl bg-slate-50 border-slate-100" placeholder="STU-XXXX" />
                                    </div>

                                    <div class="pt-2">
                                        <label class="flex items-center cursor-pointer group bg-slate-50 p-4 rounded-2xl border border-slate-100 hover:bg-white transition-all">
                                            <Checkbox v-model="editForm.is_active" :binary="true" />
                                            <span class="ml-4 text-xs font-black text-slate-600 uppercase tracking-widest">Active Enrollment</span>
                                        </label>
                                    </div>
                                </div>
                            </template>
                        </Card>

                        <Card class="border border-slate-100 shadow-sm rounded-3xl overflow-hidden bg-slate-900 text-white">
                            <template #content>
                                <div class="p-4 space-y-6">
                                     <div class="flex justify-between items-center">
                                        <h3 class="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Credential Override</h3>
                                        <Button icon="pi pi-refresh" text rounded severity="secondary" size="small" @click="editForm.password = generatePassword()" />
                                     </div>
                                     <div class="flex flex-col space-y-2">
                                         <InputText v-model="editForm.password" class="w-full bg-transparent border-slate-700 text-white text-xl font-black tracking-[0.2em] font-mono text-center focus:border-brand-primary transition-all py-4" placeholder="••••••" />
                                         <div class="text-[8px] font-bold text-slate-500 uppercase tracking-widest text-center">Leave blank to retain current key</div>
                                     </div>
                                </div>
                            </template>
                        </Card>

                        <div class="pt-4">
                            <Button type="submit" label="Commit Sync" icon="pi pi-check" :loading="isSaving" class="w-full py-6 rounded-3xl shadow-lg shadow-rose-100 text-sm font-black tracking-widest uppercase" />
                        </div>
                    </div>
                </div>
            </form>
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

:deep(.p-card-body) {
    padding: 0;
}

.animate-in {
    animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
}
</style>
