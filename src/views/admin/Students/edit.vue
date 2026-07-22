<script setup>
import { useModal } from '@/composables/useModal';
import { ref, onMounted, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';

import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Checkbox from 'primevue/checkbox';
import Password from 'primevue/password';
import Button from 'primevue/button';
import Card from 'primevue/card';
import DatePicker from 'primevue/datepicker';
import Message from 'primevue/message';
import ProgressSpinner from 'primevue/progressspinner';

const { showAlert, showConfirm } = useModal();

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

const currentLang = ref(localStorage.getItem('dashboard_lang') || 'ar');

// Translation Dictionary
const t = {
    ar: {
        syncIdentity: "مزامنة وتحديث الهوية",
        subtitle: "المصالحة والتعديل اليدوي لبيانات الطالب بالمنظومة",
        activeSystem: "نظام التسجيل والقبول النشط",
        activeLink: "حساب الطالب نشط",
        inactiveLink: "حساب الطالب معطل",
        profileIntegrity: "سلامة وتكامل هوية الطالب",
        firstName: "الاسم الأول",
        lastName: "اسم العائلة",
        username: "اسم المستخدم للمنصة",
        email: "البريد الإلكتروني",
        phone: "رقم الهاتف والاتصال",
        birthDate: "تاريخ الميلاد",
        gender: "الجنس / النوع",
        classification: "التصنيف والتبعية التعليمية",
        assignedPartner: "الشريك أو المركز الأكاديمي",
        curriculumPackage: "الباقة التعليمية المعتمدة",
        adaptiveSelect: "نظام التقييم",
        adaptiveOpt: "يقف عند درجة الطالب",
        notAdaptiveOpt: "يكمل الامتحان الى الاخر",
        identificationCode: "كود الهوية الأكاديمية / رقم الهوية (اختياري)",
        activeEnrollment: "تفعيل حالة الحساب ونشاطه",
        retryToggle: "السماح بإعادة محاولة المستويات",
        retrySubtitle: "يسمح للطالب بفرصة ثانية إذا لم يجتاز المستوى",
        credentialOverride: "تعيين كلمة مرور جديدة",
        overrideSubtitle: "اترك الحقل فارغاً للمحافظة على كلمة المرور الحالية",
        completeBtn: "حفظ وتأكيد التغييرات",
        moduleAssignment: "تخصيص المهارات اليدوية",
        fixedModuleSet: "مجموعة المهارات ثابتة للباقة",
        customAllowed: "تخصيص حر مسموح به",
        packageControlled: "مهارات مُقيدة بالباقة المحددة",
        errorMessage: "حدث خطأ أثناء تعديل بيانات الطالب. تأكد من أن البريد الإلكتروني أو اسم المستخدم فريد.",
        queryLoading: "جاري الاستعلام ومزامنة سجل البيانات من المنظومة...",
        selectPkgPlaceholder: "اختر باقة تعليمية...",
        isDemoToggle: "حساب طالب تجريبي (Demo Student)",
        isDemoSubtitle: "يتجاوز القيود ولا يُغلق المهارات ويدعم تشغيل مستويات محددة",
        isDemoProctoredToggle: "تفعيل المراقبة للطالب التجريبي",
        isDemoProctoredSubtitle: "فرض متطلبات الكاميرا والمراقبة لجلسة الاختبار التجريبي",
    },
    en: {
        syncIdentity: "Sync Identity",
        subtitle: "Manual identity profile reconciliation",
        activeSystem: "Active Enrollment System",
        activeLink: "Active Account",
        inactiveLink: "Inactive Account",
        profileIntegrity: "Profile Integrity",
        firstName: "First Name",
        lastName: "Last Name",
        username: "Username",
        email: "Email Address",
        phone: "Phone Number",
        birthDate: "Birth Date",
        gender: "Gender",
        classification: "Classification & Alignment",
        assignedPartner: "Assigned Partner",
        curriculumPackage: "Curriculum Package",
        adaptiveSelect: "Evaluation System",
        adaptiveOpt: "Stops at the student's Level",
        notAdaptiveOpt: "Completes the exam to the end",
        identificationCode: "Identification Code / National ID (Optional)",
        activeEnrollment: "Active Enrollment",
        retryToggle: "Allow Level Retry",
        retrySubtitle: "Allows second attempt if student fails a level",
        credentialOverride: "Credential Override",
        overrideSubtitle: "Leave blank to retain current key",
        completeBtn: "Commit Sync",
        moduleAssignment: "Module Assignment",
        fixedModuleSet: "Fixed Module Set",
        customAllowed: "Custom Allowed",
        packageControlled: "Package Controlled",
        errorMessage: "Failed to update identity. Ensure email and username are unique.",
        queryLoading: "Querying Database Matrix...",
        selectPkgPlaceholder: "Select a package...",
        isDemoToggle: "Demo Student Account",
        isDemoSubtitle: "Bypasses lockout and constraints for development/testing",
        isDemoProctoredToggle: "Proctor Demo User",
        isDemoProctoredSubtitle: "Force video/camera verification requirements for this demo run",
    }
};

// Generate a random 6-character alphanumeric password suggestion
const generatePassword = () => {
    return Math.random().toString(36).slice(-6).toUpperCase();
};

const editForm = ref({
    first_name: '',
    last_name: '',
    username: '',
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
    allows_retry: false,
    is_demo: false,
    is_demo_proctored: false,
    is_continue: false,
});

// Flag to indicate user explicitly selected a package (prevent auto-reconcile)
const manualPackageSelected = ref(false);
const skillsEdited = ref(false);

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
        const rawAssigned = student.assigned_skills || [];
        const normalizedAssigned = rawAssigned.map(code => normalizeCode(code));

        editForm.value = {
            first_name: student.user?.first_name || '',
            last_name: student.user?.last_name || '',
            username: student.user?.username || '',
            email: student.user?.email || '',
            phone: student.user?.phone || '',
            gender: student.user?.gender || 'male',
            birth_date: student.user?.birth_date ? new Date(student.user.birth_date) : null,
            student_code: student.student_code || '',
            package_id: student.package_id || null,
            exam_category_id: student.exam_category_id,
            assigned_skills: normalizedAssigned,
            partner_id: student.partner_id || null,
            password: '', // Empty initially
            is_active: !!student.user?.is_active,
            allows_retry: !!student.allows_retry,
            is_demo: !!student.is_demo,
            is_demo_proctored: !!student.is_demo_proctored,
            is_continue: student.is_continue !== undefined ? !!student.is_continue : false,


        };

        manualPackageSelected.value = true;

        // If server provided a package, respect it and prevent auto-reconciliation.
        // استدعِ reconcile فقط لو مفيش package_id خالص (يعني بيانات قديمة/فاسدة)
        // if (!editForm.value.package_id) {
        //     manualPackageSelected.value = false;
        //     reconcilePackageFromSkills();
        //     manualPackageSelected.value = true;
        // } else {
        //     manualPackageSelected.value = true;
        // }
    } catch (err) {
        console.error(err);
        errorMsg.value = 'Failed to load identity data';
    } finally {
        loading.value = false;
    }
};

// Watch package selection to sync skills and category
watch(() => editForm.value.package_id, (newVal) => {
    // mark that the user selected a package manually
    manualPackageSelected.value = true;
    if (newVal && newVal !== 4) { // 4 is Custom Pack
        const pkg = packages.value.find(p => p.id === newVal)
        if (pkg) {
            if (pkg.skills) {
                // Map package skills to the exact casing/spelling from the skills table
                // editForm.value.assigned_skills = pkg.skills.map(code => {
                //     const clean = String(code).toUpperCase().trim();
                //     const found = skills.value.find(sk => {
                //         const skCode = String(sk.short_code).toUpperCase().trim();
                //         return skCode === clean || 
                //                (clean === 'WRITT' && skCode === 'WRIT') ||
                //                (clean === 'WRIT' && skCode === 'WRITT') ||
                //                (clean === 'SPEK' && skCode === 'SPEAK') ||
                //                (clean === 'SPEAK' && skCode === 'SPEK');
                //     });
                //     return found ? found.short_code : code;
                // });
                editForm.value.assigned_skills = pkg.skills.map(code => normalizeCode(code));

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
// const normalizeSkills = (skillList) => {
//     return (skillList || [])
//         .map(s => {
//             if (typeof s === 'number' || !isNaN(s)) {
//                 const found = skills.value.find(sk => sk.id == s);
//                 return found ? found.short_code : s;
//             }
//             return s;
//         })
//         .map(s => {
//             const clean = String(s).toUpperCase().trim();
//             if (clean === 'WRITT' || clean === 'WRIT') return 'WRIT';
//             if (clean === 'SPEAK' || clean === 'SPEK') return 'SPEK';
//             return clean;
//         })
//         .sort();
// };



const normalizeCode = (code) => {
    const clean = String(code).toUpperCase().trim();
    const found = skills.value.find(sk =>
        String(sk.short_code).toUpperCase().trim() === clean
    );
    return found ? found.short_code : code;
};

const normalizeSkills = (skillList) => {
    return (skillList || [])
        .map(s => {
            if (typeof s === 'number' || !isNaN(Number(s))) {
                const found = skills.value.find(sk => sk.id == s);
                return found ? found.short_code : String(s);
            }
            return normalizeCode(s);
        })
        .sort();
};



// Automatic package reconciliation removed — do not change package_id based on assigned_skills.
// The previous `reconcilePackageFromSkills` function was intentionally deleted to preserve
// the package selected by the user or provided by the server.

// Watch manual skill changes to switch to appropriate package or custom
watch(() => editForm.value.assigned_skills, () => {
    // Mark that the user changed the skills so we send them to the server on save.
    skillsEdited.value = true;
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

        // If the user did not edit skills in this session, don't send assigned_skills
        // to avoid backend auto-syncing package based on skills.
        if (!skillsEdited.value) {
            delete payload.assigned_skills;
        }

        await api.patch(`/admin/students/${studentId}`, payload);
        showAlert(currentLang.value === 'ar' ? 'تم تحديث هوية الطالب بنجاح!' : 'Identity profile updated successfully.');
        router.push('/admin/students');
    } catch (err) {
        errorMsg.value = err.response?.data?.message || t[currentLang.value].errorMessage;
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
        <div :class="{ 'arabic-theme': currentLang === 'ar' }" :dir="currentLang === 'ar' ? 'rtl' : 'ltr'"
            class="w-full">

            <!-- Loading -->
            <div v-if="loading" class="flex flex-col items-center justify-center py-32 space-y-4">
                <ProgressSpinner />
                <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">{{ t[currentLang].queryLoading }}
                </p>
            </div>

            <div v-else class="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000 pb-20 mt-6 px-4">

                <!-- Premium Header Navigation Card -->
                <div
                    class="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6 md:space-y-0 relative overflow-hidden group">
                    <div
                        class="absolute right-0 top-0 w-64 h-64 bg-rose-50/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-rose-100/30 transition-all duration-1000">
                    </div>
                    <div
                        class="absolute left-0 bottom-0 w-64 h-64 bg-slate-50/30 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl transition-all duration-1000">
                    </div>

                    <div class="relative z-10 flex items-center gap-6">
                        <Button icon="pi pi-arrow-left" severity="secondary" outlined rounded
                            @click="router.push('/admin/students')"
                            class="w-12 h-12 flex items-center justify-center border border-slate-200 hover:border-slate-300 shadow-sm bg-white" />
                        <div>
                            <div
                                class="flex items-center gap-2 text-xs font-extrabold text-brand-primary uppercase tracking-wider">
                                <i class="pi pi-sparkles text-brand-accent"></i>
                                <span>{{ t[currentLang].activeSystem }}</span>
                            </div>
                            <h1 class="text-2xl font-black text-slate-800 tracking-tight leading-tight mt-1">
                                {{ t[currentLang].syncIdentity }}
                            </h1>
                            <p class="text-xs font-bold text-slate-400 mt-0.5">
                                {{ t[currentLang].subtitle }}
                            </p>
                        </div>
                    </div>

                    <div class="flex items-center gap-3 relative z-10">
                        <div class="flex items-center gap-1.5 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100 shadow-sm"
                            v-if="editForm.is_active">
                            <div class="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></div>
                            <span class="text-[9px] font-black text-emerald-600 uppercase tracking-widest">{{
                                t[currentLang].activeLink }}</span>
                        </div>
                        <div class="flex items-center gap-1.5 bg-rose-50 px-4 py-2 rounded-xl border border-rose-100 shadow-sm"
                            v-else>
                            <div class="w-2.5 h-2.5 bg-rose-500 rounded-full"></div>
                            <span class="text-[9px] font-black text-rose-600 uppercase tracking-widest">{{
                                t[currentLang].inactiveLink }}</span>
                        </div>
                    </div>
                </div>

                <form @submit.prevent="saveStudent" class="space-y-8 max-w-6xl mx-auto">
                    <Message v-if="errorMsg" severity="error" :closable="false"
                        class="mb-4 rounded-2xl shadow-sm border border-rose-100">
                        {{ errorMsg }}
                    </Message>

                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">

                        <!-- Left Column: Identity & Access -->
                        <div class="lg:col-span-2 space-y-8">
                            <Card class="border border-slate-100 shadow-sm rounded-[2rem] overflow-hidden bg-white">
                                <template #content>
                                    <div class="p-8 space-y-6">
                                        <div class="flex items-center gap-3 pb-4 border-b border-slate-50">
                                            <div
                                                class="w-9 h-9 rounded-xl bg-brand-primary text-white flex items-center justify-center shadow-md shadow-rose-200">
                                                <i class="pi pi-user text-sm"></i>
                                            </div>
                                            <h3 class="text-sm font-black text-slate-800 uppercase tracking-wider">{{
                                                t[currentLang].profileIntegrity }}</h3>
                                        </div>

                                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div class="flex flex-col space-y-1.5">
                                                <label
                                                    class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mr-1">{{
                                                        t[currentLang].firstName }}</label>
                                                <InputText v-model="editForm.first_name" required
                                                    class="w-full rounded-xl bg-slate-50 border-slate-100 focus:bg-white transition-all shadow-sm" />
                                            </div>
                                            <div class="flex flex-col space-y-1.5">
                                                <label
                                                    class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mr-1">{{
                                                        t[currentLang].lastName }}</label>
                                                <InputText v-model="editForm.last_name" required
                                                    class="w-full rounded-xl bg-slate-50 border-slate-100 focus:bg-white transition-all shadow-sm" />
                                            </div>
                                        </div>

                                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div class="flex flex-col space-y-1.5">
                                                <label
                                                    class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mr-1">{{
                                                        t[currentLang].username }}</label>
                                                <InputText v-model="editForm.username" required
                                                    class="w-full rounded-xl bg-slate-50 border-slate-100 focus:bg-white transition-all shadow-sm" />
                                            </div>
                                            <div class="flex flex-col space-y-1.5">
                                                <label
                                                    class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mr-1">{{
                                                        t[currentLang].email }}</label>
                                                <InputText v-model="editForm.email" type="email" required
                                                    class="w-full rounded-xl bg-slate-50 border-slate-100 focus:bg-white transition-all shadow-sm" />
                                            </div>
                                        </div>

                                        <div class="flex flex-col space-y-1.5">
                                            <label
                                                class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mr-1">{{
                                                    t[currentLang].phone }}</label>
                                            <InputText v-model="editForm.phone"
                                                class="w-full rounded-xl bg-slate-50 border-slate-100 shadow-sm"
                                                placeholder="+XX-XXXX-XXXX" />
                                        </div>

                                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div class="flex flex-col space-y-1.5">
                                                <label
                                                    class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mr-1">{{
                                                        t[currentLang].birthDate }}</label>
                                                <DatePicker v-model="editForm.birth_date" dateFormat="yy-mm-dd" showIcon
                                                    class="w-full flex-1 rounded-xl bg-slate-50 border-slate-100 shadow-sm"
                                                    inputClass="rounded-xl bg-slate-50 border-slate-100" />
                                            </div>
                                            <div class="flex flex-col space-y-1.5">
                                                <label
                                                    class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mr-1">{{
                                                        t[currentLang].gender }}</label>
                                                <Select v-model="editForm.gender"
                                                    :options="[{ label: 'Male', value: 'male' }, { label: 'Female', value: 'female' }]"
                                                    optionLabel="label" optionValue="value"
                                                    class="w-full rounded-xl bg-slate-50 border-slate-100 shadow-sm" />
                                            </div>
                                        </div>
                                    </div>
                                </template>
                            </Card>

                            <!-- Module Discovery Matrix -->
                            <Card
                                class="border border-slate-100 shadow-sm rounded-[2rem] overflow-hidden bg-white animate-in fade-in zoom-in duration-500">
                                <template #content>
                                    <div class="p-8 space-y-6">
                                        <div class="flex items-center justify-between pb-4 border-b border-slate-50">
                                            <div v-if="editForm.package_id === 4" class="flex items-center gap-3">
                                                <div
                                                    class="w-9 h-9 rounded-xl bg-brand-primary text-white flex items-center justify-center shadow-md shadow-rose-200">
                                                    <i class="pi pi-th-large text-sm"></i>
                                                </div>
                                                <h3 class="text-sm font-black text-slate-800 uppercase tracking-wider">
                                                    {{ t[currentLang].moduleAssignment }}</h3>
                                            </div>
                                            <div v-else class="flex items-center gap-3">
                                                <div
                                                    class="w-9 h-9 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center border border-slate-200 shadow-sm">
                                                    <i class="pi pi-lock text-sm"></i>
                                                </div>
                                                <h3 class="text-sm font-black text-slate-400 uppercase tracking-wider">
                                                    {{ t[currentLang].fixedModuleSet }}</h3>
                                            </div>

                                            <span v-if="editForm.package_id === 4"
                                                class="text-[9px] font-black text-brand-primary uppercase tracking-widest bg-rose-50 px-3.5 py-1.5 rounded-xl border border-rose-100/60 flex items-center shadow-sm">
                                                <i class="pi pi-unlock mr-1.5 ml-1.5 text-[8px] animate-pulse"></i> {{
                                                    t[currentLang].customAllowed }}
                                            </span>
                                            <span v-else
                                                class="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-200 flex items-center shadow-sm">
                                                <i class="pi pi-lock mr-1.5 ml-1.5 text-[8px]"></i> {{
                                                    t[currentLang].packageControlled }}
                                            </span>
                                        </div>

                                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                            <label v-for="skill in skills" :key="skill.id" :class="[
                                                editForm.assigned_skills.includes(skill.short_code) ? 'border-brand-primary bg-rose-50/20 shadow-sm shadow-rose-50' : 'border-slate-100 bg-slate-50/30',
                                                editForm.package_id !== 4 ? 'opacity-70 grayscale-[0.5] cursor-not-allowed' : 'cursor-pointer hover:border-rose-300 hover:bg-rose-50/5'
                                            ]"
                                                class="flex items-center p-4.5 rounded-2xl border-2 transition-all duration-300 group">
                                                <Checkbox :value="skill.short_code" v-model="editForm.assigned_skills"
                                                    :disabled="editForm.package_id !== 4" />
                                                <span
                                                    class="ml-3 mr-3 text-xs font-extrabold text-slate-700 truncate leading-none">
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
                                            <div
                                                class="w-9 h-9 rounded-xl bg-brand-primary text-white flex items-center justify-center shadow-md shadow-rose-200">
                                                <i class="pi pi-cog text-sm"></i>
                                            </div>
                                            <h3 class="text-sm font-black text-slate-800 uppercase tracking-wider">{{
                                                t[currentLang].classification }}</h3>
                                        </div>

                                        <div class="flex flex-col space-y-1.5">
                                            <label
                                                class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mr-1">{{
                                                    t[currentLang].assignedPartner }}</label>
                                            <Select v-model="editForm.partner_id" :options="partners"
                                                optionLabel="partner_name" optionValue="id"
                                                class="w-full rounded-xl bg-slate-50 border-slate-100 shadow-sm" />
                                        </div>

                                        <div class="flex flex-col space-y-1.5">
                                            <label
                                                class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mr-1">{{
                                                    t[currentLang].curriculumPackage }}</label>
                                            <Select v-model="editForm.package_id" :options="packages" optionLabel="name"
                                                optionValue="id" :placeholder="t[currentLang].selectPkgPlaceholder"
                                                class="w-full rounded-xl bg-slate-50 border-slate-100 shadow-sm" />
                                        </div>

                                        <div class="flex flex-col space-y-1.5">
                                            <label
                                                class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mr-1">{{
                                                    t[currentLang].adaptiveSelect }}</label>
                                            <Select v-model="editForm.is_continue" :options="[
                                                { label: t[currentLang].adaptiveOpt, value: false },
                                                { label: t[currentLang].notAdaptiveOpt, value: true }
                                            ]" optionLabel="label" optionValue="value"
                                                class="w-full rounded-xl bg-slate-50 border-slate-100 shadow-sm" />
                                        </div>

                                        <div class="flex flex-col space-y-1.5">
                                            <label
                                                class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mr-1">{{
                                                    t[currentLang].identificationCode }}</label>
                                            <InputText v-model="editForm.student_code"
                                                class="w-full rounded-xl bg-slate-50 border-slate-100 shadow-sm"
                                                :placeholder="currentLang === 'ar' ? 'مثال: 123456 (اختياري)' : 'e.g. 123456 (Optional)'" />
                                        </div>

                                        <div class="pt-2 space-y-3.5">
                                            <label
                                                class="flex items-center cursor-pointer group bg-slate-50/40 p-4 rounded-2xl border border-slate-100 hover:bg-white transition-all shadow-sm">
                                                <Checkbox v-model="editForm.is_active" :binary="true" />
                                                <span
                                                    class="ml-3.5 mr-3.5 text-xs font-black text-slate-700 uppercase tracking-widest leading-none">{{
                                                        t[currentLang].activeEnrollment }}</span>
                                            </label>

                                            <!-- Retry Logic Control -->
                                            <label
                                                class="flex items-center cursor-pointer group bg-rose-50/20 p-4 rounded-2xl border border-rose-500/10 hover:bg-white transition-all shadow-sm">
                                                <Checkbox v-model="editForm.allows_retry" :binary="true" />
                                                <div class="ml-3.5 mr-3.5 flex flex-col justify-center">
                                                    <span
                                                        class="text-xs font-black text-slate-800 uppercase tracking-wider leading-none">{{
                                                            t[currentLang].retryToggle }}</span>
                                                    <span
                                                        class="text-[9px] font-bold text-slate-500 mt-1 leading-none">{{
                                                            t[currentLang].retrySubtitle }}</span>
                                                </div>
                                            </label>

                                            <!-- Demo Student Toggles -->
                                            <label
                                                class="flex items-center cursor-pointer group bg-violet-50/20 p-4 rounded-2xl border border-violet-500/10 hover:bg-white transition-all shadow-sm">
                                                <Checkbox v-model="editForm.is_demo" :binary="true" />
                                                <div class="ml-3.5 mr-3.5 flex flex-col justify-center">
                                                    <span
                                                        class="text-xs font-black text-slate-800 uppercase tracking-wider leading-none">{{
                                                            t[currentLang].isDemoToggle }}</span>
                                                    <span
                                                        class="text-[9px] font-bold text-slate-500 mt-1 leading-none">{{
                                                            t[currentLang].isDemoSubtitle }}</span>
                                                </div>
                                            </label>

                                            <label v-if="editForm.is_demo"
                                                class="flex items-center cursor-pointer group bg-amber-50/20 p-4 rounded-2xl border border-amber-500/10 hover:bg-white transition-all shadow-sm animate-in fade-in duration-300">
                                                <Checkbox v-model="editForm.is_demo_proctored" :binary="true" />
                                                <div class="ml-3.5 mr-3.5 flex flex-col justify-center">
                                                    <span
                                                        class="text-xs font-black text-slate-800 uppercase tracking-wider leading-none">{{
                                                            t[currentLang].isDemoProctoredToggle }}</span>
                                                    <span
                                                        class="text-[9px] font-bold text-slate-500 mt-1 leading-none">{{
                                                            t[currentLang].isDemoProctoredSubtitle }}</span>
                                                </div>
                                            </label>
                                        </div>
                                    </div>
                                </template>
                            </Card>

                            <Card
                                class="border-none shadow-xl rounded-[2rem] overflow-hidden bg-slate-900 text-white relative">
                                <div class="absolute right-0 top-0 w-32 h-32 bg-brand-primary/10 rounded-full blur-2xl">
                                </div>
                                <template #content>
                                    <div class="p-8 space-y-6 relative z-10">
                                        <div class="flex justify-between items-center pb-2 border-b border-white/5">
                                            <h3 class="text-[9px] font-black text-rose-300 uppercase tracking-widest">{{
                                                t[currentLang].credentialOverride }}</h3>
                                            <Button icon="pi pi-refresh" text rounded severity="secondary" size="small"
                                                @click="editForm.password = generatePassword()"
                                                class="text-white hover:bg-white/10" />
                                        </div>
                                        <div class="flex flex-col space-y-2 relative">
                                            <Password v-model="editForm.password" toggleMask :feedback="false"
                                                class="w-full"
                                                inputClass="w-full bg-white/5 border border-slate-800 text-white text-2xl font-black tracking-[0.2em] font-mono text-center focus:border-brand-primary focus:ring-1 focus:ring-brand-primary rounded-2xl py-4 shadow-inner"
                                                placeholder="••••••" />
                                            <div
                                                class="text-[8px] font-bold text-slate-500 uppercase tracking-widest text-center mt-1">
                                                {{ t[currentLang].overrideSubtitle }}</div>
                                        </div>
                                    </div>
                                </template>
                            </Card>

                            <div class="pt-4">
                                <Button type="submit" :label="t[currentLang].completeBtn" icon="pi pi-check"
                                    :loading="isSaving"
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

:deep(.p-password-input) {
    text-align: center !important;
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
