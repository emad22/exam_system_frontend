<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import AdminLayout from '@/components/AdminLayout.vue';
import { useModal } from '@/composables/useModal';
import api from '@/services/api';

import Button from 'primevue/button';
import Card from 'primevue/card';
import Dialog from 'primevue/dialog';
import Select from 'primevue/select';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import Tag from 'primevue/tag';
import TableSkeleton from '@/components/skeletons/TableSkeleton.vue';
import DatePicker from 'primevue/datepicker';
import FilterBar from '@/components/FilterBar.vue';

const router = useRouter();
const route = useRoute();
const { showAlert, showConfirm } = useModal();

const students = ref([]);
const packages = ref([]);
const partners = ref([]);
const loading = ref(true);
const isSaving = ref(false);
const skills = ref([]);

const selectedStudents = ref([]);

// Restore filters from sessionStorage if coming back from edit/show
const _savedFilters = (() => {
    try { return JSON.parse(sessionStorage.getItem('students_filters') || 'null'); } catch { return null; }
})();
const searchQuery = ref(_savedFilters?.searchQuery ?? '');
const selectedPartner = ref(_savedFilters?.selectedPartner ?? null);
const selectedExamStatus = ref(_savedFilters?.selectedExamStatus ?? null);
const dateFrom = ref(_savedFilters?.dateFrom ? new Date(_savedFilters.dateFrom) : null);
const dateTo = ref(_savedFilters?.dateTo ? new Date(_savedFilters.dateTo) : null);

// Bulk Skills State
const showBulkSkillsModal = ref(false);
const bulkEmails = ref('');
const bulkSkills = ref('');
const bulkFile = ref(null);
const fileInput = ref(null);
const isBulkSaving = ref(false);

const currentLang = ref('en');

const t = {
    ar: {
        loading: "جاري تحميل سجل الطلاب...",
        title: "سجل الطلاب المشتركين",
        subtitle: "استعراض بيانات الطلاب المسجلين، باقات اشتراكاتهم، ومستويات تقدمهم وإحصائياتهم",
        btnRegister: "تسجيل طالب جديد",
        btnMatrixImport: "تسجيل من ملف Excel",
        btnBulkSkills: "تحديث مهارات الطلاب",
        btnPurge: "حذف المحدد",
        searchPlaceholder: "بحث بـ (ID، الاسم، البريد، اسم المستخدم، الكود)...",
        dateFrom: "من تاريخ",
        dateTo: "إلى تاريخ",
        btnResetFilters: "إعادة تعيين",
        colIdentity: "حساب الطالب وبياناته",
        colInstitutionCode: "كود المؤسسة",
        colSubscription: "الباقة / الاشتراك",
        colCategory: "نوع التقييم",
        colExamStatus: "تقدم مهارات الامتحان",
        colAttemptStarted: "وقت بداية المحاولة",
        colRegistrationDate: "تاريخ التسجيل",
        colStatus: "النشاط",
        colActions: "العمليات",
        nonAdaptive: "يقف عند درجة الطالب",
        adaptive: "يكمل الامتحان الى الاخر",
        customAsset: "باقة مخصصة / ذاتية",
        active: "نشط",
        inactive: "غير نشط",
        examAllCompleted: "مكتمل بالكامل",
        examPartiallyCompleted: "مكتمل جزئياً",
        examInProgress: "قيد الاختبار الآن",
        examNotTaken: "لم يبدأ الامتحان",
        filterExamStatus: "تصفية بتقدم المهارات",
        statusAll: "جميع الطلاب",
        statusAllCompleted: "مكتمل بالكامل (أنهى جميع المهارات)",
        statusPartiallyCompleted: "مكتمل جزئياً (أنهى بعض المهارات)",
        statusInProgress: "بدأ الاختبار (المهارة الأولى)",
        statusNotTaken: "لم يدخل الاختبار إطلاقاً",
        attemptsCountSuffix: "محاولة",
        scoreLabel: "الدرجة",
        tooltipSkillCompleted: "مكتملة بنجاح",
        tooltipSkillInProgress: "جاري الاختبار الآن",
        tooltipSkillPending: "لم تبدأ بعد",
        tooltipView: "عرض الملف الشخصي",
        tooltipReset: "إعادة ضبط محاولات وتقدم الطالب",
        tooltipEdit: "تعديل التفاصيل",
        tooltipDelete: "حذف الطالب نهائياً",
        emptySearch: "لم يتم العثور على أي طلاب مطابقين لعملية البحث.",
        emptyTitle: "لا يوجد طلاب مسجلين",
        emptySubtitle: "قم بتسجيل الطلاب يدوياً أو عبر ملف استيراد جماعي لبدء تقديم الاختبارات.",
        emptyBtn: "تسجيل أول طالب",
        filterByPartner: "تصفية حسب الشريك",
        allPartners: "جميع الشركاء",
        confirmHold: "هل أنت متأكد من رغبتك في تعليق حساب هذا الطالب مؤقتاً؟",
        confirmUnhold: "هل أنت متأكد من رغبتك في إعادة تنشيط هذا الطالب؟",
        holdPlaced: "تم تعليق حساب الطالب بنجاح.",
        unholdPlaced: "تمت إعادة تنشيط حساب الطالب بنجاح.",
        failedHold: "فشل تعليق حساب الطالب.",
        failedUnhold: "فشل إعادة تنشيط حساب الطالب.",
        bulkHoldTitle: "تحديث حالة جماعي",
        bulkHoldConfirm: "هل أنت متأكد من رغبتك في {action} {count} من الطلاب المحددين؟",
        bulkHoldSuccess: "تم تحديث حالة الطلاب المحددين بنجاح.",
        bulkHoldError: "فشل تحديث حالة الطلاب المحددين.",
        btnBulkHold: "تعليق / تنشيط",
        
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
        loading: "Loading students...",
        title: "Students",
        subtitle: "Manage student records, subscriptions, and skill assignments",
        btnRegister: "Add Student",
        btnMatrixImport: "Import from Excel",
        btnBulkSkills: "Update Students' Skills",
        btnPurge: "Delete Selected",
        searchPlaceholder: "Search by ID, Name, Email, Username, Code...",
        dateFrom: "From Date",
        dateTo: "To Date",
        btnResetFilters: "Reset",
        colIdentity: "Student",
        colInstitutionCode: "Institution Code",
        colSubscription: "Package",
        colCategory: "Assessment Model",
        colExamStatus: "Exam Skills Progress",
        colAttemptStarted: "Attempt Started",
        colRegistrationDate: "Registered Date",
        colStatus: "Status",
        colActions: "Actions",
        nonAdaptive: "Completes the exam to the end",
        adaptive: "Stops at the student's Level",
        customAsset: "Custom Asset",
        active: "Active",
        inactive: "Inactive",
        examAllCompleted: "All Completed",
        examPartiallyCompleted: "Partially Done",
        examInProgress: "In Progress",
        examNotTaken: "Not Started",
        filterExamStatus: "Filter by Exam Progress",
        statusAll: "All Students",
        statusAllCompleted: "Fully Completed (All Skills)",
        statusPartiallyCompleted: "Partially Completed (Some Skills)",
        statusInProgress: "In Progress (1st Skill)",
        statusNotTaken: "Not Started Yet",
        attemptsCountSuffix: "Attempt(s)",
        scoreLabel: "Score",
        tooltipSkillCompleted: "Completed successfully",
        tooltipSkillInProgress: "Currently in progress",
        tooltipSkillPending: "Not started yet",
        tooltipView: "View Profile",
        tooltipReset: "Reset Exam Progress",
        tooltipEdit: "Edit Details",
        tooltipDelete: "Delete Student",
        emptySearch: "No students match your search.",
        emptyTitle: "No Students",
        emptySubtitle: "Add students manually or via bulk import to start assessments.",
        emptyBtn: "Add First Student",
        filterByPartner: "Filter by Partner",
        allPartners: "All Partners",
        confirmHold: "Are you sure you want to place this student on hold?",
        confirmUnhold: "Are you sure you want to reactivate this student?",
        holdPlaced: "Student placed on hold.",
        unholdPlaced: "Student reactivated.",
        failedHold: "Failed to hold student.",
        failedUnhold: "Failed to reactivate student.",
        bulkHoldTitle: "Bulk Status Update",
        bulkHoldConfirm: "Are you sure you want to {action} {count} selected students?",
        bulkHoldSuccess: "Selected students' status updated successfully.",
        bulkHoldError: "Failed to update students' status.",
        btnBulkHold: "Hold / Unhold",

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
        bulkModalTitle: "Update Students' Skills",
        bulkModalSubtitle: "Assign skills to students in bulk",
        bulkModalNote: "Update skill assignments by pasting student emails or usernames, or by uploading a file.",
        downloadTemplate: "Download Template",
        manualOverride: "Manual Entry",
        labelEmails: "Student Emails or Usernames",
        labelSkills: "Skill Codes (e.g. R, W, G)",
        placeholderEmails: "user1@domain.com or username123...\n(Separate by comma or new line)",
        placeholderSkills: "e.g. R, W, G",
        btnDiscard: "Cancel",
        btnSyncing: "Updating...",
        btnCommit: "Update Skills",
        importFileError: "Failed to import file.",
        updateSkillsSuccess: "Skills updated successfully for selected students.",
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

const skillOrderMap = { 'L': 1, 'R': 2, 'G': 3, 'W': 4, 'S': 5 };

const getStudentSkillProgress = (student) => {
    if (!student) return null;

    const rawAssigned = student.assigned_skills || student.package?.skills || null;
    let targetSkills = [];

    if (Array.isArray(rawAssigned) && rawAssigned.length > 0) {
        targetSkills = rawAssigned.map(codeOrId => {
            const found = skills.value.find(sk => 
                sk.id === codeOrId || 
                String(sk.id) === String(codeOrId) || 
                (sk.short_code && sk.short_code.toUpperCase() === String(codeOrId).toUpperCase()) ||
                (sk.name && sk.name.toLowerCase() === String(codeOrId).toLowerCase())
            );
            if (found) return found;
            return {
                id: codeOrId,
                short_code: String(codeOrId).toUpperCase(),
                name: String(codeOrId)
            };
        });
    } else if (skills.value.length > 0) {
        targetSkills = [...skills.value];
    } else {
        // Fallback standard skills if not loaded yet
        targetSkills = [
            { id: 1, short_code: 'L', name: 'Listening' },
            { id: 2, short_code: 'R', name: 'Reading' },
            { id: 3, short_code: 'G', name: 'Grammar' },
            { id: 4, short_code: 'W', name: 'Writing' },
            { id: 5, short_code: 'S', name: 'Speaking' }
        ];
    }

    targetSkills.sort((a, b) => {
        const codeA = (a.short_code || a.name || '').toUpperCase().charAt(0);
        const codeB = (b.short_code || b.name || '').toUpperCase().charAt(0);
        const orderA = skillOrderMap[codeA] || 99;
        const orderB = skillOrderMap[codeB] || 99;
        return orderA - orderB;
    });

    const latestAttempt = student.attempts?.[0];
    const attemptSkills = latestAttempt?.attempt_skills || latestAttempt?.attemptSkills || [];

    let completedCount = 0;
    let inProgressCount = 0;

    const skillChips = targetSkills.map(sk => {
        const matchingAttemptSkill = attemptSkills.find(as => 
            as.skill_id === sk.id || 
            (as.skill?.short_code && as.skill.short_code.toUpperCase() === sk.short_code?.toUpperCase()) ||
            (as.skill?.name && sk.name && as.skill.name.toLowerCase() === sk.name.toLowerCase())
        );

        let status = 'pending';
        let score = null;
        let finishedAt = null;

        if (matchingAttemptSkill) {
            score = matchingAttemptSkill.score;
            finishedAt = matchingAttemptSkill.finished_at;
            if (matchingAttemptSkill.status === 'completed' || finishedAt) {
                status = 'completed';
                completedCount++;
            } else if (['in_progress', 'active', 'paused'].includes(matchingAttemptSkill.status) || matchingAttemptSkill.started_at) {
                status = 'in_progress';
                inProgressCount++;
            }
        }

        return {
            id: sk.id,
            name: sk.name || sk.short_code,
            short_code: (sk.short_code || sk.name || '?').toUpperCase(),
            status,
            score,
            finishedAt
        };
    });

    const totalCount = skillChips.length;
    const hasAttempts = (student.attempts_count ?? student.attempts?.length ?? 0) > 0;

    let overallState = 'not_taken'; // 'not_taken' | 'in_progress' | 'partially_completed' | 'completed'

    if (!hasAttempts || (completedCount === 0 && inProgressCount === 0)) {
        overallState = 'not_taken';
    } else if (completedCount === totalCount && totalCount > 0) {
        overallState = 'completed';
    } else if (completedCount > 0) {
        overallState = 'partially_completed';
    } else if (inProgressCount > 0) {
        overallState = 'in_progress';
    }

    return {
        chips: skillChips,
        completedCount,
        totalCount,
        inProgressCount,
        overallState,
        latestAttempt
    };
};

const examStatusOptions = computed(() => [
    { label: t[currentLang.value].statusAllCompleted, value: 'completed' },
    { label: t[currentLang.value].statusPartiallyCompleted, value: 'partially_completed' },
    { label: t[currentLang.value].statusInProgress, value: 'in_progress' },
    { label: t[currentLang.value].statusNotTaken, value: 'not_taken' },
]);

const resetFilters = () => {
    searchQuery.value = '';
    selectedPartner.value = null;
    selectedExamStatus.value = null;
    dateFrom.value = null;
    dateTo.value = null;
    sessionStorage.removeItem('students_filters');
};

const currentPage = ref(1);
const rowsPerPage = ref(15);
const rowsPerPageOptions = [10, 15, 25, 50, 100];

// Persist filters to sessionStorage whenever they change
watch([searchQuery, selectedPartner, selectedExamStatus, dateFrom, dateTo], () => {
    currentPage.value = 1;
    const toISO = (val) => {
        if (!val) return null;
        if (val instanceof Date && !isNaN(val)) return val.toISOString();
        const d = new Date(val);
        return !isNaN(d) ? d.toISOString() : null;
    };
    sessionStorage.setItem('students_filters', JSON.stringify({
        searchQuery: searchQuery.value,
        selectedPartner: selectedPartner.value,
        selectedExamStatus: selectedExamStatus.value,
        dateFrom: toISO(dateFrom.value),
        dateTo: toISO(dateTo.value),
    }));
});

const filteredStudents = computed(() => {
    let result = students.value;

    if (selectedPartner.value) {
        result = result.filter(s => s.partner_id === selectedPartner.value);
    }

    if (selectedExamStatus.value) {
        result = result.filter(s => {
            const progress = getStudentSkillProgress(s);
            if (!progress) return false;
            return progress.overallState === selectedExamStatus.value;
        });
    }

    if (searchQuery.value) {
        const query = searchQuery.value.trim().toLowerCase();
        result = result.filter(s => {
            const idStr = String(s.id || '');
            const userIdStr = String(s.user?.id || '');
            const firstName = (s.user?.first_name || '').toLowerCase();
            const lastName = (s.user?.last_name || '').toLowerCase();
            const fullName = `${firstName} ${lastName}`.trim();
            const username = (s.user?.username || '').toLowerCase();
            const email = (s.user?.email || '').toLowerCase();
            const code = (s.student_code || '').toLowerCase();
            const instCode = (s.institution_code || '').toLowerCase();

            return idStr === query ||
                   userIdStr === query ||
                   fullName.includes(query) ||
                   firstName.includes(query) ||
                   lastName.includes(query) ||
                   username.includes(query) ||
                   email.includes(query) ||
                   code.includes(query) ||
                   instCode.includes(query);
        });
    }

    if (dateFrom.value) {
        const fromTime = new Date(dateFrom.value).setHours(0, 0, 0, 0);
        result = result.filter(s => {
            const rawDate = s.registration_date || s.created_at;
            if (!rawDate) return false;
            const regTime = new Date(rawDate).setHours(0, 0, 0, 0);
            return regTime >= fromTime;
        });
    }

    if (dateTo.value) {
        const toTime = new Date(dateTo.value).setHours(23, 59, 59, 999);
        result = result.filter(s => {
            const rawDate = s.registration_date || s.created_at;
            if (!rawDate) return false;
            const regTime = new Date(rawDate).getTime();
            return regTime <= toTime;
        });
    }

    return result;
});

const totalRecords = computed(() => filteredStudents.value.length);
const totalPages = computed(() => Math.ceil(totalRecords.value / rowsPerPage.value) || 1);

const paginatedStudents = computed(() => {
    const start = (currentPage.value - 1) * rowsPerPage.value;
    return filteredStudents.value.slice(start, start + rowsPerPage.value);
});

const changePage = (page) => {
    if (page >= 1 && page <= totalPages.value) currentPage.value = page;
};

const fetchStudents = async () => {
    loading.value = true;
    try {
        const res = await api.get('/admin/students');
        students.value = res.data.data || res.data;
        // console.log('Student sample:', students.value[0]); // شوف الـ fields

    } catch (err) {
        showAlert('Failed to load students', 'Error', 'error');
    } finally {
        loading.value = false;
    }
};

// URL sync removed to keep it entirely client-side

const fetchPartners = async () => {
    try {
        const res = await api.get('/admin/partners');
        partners.value = res.data;
    } catch (err) {
        console.error('Failed to load partners', err);
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
        await showAlert(t[currentLang.value].deleteSuccess, 'Success', 'success');
    } catch (err) {
        showAlert(t[currentLang.value].deleteError, 'Error', 'danger');
    }
};

const toggleHold = async (student) => {
    const action = student.user?.is_active ? 'hold' : 'unhold';
    const confirmMsg = action === 'hold' ? t[currentLang.value].confirmHold : t[currentLang.value].confirmUnhold;
    
    const confirmed = await showConfirm(
        confirmMsg,
        t[currentLang.value].title,
        action === 'hold' ? 'warning' : 'info',
        'Confirm'
    );
    if (!confirmed) return;

    try {
        await api.patch(`/admin/students/${student.id}`, { is_active: !student.user?.is_active });
        if (student.user) student.user.is_active = !student.user.is_active;
        await showAlert(
            action === 'hold' ? t[currentLang.value].holdPlaced : t[currentLang.value].unholdPlaced,
            'Success',
            'success'
        );
        fetchStudents();
    } catch (err) {
        console.error(err);
        showAlert(
            action === 'hold' ? t[currentLang.value].failedHold : t[currentLang.value].failedUnhold,
            'Error',
            'danger'
        );
    }
};

const resetProgress = async (student) => {
    const fullName = `${student.user?.first_name} ${student.user?.last_name}`;
    const confirmed = await showConfirm(
        t[currentLang.value].resetConfirmMessage.replace('{name}', fullName),
        t[currentLang.value].resetConfirmTitle,
        'warning',
        'Yes, Reset'
    );

    if (!confirmed) return;

    try {
        await api.post(`/admin/students/${student.id}/reset`);
        await showAlert(t[currentLang.value].resetSuccess, t[currentLang.value].resetConfirmTitle, 'success');
        fetchStudents();
    } catch (err) {
        showAlert(err.response?.data?.error || t[currentLang.value].resetError, 'Error', 'danger');
    }
};

const bulkDelete = async () => {
    if (!selectedStudents.value.length) return;

    const confirmed = await showConfirm(
        t[currentLang.value].bulkDeleteMessage.replace('{count}', selectedStudents.value.length),
        t[currentLang.value].bulkDeleteTitle,
        'danger',
        'Yes, Delete Selected'
    );

    if (!confirmed) return;

    try {
        const ids = selectedStudents.value.map(s => s.id);
        await api.post('/admin/students/bulk-delete', { ids });
        students.value = students.value.filter(s => !ids.includes(s.id));
        selectedStudents.value = [];
        await showAlert(t[currentLang.value].bulkDeleteSuccess, 'Success', 'success');
    } catch (err) {
        showAlert(t[currentLang.value].bulkDeleteError, 'Error', 'danger');
    }
};

const bulkToggleHold = async () => {
    if (!selectedStudents.value.length) return;

    const targetIsActive = !selectedStudents.value[0].user?.is_active;
    const actionText = targetIsActive ? 'reactivate' : 'place on hold';
    
    const confirmMsg = t[currentLang.value].bulkHoldConfirm
        .replace('{action}', actionText)
        .replace('{count}', selectedStudents.value.length);
        
    const confirmed = await showConfirm(
        confirmMsg,
        t[currentLang.value].bulkHoldTitle,
        targetIsActive ? 'info' : 'warning',
        'Confirm'
    );
    
    if (!confirmed) return;

    isSaving.value = true;
    try {
        await Promise.all(selectedStudents.value.map(student => 
            api.patch(`/admin/students/${student.id}`, { is_active: targetIsActive })
        ));
        
        await showAlert(t[currentLang.value].bulkHoldSuccess, 'Success', 'success');
        selectedStudents.value = [];
        fetchStudents();
    } catch (err) {
        console.error(err);
        showAlert(t[currentLang.value].bulkHoldError, 'Error', 'danger');
    } finally {
        isSaving.value = false;
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
            await showAlert(t[currentLang.value].updateSkillsSuccess, 'Success', 'success');
        } catch (err) {
            showAlert(t[currentLang.value].importFileError, 'Error', 'error');
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
            await showAlert(t[currentLang.value].updateSkillsSuccess, 'Success', 'success');
        } catch (err) {
            showAlert(t[currentLang.value].updateSkillsError, 'Error', 'error');
        } finally {
            isBulkSaving.value = false;
        }
    }
};

const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toISOString().split('T')[0];
};

const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const date = d.toISOString().split('T')[0];
    const time = d.toTimeString().split(' ')[0].substring(0, 5); // HH:MM
    return `${date} ${time}`;
};

onMounted(() => {
    fetchStudents();
    fetchPackages();
    fetchSkills();
    fetchPartners();
});
</script>

<template>
    <AdminLayout>
        <div dir="ltr" class="w-full">
            <!-- Loading Skeleton -->
            <div v-if="loading" class="mt-6 px-4 md:px-8">
                <TableSkeleton :rows="8" :columns="6" />
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
                        <Button :label="t[currentLang].btnBulkSkills" icon="pi pi-tags" severity="secondary" outlined
                            class="text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all"
                            @click="showBulkSkillsModal = true" />
                        <Button :label="t[currentLang].btnMatrixImport" icon="pi pi-file-excel" severity="secondary" outlined
                            class="text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all"
                            @click="router.push('/admin/students/batch')" />
                        <Button :label="t[currentLang].btnRegister" icon="pi pi-plus"
                            class="px-7 py-2.5 rounded-xl bg-brand-primary border-none shadow-lg shadow-rose-100 text-xs font-black tracking-wider uppercase transition-all hover:-translate-y-0.5"
                            @click="router.push('/admin/students/create')" />
                    </div>
                </div>

                <!-- Bulk Action Banner — appears only when students are selected -->
                <transition name="slide-down">
                    <div v-if="selectedStudents.length > 0"
                        class="flex flex-wrap items-center justify-between gap-4 bg-brand-primary/5 border border-brand-primary/20 rounded-2xl px-6 py-4">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 bg-brand-primary rounded-xl flex items-center justify-center text-white shrink-0">
                                <i class="pi pi-check-square text-sm"></i>
                            </div>
                            <div>
                                <p class="text-xs font-black text-brand-primary uppercase tracking-wider">
                                    {{ selectedStudents.length }} Students Selected
                                </p>
                                <p class="text-[10px] font-bold text-slate-400">
                                    Choose a bulk action to apply
                                </p>
                            </div>
                        </div>
                        <div class="flex items-center gap-2 flex-wrap">
                            <Button
                                :label="t[currentLang].btnBulkHold"
                                :icon="selectedStudents[0]?.user?.is_active ? 'pi pi-pause' : 'pi pi-play'"
                                severity="warning" outlined
                                class="text-xs font-extrabold uppercase tracking-wider rounded-xl px-5 py-2"
                                @click="bulkToggleHold" :loading="isSaving" />
                            <Button
                                :label="t[currentLang].btnPurge" icon="pi pi-trash"
                                severity="danger" outlined
                                class="text-xs font-extrabold uppercase tracking-wider rounded-xl px-5 py-2"
                                @click="bulkDelete" />
                            <button @click="selectedStudents = []"
                                class="px-4 py-2 text-[10px] font-extrabold text-slate-400 hover:text-slate-600 uppercase tracking-wider transition-colors">
                                Clear
                            </button>
                        </div>
                    </div>
                </transition>


                <!-- Filter Bar -->
                <FilterBar
                    v-model="searchQuery"
                    :search-placeholder="t[currentLang].searchPlaceholder"
                    v-model:dateFrom="dateFrom"
                    v-model:dateTo="dateTo"
                    :active-count="(selectedPartner ? 1 : 0) + (selectedExamStatus ? 1 : 0)"
                    @reset="resetFilters"
                >
                    <div class="hidden sm:block h-8 w-px bg-slate-100 shrink-0" />
                    <Select v-model="selectedPartner" :options="partners" optionLabel="partner_name" optionValue="id"
                        :placeholder="t[currentLang].allPartners" showClear 
                        class="!h-11 !rounded-2xl !border-slate-100 !bg-slate-50 !text-xs !font-bold min-w-[180px] hover:!border-brand-primary/30 transition-all flex items-center" />
                </FilterBar>

                <!-- Registry Table Card -->
                <div v-if="students.length > 0 || searchQuery || selectedPartner || selectedExamStatus || dateFrom || dateTo">
                    <Card class="border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-[2rem] overflow-hidden">
                        <template #content>
                            <DataTable :value="paginatedStudents" v-model:selection="selectedStudents" dataKey="id"
                                class="p-datatable-sm text-sm" responsiveLayout="scroll">

                                <Column selectionMode="multiple" headerStyle="width: 3rem"></Column>

                                <Column :header="t[currentLang].colIdentity" style="min-width: 280px">
                                    <template #body="{ data }">
                                        <div class="flex items-center space-x-4">
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
                                                    <span v-if="data.student_code" class="text-slate-500 font-extrabold">
                                                    • ID: {{ data.student_code }}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </template>
                                </Column>

                                <!-- <Column :header="t[currentLang].colInstitutionCode" style="min-width: 140px">
                                    <template #body="{ data }">
                                        <div class="font-mono text-xs font-bold text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 inline-block">
                                            {{ data.institution_code || '-' }}
                                        </div>
                                    </template>
                                </Column> -->

                                <Column :header="t[currentLang].colSubscription" style="min-width: 150px">
                                    <template #body="{ data }">
                                        <Tag v-if="data.package" :value="data.package.name" severity="info"
                                            class="text-[9px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-lg" />
                                        <span v-else
                                            class="text-[9px] font-extrabold text-slate-300 uppercase tracking-wider italic">{{ t[currentLang].customAsset }}</span>
                                    </template>
                                </Column>

                                <!-- <Column :header="t[currentLang].colCategory" style="min-width: 150px">
                                    <template #body="{ data }">
                                        <div class="flex flex-col space-y-1">
                                            <Tag :value="data.is_continue ? t[currentLang].nonAdaptive : t[currentLang].adaptive"
                                                 :severity="data.is_continue ? 'warn' : 'info'"
                                                 class="text-[9px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-lg" />
                                        </div>
                                    </template>
                                </Column> -->

                                <Column :header="t[currentLang].colExamStatus" style="min-width: 220px">
                                    <template #body="{ data }">
                                        <div v-if="getStudentSkillProgress(data)" class="flex flex-col items-start gap-1.5 py-1">
                                            <!-- Overall Status Header Tag -->
                                            <div class="flex items-center gap-1.5">
                                                <!-- Case 1: Fully Completed -->
                                                <span v-if="getStudentSkillProgress(data).overallState === 'completed'"
                                                    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-black text-[10px] tracking-wide shadow-2xs">
                                                    <i class="pi pi-check-circle text-emerald-600 text-xs"></i>
                                                    <span>{{ t[currentLang].examAllCompleted }} ({{ getStudentSkillProgress(data).completedCount }}/{{ getStudentSkillProgress(data).totalCount }})</span>
                                                    <span v-if="getStudentSkillProgress(data).latestAttempt?.overall_score !== null && getStudentSkillProgress(data).latestAttempt?.overall_score !== undefined" class="text-emerald-800 font-extrabold ml-1">
                                                        • {{ getStudentSkillProgress(data).latestAttempt.overall_score }}%
                                                    </span>
                                                </span>

                                                <!-- Case 2: Partially Completed (Finished some skills, remaining others) -->
                                                <span v-else-if="getStudentSkillProgress(data).overallState === 'partially_completed'"
                                                    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200/80 font-black text-[10px] tracking-wide shadow-2xs">
                                                    <i class="pi pi-hourglass text-indigo-600 text-xs"></i>
                                                    <span>{{ t[currentLang].examPartiallyCompleted }} ({{ getStudentSkillProgress(data).completedCount }}/{{ getStudentSkillProgress(data).totalCount }})</span>
                                                </span>

                                                <!-- Case 3: In Progress (Started first skill) -->
                                                <span v-else-if="getStudentSkillProgress(data).overallState === 'in_progress'"
                                                    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/80 font-black text-[10px] tracking-wide shadow-2xs">
                                                    <i class="pi pi-spin pi-spinner text-amber-600 text-xs"></i>
                                                    <span>{{ t[currentLang].examInProgress }} (0/{{ getStudentSkillProgress(data).totalCount }})</span>
                                                </span>

                                                <!-- Case 4: Not Started -->
                                                <span v-else
                                                    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100/90 text-slate-500 border border-slate-200/70 font-extrabold text-[10px] tracking-wide">
                                                    <i class="pi pi-minus-circle text-slate-400 text-xs"></i>
                                                    <span>{{ t[currentLang].examNotTaken }}</span>
                                                </span>
                                            </div>

                                            <!-- Skill Chips Horizontal Bar -->
                                            <div class="flex items-center gap-1.5 flex-wrap mt-0.5">
                                                <template v-for="chip in getStudentSkillProgress(data).chips" :key="chip.id || chip.short_code">
                                                    <!-- Completed Skill Chip (Green) -->
                                                    <div v-if="chip.status === 'completed'"
                                                        v-tooltip.top="`${chip.name}: ${t[currentLang].tooltipSkillCompleted}${chip.score !== null && chip.score !== undefined ? ` (${chip.score}%)` : ''}`"
                                                        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-100/90 text-emerald-800 border border-emerald-300/80 text-[10px] font-black cursor-help transition-all hover:scale-105 shadow-2xs">
                                                        <span>{{ chip.short_code }}</span>
                                                        <i class="pi pi-check text-[9px] text-emerald-700 font-black"></i>
                                                    </div>

                                                    <!-- In Progress Skill Chip (Yellow Pulsing) -->
                                                    <div v-else-if="chip.status === 'in_progress'"
                                                        v-tooltip.top="`${chip.name}: ${t[currentLang].tooltipSkillInProgress}`"
                                                        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black cursor-help animate-pulse transition-all hover:scale-105 shadow-2xs">
                                                        <span>{{ chip.short_code }}</span>
                                                        <i class="pi pi-spin pi-spinner text-[9px] text-amber-700"></i>
                                                    </div>

                                                    <!-- Pending / Not Started Skill Chip (Gray) -->
                                                    <div v-else
                                                        v-tooltip.top="`${chip.name}: ${t[currentLang].tooltipSkillPending}`"
                                                        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-400 border border-slate-200/80 text-[10px] font-bold cursor-help opacity-70 transition-all hover:scale-105">
                                                        <span>{{ chip.short_code }}</span>
                                                        <span class="w-1.5 h-1.5 rounded-full bg-slate-300 inline-block"></span>
                                                    </div>
                                                </template>
                                            </div>
                                        </div>
                                    </template>
                                </Column>

                                <!-- Attempt Start Time Column -->
                                <Column :header="t[currentLang].colAttemptStarted" style="min-width: 160px">
                                    <template #body="{ data }">
                                        <div v-if="data.attempts?.[0]?.started_at" class="flex flex-col gap-0.5">
                                            <div class="flex items-center gap-1.5 text-xs font-bold text-slate-700 font-mono">
                                                <i class="pi pi-clock text-amber-500 text-xs"></i>
                                                <span>{{ formatDateTime(data.attempts[0].started_at) }}</span>
                                            </div>
                                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-5">
                                                {{ data.attempts[0].status === 'completed' ? (currentLang === 'ar' ? 'مكتملة' : 'Completed') : data.attempts[0].status === 'in_progress' ? (currentLang === 'ar' ? 'جارية' : 'In Progress') : data.attempts[0].status }}
                                            </span>
                                        </div>
                                        <span v-else class="text-[10px] font-bold text-slate-300 uppercase tracking-wider italic">—</span>
                                    </template>
                                </Column>

                                <Column :header="t[currentLang].colRegistrationDate" style="min-width: 140px">
                                    <template #body="{ data }">
                                        <div class="flex items-center gap-1.5 text-xs font-bold text-slate-600 font-mono">
                                            <i class="pi pi-calendar text-slate-400 text-xs"></i>
                                            <span>{{ formatDate(data.registration_date || data.created_at) }}</span>
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
                                        <div class="flex items-center space-x-2">
                                            <Button icon="pi pi-eye" text severity="info" size="small" @click="openView(data)"
                                                v-tooltip.top="t[currentLang].tooltipView" />
                                            <Button 
                                                icon="pi pi-refresh" 
                                                text 
                                                severity="danger" 
                                                size="small"
                                                @click="resetProgress(data)" 
                                                v-tooltip.top="t[currentLang].tooltipReset"
                                                :disabled="!data.attempts_count"
                                            />
                                            <Button icon="pi pi-pencil" text severity="warning" size="small"
                                                @click="openEdit(data)" v-tooltip.top="t[currentLang].tooltipEdit" />
                                            <Button :icon="data.user?.is_active ? 'pi pi-pause' : 'pi pi-play'" text severity="warning" size="small" @click="toggleHold(data)" />
                                            <Button icon="pi pi-trash" text severity="danger" size="small"
                                                @click="deleteStudent(data)" v-tooltip.top="t[currentLang].tooltipDelete" />
                                        </div>
                                    </template>
                                </Column>

                                <template #empty>
                                    <div class="p-8 text-center text-slate-400 font-medium">{{ t[currentLang].emptySearch }}</div>
                                </template>
                            </DataTable>

                            <!-- Pagination Bar -->
                            <div v-if="filteredStudents.length > 0" class="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 border-t border-slate-50">
                                <!-- Left: record info + rows per page -->
                                <div class="flex items-center gap-4">
                                    <span class="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                                        Showing
                                        <span class="text-slate-700 font-black">
                                            {{ (currentPage - 1) * rowsPerPage + 1 }}–{{ Math.min(currentPage * rowsPerPage, totalRecords) }}
                                        </span>
                                        of
                                        <span class="text-slate-700 font-black">{{ totalRecords }}</span>
                                        records
                                    </span>
                                    <select v-model="rowsPerPage" @change="currentPage = 1"
                                        class="bg-slate-50 border border-slate-100 rounded-xl px-3 py-1.5 text-[11px] font-bold text-slate-600 outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all">
                                        <option v-for="opt in rowsPerPageOptions" :key="opt" :value="opt">{{ opt }} / page</option>
                                    </select>
                                </div>

                                <!-- Right: page buttons -->
                                <div class="flex items-center gap-1">
                                    <button @click="changePage(1)" :disabled="currentPage === 1"
                                        class="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all" title="First page">
                                        <i class="pi pi-angle-double-left text-xs" />
                                    </button>
                                    <button @click="changePage(currentPage - 1)" :disabled="currentPage === 1"
                                        class="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all" title="Previous">
                                        <i class="pi pi-angle-left text-xs" />
                                    </button>

                                    <template v-for="page in totalPages" :key="page">
                                        <button v-if="page === 1 || page === totalPages || (page >= currentPage - 2 && page <= currentPage + 2)"
                                            @click="changePage(page)"
                                            :class="[
                                                'w-8 h-8 rounded-xl text-[11px] font-black transition-all',
                                                page === currentPage
                                                    ? 'bg-brand-primary text-white shadow-sm'
                                                    : 'text-slate-500 hover:bg-slate-100'
                                            ]">
                                            {{ page }}
                                        </button>
                                        <span v-else-if="page === currentPage - 3 || page === currentPage + 3"
                                            class="w-8 h-8 flex items-center justify-center text-slate-300 text-xs font-bold">…</span>
                                    </template>

                                    <button @click="changePage(currentPage + 1)" :disabled="currentPage === totalPages"
                                        class="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all" title="Next">
                                        <i class="pi pi-angle-right text-xs" />
                                    </button>
                                    <button @click="changePage(totalPages)" :disabled="currentPage === totalPages"
                                        class="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all" title="Last page">
                                        <i class="pi pi-angle-double-right text-xs" />
                                    </button>
                                </div>
                            </div>
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
                <div class="flex flex-col text-left">
                    <h3 class="text-xl font-black text-slate-800 uppercase tracking-tight">{{ t[currentLang].bulkModalTitle }}</h3>
                    <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{{ t[currentLang].bulkModalSubtitle }}</p>
                </div>
            </template>

            <div class="pt-6 space-y-8 text-left">
                <div
                    class="bg-rose-50/50 border border-brand-primary/10 p-5 rounded-2xl text-[10px] font-bold text-brand-primary leading-relaxed uppercase tracking-wider">
                    <i class="pi pi-info-circle mr-2"></i>
                    {{ t[currentLang].bulkModalNote }}
                </div>

                <div class="space-y-6">
                    <div
                        class="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 flex flex-col items-center space-y-4">
                        <Button :label="t[currentLang].downloadTemplate" icon="pi pi-download" size="small" text
                            @click="downloadExcelTemplate"
                            class="text-[10px] uppercase font-black tracking-widest text-brand-primary animate-none" />
                        <input type="file" ref="fileInput" @change="handleFileUpload" accept=".xlsx,.xls,.csv"
                            class="w-full text-[10px] font-black uppercase text-slate-400 file:bg-brand-primary file:text-white file:border-none file:rounded-xl file:px-4 file:py-2 file:cursor-pointer file:mr-4">
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
                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">{{ t[currentLang].labelEmails }}</label>
                            <textarea v-model="bulkEmails" 
                                class="w-full h-24 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-bold focus:bg-white focus:border-brand-primary/20 focus:ring-4 focus:ring-rose-50/50 transition-all outline-none no-scrollbar shadow-sm"
                                :placeholder="t[currentLang].placeholderEmails"></textarea>
                        </div>
                        <div class="space-y-2">
                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">{{ t[currentLang].labelSkills }}</label>
                            <input v-model="bulkSkills" type="text"
                                class="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-black uppercase text-brand-primary focus:bg-white focus:border-brand-primary/20 focus:ring-4 focus:ring-rose-50/50 transition-all outline-none shadow-sm animate-none"
                                :placeholder="t[currentLang].placeholderSkills">
                        </div>
                    </div>
                </div>
            </div>

            <template #footer>
                <div class="flex justify-end pt-6 border-t border-slate-50 gap-3">
                    <Button :label="t[currentLang].btnDiscard" outlined severity="secondary"
                        class="text-[10px] font-black uppercase tracking-widest px-8"
                        @click="showBulkSkillsModal = false" />
                    <Button :label="isBulkSaving ? t[currentLang].btnSyncing : t[currentLang].btnCommit" :loading="isBulkSaving"
                        class="bg-brand-primary border-none text-[10px] font-black uppercase tracking-widest px-8 shadow-lg shadow-rose-100"
                        @click="submitBulkSkills" />
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

/* Bulk action banner slide-down animation */
.slide-down-enter-active,
.slide-down-leave-active {
    transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    overflow: hidden;
}
.slide-down-enter-from,
.slide-down-leave-to {
    opacity: 0;
    transform: translateY(-8px);
    max-height: 0;
}
.slide-down-enter-to,
.slide-down-leave-from {
    opacity: 1;
    transform: translateY(0);
    max-height: 120px;
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
