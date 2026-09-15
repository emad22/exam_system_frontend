<script setup>
import { ref, onMounted, watch } from 'vue';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Select from 'primevue/select';
import Dialog from 'primevue/dialog';
import TableSkeleton from '@/components/skeletons/TableSkeleton.vue';
import CustomPagination from '@/components/CustomPagination.vue';
import FilterBar from '@/components/FilterBar.vue';
import { useConfirm } from "primevue/useconfirm";
import { useModal } from '@/composables/useModal';

const { showAlert } = useModal();
const confirm = useConfirm();

const logs = ref([]);
const totalRecords = ref(0);
const loading = ref(true);
const selectedLogs = ref([]);
const selectedLog = ref(null);
const showDetail = ref(false);
const showRawJson = ref(false);

const filters = ref({
    action: null,
    model_type: '',
    search: '',
    date_from: null,
    date_to: null,
    page: 1,
    per_page: 25
});

const actionOptions = [
    { label: 'All Actions', value: null },
    { label: 'Time Expired (Forced Exit)', value: 'exam_timeout' },
    { label: 'File Uploaded', value: 'file_upload' },
    { label: 'Exit Exam (Button)', value: 'exam_exit' },
    { label: 'Left Exam Window', value: 'exam_page_leave' },
    { label: 'Skill Started', value: 'skill_start' },
    { label: 'Level Transition', value: 'level_transition' },
    { label: 'Record Created', value: 'created' },
    { label: 'Record Updated', value: 'updated' },
    { label: 'Record Deleted', value: 'deleted' },
    { label: 'User Login', value: 'login' },
    { label: 'User Logout', value: 'logout' },
];

const modelTypeOptions = [
    { label: 'All Entities', value: '' },
    { label: 'Exam Attempt', value: 'ExamAttempt' },
    { label: 'Exam', value: 'Exam' },
    { label: 'Question', value: 'Question' },
    { label: 'User', value: 'User' },
    { label: 'Student Profile', value: 'StudentProfile' },
    { label: 'Proctoring Session', value: 'ProctoringSession' },
];

const fetchLogs = async (page = null) => {
    if (page !== null && typeof page === 'number') {
        filters.value.page = page;
    }
    loading.value = true;
    try {
        const params = {
            page: filters.value.page,
            per_page: filters.value.per_page,
            action: filters.value.action || undefined,
            model_type: filters.value.model_type || undefined,
            search: filters.value.search || undefined,
            date_from: filters.value.date_from ? new Date(filters.value.date_from).toISOString().split('T')[0] : undefined,
            date_to: filters.value.date_to ? new Date(filters.value.date_to).toISOString().split('T')[0] : undefined,
        };

        const res = await api.get('/admin/activity-logs', { params });
        logs.value = res.data.data || [];
        totalRecords.value = res.data.meta?.total ?? res.data.total ?? 0;
    } catch (err) {
        console.error("Error fetching logs", err);
        showAlert('Error', 'Failed to load activity logs.');
    } finally {
        loading.value = false;
    }
};

onMounted(() => {
    fetchLogs(1);
});

// Watch only filtering criteria to reset page to 1
watch(
    [
        () => filters.value.action,
        () => filters.value.model_type,
        () => filters.value.search,
        () => filters.value.date_from,
        () => filters.value.date_to
    ],
    () => {
        filters.value.page = 1;
        fetchLogs(1);
    }
);

const resetFilters = () => {
    filters.value = {
        action: null,
        model_type: '',
        search: '',
        date_from: null,
        date_to: null,
        page: 1,
        per_page: 25
    };
    fetchLogs(1);
};

const getActionMeta = (action) => {
    switch (action) {
        case 'exam_timeout':
            return { label: 'Time Expired (Forced Exit)', icon: 'pi pi-clock', badgeClass: 'bg-red-50 text-red-700 border-red-200' };
        case 'file_upload':
            return { label: 'File Uploaded', icon: 'pi pi-upload', badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
        case 'exam_exit':
            return { label: 'Exit Exam (Button)', icon: 'pi pi-sign-out', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' };
        case 'exam_page_leave':
            return { label: 'Left Exam Window', icon: 'pi pi-external-link', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200' };
        case 'skill_start':
            return { label: 'Skill Started', icon: 'pi pi-play', badgeClass: 'bg-purple-50 text-purple-700 border-purple-200' };
        case 'level_transition':
            return { label: 'Level Transition', icon: 'pi pi-arrow-right-arrow-left', badgeClass: 'bg-teal-50 text-teal-700 border-teal-200' };
        case 'created':
            return { label: 'Created', icon: 'pi pi-plus', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
        case 'updated':
            return { label: 'Updated', icon: 'pi pi-pencil', badgeClass: 'bg-sky-50 text-sky-700 border-sky-200' };
        case 'deleted':
            return { label: 'Deleted', icon: 'pi pi-trash', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200' };
        case 'login':
            return { label: 'Login', icon: 'pi pi-sign-in', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' };
        case 'logout':
            return { label: 'Logout', icon: 'pi pi-power-off', badgeClass: 'bg-slate-100 text-slate-700 border-slate-200' };
        default:
            return { label: action || 'Event', icon: 'pi pi-info-circle', badgeClass: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
};

const formatModelType = (type) => {
    if (!type) return 'General';
    const raw = type.split('\\').pop();
    return raw.replace(/([A-Z])/g, ' $1').trim();
};

const getModelIcon = (type) => {
    if (!type) return 'pi pi-database text-slate-400';
    const raw = type.split('\\').pop();
    switch (raw) {
        case 'ExamAttempt': return 'pi pi-file-edit text-indigo-500';
        case 'Exam': return 'pi pi-book text-emerald-500';
        case 'Question': return 'pi pi-question-circle text-amber-500';
        case 'User': return 'pi pi-user text-blue-500';
        case 'StudentProfile': return 'pi pi-id-card text-purple-500';
        case 'ProctoringSession': return 'pi pi-video text-rose-500';
        default: return 'pi pi-database text-slate-400';
    }
};

const formatDescription = (log) => {
    if (!log) return '';
    let desc = log.description || '';

    // Translate historical Arabic descriptions if present
    if (desc.includes('ضغط على زر خروج من الامتحان')) {
        desc = desc.replace(/الطالب\s+(.+?)\s+ضغط على زر خروج من الامتحان/, 'Student $1 clicked Exit Exam button');
        desc = desc.replace(/عند السؤال رقم\s+(\d+)/, 'at Question #$1');
        desc = desc.replace(/\(معرف:\s*#(\d+)\)/, '(ID: #$1)');
        desc = desc.replace(/في مهارة\s+(.+)/, 'in skill $1');
        return desc;
    }
    if (desc.includes('غادر صفحة الامتحان أو أغلق الصفحة')) {
        desc = desc.replace(/الطالب\s+(.+?)\s+غادر صفحة الامتحان أو أغلق الصفحة/, 'Student $1 left or closed the exam window');
        desc = desc.replace(/عند السؤال رقم\s+(\d+)/, 'at Question #$1');
        desc = desc.replace(/\(معرف:\s*#(\d+)\)/, '(ID: #$1)');
        desc = desc.replace(/في مهارة\s+(.+)/, 'in skill $1');
        return desc;
    }
    if (desc.includes('اجتاز المستوى')) {
        desc = desc.replace(/الطالب\s+(.+?)\s+اجتاز المستوى\s+(\d+)\s+في مهارة\s+(.+?)\s+\(النتيجة:\s*(.+?)\)/, 'Student $1 passed Level $2 in skill $3 (Score: $4)');
        return desc;
    }
    if (desc.includes('لم يجتز المستوى')) {
        desc = desc.replace(/الطالب\s+(.+?)\s+لم يجتز المستوى\s+(\d+)\s+في مهارة\s+(.+?)\s+\(النتيجة:\s*(.+?)\)/, 'Student $1 did not pass Level $2 in skill $3 (Score: $4)');
        return desc;
    }
    if (desc.includes('بدأ مهارة')) {
        desc = desc.replace(/الطالب\s+(.+?)\s+بدأ مهارة\s+(.+?)\s+\(المستوى\s+(\d+)\)\s+في اختبار\s+(.+)/, 'Student $1 started skill $2 (Level $3) in exam $4');
        return desc;
    }

    // Clarify generic "updated" logs with key field diffs
    if (log.action === 'updated' && log.changes?.new) {
        const n = log.changes.new;
        const o = log.changes.old || {};

        if (log.model_type?.includes('User')) {
            if (n.last_token_id !== undefined && Object.keys(n).length === 1) {
                return `User #${log.model_id} session refreshed (Login)`;
            }
            const userParts = [];
            if (n.role !== undefined) userParts.push(`Role: ${o.role ?? '-'} → ${n.role}`);
            if (n.is_active !== undefined) userParts.push(`Status: ${n.is_active ? 'Active' : 'Inactive'}`);
            if (n.email !== undefined) userParts.push(`Email changed`);
            if (n.first_name !== undefined || n.last_name !== undefined) userParts.push(`Name updated`);
            if (n.password !== undefined) userParts.push(`Password changed`);
            if (userParts.length > 0) {
                return `Updated User #${log.model_id} (${userParts.join(', ')})`;
            }
        }

        const parts = [];
        if (n.last_seen_question_id !== undefined) {
            parts.push(`Question: #${o.last_seen_question_id ?? '-'} → #${n.last_seen_question_id}`);
        }
        if (n.overall_score !== undefined) {
            parts.push(`Score: ${o.overall_score ?? '-'}% → ${n.overall_score}%`);
        }
        if (n.status !== undefined) {
            parts.push(`Status: ${o.status ?? '-'} → ${n.status}`);
        }
        if (n.current_position !== undefined) {
            parts.push('Skill/level progress advanced');
        }
        if (parts.length > 0) {
            return `Updated ${formatModelType(log.model_type)} #${log.model_id} (${parts.join(', ')})`;
        }
    }

    return desc;
};

const getLogMetadataChips = (log) => {
    const chips = [];
    const c = log.changes;
    if (!c) return chips;

    if (c.skill_name) chips.push({ label: 'Skill', value: c.skill_name, color: 'bg-purple-50 text-purple-700 border-purple-200' });
    if (c.level_number !== undefined && c.level_number !== null) chips.push({ label: 'Level', value: c.level_number, color: 'bg-blue-50 text-blue-700 border-blue-200' });
    if (c.question_number) chips.push({ label: 'Q#', value: c.question_number, color: 'bg-amber-50 text-amber-700 border-amber-200' });
    else if (c.question_id) chips.push({ label: 'Q ID', value: `#${c.question_id}`, color: 'bg-slate-50 text-slate-700 border-slate-200' });
    if (c.score !== undefined) chips.push({ label: 'Score', value: `${c.score}%`, color: c.status === 'passed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200' });
    if (c.status) chips.push({ label: 'Status', value: c.status, color: c.status === 'passed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200' });
    if (c.exit_type) chips.push({ label: 'Trigger', value: c.exit_type === 'manual_button' ? 'Exit Button' : c.exit_type, color: 'bg-amber-50 text-amber-700 border-amber-200' });
    if (c.exit_type === 'timeout_forced') chips.push({ label: 'Exit Reason', value: 'Time Expired', color: 'bg-red-50 text-red-700 border-red-200' });
    if (c.file_type) chips.push({ label: 'Uploaded', value: c.file_type, color: 'bg-indigo-50 text-indigo-700 border-indigo-200' });
    if (c.event_type === 'exam_page_leave') chips.push({ label: 'Leave', value: 'Window Blur / Close', color: 'bg-rose-50 text-rose-700 border-rose-200' });

    return chips;
};

const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
};

const viewDetails = (log) => {
    selectedLog.value = log;
    showRawJson.value = false;
    showDetail.value = true;
};

const parsePossibleJson = (val) => {
    if (typeof val === 'string' && (val.trim().startsWith('{') || val.trim().startsWith('['))) {
        try {
            return JSON.parse(val);
        } catch {
            return val;
        }
    }
    return val;
};

const formatAttrKey = (key) => {
    if (!key) return '';
    return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

const deleteLog = (log) => {
    confirm.require({
        message: 'Are you sure you want to delete this activity log permanently?',
        header: 'Delete Activity Log',
        icon: 'pi pi-exclamation-triangle',
        acceptClass: 'p-button-danger',
        accept: async () => {
            try {
                await api.delete(`/admin/activity-logs/${log.id}`);
                showAlert('Deleted', 'Activity log deleted successfully.');
                fetchLogs(filters.value.page);
            } catch (err) {
                showAlert('Error', 'Failed to delete activity log.');
            }
        }
    });
};

const bulkDelete = () => {
    if (!selectedLogs.value.length) return;

    confirm.require({
        message: `Are you sure you want to permanently delete ${selectedLogs.value.length} selected activity logs?`,
        header: 'Delete Selected Logs',
        icon: 'pi pi-exclamation-triangle',
        acceptClass: 'p-button-danger',
        accept: async () => {
            try {
                await api.post('/admin/activity-logs/bulk-delete', {
                    ids: selectedLogs.value.map(l => l.id)
                });
                showAlert('Deleted', 'Selected activity logs deleted successfully.');
                selectedLogs.value = [];
                fetchLogs(1);
            } catch (err) {
                showAlert('Error', 'Failed to delete selected activity logs.');
            }
        }
    });
};
</script>

<template>
    <AdminLayout>
        <div class="w-full">
            
            <!-- Loading Indicator -->
            <div v-if="loading && logs.length === 0" class="mt-6 px-4 md:px-8">
                <TableSkeleton :rows="8" :columns="5" />
            </div>

            <div v-else class="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700 mt-6 px-4 md:px-8 pb-20">
                
                <!-- Header Banner -->
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6 md:space-y-0 relative overflow-hidden group">
                    <div class="absolute right-0 top-0 w-64 h-64 bg-rose-50/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-rose-100/30 transition-all duration-1000"></div>
                    <div class="absolute left-0 bottom-0 w-64 h-64 bg-slate-50/30 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl transition-all duration-1000"></div>
                    
                    <div class="relative z-10 space-y-2">
                        <div class="flex items-center gap-3">
                            <h1 class="text-3xl font-black text-slate-800 tracking-tight leading-tight">
                                Activity Logs
                            </h1>
                            <span v-if="totalRecords" class="bg-rose-50 text-brand-primary border border-rose-100 text-xs font-black px-3 py-1 rounded-full">
                                {{ totalRecords.toLocaleString() }} total records
                            </span>
                        </div>
                        <p class="text-xs font-bold text-slate-400 max-w-xl leading-relaxed">
                            Audit trail and real-time monitoring of student actions, exam movements, and administrative events.
                        </p>
                    </div>
                    
                    <div class="flex flex-wrap items-center gap-4 relative z-10">
                        <Button v-if="selectedLogs.length" :label="`Delete Selected (${selectedLogs.length})`" icon="pi pi-trash" severity="danger" outlined class="text-xs font-black uppercase tracking-wider px-6 py-2.5 rounded-xl border-rose-200 hover:bg-rose-50/50" @click="bulkDelete" />
                        <Button icon="pi pi-refresh" label="Refresh" outlined rounded severity="secondary" @click="fetchLogs" class="bg-white/80 h-10 px-4 text-xs font-bold border border-slate-200 hover:border-slate-300" />
                    </div>
                </div>

                <!-- Filter Bar -->
                <FilterBar
                    v-model="filters.search"
                    search-placeholder="Search by user name, action, ID, or keywords..."
                    v-model:dateFrom="filters.date_from"
                    v-model:dateTo="filters.date_to"
                    :active-count="(filters.action ? 1 : 0) + (filters.model_type ? 1 : 0)"
                    @apply="fetchLogs(1)"
                    @reset="resetFilters"
                >
                    <!-- Action Type Filter -->
                    <div class="flex flex-col">
                        <label class="block text-[11px] font-bold text-slate-600 mb-1.5 tracking-tight flex items-center gap-1.5">
                            <i class="pi pi-filter text-[10px] text-slate-400" />
                            <span>Action Type</span>
                        </label>
                        <Select v-model="filters.action" :options="actionOptions" optionLabel="label" optionValue="value"
                            placeholder="All Actions" showClear
                            class="!h-11 !rounded-xl !border-slate-200/80 !bg-slate-50/70 !text-xs !font-bold min-w-[170px]" />
                    </div>

                    <!-- Entity Filter -->
                    <div class="flex flex-col">
                        <label class="block text-[11px] font-bold text-slate-600 mb-1.5 tracking-tight flex items-center gap-1.5">
                            <i class="pi pi-box text-[10px] text-slate-400" />
                            <span>Entity</span>
                        </label>
                        <Select v-model="filters.model_type" :options="modelTypeOptions" optionLabel="label" optionValue="value"
                            placeholder="All Entities" showClear
                            class="!h-11 !rounded-xl !border-slate-200/80 !bg-slate-50/70 !text-xs !font-bold min-w-[170px]" />
                    </div>
                </FilterBar>

                <!-- DataTable Card -->
                <div class="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden mt-6">
                    <DataTable v-model:selection="selectedLogs" :value="logs" :loading="loading"
                               class="p-datatable-sm text-sm" responsiveLayout="scroll" dataKey="id">
                        
                        <Column selectionMode="multiple" headerStyle="width: 3rem"></Column>

                        <!-- User / Actor Column -->
                        <Column header="User / Actor" style="min-width: 220px">
                            <template #body="{ data }">
                                <div class="flex items-center gap-3 py-2">
                                    <div class="w-9 h-9 rounded-xl flex items-center justify-center border shrink-0"
                                         :class="data.user?.role === 'admin' ? 'bg-purple-50 border-purple-100 text-purple-600' : 'bg-slate-50 border-slate-100 text-slate-500'">
                                        <i class="pi pi-user text-sm"></i>
                                    </div>
                                    <div class="flex flex-col min-w-0">
                                        <div class="flex items-center gap-2">
                                            <span class="font-extrabold text-slate-800 tracking-tight leading-tight truncate">
                                                {{ data.user?.name || 'System' }}
                                            </span>
                                            <span v-if="data.user?.role === 'student'" class="bg-cyan-50 text-cyan-700 border border-cyan-200 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider">
                                                STUDENT
                                            </span>
                                            <span v-else-if="data.user?.role === 'admin'" class="bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider">
                                                ADMIN
                                            </span>
                                            <span v-else-if="data.user?.role" class="bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider">
                                                {{ data.user.role }}
                                            </span>
                                        </div>
                                        <span v-if="data.user?.email" class="text-[11px] font-medium text-slate-400 truncate mt-0.5">
                                            {{ data.user.email }}
                                        </span>
                                    </div>
                                </div>
                            </template>
                        </Column>

                        <!-- Action Column -->
                        <Column header="Action" style="width: 170px">
                            <template #body="{ data }">
                                <span :class="['inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider shadow-xs', getActionMeta(data.action).badgeClass]">
                                    <i :class="getActionMeta(data.action).icon" class="text-[10px]" />
                                    {{ getActionMeta(data.action).label }}
                                </span>
                            </template>
                        </Column>

                        <!-- Target / Entity Column -->
                        <Column header="Target Entity" style="min-width: 170px">
                            <template #body="{ data }">
                                <div class="flex items-center gap-2 py-1">
                                    <i :class="getModelIcon(data.model_type)" class="text-xs shrink-0" />
                                    <div class="flex items-center gap-1.5">
                                        <span class="text-xs font-bold text-slate-700">
                                            {{ formatModelType(data.model_type) }}
                                        </span>
                                        <span v-if="data.model_id" class="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200 leading-none">
                                            #{{ data.model_id }}
                                        </span>
                                    </div>
                                </div>
                            </template>
                        </Column>

                        <!-- Activity Details Column -->
                        <Column header="Activity Details" style="min-width: 320px">
                            <template #body="{ data }">
                                <div class="space-y-1.5 py-1">
                                    <p class="text-xs font-bold text-slate-700 leading-relaxed">
                                        {{ formatDescription(data) }}
                                    </p>
                                    <!-- Context Chips -->
                                    <div v-if="getLogMetadataChips(data).length" class="flex flex-wrap gap-1.5">
                                        <span v-for="(chip, idx) in getLogMetadataChips(data)" :key="idx"
                                              :class="['inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border', chip.color]">
                                            <span class="opacity-60">{{ chip.label }}:</span>
                                            <span class="font-extrabold">{{ chip.value }}</span>
                                        </span>
                                    </div>
                                </div>
                            </template>
                        </Column>

                        <!-- Date/Time Column -->
                        <Column header="Time & Date" style="width: 190px">
                            <template #body="{ data }">
                                <div class="flex flex-col py-1">
                                    <span class="text-xs font-bold text-slate-700">{{ formatDate(data.created_at) }}</span>
                                    <div class="flex items-center gap-1.5 mt-0.5 text-slate-400">
                                        <span class="text-[10px] font-semibold">{{ formatTime(data.created_at) }}</span>
                                        <span v-if="data.created_at_human" class="text-[10px] italic text-slate-400 font-medium">({{ data.created_at_human }})</span>
                                    </div>
                                </div>
                            </template>
                        </Column>

                        <!-- Actions Column -->
                        <Column :exportable="false" style="width: 100px" class="text-right">
                            <template #body="{ data }">
                                <div class="flex items-center justify-end gap-1">
                                    <Button icon="pi pi-search-plus" text rounded severity="info" size="small" @click="viewDetails(data)" title="View Details" class="hover:bg-slate-50" />
                                    <Button icon="pi pi-trash" text rounded severity="danger" size="small" @click="deleteLog(data)" title="Delete Log" class="hover:bg-rose-50" />
                                </div>
                            </template>
                        </Column>

                        <!-- Empty state -->
                        <template #empty>
                            <div class="py-16 text-center space-y-3">
                                 <div class="text-4xl opacity-30">📋</div>
                                 <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">No activity logs found matching the selected criteria.</p>
                            </div>
                        </template>
                    </DataTable>

                    <!-- Pagination -->
                    <CustomPagination
                        :totalRecords="totalRecords"
                        v-model:currentPage="filters.page"
                        v-model:rowsPerPage="filters.per_page"
                        :rowsPerPageOptions="[10, 25, 50, 100]"
                        @pageChange="fetchLogs"
                    />
                </div>
            </div>

            <!-- Detail Dialog -->
            <Dialog v-model:visible="showDetail" header="Activity Log Inspector" :modal="true" :draggable="false" class="w-full max-w-3xl rounded-[2rem] overflow-hidden">
                <div v-if="selectedLog" class="space-y-6 p-2 md:p-4">
                    
                    <!-- Top Event Summary Card -->
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-200/80">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl bg-white flex items-center justify-center border border-slate-200 shadow-xs text-slate-600">
                                <i :class="getActionMeta(selectedLog.action).icon" class="text-base" />
                            </div>
                            <div class="flex flex-col">
                                <div class="flex items-center gap-2">
                                    <span class="text-sm font-extrabold text-slate-800">
                                        {{ selectedLog.user?.name || 'System' }}
                                    </span>
                                    <span v-if="selectedLog.user?.role" class="bg-slate-200 text-slate-700 text-[9px] font-black uppercase px-2 py-0.5 rounded">
                                        {{ selectedLog.user.role }}
                                    </span>
                                </div>
                                <span class="text-xs font-bold text-slate-500">
                                    Target: {{ formatModelType(selectedLog.model_type) }} #{{ selectedLog.model_id || 'N/A' }}
                                </span>
                            </div>
                        </div>

                        <div class="flex items-center gap-2">
                            <span :class="['px-3 py-1.5 rounded-xl border text-xs font-black uppercase tracking-wider', getActionMeta(selectedLog.action).badgeClass]">
                                {{ getActionMeta(selectedLog.action).label }}
                            </span>
                        </div>
                    </div>

                    <!-- Description Card -->
                    <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs space-y-1.5">
                        <span class="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Description</span>
                        <p class="text-sm font-bold text-slate-700 leading-relaxed">
                            {{ formatDescription(selectedLog) }}
                        </p>
                    </div>

                    <!-- Context & Movement Details (If movement or exam event) -->
                    <div v-if="getLogMetadataChips(selectedLog).length" class="space-y-2">
                        <span class="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Key Movement / Event Data</span>
                        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div v-for="(chip, i) in getLogMetadataChips(selectedLog)" :key="i"
                                 class="bg-slate-50 p-3 rounded-xl border border-slate-200/60 flex flex-col">
                                <span class="text-[10px] font-bold text-slate-400 uppercase">{{ chip.label }}</span>
                                <span class="text-xs font-black text-slate-800 mt-0.5">{{ chip.value }}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Changes Comparison: Old vs New -->
                    <div v-if="selectedLog.changes && (selectedLog.changes.old !== undefined || selectedLog.changes.new !== undefined)" class="space-y-3">
                        <span class="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Attribute State Changes</span>
                        
                        <div class="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                            <table class="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider">
                                        <th class="py-2.5 px-4">Field</th>
                                        <th class="py-2.5 px-4">Previous Value</th>
                                        <th class="py-2.5 px-4">New Value</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-100 font-semibold">
                                    <tr v-for="(val, key) in (selectedLog.changes.new || {})" :key="key" class="hover:bg-slate-50/50">
                                        <td class="py-2.5 px-4 font-bold text-slate-700">{{ formatAttrKey(key) }}</td>
                                        <td class="py-2.5 px-4 text-rose-600 bg-rose-50/20">
                                            <template v-if="typeof selectedLog.changes.old?.[key] === 'object' || typeof parsePossibleJson(selectedLog.changes.old?.[key]) === 'object'">
                                                <pre class="text-[10px] font-mono bg-white p-2 rounded border border-rose-100 max-h-32 overflow-auto">{{ JSON.stringify(parsePossibleJson(selectedLog.changes.old?.[key]), null, 2) }}</pre>
                                            </template>
                                            <span v-else>{{ selectedLog.changes.old?.[key] ?? '(empty)' }}</span>
                                        </td>
                                        <td class="py-2.5 px-4 text-emerald-700 bg-emerald-50/20 font-bold">
                                            <template v-if="typeof val === 'object' || typeof parsePossibleJson(val) === 'object'">
                                                <pre class="text-[10px] font-mono bg-white p-2 rounded border border-emerald-100 max-h-32 overflow-auto">{{ JSON.stringify(parsePossibleJson(val), null, 2) }}</pre>
                                            </template>
                                            <span v-else>{{ val }}</span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Client & Network Information -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                        <div class="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex flex-col space-y-1">
                            <span class="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                <i class="pi pi-globe text-xs" /> IP Origin
                            </span>
                            <span class="text-xs font-mono font-bold text-slate-700">{{ selectedLog.ip_address || 'Unknown' }}</span>
                        </div>
                        <div class="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex flex-col space-y-1">
                            <span class="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                <i class="pi pi-desktop text-xs" /> User Agent / Device
                            </span>
                            <span class="text-xs font-medium text-slate-600 truncate" :title="selectedLog.user_agent">{{ selectedLog.user_agent || 'Unknown' }}</span>
                        </div>
                    </div>

                    <!-- Raw JSON Collapsible -->
                    <div class="pt-2 border-t border-slate-100">
                        <button @click="showRawJson = !showRawJson"
                                class="flex items-center justify-between w-full text-xs font-bold text-slate-500 hover:text-slate-800 p-2 rounded-lg hover:bg-slate-50 transition-all cursor-pointer">
                            <span class="flex items-center gap-1.5">
                                <i class="pi pi-code text-xs text-slate-400" />
                                <span>Developer Raw JSON Payload</span>
                            </span>
                            <i :class="showRawJson ? 'pi pi-chevron-up' : 'pi pi-chevron-down'" class="text-xs" />
                        </button>
                        <div v-if="showRawJson" class="mt-2">
                            <pre class="bg-slate-900 text-slate-100 p-4 rounded-xl text-[11px] font-mono overflow-auto max-h-64 leading-relaxed">{{ JSON.stringify(selectedLog, null, 2) }}</pre>
                        </div>
                    </div>

                </div>
            </Dialog>
        </div>
    </AdminLayout>
</template>

<style scoped>
.animate-in {
    animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
}

:deep(.p-datatable-thead > tr > th) {
    background: #fbfcfe;
    border-bottom: 2px solid #f1f5f9;
    padding: 1.25rem 1rem;
    color: #64748b;
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.08em;
}

:deep(.p-datatable-tbody > tr:hover) {
    background: #fbfcfe;
}

:deep(.p-dialog .p-dialog-header) {
    background: #fbfcfe;
    padding: 1.5rem 2rem;
    border-bottom: 1px solid #f1f5f9;
}

:deep(.p-dialog .p-dialog-header-title) {
    font-size: 15px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #334155;
}
</style>
