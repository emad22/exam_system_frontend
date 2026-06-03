<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import DatePicker from 'primevue/datepicker';
import Dialog from 'primevue/dialog';
import ProgressSpinner from 'primevue/progressspinner';
import { useConfirm } from "primevue/useconfirm";
import { useModal } from '@/composables/useModal';

const { showAlert } = useModal();


const confirm = useConfirm();


const logs = ref([]);
const totalRecords = ref(0);
const loading = ref(true);
const selectedLogs = ref([]);
const filters = ref({
    action: null,
    model_type: '',
    date_from: null,
    date_to: null,
    page: 1
});

const currentLang = ref(localStorage.getItem('dashboard_lang') || 'ar');

const toggleLang = () => {
    currentLang.value = currentLang.value === 'ar' ? 'en' : 'ar';
    localStorage.setItem('dashboard_lang', currentLang.value);
};

const t = {
    ar: {
        loading: "جاري تحميل سجلات النشاط...",
        title: "سجل نشاطات النظام",
        subtitle: "تتبع ومراقبة العمليات، إجراءات المستخدمين، وسجلات عمليات المدراء والمعلمين في الوقت الفعلي",
        actionType: "نوع العملية",
        entityType: "نوع السجل / الكائن",
        fromDate: "من تاريخ",
        toDate: "إلى تاريخ",
        massErase: "مسح جماعي",
        colUser: "المستخدم المبادر",
        colAction: "الإجراء المتخذ",
        colDomain: "الوحدة المستهدفة",
        colSignal: "تفاصيل العملية",
        colChronology: "توقيت الحدث",
        emptyTelemetry: "لا توجد سجلات نشاط مسجلة في النظام...",
        dialogTitle: "تفاصيل سجل التغييرات",
        preState: "الحالة السابقة (قبل التعديل)",
        postState: "الحالة الجديدة (بعد التعديل)",
        networkOrigin: "العنوان الشبكي IP",
        agentSignature: "توقيع المتصفح والبيئة",
        allActions: "كل العمليات",
        created: "إنشاء جديد",
        updated: "تحديث بيانات",
        deleted: "حذف سجل",
        login: "تسجيل دخول",
        logout: "تسجيل خروج",
        confirmSingleDelete: "هل أنت متأكد من رغبتك في حذف سجل النشاط هذا نهائياً؟",
        confirmBulkDelete: "هل أنت متأكد من رغبتك في حذف {count} من سجلات النشاط المحددة؟",
        erasureHeader: "حذف السجلات",
        erasureSuccess: "تم حذف السجل بنجاح",
        erasureBulkSuccess: "تم حذف السجلات المحددة بنجاح",
        erasureError: "فشل مسح السجل",
        erasureBulkError: "فشل مسح السجلات المحددة",
        placeholderEntity: "مثال: Exam"
    },
    en: {
        loading: "Loading activity log registry...",
        title: "System Activity Logs",
        subtitle: "Audit and trace platform actions, user sessions, and manager operations in real-time",
        actionType: "Action Type",
        entityType: "Entity Type",
        fromDate: "From Date",
        toDate: "To Date",
        massErase: "Mass Erase",
        colUser: "Institutional Actor",
        colAction: "Protocol Action",
        colDomain: "Entity Domain",
        colSignal: "Telemetry Signal",
        colChronology: "Chronology",
        emptyTelemetry: "No activity logs captured in system registry...",
        dialogTitle: "Telemetric Change Matrix",
        preState: "Pre-State (Old)",
        postState: "Post-State (New)",
        networkOrigin: "Network Origin IP",
        agentSignature: "Interface Signature",
        allActions: "All Actions",
        created: "Created",
        updated: "Updated",
        deleted: "Deleted",
        login: "Login",
        logout: "Logout",
        confirmSingleDelete: "Are you sure you want to delete this log entry permanently?",
        confirmBulkDelete: "Are you sure you want to delete {count} selected log entries?",
        erasureHeader: "Protocol Erasure",
        erasureSuccess: "Log entry erased successfully",
        erasureBulkSuccess: "Batch logs erased successfully",
        erasureError: "Failed to erase log",
        erasureBulkError: "Failed to erase selected logs",
        placeholderEntity: "e.g. Exam"
    }
};

const actionOptions = computed(() => [
    { label: t[currentLang.value].allActions, value: null },
    { label: t[currentLang.value].created, value: 'created' },
    { label: t[currentLang.value].updated, value: 'updated' },
    { label: t[currentLang.value].deleted, value: 'deleted' },
    { label: t[currentLang.value].login, value: 'login' },
    { label: t[currentLang.value].logout, value: 'logout' }
]);

const selectedLog = ref(null);
const showDetail = ref(false);

const fetchLogs = async () => {
    loading.value = true;
    try {
        const params = {
            ...filters.value,
            date_from: filters.value.date_from ? filters.value.date_from.toISOString().split('T')[0] : null,
            date_to: filters.value.date_to ? filters.value.date_to.toISOString().split('T')[0] : null,
        };
        const res = await api.get('/admin/activity-logs', { params });
        logs.value = res.data.data;
        totalRecords.value = res.data.total;
    } catch (err) {
        console.error("Error fetching logs", err);
        showAlert(currentLang.value === 'ar' ? 'خطأ' : 'Error', t[currentLang.value].loadingError);
    } finally {
        loading.value = false;
    }
};

onMounted(fetchLogs);

watch(filters, () => {
    filters.value.page = 1;
    fetchLogs();
}, { deep: true });

const onPage = (event) => {
    filters.value.page = event.page + 1;
    fetchLogs();
};

const getActionSeverity = (action) => {
    switch (action) {
        case 'created': return 'success';
        case 'updated': return 'info';
        case 'deleted': return 'danger';
        case 'login': return 'help';
        case 'logout': return 'secondary';
        default: return 'info';
    }
};

const translateAction = (action) => {
    if (!action) return '-';
    return t[currentLang.value][action] || action;
};

const viewDetails = (log) => {
    selectedLog.value = log;
    showDetail.value = true;
};

const formatModelType = (type) => {
    if (!type) return '-';
    return type.split('\\').pop();
};

const deleteLog = (log) => {
    confirm.require({
        message: t[currentLang.value].confirmSingleDelete,
        header: t[currentLang.value].erasureHeader,
        icon: 'pi pi-exclamation-triangle',
        acceptClass: 'p-button-danger',
        accept: async () => {
            try {
                await api.delete(`/admin/activity-logs/${log.id}`);
                showAlert(currentLang.value === 'ar' ? 'تم الحذف' : 'Deleted', t[currentLang.value].erasureSuccess);
                fetchLogs();
            } catch (err) {
                showAlert(currentLang.value === 'ar' ? 'خطأ' : 'Error', t[currentLang.value].erasureError);
            }
        }
    });
};

const bulkDelete = () => {
    if (!selectedLogs.value.length) return;

    confirm.require({
        message: t[currentLang.value].confirmBulkDelete.replace('{count}', selectedLogs.value.length),
        header: t[currentLang.value].erasureHeader,
        icon: 'pi pi-exclamation-triangle',
        acceptClass: 'p-button-danger',
        accept: async () => {
            try {
                await api.post('/admin/activity-logs/bulk-delete', {
                    ids: selectedLogs.value.map(l => l.id)
                });
                showAlert(currentLang.value === 'ar' ? 'تم الحذف' : 'Deleted', t[currentLang.value].erasureBulkSuccess);
                selectedLogs.value = [];
                fetchLogs();
            } catch (err) {
                showAlert(currentLang.value === 'ar' ? 'خطأ' : 'Error', t[currentLang.value].erasureBulkError);
            }
        }
    });
};
</script>

<template>
    <AdminLayout>
        <div :class="{ 'arabic-theme': currentLang === 'ar' }" :dir="currentLang === 'ar' ? 'rtl' : 'ltr'" class="w-full">
            
            <!-- Loading Indicator -->
            <div v-if="loading && logs.length === 0" class="flex flex-col items-center justify-center py-32 space-y-4">
                <ProgressSpinner />
                <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">{{ t[currentLang].loading }}</p>
            </div>
            
            

            <div v-else class="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000 mt-6 px-4 md:px-8 pb-20">
                
                <!-- Premium Header Section -->
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
                    
                    <div class="flex flex-wrap items-center gap-4 relative z-10">
                        <!-- Language Selector Toggle -->
                        <button @click="toggleLang" class="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm transition-all duration-300 font-extrabold text-xs">
                            <i class="pi pi-globe text-brand-primary"></i>
                            <span>{{ currentLang === 'ar' ? 'English' : 'العربية' }}</span>
                        </button>
                        <Button v-if="selectedLogs.length" :label="t[currentLang].massErase" icon="pi pi-trash" severity="danger" outlined class="text-xs font-black uppercase tracking-wider px-6 py-2.5 rounded-xl border-rose-200 hover:bg-rose-50/50" @click="bulkDelete" />
                        <Button icon="pi pi-refresh" outlined rounded severity="secondary" @click="fetchLogs" class="bg-white/50 w-10 h-10 border border-slate-200" />
                    </div>
                </div>

                <!-- Premium Filter HUD -->
                <div class="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-wrap gap-6 items-end relative overflow-hidden">
                    <div class="flex flex-col space-y-2">
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ms-2">{{ t[currentLang].actionType }}</label>
                        <Select v-model="filters.action" :options="actionOptions" optionLabel="label" optionValue="value" class="w-48 rounded-xl border-slate-100 text-xs font-bold" />
                    </div>
                    
                    <div class="flex flex-col space-y-2">
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ms-2">{{ t[currentLang].entityType }}</label>
                        <InputText v-model="filters.model_type" :placeholder="t[currentLang].placeholderEntity" class="w-48 rounded-xl border-slate-100 text-xs font-bold" />
                    </div>

                    <div class="flex flex-col space-y-2">
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ms-2">{{ t[currentLang].fromDate }}</label>
                        <DatePicker v-model="filters.date_from" dateFormat="yy-mm-dd" class="w-48 rounded-xl text-xs font-bold" :showIcon="true" />
                    </div>

                    <div class="flex flex-col space-y-2">
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ms-2">{{ t[currentLang].toDate }}</label>
                        <DatePicker v-model="filters.date_to" dateFormat="yy-mm-dd" class="w-48 rounded-xl text-xs font-bold" :showIcon="true" />
                    </div>
                </div>

                <!-- Premium DataTable Card -->
                <div class="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden mt-6">
                    <DataTable v-model:selection="selectedLogs" :value="logs" :loading="loading" :lazy="true" :paginator="true" :rows="50" :totalRecords="totalRecords" 
                               @page="onPage" class="p-datatable-sm text-sm" responsiveLayout="scroll" dataKey="id">
                        
                        <Column selectionMode="multiple" headerStyle="width: 3rem"></Column>

                        <!-- Actor Column -->
                        <Column :header="t[currentLang].colUser" style="min-width: 200px">
                            <template #body="{ data }">
                                <div class="flex items-center gap-3 py-2">
                                    <div class="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100">
                                        <i class="pi pi-user text-slate-400 text-xs"></i>
                                    </div>
                                    <div class="flex flex-col">
                                        <span class="font-extrabold text-slate-800 tracking-tight leading-tight">{{ data.user?.name || 'System' }}</span>
                                        <span class="text-[9px] font-black text-slate-400 uppercase tracking-wider mt-0.5">{{ data.user?.role || 'AUTOMATED' }}</span>
                                    </div>
                                </div>
                            </template>
                        </Column>

                        <!-- Action Column -->
                        <Column :header="t[currentLang].colAction" style="width: 150px">
                            <template #body="{ data }">
                                <Tag :value="translateAction(data.action)" :severity="getActionSeverity(data.action)" class="text-[9px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-xl border-none shadow-sm" />
                            </template>
                        </Column>

                        <!-- Entity Domain Column -->
                        <Column :header="t[currentLang].colDomain" style="min-width: 150px">
                            <template #body="{ data }">
                                <div class="flex items-center gap-1.5">
                                    <span class="text-[10px] font-black text-slate-600 uppercase tracking-widest leading-none">{{ formatModelType(data.model_type) }}</span>
                                    <span v-if="data.model_id" class="text-[9px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 leading-none">#{{ data.model_id }}</span>
                                </div>
                            </template>
                        </Column>

                        <!-- Telemetry details Column -->
                        <Column :header="t[currentLang].colSignal" style="min-width: 250px">
                            <template #body="{ data }">
                                <p class="text-xs font-bold text-slate-500 leading-relaxed">{{ data.description }}</p>
                            </template>
                        </Column>

                        <!-- Date/Time Column -->
                        <Column :header="t[currentLang].colChronology" style="width: 180px">
                            <template #body="{ data }">
                                <div class="flex flex-col items-end">
                                    <span class="text-xs font-bold text-slate-500">{{ new Date(data.created_at).toLocaleDateString() }}</span>
                                    <span class="text-[9px] font-black text-slate-400 uppercase italic mt-0.5">{{ new Date(data.created_at).toLocaleTimeString() }}</span>
                                </div>
                            </template>
                        </Column>

                        <!-- Actions Column -->
                        <Column :exportable="false" style="width: 120px" class="text-right">
                            <template #body="{ data }">
                                <div class="flex items-center justify-end gap-1">
                                    <Button v-if="data.changes" icon="pi pi-search-plus" text rounded severity="info" size="small" @click="viewDetails(data)" class="hover:bg-slate-50" />
                                    <Button icon="pi pi-trash" text rounded severity="danger" size="small" @click="deleteLog(data)" class="hover:bg-rose-50" />
                                </div>
                            </template>
                        </Column>

                        <!-- Empty registry slot -->
                        <template #empty>
                            <div class="py-16 text-center space-y-3">
                                 <div class="text-4xl opacity-20">📡</div>
                                 <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">{{ t[currentLang].emptyTelemetry }}</p>
                            </div>
                        </template>
                    </DataTable>
                </div>
            </div>
            

            <!-- Detail Dialog -->
            <Dialog v-model:visible="showDetail" :header="t[currentLang].dialogTitle" :modal="true" :draggable="false" class="w-full max-w-2xl rounded-[2rem] overflow-hidden" :class="{ 'arabic-theme': currentLang === 'ar' }" :dir="currentLang === 'ar' ? 'rtl' : 'ltr'">
                <div v-if="selectedLog" class="space-y-6 p-4">
                    <div class="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <div class="flex flex-col">
                            <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Operation Protocol</span>
                            <span class="text-xs font-black text-slate-800 uppercase tracking-tight">{{ selectedLog.action }} {{ formatModelType(selectedLog.model_type) }} #{{ selectedLog.model_id }}</span>
                        </div>
                        <Tag :value="translateAction(selectedLog.action)" :severity="getActionSeverity(selectedLog.action)" class="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg" />
                    </div>

                    <div v-if="selectedLog.changes" class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div class="space-y-3">
                            <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">{{ t[currentLang].preState }}</h4>
                            <pre class="bg-slate-50 p-4 rounded-xl text-[10px] font-bold text-slate-600 overflow-auto max-h-64">{ &quot;old&quot;: {{ JSON.stringify(selectedLog.changes.old, null, 2) }} }</pre>
                        </div>
                        <div class="space-y-3">
                            <h4 class="text-[10px] font-black text-emerald-400 uppercase tracking-widest border-b border-emerald-50 pb-2">{{ t[currentLang].postState }}</h4>
                            <pre class="bg-emerald-50/30 p-4 rounded-xl text-[10px] font-bold text-emerald-700 overflow-auto max-h-64">{ &quot;new&quot;: {{ JSON.stringify(selectedLog.changes.new, null, 2) }} }</pre>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                        <div class="flex flex-col space-y-1">
                            <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">{{ t[currentLang].networkOrigin }}</span>
                            <span class="text-xs font-bold text-slate-700">{{ selectedLog.ip_address }}</span>
                        </div>
                        <div class="flex flex-col space-y-1">
                            <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">{{ t[currentLang].agentSignature }}</span>
                            <span class="text-xs font-bold text-slate-500 italic truncate" :title="selectedLog.user_agent">{{ selectedLog.user_agent }}</span>
                        </div>
                    </div>
                </div>
            </Dialog>
        </div>
    </AdminLayout>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');

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
:deep(.p-dialog .p-dialog-header) {
    background: #fbfcfe;
    padding: 2rem;
    border-bottom: 1px solid #f1f5f9;
}
:deep(.p-dialog .p-dialog-header-title) {
    font-size: 14px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #475569;
}
</style>
