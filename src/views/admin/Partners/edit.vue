<script setup>
import { useModal } from '@/composables/useModal';
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';
import Button from 'primevue/button';

const { showAlert } = useModal();

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const isSaving = ref(false);
const partnerId = route.params.id;

const editForm = ref({
    partner_name: '',
    fName_contact: '',
    lName_contact: '',
    email: '',
    phone: '',
    website: '',
    country: '',
    note: '',
    is_active: true,
    proctoring_mode: 'none',
});

const loadData = async () => {
    loading.value = true;
    try {
        const res = await api.get(`/admin/partners/${partnerId}`);
        const partner = res.data;
        editForm.value = {
            partner_name: partner.partner_name || '',
            fName_contact: partner.fName_contact || '',
            lName_contact: partner.lName_contact || '',
            email: partner?.email || '',
            phone: partner?.phone || '',
            website: partner.website || '',
            country: partner.country || '',
            note: partner.note || '',
            is_active: !!partner.is_active,
            proctoring_mode: partner.proctoring_mode || (partner.proctoring_required ? 'full' : 'none'),
        };
    } catch (err) {
        console.error(err);
        showAlert('Failed to load partner data');
        router.push('/admin/partners');
    } finally {
        loading.value = false;
    }
};

const savePartner = async () => {
    isSaving.value = true;
    try {
        const payload = {
            ...editForm.value,
            is_active: editForm.value.is_active ? 1 : 0,
            proctoring_mode: editForm.value.proctoring_mode,
            proctoring_required: ['full', 'identity_only'].includes(editForm.value.proctoring_mode) ? 1 : 0,
        };
        await api.patch(`/admin/partners/${partnerId}`, payload);
        showAlert('Identity profile updated successfully.');
        router.push('/admin/partners');
    } catch (err) {
        showAlert(err.response?.data?.message || 'Failed to update identity.');
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
        <div v-if="loading" class="flex flex-col items-center justify-center py-32 space-y-4">
            <div class="w-12 h-12 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Querying Database...</p>
        </div>
        <div v-else class="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 px-4 md:px-12 mt-6">
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-6">
                    <Button icon="pi pi-arrow-left" severity="secondary" outlined rounded @click="router.push('/admin/partners')" />
                    <div>
                         <h1 class="text-3xl font-black text-slate-800 tracking-tight">Sync Entity</h1>
                         <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Manual identity reconciliation</p>
                    </div>
                </div>
            </div>

            <div class="bg-white rounded-[3rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] w-full overflow-hidden flex flex-col border border-slate-100">
                <div class="p-10 space-y-12">
                    <!-- Section 1: Core -->
                    <div class="space-y-6">
                        <div class="grid grid-cols-2 gap-6">
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Partner Name</label>
                                <input v-model="editForm.partner_name" type="text" class="premium-input text-xs uppercase" placeholder="PARTNER_NAME">
                            </div>
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">First Name Contact</label>
                                <input v-model="editForm.fName_contact" type="text" class="premium-input text-xs uppercase" placeholder="FIRST_NAME">
                            </div>
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Last Name Contact</label>
                                <input v-model="editForm.lName_contact" type="text" class="premium-input text-xs uppercase" placeholder="LAST_NAME">
                            </div>
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Country</label>
                                <input v-model="editForm.country" type="text" class="premium-input text-xs uppercase" placeholder="COUNTRY">
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-6">
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Identifier (Email)</label>
                                <input v-model="editForm.email" type="email" class="premium-input text-xs" placeholder="EMAIL@DOMAIN.COM">
                            </div>
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Contact Phone</label>
                                <input v-model="editForm.phone" type="text" class="premium-input text-xs" placeholder="+XX XXX XXXX">
                            </div>
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Website</label>
                                <input v-model="editForm.website" type="text" class="premium-input text-xs" placeholder="HTTPS://WEBSITE.COM">
                            </div>
                             <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Notes</label>
                                <input v-model="editForm.note" type="text" class="premium-input text-xs" placeholder="NOTES">
                            </div>
                        </div>
                    </div>

                    <!-- Section 2: Active Status & Proctoring Mode Selection -->
                    <div class="space-y-6 p-8 bg-slate-50/50 rounded-[2.5rem] border border-slate-100">
                        <div class="flex items-center justify-between border-b border-slate-200/60 pb-6 mb-6">
                            <div>
                                <h3 class="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">Partner Mode & Identity Settings</h3>
                                <p class="text-[9px] text-slate-400 uppercase tracking-widest mt-1">Configure security mode and active state</p>
                            </div>
                            <!-- Active Status Toggle -->
                            <label class="flex items-center cursor-pointer group">
                                <div class="relative">
                                    <input type="checkbox" v-model="editForm.is_active" class="sr-only">
                                    <div :class="editForm.is_active ? 'bg-emerald-500' : 'bg-slate-200'" class="block w-12 h-7 rounded-full transition-colors"></div>
                                    <div :class="editForm.is_active ? 'translate-x-6' : 'translate-x-1'" class="absolute left-0 top-1 bg-white w-5 h-5 rounded-full transition-transform shadow-sm"></div>
                                </div>
                                <span class="ml-3 text-[10px] font-black text-slate-600 uppercase tracking-widest">Active Status</span>
                            </label>
                        </div>

                        <!-- 3-Way Proctoring Mode Selection Cards -->
                        <div>
                            <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">
                                Proctoring & Identity Mode (نموذج المراقبة والتحقق)
                            </label>
                            
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <!-- Mode 1: None -->
                                <div 
                                    @click="editForm.proctoring_mode = 'none'"
                                    class="p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 relative flex flex-col justify-between"
                                    :class="editForm.proctoring_mode === 'none' 
                                        ? 'border-slate-800 bg-slate-900 text-white shadow-xl shadow-slate-900/10' 
                                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'"
                                >
                                    <div>
                                        <div class="flex items-center justify-between mb-3">
                                            <div class="w-9 h-9 rounded-xl flex items-center justify-center text-sm"
                                                :class="editForm.proctoring_mode === 'none' ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-600'">
                                                <i class="pi pi-shield"></i>
                                            </div>
                                            <span class="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
                                                :class="editForm.proctoring_mode === 'none' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'">
                                                Mode 1
                                            </span>
                                        </div>
                                        <h4 class="text-xs font-black uppercase tracking-wide mb-1">بدون مراقبة</h4>
                                        <p class="text-[10px] font-medium leading-relaxed opacity-70">
                                            فحص متطلبات الجهاز فقط قبل الاختبار. لا توجد مراقبة حية ولا فحص للبطاقة/الصورة.
                                        </p>
                                    </div>
                                    <div class="mt-4 pt-3 border-t text-[9px] font-bold uppercase tracking-widest"
                                        :class="editForm.proctoring_mode === 'none' ? 'border-white/10 text-slate-300' : 'border-slate-100 text-slate-400'">
                                        Non-Proctored
                                    </div>
                                </div>

                                <!-- Mode 2: Full Proctored -->
                                <div 
                                    @click="editForm.proctoring_mode = 'full'"
                                    class="p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 relative flex flex-col justify-between"
                                    :class="editForm.proctoring_mode === 'full' 
                                        ? 'border-violet-600 bg-gradient-to-br from-violet-950 to-violet-900 text-white shadow-xl shadow-violet-500/20' 
                                        : 'border-slate-200 bg-white hover:border-violet-300 text-slate-700'"
                                >
                                    <div>
                                        <div class="flex items-center justify-between mb-3">
                                            <div class="w-9 h-9 rounded-xl flex items-center justify-center text-sm"
                                                :class="editForm.proctoring_mode === 'full' ? 'bg-violet-500/25 text-violet-300' : 'bg-violet-50 text-violet-600'">
                                                <i class="pi pi-video"></i>
                                            </div>
                                            <span class="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
                                                :class="editForm.proctoring_mode === 'full' ? 'bg-violet-500/30 text-violet-200' : 'bg-violet-100 text-violet-700'">
                                                Mode 2
                                            </span>
                                        </div>
                                        <h4 class="text-xs font-black uppercase tracking-wide mb-1">مراقبة كاملة</h4>
                                        <p class="text-[10px] font-medium leading-relaxed opacity-70">
                                            فحص الهوية (تصوير + بطاقة + مطابقة الذكاء الاصطناعي) + مراقبة حية وتسجيل فيديو ورصد تنقلات أثناء الاختبار.
                                        </p>
                                    </div>
                                    <div class="mt-4 pt-3 border-t text-[9px] font-bold uppercase tracking-widest"
                                        :class="editForm.proctoring_mode === 'full' ? 'border-white/10 text-violet-300' : 'border-slate-100 text-slate-400'">
                                        Full Proctored
                                    </div>
                                </div>

                                <!-- Mode 3: Identity Verification Only (New) -->
                                <div 
                                    @click="editForm.proctoring_mode = 'identity_only'"
                                    class="p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 relative flex flex-col justify-between"
                                    :class="editForm.proctoring_mode === 'identity_only' 
                                        ? 'border-emerald-500 bg-gradient-to-br from-emerald-950 to-emerald-900 text-white shadow-xl shadow-emerald-500/20' 
                                        : 'border-slate-200 bg-white hover:border-emerald-300 text-slate-700'"
                                >
                                    <div>
                                        <div class="flex items-center justify-between mb-3">
                                            <div class="w-9 h-9 rounded-xl flex items-center justify-center text-sm"
                                                :class="editForm.proctoring_mode === 'identity_only' ? 'bg-emerald-500/25 text-emerald-300' : 'bg-emerald-50 text-emerald-600'">
                                                <i class="pi pi-id-card"></i>
                                            </div>
                                            <span class="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
                                                :class="editForm.proctoring_mode === 'identity_only' ? 'bg-emerald-500/30 text-emerald-200' : 'bg-emerald-100 text-emerald-700'">
                                                Mode 3 ✨ جديد
                                            </span>
                                        </div>
                                        <h4 class="text-xs font-black uppercase tracking-wide mb-1">تحقق هوية فقط بدون مراقبة</h4>
                                        <p class="text-[10px] font-medium leading-relaxed opacity-70">
                                            فحص الهوية (تصوير + بطاقة + مطابقة الذكاء الاصطناعي) قبل الاختبار، وبدون مراقبة حية أثناء حل الاختبار.
                                        </p>
                                    </div>
                                    <div class="mt-4 pt-3 border-t text-[9px] font-bold uppercase tracking-widest"
                                        :class="editForm.proctoring_mode === 'identity_only' ? 'border-white/10 text-emerald-300' : 'border-slate-100 text-slate-400'">
                                        Identity Only (No Live Proctor)
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                <!-- Footer -->
                <div class="p-10 bg-slate-50 border-t border-slate-100 flex justify-end space-x-4 shrink-0">
                    <Button label="Discard" severity="secondary" text @click="router.push('/admin/partners')" />
                    <Button :label="isSaving ? 'SYNCHRONIZING...' : 'COMMIT CHANGES'" 
                           :loading="isSaving" 
                           icon="pi pi-check" 
                           size="large" 
                           @click="savePartner" />
                </div>
            </div>
        </div>
    </AdminLayout>
</template>

<style scoped>
.premium-input {
    width: 100%;
    padding: 1.25rem 1.5rem;
    border-radius: 1.5rem;
    border: 2px solid #f1f5f9;
    background-color: #f8fafc;
    transition: all 0.3s ease;
    outline: none;
    color: #1e293b;
}

.premium-input:focus {
    background-color: white;
    border-color: #6366f1;
    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
}
</style>
