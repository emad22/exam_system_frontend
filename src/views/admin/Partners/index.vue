<script setup>
import { useModal } from '@/composables/useModal';
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import ProgressSpinner from 'primevue/progressspinner';

const { showAlert, showConfirm } = useModal();

const router = useRouter();
const partners = ref([]);
const loading = ref(true);
const searchQuery = ref('');

const currentLang = ref(localStorage.getItem('dashboard_lang') || 'ar');

const toggleLang = () => {
    currentLang.value = currentLang.value === 'ar' ? 'en' : 'ar';
    localStorage.setItem('dashboard_lang', currentLang.value);
};

const t = {
    ar: {
        loading: "جاري تحميل سجل الشركاء...",
        title: "الشركاء والمراكز المعتمدة",
        subtitle: "إدارة مراكز الاختبارات الخارجية، المدارس الشريكة، وتراخيص الوصول للطلاب",
        createBtn: "شريك جديد",
        placeholderSearch: "البحث باسم الشريك أو جهة الاتصال...",
        colEntity: "المؤسسة / الكيان الشريك",
        colLiaison: "مسؤول الاتصال الأساسي",
        colIdentifier: "المعرف الرقمي (البريد)",
        colJurisdiction: "النطاق الجغرافي / الدولة",
        colStatus: "حالة الشريك",
        colActions: "إجراءات",
        emptyTelemetry: "لا يوجد شركاء مسجلين في النظام حالياً...",
        confirmDelete: "هل أنت متأكد من رغبتك في حذف هذا الشريك نهائياً؟",
        deleted: "تم الحذف",
        partnerRemoved: "تمت إزالة الشريك بنجاح.",
        error: "خطأ",
        failedDelete: "فشل حذف الشريك.",
        active: "نشط",
        onHold: "معلق",
        confirmHold: "هل أنت متأكد من رغبتك في تعليق حساب هذا الشريك مؤقتاً؟",
        confirmUnhold: "هل أنت متأكد من رغبتك في إعادة تنشيط هذا الشريك؟",
        holdPlaced: "تم تعليق حساب الشريك بنجاح.",
        unholdPlaced: "تمت إعادة تنشيط حساب الشريك بنجاح.",
        failedHold: "فشل تعليق حساب الشريك.",
        failedUnhold: "فشل إعادة تنشيط حساب الشريك.",
        partnerId: "كود الشريك",
        noContact: "لا تتوفر بيانات اتصال",
        global: "عالمي",
        viewProfile: "عرض الملف الشخصي",
        editDetails: "تعديل التفاصيل",
        deletePartner: "حذف الشريك"
    },
    en: {
        loading: "Querying Partner Registry...",
        title: "Authorized Partners",
        subtitle: "Track external assessment centers, partner schools, and candidate licenses.",
        createBtn: "Register Partner",
        placeholderSearch: "Filter by partner or contact...",
        colEntity: "Institutional Entity",
        colLiaison: "Primary Liaison",
        colIdentifier: "Digital Identifier",
        colJurisdiction: "Jurisdiction",
        colStatus: "Status",
        colActions: "Actions",
        emptyTelemetry: "No partner network discovered in system.",
        confirmDelete: "Are you sure you want to delete this partner?",
        deleted: "Deleted",
        partnerRemoved: "Partner removed.",
        error: "Error",
        failedDelete: "Failed to delete partner.",
        active: "ACTIVE",
        onHold: "ON_HOLD",
        confirmHold: "Are you sure you want to place this partner on hold?",
        confirmUnhold: "Are you sure you want to reactivate this partner?",
        holdPlaced: "Partner placed on hold.",
        unholdPlaced: "Partner reactivated.",
        failedHold: "Failed to hold partner.",
        failedUnhold: "Failed to reactivate partner.",
        partnerId: "Partner ID",
        noContact: "NO_CONTACT_DATA",
        global: "Global",
        viewProfile: "View Profile",
        editDetails: "Edit Details",
        deletePartner: "Delete Partner"
    }
};

const filteredPartners = computed(() => {
    if (!searchQuery.value) return partners.value;
    const query = searchQuery.value.toLowerCase();
    return partners.value.filter(p => {
        const name = (p.partner_name || '').toLowerCase();
        const contact = `${p.user?.first_name || ''} ${p.user?.last_name || ''}`.toLowerCase();
        const email = (p.user?.email || '').toLowerCase();
        const website = (p.website || '').toLowerCase();
        return name.includes(query) || contact.includes(query) || email.includes(query) || website.includes(query);
    });
});

const fetchPartners = async () => {
    loading.value = true;
    try {
        const res = await api.get('/admin/partners');
        partners.value = res.data;
    } catch (err) {
        console.error('Failed to load partners', err);
    } finally {
        loading.value = false;
    }
};

const deletePartner = async (id) => {
    if (!(await showConfirm(t[currentLang.value].confirmDelete))) return;
    try {
        await api.delete(`/admin/partners/${id}`);
        partners.value = partners.value.filter(p => p.id !== id);
    } catch (err) {
        showAlert(t[currentLang.value].failedDelete);
    }
};

const toggleHold = async (partner) => {
    const action = partner.user?.is_active ? 'hold' : 'unhold';
    const confirmMsg = action === 'hold' ? t[currentLang.value].confirmHold : t[currentLang.value].confirmUnhold;
    if (!(await showConfirm(confirmMsg))) return;

    try {
        await api.post(`/admin/partners/${partner.id}/${action}`);
        if (partner.user) partner.user.is_active = !partner.user.is_active;
    } catch (err) {
        console.error(err);
        showAlert(action === 'hold' ? t[currentLang.value].failedHold : t[currentLang.value].failedUnhold);
    }
};

onMounted(fetchPartners);
</script>

<template>
    <AdminLayout>
        <div :class="{ 'arabic-theme': currentLang === 'ar' }" :dir="currentLang === 'ar' ? 'rtl' : 'ltr'" class="w-full">
            
            <!-- Loading Indicator -->
            <div v-if="loading" class="flex flex-col items-center justify-center py-32 space-y-4">
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
                        <!-- Primary Action -->
                        <Button :label="t[currentLang].createBtn" icon="pi pi-plus" 
                            class="px-8 py-3 rounded-2xl bg-brand-primary border-none shadow-lg shadow-rose-100 text-xs font-black tracking-wider uppercase transition-all hover:-translate-y-1" 
                            @click="router.push('/admin/staff/create?role=partner')" />
                    </div>
                </div>

                <!-- Premium Search Bar -->
                <div class="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between">
                    <div class="relative w-full max-w-xl">
                        <i class="pi pi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 z-10" />
                        <InputText v-model="searchQuery" :placeholder="t[currentLang].placeholderSearch"
                            class="w-full pl-12 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white text-xs font-bold shadow-sm" />
                    </div>
                </div>

                <!-- Registry Table Card -->
                <div class="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                    <DataTable :value="filteredPartners" dataKey="id" paginator :rows="10" 
                               class="p-datatable-sm text-sm" responsiveLayout="scroll">
                        
                        <Column :header="t[currentLang].colEntity" style="min-width: 250px">
                            <template #body="{ data }">
                                <div class="flex items-center space-x-4 py-2" :class="{ 'space-x-reverse': currentLang === 'ar' }">
                                     <div class="w-11 h-11 rounded-2xl bg-slate-50 text-brand-primary flex items-center justify-center border border-slate-100 shadow-sm">
                                         <i class="pi pi-briefcase text-lg"></i>
                                     </div>
                                     <div>
                                         <div @click="router.push(`/admin/staff/${data.user_id}/edit`)" 
                                              class="font-black text-slate-800 hover:text-brand-primary cursor-pointer uppercase tracking-tight transition-colors">
                                               {{ data.partner_name }}
                                         </div>
                                         <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{{ t[currentLang].partnerId }}: #{{ String(data.id).padStart(3, '0') }}</div>
                                     </div>
                                </div>
                            </template>
                        </Column>

                        <Column :header="t[currentLang].colLiaison" style="min-width: 200px">
                            <template #body="{ data }">
                                <div class="flex flex-col space-y-1">
                                    <span class="font-black text-slate-700 text-[11px] uppercase tracking-tight">{{ data.user?.first_name }} {{ data.user?.last_name }}</span>
                                    <span class="text-[10px] font-bold text-slate-400 tracking-wider">{{ data.user?.phone || t[currentLang].noContact }}</span>
                                </div>
                            </template>
                        </Column>

                        <Column :header="t[currentLang].colIdentifier" style="min-width: 150px">
                            <template #body="{ data }">
                                <span class="text-xs font-bold text-slate-500 lowercase underline decoration-slate-200 underline-offset-4">{{ data.user?.email || '---' }}</span>
                            </template>
                        </Column>

                        <Column :header="t[currentLang].colJurisdiction" style="min-width: 120px" class="text-center">
                            <template #body="{ data }">
                                <Tag :value="data.user?.country || t[currentLang].global" severity="secondary" class="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border border-slate-200" />
                            </template>
                        </Column>

                        <Column :header="t[currentLang].colStatus" style="min-width: 120px" class="text-center">
                            <template #body="{ data }">
                                <Tag :value="data.user?.is_active ? t[currentLang].active : t[currentLang].onHold" 
                                     :severity="data.user?.is_active ? 'success' : 'warning'" 
                                     class="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border" />
                            </template>
                        </Column>

                        <Column :header="t[currentLang].colActions" style="width: 150px" class="text-right">
                            <template #body="{ data }">
                                <div class="flex justify-end gap-1">
                                     <Button :icon="data.user?.is_active ? 'pi pi-pause' : 'pi pi-play'" text rounded severity="warning" size="small" @click="toggleHold(data)" />
                                     <Button icon="pi pi-pencil" text rounded severity="secondary" size="small" @click="router.push(`/admin/staff/${data.user_id}/edit`)" />
                                     <Button icon="pi pi-trash" text rounded severity="danger" size="small" @click="deletePartner(data.id)" />
                                </div>
                            </template>
                        </Column>

                        <template #empty>
                            <div class="py-16 text-center space-y-3">
                                 <div class="text-4xl opacity-20">🤝</div>
                                 <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">{{ t[currentLang].emptyTelemetry }}</p>
                            </div>
                        </template>
                    </DataTable>
                </div>
            </div>
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
</style>
