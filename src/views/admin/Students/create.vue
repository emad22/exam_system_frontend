<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';

import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Checkbox from 'primevue/checkbox';
import Button from 'primevue/button';
import Card from 'primevue/card';
import DatePicker from 'primevue/datepicker';
import Message from 'primevue/message';

const router = useRouter();

// Generate a random 6-character alphanumeric password suggestion
const generatePassword = () => {
    return Math.random().toString(36).slice(-6).toUpperCase();
};

const skills = ref([]);
const partners = ref([]);
const packages = ref([]);
const exams = ref([]);
const categories = ref([]);

const form = ref({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    gender: 'male',
    birth_date: null,
    student_code: '',
    password: generatePassword(),
    exam_category_id: null,
    exam_id: null,
    assigned_skills: [],
    package_id: null,
    is_active: true,
    partner_id: '',
});

const isSubmitting = ref(false);
const errorMsg = ref('');

onMounted(async () => {
    try {
        const [skillRes, partnerRes, packageRes, examRes, catRes] = await Promise.all([
            api.get('/admin/skills'),
            api.get('/admin/partners/active'),
            api.get('/admin/packages'),
            api.get('/admin/exams'),
            api.get('/admin/exam-categories')
        ]);
        skills.value = skillRes.data;
        partners.value = partnerRes.data;
        packages.value = packageRes.data;
        exams.value = examRes.data;
        categories.value = catRes.data;

        if (categories.value.length > 0) form.value.exam_category_id = categories.value[0].id;

        if (partners.value.length > 0) form.value.partner_id = partners.value[0].id;

        // Start with custom
        form.value.assigned_skills = [];
    } catch (err) {
        console.error('Failed to load prerequisites', err);
    }
});

const addStudent = async () => {
    isSubmitting.value = true;
    errorMsg.value = '';

    try {
        await api.post('/admin/students', form.value);
        alert('Student successfully registered!');
        router.push('/admin/students');
    } catch (err) {
        console.error(err);
        errorMsg.value = err.response?.data?.message || 'Failed to add student. Ensure email is unique.';
    } finally {
        isSubmitting.value = false;
    }
};


// Watch package selection to sync skills and category
watch(() => form.value.package_id, (newVal) => {
    if (newVal && newVal !== 4) { // 4 is Custom Pack
        const pkg = packages.value.find(p => p.id === newVal)
        if (pkg) {
            if (pkg.skills) {
                form.value.assigned_skills = [...pkg.skills]
            }
            if (pkg.exam_id) {
                const exam = exams.value.find(e => e.id === pkg.exam_id)
                if (exam) {
                    form.value.exam_category_id = exam.exam_category_id
                }
            }
        }
    }
})

// Watch manual skill changes to switch to Custom Pack
watch(() => form.value.assigned_skills, (newVal) => {
    if (form.value.package_id && form.value.package_id !== 4) {
        const pkg = packages.value.find(p => p.id === form.value.package_id)
        if (pkg && pkg.skills) {
            const current = [...newVal].sort().join(',')
            const target = [...pkg.skills].sort().join(',')
            if (current !== target) {
                form.value.package_id = 4 // Switch to Custom Pack
            }
        }
    }
}, { deep: true })

const filteredExams = computed(() => {
    return exams.value.filter(e => e.exam_category_id === form.value.exam_category_id);
});
</script>

<template>
    <AdminLayout>
        <div class="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 mt-6 px-4">

            <!-- Header -->
            <div class="flex items-center justify-between bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                <div class="flex items-center space-x-6">
                    <Button icon="pi pi-arrow-left" severity="secondary" outlined rounded @click="router.push('/admin/students')" />
                    <div>
                         <h1 class="text-2xl font-black text-slate-800 tracking-tight lowercase first-letter:uppercase">Register student</h1>
                         <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Quick identity provisioning</p>
                    </div>
                </div>
                <div class="hidden md:flex items-center space-x-2 bg-indigo-50 px-4 py-2 rounded-2xl border border-indigo-100">
                    <div class="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></div>
                    <span class="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Active Enrollment System</span>
                </div>
            </div>

            <form @submit.prevent="addStudent" class="space-y-8">
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
                                        <div class="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                                            <i class="pi pi-user text-xs"></i>
                                        </div>
                                        <h3 class="text-sm font-black text-slate-800 uppercase tracking-wider">Core Identity</h3>
                                    </div>

                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div class="flex flex-col">
                                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">First Name</label>
                                            <InputText v-model="form.first_name" required class="w-full rounded-xl bg-slate-50 border-slate-100 focus:bg-white transition-all" placeholder="e.g. John" />
                                        </div>
                                        <div class="flex flex-col">
                                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Last Name</label>
                                            <InputText v-model="form.last_name" required class="w-full rounded-xl bg-slate-50 border-slate-100 focus:bg-white transition-all" placeholder="e.g. Doe" />
                                        </div>
                                    </div>

                                    <div class="flex flex-col">
                                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Email Address (Username)</label>
                                        <InputText v-model="form.email" type="email" required class="w-full rounded-xl bg-slate-50 border-slate-100 focus:bg-white transition-all" placeholder="john.doe@academic.com" />
                                    </div>

                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div class="flex flex-col">
                                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Birth Date</label>
                                            <DatePicker v-model="form.birth_date" dateFormat="yy-mm-dd" showIcon class="w-full flex-1" inputClass="rounded-xl bg-slate-50 border-slate-100" />
                                        </div>
                                        <div class="flex flex-col">
                                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Gender</label>
                                            <Select v-model="form.gender" :options="[{label:'Male', value:'male'}, {label:'Female', value:'female'}]" optionLabel="label" optionValue="value" class="w-full rounded-xl bg-slate-50 border-slate-100" />
                                        </div>
                                    </div>
                                </div>
                            </template>
                        </Card>

                        <!-- Module Discovery Matrix -->
                        <Card class="border border-slate-100 shadow-sm rounded-3xl overflow-hidden">
                            <template #content>
                                <div class="p-4 space-y-6">
                                    <div class="flex items-center justify-between mb-4">
                                        <div class="flex items-center space-x-3">
                                            <div class="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                                                <i class="pi pi-th-large text-xs"></i>
                                            </div>
                                            <h3 class="text-sm font-black text-slate-800 uppercase tracking-wider">Module Assignment</h3>
                                        </div>
                                        <span class="text-[9px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100 flex items-center">
                                            <i class="pi pi-unlock mr-2 text-[8px]"></i> Custom Allowed
                                        </span>
                                    </div>

                                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <label v-for="skill in skills" :key="skill.id" 
                                            :class="form.assigned_skills.includes(skill.short_code) ? 'border-indigo-600 bg-indigo-50/30' : 'border-slate-100 bg-white'"
                                            class="flex items-center p-4 rounded-2xl border-2 transition-all duration-300 group cursor-pointer hover:border-indigo-200">
                                            <Checkbox :value="skill.short_code" v-model="form.assigned_skills" />
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
                                        <div class="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                                            <i class="pi pi-cog text-xs"></i>
                                        </div>
                                        <h3 class="text-sm font-black text-slate-800 uppercase tracking-wider">Classification</h3>
                                    </div>


                                    <div class="flex flex-col">
                                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Assigned Partner</label>
                                        <Select v-model="form.partner_id" :options="partners" optionLabel="partner_name" optionValue="id" class="w-full rounded-xl bg-slate-50 border-slate-100" />
                                    </div>

                                    <div class="flex flex-col">
                                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Curriculum Package</label>
                                        <Select v-model="form.package_id" 
                                            :options="packages" 
                                            optionLabel="name" 
                                            optionValue="id" 
                                            placeholder="Select a package..."
                                            class="w-full rounded-xl bg-slate-50 border-slate-100" />
                                    </div>

                                    <div class="flex flex-col">
                                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Phone Number</label>
                                        <InputText v-model="form.phone" class="w-full rounded-xl bg-slate-50 border-slate-100" placeholder="+XX-XXXX-XXXX" />
                                    </div>
                                </div>
                            </template>
                        </Card>

                        <Card class="border border-slate-100 shadow-sm rounded-3xl overflow-hidden bg-slate-900 text-white">
                            <template #content>
                                <div class="p-4 space-y-6">
                                     <div class="flex justify-between items-center">
                                        <h3 class="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Secret Key (Password)</h3>
                                        <Button icon="pi pi-refresh" text rounded severity="secondary" size="small" @click="form.password = generatePassword()" />
                                     </div>
                                     <div class="flex flex-col space-y-2">
                                         <InputText v-model="form.password" required class="w-full bg-transparent border-slate-700 text-white text-xl font-black tracking-[0.2em] font-mono text-center focus:border-indigo-500 transition-all py-4" />
                                         <div class="text-[8px] font-bold text-slate-500 uppercase tracking-widest text-center">Click to edit or regenerate above</div>
                                     </div>
                                </div>
                            </template>
                        </Card>

                        <div class="pt-4">
                            <Button type="submit" label="Complete Registration" icon="pi pi-check" :loading="isSubmitting" class="w-full py-6 rounded-3xl shadow-lg shadow-indigo-100 text-sm font-black tracking-widest uppercase" />
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
</style>
