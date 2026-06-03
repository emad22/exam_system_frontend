<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import AdminLayout from '@/components/AdminLayout.vue';
import { useModal } from '@/composables/useModal';
import api from '@/services/api';

import Button from 'primevue/button';
import Card from 'primevue/card';
import Dialog from 'primevue/dialog';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import Tag from 'primevue/tag';
import ProgressSpinner from 'primevue/progressspinner';

const router = useRouter();
const { showAlert, showConfirm } = useModal();

const students = ref([]);
const packages = ref([]);
const loading = ref(true);
const isSaving = ref(false);
const skills = ref([]);

const selectedStudents = ref([]);
const searchQuery = ref('');

// Bulk Skills State
const showBulkSkillsModal = ref(false);
const bulkEmails = ref('');
const bulkSkills = ref('');
const bulkFile = ref(null);
const fileInput = ref(null);
const isBulkSaving = ref(false);

const currentLang = ref(localStorage.getItem('dashboard_lang') || 'ar');

const toggleLang = () => {
    currentLang.value = currentLang.value === 'ar' ? 'en' : 'ar';
    localStorage.setItem('dashboard_lang', currentLang.value);
};

const t = {
    ar: {
        loading: "جاري تحميل سجل الطلاب...",
        title: "سجل الطلاب المشتركين",
        subtitle: "استعراض بيانات الطلاب المسجلين، باقات اشتراكاتهم، ومستويات تقدمهم وإحصائياتهم",
        btnRegister: "تسجيل طالب جديد",
        btnMatrixImport: "استيراد دفعات",
        btnBulkSkills: "ربط مهارات جماعي",
        btnPurge: "حذف المحدد",
        searchPlaceholder: "بحث عن طالب...",
        colIdentity: "حساب الطالب وبياناته",
        colSubscription: "الباقة / الاشتراك",
        colCategory: "نوع التقييم",
        colStatus: "النشاط",
        colActions: "العمليات",
        nonAdaptive: "غير تكيفي",
        customAsset: "باقة مخصصة / ذاتية",
        active: "نشط",
        inactive: "غير نشط",
        tooltipView: "عرض الملف الشخصي",
        tooltipReset: "إعادة ضبط محاولات وتقدم الطالب",
        tooltipEdit: "تعديل التفاصيل",
        tooltipDelete: "حذف الطالب نهائياً",
        emptySearch: "لم يتم العثور على أي طلاب مطابقين لعملية البحث.",
        emptyTitle: "لا يوجد طلاب مسجلين",
        emptySubtitle: "قم بتسجيل الطلاب يدوياً أو عبر ملف استيراد جماعي لبدء تقديم الاختبارات.",
        emptyBtn: "تسجيل أول طالب",
        
        // Modals
        deleteConfirmTitle: "حذف حساب الطالب",
        deleteConfirmMessage: "هل أنت متأكد من رغبتك في حذف حساب الطالب: {name} نهائياً؟ سيؤدي ذلك أيضاً لحذف حسابه الرئيسي وسجل امتحاناته بالكامل ولا يمكن التراجع عن ذلك.",
        deleteSuccess: "تم حذف الطالب بنجاح.",
        deleteError: "فشل حذف الطالب.",

        resetConfirmTitle: "إعادة ضبط تقدم الطالب",
        resetConfirmMessage: "تنبيه هام: هل أنت متأكد من إعادة ضبط تقدم الطالب {name} بالكامل؟ سيتم مسح محاولاته السابقة نهائياً لتمكينه من البدء من جديد.",
        resetSuccess: "تمت إعادة ضبط محاولات الطالب بنجاح ويمكنه الآن إعادة التقييم.",
        resetError: "فشلت إعادة ضبط تقدم الطالب.",

        bulkDeleteTitle: "حذف جماعي للطلاب",
        bulkDeleteMessage: "هل أنت متأكد من رغبتك في حذف {count} من الطلاب المحددين نهائياً؟ هذا الإجراء لا يمكن التراجع عنه.",
        bulkDeleteSuccess: "تم حذف الطلاب المحددين بنجاح.",
        bulkDeleteError: "فشل حذف الطلاب المحددين.",

        // Bulk Skills Modal
        bulkModalTitle: "ربط المهارات جماعياً",
        bulkModalSubtitle: "بروتوكول تعيين وتحديث مهارات قياس الطلاب دفعة واحدة",
        bulkModalNote: "تحديث تعيينات المهارات للطلاب إما عن طريق لصق رسائل البريد الإلكتروني أو أسماء المستخدمين يدوياً، أو عن طريق تحميل ملف البيانات الرئيسي.",
        downloadTemplate: "تحميل قالب ملف الربط (Excel Template)",
        manualOverride: "تعيين يدوي سريع",
        labelEmails: "معرفات الطلاب (البريد الإلكتروني أو اسم المستخدم)",
        labelSkills: "رموز المهارات القصيرة المراد ربطها (مثل R, W, G)",
        placeholderEmails: "مثال: user1@domain.com أو username123...\n(افصل بينها بفاصلة أو سطر جديد)",
        placeholderSkills: "مثال: R, W, G",
        btnDiscard: "إلغاء وتراجع",
        btnSyncing: "جاري المزامنة والربط...",
        btnCommit: "مزامنة وتأكيد الربط",
        importFileError: "فشل استيراد ورفع ملف المهارات.",
        updateSkillsSuccess: "تم ربط وتحديث المهارات للطلاب المحددين بنجاح.",
        updateSkillsError: "فشل ربط وتحديث المهارات للطلاب."
    },
    en: {
        loading: "Loading candidate registry...",
        title: "Student Registry",
        subtitle: "Audit verified student records, subscription plans, and adaptive level progress profiles",
        btnRegister: "Register Student",
        btnMatrixImport: "Batch Import",
        btnBulkSkills: "Bulk Skills Mapping",
        btnPurge: "Purge Selected",
        searchPlaceholder: "Search students...",
        colIdentity: "Student Account & Info",
        colSubscription: "Active Package",
        colCategory: "Assessment Model",
        colStatus: "Status",
        colActions: "Actions",
        nonAdaptive: "Non-Adaptive",
        customAsset: "Custom Asset",
        active: "Active",
        inactive: "Inactive",
        tooltipView: "View Profile",
        tooltipReset: "Reset Exam Progress",
        tooltipEdit: "Edit Details",
        tooltipDelete: "Delete Identity",
        emptySearch: "No matching candidate identities discovered.",
        emptyTitle: "No Registered Students",
        emptySubtitle: "Register students manually or via bulk spreadsheet import to start conducting assessments.",
        emptyBtn: "Register First Student",

        // Modals
        deleteConfirmTitle: "Delete Student",
        deleteConfirmMessage: "Are you sure you want to permanently delete student: {name}? This will also delete their User account and all exam history.",
        deleteSuccess: "Student deleted successfully.",
        deleteError: "Failed to delete student.",

        resetConfirmTitle: "Reset Progress",
        resetConfirmMessage: "CAUTION: Are you sure you want to reset all exam progress for {name}? This will permanently delete their previous attempts and allow them to start fresh.",
        resetSuccess: "Candidate progress has been successfully reset. They can now retake the assessment.",
        resetError: "Failed to reset progress.",

        bulkDeleteTitle: "Bulk Delete",
        bulkDeleteMessage: "Are you sure you want to delete {count} selected students? This action cannot be undone.",
        bulkDeleteSuccess: "Selected students deleted successfully.",
        bulkDeleteError: "Failed to delete students.",

        // Bulk Skills Modal
        bulkModalTitle: "Bulk Skills Mapping",
        bulkModalSubtitle: "Bulk module mapping protocol",
        bulkModalNote: "Update module assignments either by pasting emails or usernames manually, OR by uploading the master sheet.",
        downloadTemplate: "Download Excel Template",
        manualOverride: "Manual Override",
        labelEmails: "Identity Access (Emails or Usernames)",
        labelSkills: "Mapping Short Codes (e.g. R, W, G)",
        placeholderEmails: "E.G. JOHN@DOMAIN.COM OR USERNAME123...\n(Separate by comma or new lines)",
        placeholderSkills: "E.G. R, W, G",
        btnDiscard: "Discard",
        btnSyncing: "SYNCING...",
        btnCommit: "COMMIT SYNC",
        importFileError: "Failed to import file.",
        updateSkillsSuccess: "Skills successfully updated for matching identities.",
        updateSkillsError: "Failed to update skills."
    }
};

const modalConfig = ref({
    visible: false,
    title: '',
    message: '',
    type: 'info',
    showCancel: false,
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    onConfirm: null,
    onCancel: null
});

const showModal = (options) => {
    modalConfig.value = {
        visible: true,
        title: options.title || 'Notification',
        message: options.message || '',
        type: options.type || 'info',
        showCancel: options.showCancel || false,
        confirmText: options.confirmText || 'Yes',
        cancelText: options.cancelText || 'Cancel',
        onConfirm: options.onConfirm || null,
        onCancel: options.onCancel || null
    };
};

const handleModalConfirm = () => {
    modalConfig.value.visible = false;
    if (modalConfig.value.onConfirm) modalConfig.value.onConfirm();
};

const handleModalCancel = () => {
    modalConfig.value.visible = false;
    if (modalConfig.value.onCancel) modalConfig.value.onCancel();
};

const filteredStudents = computed(() => {
    if (!searchQuery.value) return students.value;
    const query = searchQuery.value.toLowerCase();
    return students.value.filter(s => {
        const name = `${s.user?.first_name || ''} ${s.user?.last_name || ''}`.toLowerCase();
        const email = (s.user?.email || '').toLowerCase();
        const code = (s.student_code || '').toLowerCase();
        return name.includes(query) || email.includes(query) || code.includes(query);
    });
});

const fetchStudents = async () => {
    loading.value = true;
    try {
        const res = await api.get('/admin/students');
        students.value = res.data.data || res.data;
    } catch (err) {
        showAlert('Failed to load students', 'Error', 'error');
    } finally {
        loading.value = false;
    }
};

const fetchSkills = async () => {
    try {
        const res = await api.get('/admin/skills');
        skills.value = res.data;
    } catch (err) {
        showAlert('Failed to load skills', 'Error', 'error');
    }
};

const fetchPackages = async () => {
    try {
        const res = await api.get('/admin/packages');
        packages.value = res.data;
    } catch (err) {
        showAlert('Failed to load packages', 'Error', 'error');
    }
};

const openView = (student) => {
    router.push(`/admin/students/${student.id}/show`);
};

const openEdit = (student) => {
    router.push(`/admin/students/${student.id}/edit`);
};

const deleteStudent = async (student) => {
    const fullName = `${student.user?.first_name} ${student.user?.last_name}`;
    const confirmed = await showConfirm(
        t[currentLang.value].deleteConfirmMessage.replace('{name}', fullName),
        t[currentLang.value].deleteConfirmTitle,
        'danger',
        currentLang.value === 'ar' ? 'نعم، احذف' : 'Yes, Delete'
    );

    if (!confirmed) return;

    try {
        await api.delete(`/admin/students/${student.id}`);
        students.value = students.value.filter(s => s.id !== student.id);
        await showAlert(t[currentLang.value].deleteSuccess, currentLang.value === 'ar' ? 'تم بنجاح' : 'Success', 'success');
    } catch (err) {
        showAlert(t[currentLang.value].deleteError, currentLang.value === 'ar' ? 'خطأ' : 'Error', 'danger');
    }
};

const resetProgress = async (student) => {
    const fullName = `${student.user?.first_name} ${student.user?.last_name}`;
    const confirmed = await showConfirm(
        t[currentLang.value].resetConfirmMessage.replace('{name}', fullName),
        t[currentLang.value].resetConfirmTitle,
        'warning',
        currentLang.value === 'ar' ? 'نعم، أعد الضبط' : 'Yes, Reset'
    );

    if (!confirmed) return;

    try {
        await api.post(`/admin/students/${student.id}/reset`);
        await showAlert(t[currentLang.value].resetSuccess, t[currentLang.value].resetConfirmTitle, 'success');
        fetchStudents();
    } catch (err) {
        showAlert(err.response?.data?.error || t[currentLang.value].resetError, currentLang.value === 'ar' ? 'خطأ' : 'Error', 'danger');
    }
};

const bulkDelete = async () => {
    if (!selectedStudents.value.length) return;

    const confirmed = await showConfirm(
        t[currentLang.value].bulkDeleteMessage.replace('{count}', selectedStudents.value.length),
        t[currentLang.value].bulkDeleteTitle,
        'danger',
        currentLang.value === 'ar' ? 'نعم، احذف المحدد' : 'Yes, Delete Selected'
    );

    if (!confirmed) return;

    try {
        const ids = selectedStudents.value.map(s => s.id);
        await api.post('/admin/students/bulk-delete', { ids });
        students.value = students.value.filter(s => !ids.includes(s.id));
        selectedStudents.value = [];
        await showAlert(t[currentLang.value].bulkDeleteSuccess, currentLang.value === 'ar' ? 'تم بنجاح' : 'Success', 'success');
    } catch (err) {
        showAlert(t[currentLang.value].bulkDeleteError, currentLang.value === 'ar' ? 'خطأ' : 'Error', 'danger');
    }
};

const handleFileUpload = (e) => {
    bulkFile.value = e.target.files[0];
};

const downloadExcelTemplate = async () => {
    try {
        const response = await api.get('/admin/students/bulk-skills-export', { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'students_skills_template.xlsx');
        document.body.appendChild(link);
        link.click();
    } catch (err) {
        showAlert('Failed to download template', 'Error', 'error');
    }
};

const submitBulkSkills = async () => {
    if (bulkFile.value) {
        const formData = new FormData();
        formData.append('file', bulkFile.value);
        isBulkSaving.value = true;
        try {
            await api.post('/admin/students/bulk-skills-import', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            showBulkSkillsModal.value = false;
            fetchStudents();
            await showAlert(t[currentLang.value].updateSkillsSuccess, currentLang.value === 'ar' ? 'تم بنجاح' : 'Success', 'success');
        } catch (err) {
            showAlert(t[currentLang.value].importFileError, currentLang.value === 'ar' ? 'خطأ' : 'Error', 'error');
        } finally {
            isBulkSaving.value = false;
        }
    } else {
        if (!bulkEmails.value || !bulkSkills.value) return;
        const emailsArray = bulkEmails.value.split(/[\s,]+/).map(e => e.trim()).filter(e => e);
        const skillsArray = bulkSkills.value.split(/[\s,]+/).map(s => s.trim().toLowerCase()).filter(s => s);
        isBulkSaving.value = true;
        try {
            await api.post('/admin/students/bulk-skills', {
                emails: emailsArray,
                skills: skillsArray
            });
            showBulkSkillsModal.value = false;
            fetchStudents();
            await showAlert(t[currentLang.value].updateSkillsSuccess, currentLang.value === 'ar' ? 'تم بنجاح' : 'Success', 'success');
        } catch (err) {
            showAlert(t[currentLang.value].updateSkillsError, currentLang.value === 'ar' ? 'خطأ' : 'Error', 'error');
        } finally {
            isBulkSaving.value = false;
        }
    }
};

onMounted(() => {
    fetchStudents();
    fetchPackages();
    fetchSkills();
});
</script>

<template>
    <AdminLayout>
        <div :class="{ 'arabic-theme': currentLang === 'ar' }" :dir="currentLang === 'ar' ? 'rtl' : 'ltr'" class="w-full">
            <!-- Loading Spinner -->
            <div v-if="loading" class="flex flex-col items-center justify-center py-32 space-y-4">
                <ProgressSpinner />
                <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">{{ t[currentLang].loading }}</p>
            </div>

            <!-- Main Content -->
            <div v-else class="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000 mt-6 px-4 md:px-8 pb-20">

                <!-- Premium Standardized Header Card -->
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6 md:space-y-0 relative overflow-hidden group">
                    <div class="absolute right-0 top-0 w-64 h-64 bg-rose-50/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-rose-100/30 transition-all duration-1000"></div>
                    <div class="absolute left-0 bottom-0 w-64 h-64 bg-slate-50/30 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl transition-all duration-1000"></div>
                    
                    <div class="relative z-10 space-y-2">
                         <h1 class="text-3xl font-black text-slate-800 tracking-tight leading-tight">
                             {{ t[currentLang].title }}
                         </h1>
                         <p class="text-xs font-bold text-slate-400 max-w-xl leading-relaxed">
                             {{ t[currentLang].subtitle }}
                         </p>
                    </div>
                    
                    <div class="flex flex-wrap items-center gap-3 relative z-10">
                         
            <!-- Language Selector Toggle -->
                        <button @click="toggleLang" class="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm transition-all duration-300 font-extrabold text-xs">
                            <i class="pi pi-globe text-brand-primary"></i>
                            <span>{{ currentLang === 'ar' ? 'English' : 'العربية' }}</span>
                        </button>
                         <Button v-if="selectedStudents.length > 0" :label="t[currentLang].btnPurge" icon="pi pi-trash"
                             severity="danger" class="text-xs font-bold uppercase tracking-wider px-6 py-2.5 rounded-xl transition-all"
                             @click="bulkDelete" />
                         <Button :label="t[currentLang].btnBulkSkills" icon="pi pi-tags" severity="secondary" outlined
                             class="text-xs font-bold uppercase tracking-wider px-6 py-2.5 rounded-xl transition-all"
                             @click="showBulkSkillsModal = true" />
                         <Button :label="t[currentLang].btnMatrixImport" icon="pi pi-file-excel" severity="secondary" outlined
                             class="text-xs font-bold uppercase tracking-wider px-6 py-2.5 rounded-xl transition-all"
                             @click="router.push('/admin/students/batch')" />
                         <Button :label="t[currentLang].btnRegister" icon="pi pi-plus"
                             class="px-8 py-3 rounded-2xl bg-brand-primary border-none shadow-lg shadow-rose-100 text-xs font-black tracking-wider uppercase transition-all hover:-translate-y-1"
                             @click="router.push('/admin/students/create')" />
                    </div>
                </div>

                <!-- Registry Table Card -->
                <div v-if="students.length > 0 || searchQuery">
                    <Card class="border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-[2rem] overflow-hidden">
                        <template #content>
                            <DataTable :value="filteredStudents" v-model:selection="selectedStudents" dataKey="id" paginator
                                :rows="10" class="p-datatable-sm text-sm" responsiveLayout="scroll">

                                <template #header>
                                    <div class="flex justify-end p-2 pb-4">
                                        <span class="relative">
                                            <i class="pi pi-search absolute text-slate-400 z-10" :class="currentLang === 'ar' ? 'right-3 top-1/2 -translate-y-1/2' : 'left-3 top-1/2 -translate-y-1/2'" />
                                            <InputText v-model="searchQuery" :placeholder="t[currentLang].searchPlaceholder" class="w-full md:w-80 shadow-sm rounded-xl" :class="currentLang === 'ar' ? 'pr-10' : 'pl-10'" />
                                        </span>
                                    </div>
                                </template>

                                <Column selectionMode="multiple" headerStyle="width: 3rem"></Column>

                                <Column :header="t[currentLang].colIdentity" style="min-width: 280px">
                                    <template #body="{ data }">
                                        <div class="flex items-center" :class="currentLang === 'ar' ? 'space-x-reverse space-x-4' : 'space-x-4'">
                                            <div
                                                class="w-11 h-11 rounded-2xl bg-slate-50 text-brand-primary flex items-center justify-center font-black border border-slate-100 shrink-0">
                                                {{ data.user?.first_name ? data.user.first_name[0].toUpperCase() : 'S' }}
                                            </div>
                                            <div>
                                                <div @click="openView(data)"
                                                    class="font-extrabold text-slate-800 hover:text-brand-primary cursor-pointer tracking-tight transition-colors text-sm">
                                                    {{ data.user?.first_name }} {{ data.user?.last_name }}
                                                </div>
                                                <div
                                                    class="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
                                                    {{ data.user?.username || 'NO USERNAME' }} • {{ data.user?.email }}
                                                </div>
                                            </div>
                                        </div>
                                    </template>
                                </Column>

                                <Column :header="t[currentLang].colSubscription" style="min-width: 150px">
                                    <template #body="{ data }">
                                        <Tag v-if="data.package" :value="data.package.name" severity="info"
                                            class="text-[9px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-lg" />
                                        <span v-else
                                            class="text-[9px] font-extrabold text-slate-300 uppercase tracking-wider italic">{{ t[currentLang].customAsset }}</span>
                                    </template>
                                </Column>

                                <Column :header="t[currentLang].colCategory" style="min-width: 150px">
                                    <template #body="{ data }">
                                        <div class="flex flex-col space-y-1">
                                            <div v-if="data.not_adaptive"
                                                class="text-[9px] font-extrabold text-brand-accent uppercase tracking-wider">
                                                {{ t[currentLang].nonAdaptive }}</div>
                                        </div>
                                    </template>
                                </Column>

                                <Column :header="t[currentLang].colStatus" style="min-width: 100px" class="text-center">
                                    <template #body="{ data }">
                                        <Tag :value="data.user?.is_active ? t[currentLang].active : t[currentLang].inactive"
                                             :severity="data.user?.is_active ? 'success' : 'danger'"
                                             class="text-[9px] font-extrabold uppercase tracking-wider px-3" />
                                    </template>
                                </Column>

                                <Column :header="t[currentLang].colActions" :exportable="false" style="min-width: 180px">
                                    <template #body="{ data }">
                                        <div class="flex items-center space-x-2" :class="currentLang === 'ar' ? 'space-x-reverse' : ''">
                                            <Button icon="pi pi-eye" text severity="info" size="small" @click="openView(data)"
                                                v-tooltip.top="t[currentLang].tooltipView" />
                                            <Button icon="pi pi-refresh" text severity="danger" size="small"
                                                @click="resetProgress(data)" v-tooltip.top="t[currentLang].tooltipReset" />
                                            <Button icon="pi pi-pencil" text severity="warning" size="small"
                                                @click="openEdit(data)" v-tooltip.top="t[currentLang].tooltipEdit" />
                                            <Button icon="pi pi-trash" text severity="danger" size="small"
                                                @click="deleteStudent(data)" v-tooltip.top="t[currentLang].tooltipDelete" />
                                        </div>
                                    </template>
                                </Column>

                                <template #empty>
                                    <div class="p-8 text-center text-slate-400 font-medium">{{ t[currentLang].emptySearch }}</div>
                                </template>
                            </DataTable>
                        </template>
                    </Card>
                </div>

                <!-- Empty Global State -->
                <div v-else class="bg-white rounded-[3rem] shadow-[0_32px_120px_rgba(0,0,0,0.02)] border border-slate-100 p-24 text-center group mt-6">
                    <div class="w-24 h-24 bg-rose-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 text-5xl group-hover:rotate-12 transition-transform duration-500 text-brand-accent">
                        <i class="pi pi-users"></i>
                    </div>
                    <h3 class="text-3xl font-black text-slate-800 mb-4 tracking-tight">{{ t[currentLang].emptyTitle }}</h3>
                    <p class="text-slate-500 mb-8 max-w-md mx-auto leading-relaxed">
                        {{ t[currentLang].emptySubtitle }}
                    </p>
                    <Button :label="t[currentLang].emptyBtn" icon="pi pi-arrow-right" iconPos="right" @click="router.push('/admin/students/create')" />
                </div>
            </div>
        </div>

        <!-- Bulk Skills Modal - Institutional Light mode -->
        <Dialog v-model:visible="showBulkSkillsModal" :style="{ width: '500px' }" modal class="rounded-[2.5rem] overflow-hidden border-none shadow-2xl">
            <template #header>
                <div class="flex flex-col" :class="currentLang === 'ar' ? 'text-right' : 'text-left'">
                    <h3 class="text-xl font-black text-slate-800 uppercase tracking-tight">{{ t[currentLang].bulkModalTitle }}</h3>
                    <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{{ t[currentLang].bulkModalSubtitle }}</p>
                </div>
            </template>

            <div class="pt-6 space-y-8" :class="currentLang === 'ar' ? 'text-right' : 'text-left'">
                <div
                    class="bg-rose-50/50 border border-brand-primary/10 p-5 rounded-2xl text-[10px] font-bold text-brand-primary leading-relaxed uppercase tracking-wider">
                    <i class="pi pi-info-circle" :class="currentLang === 'ar' ? 'ml-2' : 'mr-2'"></i>
                    {{ t[currentLang].bulkModalNote }}
                </div>

                <div class="space-y-6">
                    <div
                        class="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 flex flex-col items-center space-y-4">
                        <Button :label="t[currentLang].downloadTemplate" icon="pi pi-download" size="small" text
                            @click="downloadExcelTemplate"
                            class="text-[10px] uppercase font-black tracking-widest text-brand-primary animate-none" />
                        <input type="file" ref="fileInput" @change="handleFileUpload" accept=".xlsx,.xls,.csv"
                            class="w-full text-[10px] font-black uppercase text-slate-400 file:bg-brand-primary file:text-white file:border-none file:rounded-xl file:px-4 file:py-2 file:cursor-pointer"
                            :class="currentLang === 'ar' ? 'file:ml-4' : 'file:mr-4'">
                    </div>

                    <div class="relative flex items-center justify-center">
                        <div class="absolute inset-0 flex items-center px-4">
                            <div class="w-full border-t border-slate-100"></div>
                        </div>
                        <span
                            class="relative bg-white px-4 text-[9px] font-black text-slate-300 uppercase tracking-widest">{{ t[currentLang].manualOverride }}</span>
                    </div>

                    <div class="space-y-4">
                        <div class="space-y-2">
                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block" :class="currentLang === 'ar' ? 'mr-1' : 'ml-1'">{{ t[currentLang].labelEmails }}</label>
                            <textarea v-model="bulkEmails" 
                                class="w-full h-24 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-bold focus:bg-white focus:border-brand-primary/20 focus:ring-4 focus:ring-rose-50/50 transition-all outline-none no-scrollbar shadow-sm"
                                :placeholder="t[currentLang].placeholderEmails"></textarea>
                        </div>
                        <div class="space-y-2">
                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block" :class="currentLang === 'ar' ? 'mr-1' : 'ml-1'">{{ t[currentLang].labelSkills }}</label>
                            <input v-model="bulkSkills" type="text"
                                class="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-black uppercase text-brand-primary focus:bg-white focus:border-brand-primary/20 focus:ring-4 focus:ring-rose-50/50 transition-all outline-none shadow-sm animate-none"
                                :placeholder="t[currentLang].placeholderSkills">
                        </div>
                    </div>
                </div>
            </div>

            <template #footer>
                <div class="flex justify-end pt-6 border-t border-slate-50 gap-3" :class="currentLang === 'ar' ? 'flex-row-reverse' : ''">
                    <Button :label="t[currentLang].btnDiscard" outlined severity="secondary"
                        class="text-[10px] font-black uppercase tracking-widest px-8"
                        @click="showBulkSkillsModal = false" />
                    <Button :label="isBulkSaving ? t[currentLang].btnSyncing : t[currentLang].btnCommit" :loading="isBulkSaving"
                        class="bg-brand-primary border-none text-[10px] font-black uppercase tracking-widest px-8 shadow-lg shadow-rose-100"
                        @click="submitBulkSkills" />
                </div>
            </template>
        </Dialog>

        <!-- Custom Beautiful Modal -->
        <Dialog v-model:visible="modalConfig.visible" modal :closable="false" :style="{ width: '450px' }" class="rounded-[2rem] overflow-hidden border-0 shadow-2xl z-50">
            <template #header>
                <div class="flex items-center gap-4 px-2 pt-2" :class="{
                    'text-emerald-500': modalConfig.type === 'success',
                    'text-rose-500': modalConfig.type === 'danger',
                    'text-amber-500': modalConfig.type === 'warning',
                    'text-indigo-500': modalConfig.type === 'info',
                    'flex-row-reverse': currentLang === 'ar'
                }">
                    <div class="w-12 h-12 rounded-2xl flex items-center justify-center border shadow-sm shrink-0" :class="{
                        'bg-emerald-50 border-emerald-100 text-emerald-600': modalConfig.type === 'success',
                        'bg-rose-50 border-rose-100 text-rose-600': modalConfig.type === 'danger',
                        'bg-amber-50 border-amber-100 text-amber-600': modalConfig.type === 'warning',
                        'bg-indigo-50 border-indigo-100 text-indigo-600': modalConfig.type === 'info'
                    }">
                        <i class="text-2xl" :class="{
                            'pi pi-check-circle': modalConfig.type === 'success',
                            'pi pi-times-circle': modalConfig.type === 'danger',
                            'pi pi-exclamation-triangle': modalConfig.type === 'warning',
                            'pi pi-info-circle': modalConfig.type === 'info'
                        }"></i>
                    </div>
                    <h3 class="font-black text-2xl tracking-tight text-slate-800" :class="currentLang === 'ar' ? 'text-right' : 'text-left'">{{ modalConfig.title }}</h3>
                </div>
            </template>
            <div class="px-2 py-4 text-slate-600 font-medium leading-relaxed text-base" :class="currentLang === 'ar' ? 'text-right' : 'text-left'">
                {{ modalConfig.message }}
            </div>
            <template #footer>
                <div class="flex justify-end gap-3 w-full px-2 pb-2 mt-4" :class="currentLang === 'ar' ? 'flex-row-reverse' : ''">
                    <Button v-if="modalConfig.showCancel" :label="modalConfig.cancelText" text severity="secondary" @click="handleModalCancel" class="font-bold px-6 py-3 rounded-xl hover:bg-slate-100" />
                    <Button :label="modalConfig.confirmText" @click="handleModalConfirm" 
                        class="font-black px-6 py-3 rounded-xl border-none shadow-md hover:shadow-lg transition-all"
                        :class="{
                            'bg-emerald-500 hover:bg-emerald-600 text-white': modalConfig.type === 'success',
                            'bg-rose-500 hover:bg-rose-600 text-white': modalConfig.type === 'danger',
                            'bg-amber-500 hover:bg-amber-600 text-white': modalConfig.type === 'warning',
                            'bg-indigo-500 hover:bg-indigo-600 text-white': modalConfig.type === 'info'
                        }"
                    />
                </div>
            </template>
        </Dialog>
    </AdminLayout>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');

.no-scrollbar::-webkit-scrollbar {
    display: none;
}

.arabic-theme {
    font-family: 'Cairo', system-ui, -apple-system, sans-serif !important;
}

.animate-in {
    animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
}

:deep(.p-datatable-thead > tr > th) {
    background: #fbfcfe;
    border-bottom: 2px solid #f1f5f9;
    padding: 1.25rem 1rem;
    color: #94a3b8;
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.1em;
}

.arabic-theme :deep(.p-datatable-thead > tr > th) {
    text-align: right !important;
}
.arabic-theme :deep(.p-datatable-tbody > tr > td) {
    text-align: right !important;
}

:deep(.p-datatable-tbody > tr:hover) {
    background: #fbfcfe;
}
</style>
