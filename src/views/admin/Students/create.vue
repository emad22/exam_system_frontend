<script setup>
import { useModal } from '@/composables/useModal';
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

const { showAlert, showConfirm } = useModal();

const router = useRouter();

// Generate a random 6-character alphanumeric password suggestion
const generatePassword = () => {
    return Math.random().toString(36).slice(-6).toUpperCase();
};

const currentLang = ref(localStorage.getItem('dashboard_lang') || 'ar');

// Translation Dictionary
const t = {
    ar: {
        registerStudent: "تسجيل طالب جديد",
        subtitle: "تهيئة وحجز هوية أكاديمية سريعة بالمنظومة",
        activeSystem: "نظام التسجيل والقبول النشط",
        coreIdentity: "الهوية الأساسية للمرشح",
        firstName: "الاسم الأول",
        lastName: "اسم العائلة",
        username: "اسم المستخدم للمنصة",
        email: "البريد الإلكتروني",
        birthDate: "تاريخ الميلاد",
        gender: "الجنس / النوع",
        classification: "التصنيف والتبعية التعليمية",
        assignedPartner: "الشريك أو المركز الأكاديمي",
        curriculumPackage: "الباقة التعليمية المعتمدة",
        adaptiveSelect: "نظام التقييم",
        adaptiveOpt: "يقف عند درجة الطالب",
        notAdaptiveOpt: "يكمل الامتحان الى الاخر",
        identificationCode: "كود الهوية الأكاديمية (الكود التعريفي)",
        retryToggle: "السماح بإعادة محاولة المستويات",
        retrySubtitle: "يسمح للطالب بفرصة ثانية إذا لم يجتاز المستوى من المرة الأولى",
        secretKey: "مفتاح المرور السري (كلمة السر)",
        secretSubtitle: "انقر للتعديل أو لتوليد كلمة مرور عشوائية",
        completeBtn: "إتمام عملية التسجيل وتأكيد الهوية",
        moduleAssignment: "تخصيص المهارات اليدوية",
        customAllowed: "تعديل مخصص للمهارات",
        selectPkgPlaceholder: "اختر باقة تعليمية...",
        errorMessage: "حدث خطأ أثناء إضافة الطالب. تأكد من أن البريد الإلكتروني أو اسم المستخدم فريد."
    },
    en: {
        registerStudent: "Register student",
        subtitle: "Quick identity provisioning in the platform",
        activeSystem: "Active Enrollment System",
        coreIdentity: "Core Identity",
        firstName: "First Name",
        lastName: "Last Name",
        username: "Username",
        email: "Email Address",
        birthDate: "Birth Date",
        gender: "Gender",
        classification: "Classification & Alignment",
        assignedPartner: "Assigned Partner",
        curriculumPackage: "Curriculum Package",
        adaptiveSelect: "Evaluation System",
        adaptiveOpt: "Stops at the student's score",
        notAdaptiveOpt: "Completes the exam to the end",
        identificationCode: "Identification Code",
        retryToggle: "Allow Level Retry",
        retrySubtitle: "Allows second attempt if student fails a level",
        secretKey: "Secret Key (Password)",
        secretSubtitle: "Click to edit or regenerate above",
        completeBtn: "Complete Registration",
        moduleAssignment: "Module Assignment",
        customAllowed: "Custom Allowed",
        selectPkgPlaceholder: "Select a package...",
        errorMessage: "Failed to add student. Ensure email and username are unique."
    }
};

const skills = ref([]);
const partners = ref([]);
const packages = ref([]);
const exams = ref([]);
const categories = ref([]);

const form = ref({
    first_name: '',
    last_name: '',
    username: '',
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
    allows_retry: false,
    adaptive: true,
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
        showAlert(currentLang.value === 'ar' ? 'تم تسجيل الطالب بنجاح وتفعيل حسابه!' : 'Student successfully registered!');
        router.push('/admin/students');
    } catch (err) {
        console.error(err);
        errorMsg.value = err.response?.data?.message || t[currentLang.value].errorMessage;
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
        <div :class="{ 'arabic-theme': currentLang === 'ar' }" :dir="currentLang === 'ar' ? 'rtl' : 'ltr'" class="w-full">
            <div class="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000 pb-20 mt-6 px-4">

                <!-- Premium Header Card -->
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6 md:space-y-0 relative overflow-hidden group">
                    <div class="absolute right-0 top-0 w-64 h-64 bg-rose-50/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-rose-100/30 transition-all duration-1000"></div>
                    <div class="absolute left-0 bottom-0 w-64 h-64 bg-slate-50/30 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl transition-all duration-1000"></div>
                    
                    <div class="relative z-10 flex items-center gap-6">
                        <Button icon="pi pi-arrow-left" severity="secondary" outlined rounded @click="router.push('/admin/students')" class="w-12 h-12 flex items-center justify-center border border-slate-200 hover:border-slate-300 shadow-sm bg-white" />
                        <div>
                             <div class="flex items-center gap-2 text-xs font-extrabold text-brand-primary uppercase tracking-wider">
                                  <i class="pi pi-sparkles text-brand-accent"></i>
                                  <span>{{ t[currentLang].activeSystem }}</span>
                             </div>
                             <h1 class="text-2xl font-black text-slate-800 tracking-tight leading-tight mt-1">
                                 {{ t[currentLang].registerStudent }}
                             </h1>
                             <p class="text-xs font-bold text-slate-400 mt-0.5">
                                 {{ t[currentLang].subtitle }}
                             </p>
                        </div>
                    </div>
                </div>

                <form @submit.prevent="addStudent" class="space-y-8 max-w-6xl mx-auto">
                    <Message v-if="errorMsg" severity="error" :closable="false" class="mb-4 rounded-2xl shadow-sm border border-rose-100">
                        {{ errorMsg }}
                    </Message>

                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        
                        <!-- Left Column: Identity & Access -->
                        <div class="lg:col-span-2 space-y-8">
                            <Card class="border border-slate-100 shadow-sm rounded-[2rem] overflow-hidden bg-white">
                                <template #content>
                                    <div class="p-8 space-y-6">
                                        <div class="flex items-center gap-3 pb-4 border-b border-slate-50">
                                            <div class="w-9 h-9 rounded-xl bg-brand-primary text-white flex items-center justify-center shadow-md shadow-rose-200">
                                                <i class="pi pi-user text-sm"></i>
                                            </div>
                                            <h3 class="text-sm font-black text-slate-800 uppercase tracking-wider">{{ t[currentLang].coreIdentity }}</h3>
                                        </div>

                                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div class="flex flex-col space-y-1.5">
                                                <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mr-1">{{ t[currentLang].firstName }}</label>
                                                <InputText v-model="form.first_name" required class="w-full rounded-xl bg-slate-50 border-slate-100 focus:bg-white transition-all shadow-sm" placeholder="e.g. John" />
                                            </div>
                                            <div class="flex flex-col space-y-1.5">
                                                <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mr-1">{{ t[currentLang].lastName }}</label>
                                                <InputText v-model="form.last_name" required class="w-full rounded-xl bg-slate-50 border-slate-100 focus:bg-white transition-all shadow-sm" placeholder="e.g. Doe" />
                                            </div>
                                        </div>

                                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div class="flex flex-col space-y-1.5">
                                                <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mr-1">{{ t[currentLang].username }}</label>
                                                <InputText v-model="form.username" required class="w-full rounded-xl bg-slate-50 border-slate-100 focus:bg-white transition-all shadow-sm" placeholder="e.g. johndoe123" />
                                            </div>
                                            <div class="flex flex-col space-y-1.5">
                                                <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mr-1">{{ t[currentLang].email }}</label>
                                                <InputText v-model="form.email" type="email" required class="w-full rounded-xl bg-slate-50 border-slate-100 focus:bg-white transition-all shadow-sm" placeholder="john.doe@academic.com" />
                                            </div>
                                        </div>

                                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div class="flex flex-col space-y-1.5">
                                                <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mr-1">{{ t[currentLang].birthDate }}</label>
                                                <DatePicker v-model="form.birth_date" dateFormat="yy-mm-dd" showIcon class="w-full flex-1 rounded-xl bg-slate-50 border-slate-100 shadow-sm" inputClass="rounded-xl bg-slate-50 border-slate-100" />
                                            </div>
                                            <div class="flex flex-col space-y-1.5">
                                                <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mr-1">{{ t[currentLang].gender }}</label>
                                                <Select v-model="form.gender" :options="[{label:'Male', value:'male'}, {label:'Female', value:'female'}]" optionLabel="label" optionValue="value" class="w-full rounded-xl bg-slate-50 border-slate-100 shadow-sm" />
                                            </div>
                                        </div>
                                    </div>
                                </template>
                            </Card>

                            <!-- Module Discovery Matrix -->
                            <Card v-if="form.package_id === 4" class="border border-slate-100 shadow-sm rounded-[2rem] overflow-hidden bg-white animate-in fade-in zoom-in duration-500">
                                <template #content>
                                    <div class="p-8 space-y-6">
                                        <div class="flex items-center justify-between pb-4 border-b border-slate-50">
                                            <div class="flex items-center gap-3">
                                                <div class="w-9 h-9 rounded-xl bg-brand-primary text-white flex items-center justify-center shadow-md shadow-rose-200">
                                                    <i class="pi pi-th-large text-sm"></i>
                                                </div>
                                                <h3 class="text-sm font-black text-slate-800 uppercase tracking-wider">{{ t[currentLang].moduleAssignment }}</h3>
                                            </div>
                                            <span class="text-[9px] font-black text-brand-primary uppercase tracking-widest bg-rose-50 px-3.5 py-1.5 rounded-xl border border-rose-100/60 flex items-center shadow-sm">
                                                <i class="pi pi-unlock mr-1.5 ml-1.5 text-[8px] animate-pulse"></i> {{ t[currentLang].customAllowed }}
                                            </span>
                                        </div>

                                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                            <label v-for="skill in skills" :key="skill.id" 
                                                :class="form.assigned_skills.includes(skill.short_code) ? 'border-brand-primary bg-rose-50/20 shadow-sm shadow-rose-50' : 'border-slate-100 bg-slate-50/30'"
                                                class="flex items-center p-4.5 rounded-2xl border-2 transition-all duration-300 group cursor-pointer hover:border-rose-300 hover:bg-rose-50/5">
                                                <Checkbox :value="skill.short_code" v-model="form.assigned_skills" />
                                                <span class="ml-3 mr-3 text-xs font-extrabold text-slate-700 truncate leading-none">
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
                            <Card class="border border-slate-100 shadow-sm rounded-[2rem] overflow-hidden bg-white">
                                <template #content>
                                    <div class="p-8 space-y-6">
                                        <div class="flex items-center gap-3 pb-4 border-b border-slate-50">
                                            <div class="w-9 h-9 rounded-xl bg-brand-primary text-white flex items-center justify-center shadow-md shadow-rose-200">
                                                <i class="pi pi-cog text-sm"></i>
                                            </div>
                                            <h3 class="text-sm font-black text-slate-800 uppercase tracking-wider">{{ t[currentLang].classification }}</h3>
                                        </div>

                                        <div class="flex flex-col space-y-1.5">
                                            <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mr-1">{{ t[currentLang].assignedPartner }}</label>
                                            <Select v-model="form.partner_id" :options="partners" optionLabel="partner_name" optionValue="id" class="w-full rounded-xl bg-slate-50 border-slate-100 shadow-sm" />
                                        </div>

                                        <div class="flex flex-col space-y-1.5">
                                            <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mr-1">{{ t[currentLang].curriculumPackage }}</label>
                                            <Select v-model="form.package_id" 
                                                :options="packages" 
                                                optionLabel="name" 
                                                optionValue="id" 
                                                :placeholder="t[currentLang].selectPkgPlaceholder"
                                                class="w-full rounded-xl bg-slate-50 border-slate-100 shadow-sm" />
                                        </div>

                                        <div class="flex flex-col space-y-1.5">
                                            <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mr-1">{{ t[currentLang].adaptiveSelect }}</label>
                                            <Select v-model="form.adaptive" 
                                                :options="[
                                                    { label: t[currentLang].adaptiveOpt, value: true },
                                                    { label: t[currentLang].notAdaptiveOpt, value: false }
                                                ]" 
                                                optionLabel="label" 
                                                optionValue="value" 
                                                class="w-full rounded-xl bg-slate-50 border-slate-100 shadow-sm" />
                                        </div>

                                        <div class="flex flex-col space-y-1.5">
                                            <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mr-1">{{ t[currentLang].identificationCode }}</label>
                                            <InputText v-model="form.student_code" class="w-full rounded-xl bg-slate-50 border-slate-100 shadow-sm" placeholder="STU-XXXX" />
                                        </div>

                                        <!-- Retry Logic Control -->
                                        <div class="flex items-center p-4 bg-rose-50/20 rounded-2xl border border-rose-500/10 shadow-sm">
                                            <Checkbox v-model="form.allows_retry" :binary="true" inputId="retry_toggle" />
                                            <label for="retry_toggle" class="ml-3.5 mr-3.5 flex flex-col cursor-pointer">
                                                <span class="text-xs font-black text-slate-800 uppercase tracking-wider">{{ t[currentLang].retryToggle }}</span>
                                                <span class="text-[9px] font-bold text-slate-500 mt-0.5">{{ t[currentLang].retrySubtitle }}</span>
                                            </label>
                                        </div>
                                    </div>
                                </template>
                            </Card>

                            <Card class="border-none shadow-xl rounded-[2rem] overflow-hidden bg-slate-900 text-white relative">
                                <div class="absolute right-0 top-0 w-32 h-32 bg-brand-primary/10 rounded-full blur-2xl"></div>
                                <template #content>
                                    <div class="p-8 space-y-6 relative z-10">
                                         <div class="flex justify-between items-center pb-2 border-b border-white/5">
                                            <h3 class="text-[9px] font-black text-rose-300 uppercase tracking-widest">{{ t[currentLang].secretKey }}</h3>
                                            <Button icon="pi pi-refresh" text rounded severity="secondary" size="small" @click="form.password = generatePassword()" class="text-white hover:bg-white/10" />
                                         </div>
                                         <div class="flex flex-col space-y-2">
                                             <InputText v-model="form.password" required class="w-full bg-white/5 border border-slate-800 text-white text-2xl font-black tracking-[0.2em] font-mono text-center focus:border-brand-primary focus:ring-1 focus:ring-brand-primary rounded-2xl py-4 shadow-inner" />
                                             <div class="text-[8px] font-bold text-slate-500 uppercase tracking-widest text-center mt-1">{{ t[currentLang].secretSubtitle }}</div>
                                         </div>
                                    </div>
                                </template>
                            </Card>

                            <div class="pt-4">
                                <Button type="submit" :label="t[currentLang].completeBtn" icon="pi pi-check" :loading="isSubmitting" 
                                        class="w-full py-5 rounded-3xl shadow-lg shadow-rose-200 bg-brand-primary text-white hover:bg-rose-800 border-none font-black tracking-wider text-xs uppercase transition-all duration-300 hover:scale-[1.02] active:scale-95" />
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    </AdminLayout>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');

.arabic-theme {
    font-family: 'Cairo', system-ui, -apple-system, sans-serif !important;
}

:deep(.p-inputtext) {
    padding: 0.85rem 1.1rem;
    font-size: 0.875rem;
    font-weight: 600;
}

:deep(.p-select) {
    border-radius: 0.75rem;
    padding: 0.25rem 0.5rem;
}

:deep(.p-card-body) {
    padding: 0;
}

.animate-in {
    animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
}
</style>
