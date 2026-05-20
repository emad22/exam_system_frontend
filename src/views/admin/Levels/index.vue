<script setup>
import { useModal } from '@/composables/useModal';
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Select from 'primevue/select';
import InputText from 'primevue/inputtext';

import Tag from 'primevue/tag';
import ProgressSpinner from 'primevue/progressspinner';


const { showAlert, showConfirm } = useModal();

const route = useRoute();
const router = useRouter();


const skills = ref([]);
const levels = ref([]);
const loading = ref(true);
const selectedSkill = ref(null);
const searchQuery = ref('');

const currentLang = ref(localStorage.getItem('dashboard_lang') || 'ar');

const toggleLang = () => {
    currentLang.value = currentLang.value === 'ar' ? 'en' : 'ar';
    localStorage.setItem('dashboard_lang', currentLang.value);
};

const t = {
    ar: {
        loading: "جاري تحميل مصفوفة المستويات...",
        title: "مستويات التقدم التكيفية",
        subtitle: "ضبط وتوزيع درجات ومستويات الصعوبة للمهارات والحدود الدنيا للتخطي",
        createBtn: "مستوى جديد",
        domainFilter: "تصفية بالمهارة",
        allDomains: "جميع المجالات",
        placeholderSearch: "البحث بالمهارة أو اسم المستوى...",
        colSequence: "الترتيب",
        colSkill: "المهارة / المجال",
        colDesignation: "اسم المستوى",
        colScoreMatrix: "نطاق الدرجات",
        colQuestionCount: "الأسئلة الافتراضية",
        colThreshold: "الحد الأدنى للتخطي",
        colVisibility: "الظهور",
        colActions: "إجراءات",
        emptyTelemetry: "لم يتم العثور على أي مستويات في النظام بعد...",
        active: "نشط",
        inactive: "غير نشط",
        confirmDelete: "هل أنت متأكد من رغبتك في حذف هذا المستوى نهائياً؟",
        deleted: "تم الحذف",
        levelRemoved: "تمت إزالة المستوى بنجاح.",
        error: "خطأ",
        failedDelete: "فشل حذف المستوى.",
        defaultQuestionCount: "الأسئلة الافتراضية",
        noInstructions: "لا توجد إرشادات محددة",
        instructionsLabel: "الإرشادات"
    },
    en: {
        loading: "Querying Level Matrix...",
        title: "Adaptive Tiers",
        subtitle: "Configure difficulty matrices and skill mastery thresholds",
        createBtn: "Initialize Tier",
        domainFilter: "Domain Filter",
        allDomains: "All Domains",
        placeholderSearch: "Filter tier registry...",
        colSequence: "Sequence",
        colSkill: "Skill Domain",
        colDesignation: "Designation",
        colScoreMatrix: "Score Matrix",
        colQuestionCount: "Default Count",
        colThreshold: "Threshold",
        colVisibility: "Visibility",
        colActions: "Actions",
        emptyTelemetry: "No adaptive configurations discovered in system registry.",
        active: "Active",
        inactive: "Inactive",
        confirmDelete: "Are you sure you want to delete this level globally?",
        deleted: "Deleted",
        levelRemoved: "Level removed.",
        error: "Error",
        failedDelete: "Failed to delete level.",
        defaultQuestionCount: "Default Count",
        noInstructions: "No instructions set",
        instructionsLabel: "Instructions"
    }
};

const fetchData = async () => {
    loading.value = true;
    try {
        const [skillRes, levelRes] = await Promise.all([
            api.get('/admin/skills-with-levels'),
            api.get('/admin/levels')
        ]);

        skills.value = skillRes.data || [];
        levels.value = levelRes.data || [];

        if (route.params.id) {
            const found = skills.value.find(s => s.id == route.params.id);
            if (found) selectedSkill.value = found;
        }
    } catch (err) {
        console.error('Failed to load data', err);
        
        showAlert('Error', 'Failed to load levels data. Please try again later.');

    } finally {
        loading.value = false;
    }
};

const getSkill = (skillId) => {
    return skills.value.find(s => s.id === skillId) || { name: 'Unknown', icon: '🎯' };
};

const filteredLevels = computed(() => {
    let result = levels.value;

    if (selectedSkill.value) {
        result = result.filter(l => l.skill_id === selectedSkill.value.id);
    }

    if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase();
        result = result.filter(l => {
            const skillIcon = getSkill(l.skill_id).icon;
            const skillName = getSkill(l.skill_id).name.toLowerCase();
            return l.name.toLowerCase().includes(query) ||
                skillIcon.includes(query) ||
                skillName.includes(query);
        });
    }

    return result;
});

const groupedLevels = computed(() => {
    const groups = {};
    filteredLevels.value.forEach(level => {
        if (!groups[level.skill_id]) {
            groups[level.skill_id] = {
                skill: getSkill(level.skill_id),
                levels: []
            };
        }
        groups[level.skill_id].levels.push(level);
    });

    Object.values(groups).forEach(group => {
        group.levels.sort((a, b) => a.level_number - b.level_number);
    });

    return groups;
});

const deleteLevel = async (id) => {
    if (!(await showConfirm(t[currentLang.value].confirmDelete))) return;

    try {
        await api.delete(`/admin/levels/${id}`);
        levels.value = levels.value.filter(l => l.id !== id);
        
        showAlert('Deleted', 'Level removed successfully.');

    } catch (err) {
        console.error(err);       
        showAlert('Error', 'Failed to delete level. Please try again later.');
    }
};

onMounted(fetchData);
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
                    
                    <div class="flex flex-wrap items-center gap-4 relative z-10">
                         <!-- Language Selector Toggle -->
                         <button @click="toggleLang" class="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm transition-all duration-300 font-extrabold text-xs">
                             <i class="pi pi-globe text-brand-primary"></i>
                             <span>{{ currentLang === 'ar' ? 'English' : 'العربية' }}</span>
                         </button>
                         
                         <!-- Primary Action Button -->
                         <Button :label="t[currentLang].createBtn" icon="pi pi-plus" 
                                 class="px-8 py-3 rounded-2xl bg-brand-primary border-none shadow-lg shadow-rose-100 text-xs font-black tracking-wider uppercase transition-all hover:-translate-y-1" 
                                 @click="router.push('/admin/levels/create')" />
                    </div>
                </div>

                <!-- Premium Search & Filters -->
                <div class="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
                    <div class="flex items-center space-x-4 w-full md:w-auto bg-slate-50/50 p-2 rounded-2xl border border-slate-100" :class="{ 'space-x-reverse': currentLang === 'ar' }">
                        <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest flex-shrink-0 mx-2">
                            {{ t[currentLang].domainFilter }}
                        </span>
                        <Select v-model="selectedSkill" :options="skills" optionLabel="name"
                            :placeholder="t[currentLang].allDomains"
                            class="w-full md:w-64 rounded-xl border-none bg-white text-xs font-bold shadow-sm"
                            showClear />
                    </div>
                    <div class="w-full md:w-80 relative">
                        <i class="pi pi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 z-10" />
                        <InputText v-model="searchQuery" :placeholder="t[currentLang].placeholderSearch"
                            class="w-full pl-12 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white text-xs font-bold shadow-sm" />
                    </div>
                </div>

                <!-- Page Registry (DataTable in Card) -->
                <div class="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                    <DataTable :value="filteredLevels" rowGroupMode="subheader" groupRowsBy="skill_id"
                        sortField="skill_id" :sortOrder="1" class="p-datatable-sm text-sm" responsiveLayout="scroll">

                        <template #rowgroupheader="slotProps">
                            <div class="flex items-center space-x-4 py-3 px-6 bg-slate-50/50 backdrop-blur-sm border-y border-slate-100/50" :class="{ 'space-x-reverse': currentLang === 'ar' }">
                                <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                                    {{ t[currentLang].colSkill }}: {{ getSkill(slotProps.data.skill_id).name }}
                                </span>
                            </div>
                        </template>

                        <Column field="level_number" :header="t[currentLang].colSequence" style="width: 70px" class="pl-6">
                            <template #body="{ data }">
                                <span class="font-black text-slate-300 italic">#{{ data.level_number }}</span>
                            </template>
                        </Column>

                        <Column :header="t[currentLang].colSkill" style="width: 220px">
                            <template #body="{ data }">
                                <div class="flex items-center space-x-3" :class="{ 'space-x-reverse': currentLang === 'ar' }">
                                    <div class="w-8 h-8 rounded-lg bg-slate-100 text-brand-primary flex items-center justify-center text-sm border border-slate-200 shadow-sm">
                                        {{ getSkill(data.skill_id).icon }}
                                    </div>
                                    <span class="font-black text-slate-700 uppercase tracking-tight text-xs">
                                        {{ getSkill(data.skill_id).name }}
                                    </span>
                                </div>
                            </template>
                        </Column>

                        <Column field="name" :header="t[currentLang].colDesignation" style="min-width: 200px">
                            <template #body="{ data }">
                                <div class="flex flex-col">
                                    <span class="font-black text-slate-700 uppercase tracking-tight text-xs">{{ data.name }}</span>
                                    <span class="text-[10px] text-slate-400 font-bold tracking-wide mt-0.5">{{ data.instructions ? data.instructions.substring(0, 40) + '...' : t[currentLang].noInstructions }}</span>
                                </div>
                            </template>
                        </Column>

                        <Column :header="t[currentLang].colScoreMatrix" style="width: 180px" class="text-center">
                            <template #body="{ data }">
                                <div class="flex items-center justify-center space-x-3 bg-slate-50 p-2 rounded-xl border border-slate-100" :class="{ 'space-x-reverse': currentLang === 'ar' }">
                                    <span class="text-[10px] font-black text-slate-500">{{ data.min_score }}</span>
                                    <i class="pi pi-arrows-h text-[8px] text-slate-300"></i>
                                    <span class="text-[10px] font-black text-slate-800">{{ data.max_score }}</span>
                                </div>
                            </template>
                        </Column>

                        <Column :header="t[currentLang].colQuestionCount" style="width: 140px" class="text-center">
                            <template #body="{ data }">
                                <Tag :value="`${data.default_question_count} ${t[currentLang].colQuestionCount}`" severity="info"
                                    class="font-black px-4 py-1.5 rounded-xl bg-brand-primary/5 text-brand-primary border border-brand-primary/10 shadow-sm" />
                            </template>
                        </Column>

                        <Column :header="t[currentLang].colThreshold" style="width: 150px">
                            <template #body="{ data }">
                                <div class="flex items-center space-x-3" :class="{ 'space-x-reverse': currentLang === 'ar' }">
                                    <div class="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                        <div class="bg-brand-primary h-full rounded-full"
                                            :style="{ width: data.pass_threshold + '%' }"></div>
                                    </div>
                                    <span class="text-[10px] font-black text-slate-600">{{ data.pass_threshold }}%</span>
                                </div>
                            </template>
                        </Column>

                        <Column :header="t[currentLang].colVisibility" style="width: 120px" class="text-center">
                            <template #body="{ data }">
                                <i :class="data.is_active ? 'pi pi-eye text-emerald-500' : 'pi pi-eye-slash text-slate-300'"
                                    class="text-lg"></i>
                            </template>
                        </Column>

                        <Column :header="t[currentLang].colActions" style="width: 120px" class="text-right">
                            <template #body="{ data }">
                                <div class="flex justify-end gap-1.5">
                                    <Button icon="pi pi-pencil" text rounded severity="warning" size="small"
                                        @click="router.push(`/admin/levels/${data.id}/edit`)" />
                                    <Button icon="pi pi-trash" text rounded severity="danger" size="small"
                                        @click="deleteLevel(data.id)" />
                                </div>
                            </template>
                        </Column>

                        <template #empty>
                            <div class="py-16 text-center space-y-3">
                                 <div class="text-4xl opacity-20">🎯</div>
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
