<script setup>
import { useModal } from '@/composables/useModal';
import { ref, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';
import Button from 'primevue/button';
import ProgressSpinner from 'primevue/progressspinner';

const { showAlert } = useModal();
const router = useRouter();
const route = useRoute();
const skillId = route.params.id;

const currentLang = ref(localStorage.getItem('dashboard_lang') || 'ar');

const toggleLang = () => {
    currentLang.value = currentLang.value === 'ar' ? 'en' : 'ar';
    localStorage.setItem('dashboard_lang', currentLang.value);
};

const t = {
    ar: {
        activeSystem: "نظام إعداد مهارات القياس",
        title: "تعديل مهارة القياس الأكاديمية",
        subtitle: "تحديث المسميات والرموز المعيارية للمهارات بالمنظومة",
        loading: "جاري تحميل تفاصيل المهارة...",
        fieldName: "اسم المهارة الأكاديمية",
        fieldCode: "الرمز التعريفي (الرمز المختصر)",
        placeholderName: "مثال: مهارة القراءة والاستيعاب",
        placeholderCode: "مثال: READ",
        nameHelp: "سيتم استخدام هذا المسمى عبر جميع هياكل التقييم والتقارير",
        codeHelp: "يستخدم لتتبع وتعيين الأسئلة واستمارات الاستيراد الجماعي",
        tiersCount: "مستويات التقييم المفعلة حالياً:",
        btnCommit: "حفظ التعديلات وتأكيد المزامنة",
        btnDiscard: "تراجع وإلغاء",
        updateSuccess: "تم تحديث مهارة القياس بنجاح.",
        updateFailed: "حدث خطأ أثناء تعديل المهارة."
    },
    en: {
        activeSystem: "Assessment Domain System",
        title: "Edit Skill Domain",
        subtitle: "Refining logical domain designation and standard identifiers",
        loading: "Retrieving skill parameters...",
        fieldName: "Cognitive Segment Name",
        fieldCode: "Identification Key (Short Code)",
        placeholderName: "E.G. READING COMPREHENSION",
        placeholderCode: "E.G. READ",
        nameHelp: "This identifier will be displayed across all assessments and reports",
        codeHelp: "Used for bulk enrollment mapping and system analytics (e.g. 'r')",
        tiersCount: "Active assessment tiers:",
        btnCommit: "Commit Changes",
        btnDiscard: "Cancel & Return",
        updateSuccess: "Skill domain updated successfully.",
        updateFailed: "Failed to update skill domain."
    }
};

const form = ref({
    name: '',
    short_code: '',
    levels_count: 0
});

watch(() => form.value.name, (newName) => {
    form.value.short_code = (newName || '').slice(0, 4).toUpperCase();
});

const loading = ref(true);
const isSubmitting = ref(false);

const fetchSkill = async () => {
    loading.value = true;
    try {
        const res = await api.get(`/admin/skills`);
        // Find specific skill in the list as backend might not have dedicated single get endpoint
        const skillsList = res.data;
        const currentSkill = skillsList.find(s => s.id === Number(skillId));
        if (currentSkill) {
            form.value = {
                name: currentSkill.name,
                short_code: currentSkill.short_code || '',
                levels_count: currentSkill.levels_count || 0
            };
        } else {
            showAlert('Skill domain not found in the ecosystem.', 'Error', 'danger');
            router.push('/admin/skills');
        }
    } catch (err) {
        console.error('Failed to load skill details', err);
        showAlert('Could not retrieve skill properties.', 'Network Error', 'danger');
    } finally {
        loading.value = false;
    }
};

const editSkill = async () => {
    if (!form.value.name) return;
    isSubmitting.value = true;
    
    try {
        await api.patch(`/admin/skills/${skillId}`, {
            name: form.value.name,
            short_code: form.value.short_code,
            levels_count: form.value.levels_count
        });
        showAlert(t[currentLang.value].updateSuccess, 'Success', 'success');
        router.push('/admin/skills');
    } catch (err) {
        console.error(err);
        showAlert(err.response?.data?.message || t[currentLang.value].updateFailed, 'Error', 'danger');
    } finally {
        isSubmitting.value = false;
    }
};

onMounted(fetchSkill);
</script>

<template>
  <AdminLayout>
    <div :class="{ 'arabic-theme': currentLang === 'ar' }" :dir="currentLang === 'ar' ? 'rtl' : 'ltr'" class="w-full">
      
      <!-- Loading Indicator -->
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
              
              <div class="relative z-10 flex items-center gap-6">
                  <Button :icon="currentLang === 'ar' ? 'pi pi-arrow-right' : 'pi pi-arrow-left'" severity="secondary" outlined rounded 
                      @click="router.push('/admin/skills')"
                      class="w-12 h-12 flex items-center justify-center border border-slate-200 hover:border-slate-300 shadow-sm bg-white" />
                  <div>
                       <div class="flex items-center gap-2 text-xs font-extrabold text-brand-primary uppercase tracking-wider">
                           <i class="pi pi-sparkles text-brand-accent animate-pulse"></i>
                           <span>{{ t[currentLang].activeSystem }}</span>
                       </div>
                       <h1 class="text-2xl font-black text-slate-800 tracking-tight leading-tight mt-1">
                           {{ t[currentLang].title }}
                       </h1>
                       <p class="text-xs font-bold text-slate-400 mt-0.5">
                           {{ t[currentLang].subtitle }}
                       </p>
                  </div>
              </div>
              
              <div class="flex flex-wrap items-center gap-4 relative z-10">
                   <!-- Language Selector Toggle -->
                   <button @click="toggleLang" class="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm transition-all duration-300 font-extrabold text-xs">
                       <i class="pi pi-globe text-brand-primary"></i>
                       <span>{{ currentLang === 'ar' ? 'English' : 'العربية' }}</span>
                   </button>
              </div>
          </div>

          <!-- Edit Form Container -->
          <div class="premium-card p-8 md:p-12 relative overflow-hidden bg-white rounded-[2rem] shadow-[0_8px_30px_rgba(0,0,0,0.02)] border border-slate-100">
              <div class="absolute -right-24 -top-24 w-64 h-64 bg-rose-50/40 rounded-full blur-3xl"></div>

              <form @submit.prevent="editSkill" class="relative z-10 space-y-10">
                  <div class="space-y-6">
                      <div class="flex items-center space-x-3 rtl:space-x-reverse mb-6">
                          <div class="w-1.5 h-6 bg-brand-primary rounded-full"></div>
                          <h3 class="text-xs font-black text-slate-800 uppercase tracking-widest">
                              {{ currentLang === 'ar' ? 'معايير المهارة الحالية' : 'Skill Attributes' }}
                          </h3>
                      </div>

                      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <!-- Skill Name Field -->
                          <div class="flex flex-col space-y-2">
                              <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest block mr-1 ml-1">
                                  {{ t[currentLang].fieldName }}
                              </label>
                              <input v-model="form.name" type="text" required 
                                  class="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-bold focus:bg-white focus:border-brand-primary/20 focus:ring-4 focus:ring-rose-50/50 transition-all outline-none shadow-sm text-slate-800 font-bold" 
                                  :placeholder="t[currentLang].placeholderName">
                              <p class="text-[9px] text-slate-400 mt-1 mr-1 ml-1 font-bold uppercase tracking-widest">
                                  {{ t[currentLang].nameHelp }}
                              </p>
                          </div>

                          <!-- Short Code Field -->
                          <div class="flex flex-col space-y-2">
                              <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest block mr-1 ml-1">
                                  {{ t[currentLang].fieldCode }}
                              </label>
                              <input v-model="form.short_code" type="text" readonly
                                  class="w-full bg-slate-100 border border-slate-200 rounded-2xl p-4 text-xs font-black uppercase text-slate-400 transition-all outline-none shadow-sm cursor-not-allowed select-none font-bold" 
                                  placeholder="AUTO-GENERATED">
                              <p class="text-[9px] text-slate-400 mt-1 mr-1 ml-1 font-bold uppercase tracking-widest">
                                  {{ currentLang === 'ar' ? 'يتم توليده تلقائياً من أول 4 أحرف لاسم المهارة' : 'Auto-generated from the first 4 characters of Module Name' }}
                              </p>
                          </div>

                           <!-- Levels Display & Input -->
                           <div class="md:col-span-2 bg-slate-50/50 p-6 rounded-2xl border border-slate-100/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                               <div class="flex items-center gap-3">
                                   <div class="w-10 h-10 bg-brand-primary/10 text-brand-primary rounded-xl flex items-center justify-center font-black">
                                       <i class="pi pi-sliders-h"></i>
                                   </div>
                                   <div>
                                       <p class="text-xs font-black text-slate-700">{{ t[currentLang].tiersCount }}</p>
                                       <p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                                           {{ currentLang === 'ar' ? 'يمكنك زيادة أو تقليل عدد مستويات الصعوبة المخصصة' : 'Adjust the number of allocated difficulty scales' }}
                                       </p>
                                   </div>
                               </div>
                               <input v-model="form.levels_count" type="number" min="0" max="100"
                                   class="text-center text-sm font-black text-slate-800 bg-white w-24 px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary transition-all outline-none" />
                           </div>
                      </div>
                  </div>

                  <!-- Form Action Buttons -->
                  <div class="pt-8 border-t border-slate-100/60 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <Button :label="t[currentLang].btnDiscard" outlined severity="secondary" @click="router.push('/admin/skills')"
                          class="w-full sm:w-auto text-[10px] font-black uppercase tracking-widest px-8 rounded-xl" />
                      <Button :label="isSubmitting ? (currentLang === 'ar' ? 'جاري الحفظ...' : 'PERSISTING...') : t[currentLang].btnCommit" 
                          :loading="isSubmitting"
                          icon="pi pi-check"
                          @click="editSkill" 
                          class="w-full sm:w-auto bg-brand-primary border-none text-[10px] font-black uppercase tracking-widest px-8 shadow-lg shadow-rose-100 rounded-xl" />
                  </div>
              </form>
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
</style>
