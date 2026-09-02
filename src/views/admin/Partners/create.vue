<script setup>
import { useModal } from '@/composables/useModal';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';
import Button from 'primevue/button';

const { showAlert } = useModal();
const router = useRouter();

const isSaving = ref(false);

const form = ref({
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

const savePartner = async () => {
    if (!form.value.partner_name?.trim()) {
        showAlert('Partner name is required.');
        return;
    }
    if (!form.value.email?.trim()) {
        showAlert('Email is required.');
        return;
    }

    isSaving.value = true;
    try {
        const payload = {
            ...form.value,
            is_active: form.value.is_active ? 1 : 0,
            proctoring_mode: form.value.proctoring_mode,
            proctoring_required: ['full', 'identity_only'].includes(form.value.proctoring_mode) ? 1 : 0,
        };
        await api.post('/admin/partners', payload);
        showAlert('Partner created successfully.');
        router.push('/admin/partners');
    } catch (err) {
        const errorMsg = err.response?.data?.errors 
            ? Object.values(err.response.data.errors).flat().join('\n') 
            : (err.response?.data?.message || 'Failed to create partner.');
        showAlert(errorMsg);
    } finally {
        isSaving.value = false;
    }
};
</script>

<template>
    <AdminLayout>
        <div class="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 px-4 md:px-12 mt-6">
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-6">
                    <Button icon="pi pi-arrow-left" severity="secondary" outlined rounded @click="router.push('/admin/partners')" />
                    <div>
                         <h1 class="text-3xl font-black text-slate-800 tracking-tight">Add Partner</h1>
                         <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Create a new partner</p>
                    </div>
                </div>
            </div>

            <div class="bg-white rounded-[3rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] w-full overflow-hidden flex flex-col border border-slate-100">
                <div class="p-10 space-y-12">
                    <!-- Section 1: Organization Details -->
                    <div class="space-y-6">
                        <div class="flex items-center space-x-3 pb-2 border-b border-slate-100">
                            <div class="w-2 h-2 rounded-full bg-brand-primary"></div>
                            <h3 class="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">Organization Details</h3>
                        </div>

                        <!-- Row 1: Partner Name (Full Width) -->
                        <div>
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Partner Name <span class="text-rose-500">*</span></label>
                            <input v-model="form.partner_name" type="text" class="premium-input text-sm font-bold uppercase" placeholder="ORGANIZATION / PARTNER NAME">
                        </div>

                        <!-- Row 2: Country & Website -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Country</label>
                                <input v-model="form.country" type="text" class="premium-input text-xs uppercase" placeholder="COUNTRY">
                            </div>
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Website</label>
                                <input v-model="form.website" type="text" class="premium-input text-xs" placeholder="HTTPS://WEBSITE.COM">
                            </div>
                        </div>
                    </div>

                    <!-- Section 2: Contact Person -->
                    <div class="space-y-6">
                        <div class="flex items-center space-x-3 pb-2 border-b border-slate-100">
                            <div class="w-2 h-2 rounded-full bg-blue-500"></div>
                            <h3 class="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">Primary Contact Person</h3>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">First Name Contact</label>
                                <input v-model="form.fName_contact" type="text" class="premium-input text-xs uppercase" placeholder="FIRST_NAME">
                            </div>
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Last Name Contact</label>
                                <input v-model="form.lName_contact" type="text" class="premium-input text-xs uppercase" placeholder="LAST_NAME">
                            </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Identifier (Email) <span class="text-rose-500">*</span></label>
                                <input v-model="form.email" type="email" class="premium-input text-xs" placeholder="EMAIL@DOMAIN.COM">
                            </div>
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Contact Phone</label>
                                <input v-model="form.phone" type="text" class="premium-input text-xs" placeholder="+XX XXX XXXX">
                            </div>
                        </div>
                    </div>

                    <!-- Section 3: Notes -->
                    <div class="space-y-6">
                        <div class="flex items-center space-x-3 pb-2 border-b border-slate-100">
                            <div class="w-2 h-2 rounded-full bg-purple-500"></div>
                            <h3 class="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">Additional Notes</h3>
                        </div>

                        <div>
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Notes / Remarks</label>
                            <textarea v-model="form.note" rows="3" class="premium-input text-xs" placeholder="Enter any relevant internal notes or remarks..."></textarea>
                        </div>
                    </div>

                    <!-- Section 4: Active Status & Proctoring Mode Selection -->
                    <div class="space-y-6 p-8 bg-slate-50/50 rounded-[2.5rem] border border-slate-100">
                        <div class="flex items-center justify-between border-b border-slate-200/60 pb-6 mb-6">
                            <div>
                                <h3 class="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">Partner Settings</h3>
                                <p class="text-[9px] text-slate-400 uppercase tracking-widest mt-1">Configure partner status and proctoring mode</p>
                            </div>
                            <!-- Active Status Toggle -->
                            <label class="flex items-center cursor-pointer group">
                                <div class="relative">
                                    <input type="checkbox" v-model="form.is_active" class="sr-only">
                                    <div :class="form.is_active ? 'bg-emerald-500' : 'bg-slate-200'" class="block w-12 h-7 rounded-full transition-colors"></div>
                                    <div :class="form.is_active ? 'translate-x-6' : 'translate-x-1'" class="absolute left-0 top-1 bg-white w-5 h-5 rounded-full transition-transform shadow-sm"></div>
                                </div>
                                <span class="ml-3 text-[10px] font-black text-slate-600 uppercase tracking-widest">Active Status</span>
                            </label>
                        </div>

                        <!-- 3-Way Proctoring Mode Selection Cards -->
                        <div>
                            <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">
                                Proctoring & Identity Mode
                            </label>
                            
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <!-- Mode 1: None -->
                                <div 
                                    @click="form.proctoring_mode = 'none'"
                                    class="p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 relative flex flex-col justify-between"
                                    :class="form.proctoring_mode === 'none' 
                                        ? 'border-slate-800 bg-slate-900 text-white shadow-xl shadow-slate-900/10' 
                                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'"
                                >
                                    <div>
                                        <div class="flex items-center justify-between mb-3">
                                            <div class="w-9 h-9 rounded-xl flex items-center justify-center text-sm"
                                                :class="form.proctoring_mode === 'none' ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-600'">
                                                <i class="pi pi-shield"></i>
                                            </div>
                                            <span class="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
                                                :class="form.proctoring_mode === 'none' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'">
                                                Mode 1
                                            </span>
                                        </div>
                                        <h4 class="text-xs font-black uppercase tracking-wide mb-1">Non-Proctored</h4>
                                        <p class="text-[10px] font-medium leading-relaxed opacity-70">
                                            System check only before the exam. No live proctoring, webcam recording, or ID verification.
                                        </p>
                                    </div>
                                    <div class="mt-4 pt-3 border-t text-[9px] font-bold uppercase tracking-widest"
                                        :class="form.proctoring_mode === 'none' ? 'border-white/10 text-slate-300' : 'border-slate-100 text-slate-400'">
                                        Non-Proctored
                                    </div>
                                </div>

                                <!-- Mode 2: Full Proctored -->
                                <div 
                                    @click="form.proctoring_mode = 'full'"
                                    class="p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 relative flex flex-col justify-between"
                                    :class="form.proctoring_mode === 'full' 
                                        ? 'border-violet-600 bg-gradient-to-br from-violet-950 to-violet-900 text-white shadow-xl shadow-violet-500/20' 
                                        : 'border-slate-200 bg-white hover:border-violet-300 text-slate-700'"
                                >
                                    <div>
                                        <div class="flex items-center justify-between mb-3">
                                            <div class="w-9 h-9 rounded-xl flex items-center justify-center text-sm"
                                                :class="form.proctoring_mode === 'full' ? 'bg-violet-500/25 text-violet-300' : 'bg-violet-50 text-violet-600'">
                                                <i class="pi pi-video"></i>
                                            </div>
                                            <span class="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
                                                :class="form.proctoring_mode === 'full' ? 'bg-violet-500/30 text-violet-200' : 'bg-violet-100 text-violet-700'">
                                                Mode 2
                                            </span>
                                        </div>
                                        <h4 class="text-xs font-black uppercase tracking-wide mb-1">Full Proctored</h4>
                                        <p class="text-[10px] font-medium leading-relaxed opacity-70">
                                            ID verification (photo capture + ID card + AI match) + live proctoring, webcam video recording, and tab switch detection.
                                        </p>
                                    </div>
                                    <div class="mt-4 pt-3 border-t text-[9px] font-bold uppercase tracking-widest"
                                        :class="form.proctoring_mode === 'full' ? 'border-white/10 text-violet-300' : 'border-slate-100 text-slate-400'">
                                        Full Proctored
                                    </div>
                                </div>

                                <!-- Mode 3: Identity Verification Only (New) -->
                                <div 
                                    @click="form.proctoring_mode = 'identity_only'"
                                    class="p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 relative flex flex-col justify-between"
                                    :class="form.proctoring_mode === 'identity_only' 
                                        ? 'border-emerald-500 bg-gradient-to-br from-emerald-950 to-emerald-900 text-white shadow-xl shadow-emerald-500/20' 
                                        : 'border-slate-200 bg-white hover:border-emerald-300 text-slate-700'"
                                >
                                    <div>
                                        <div class="flex items-center justify-between mb-3">
                                            <div class="w-9 h-9 rounded-xl flex items-center justify-center text-sm"
                                                :class="form.proctoring_mode === 'identity_only' ? 'bg-emerald-500/25 text-emerald-300' : 'bg-emerald-50 text-emerald-600'">
                                                <i class="pi pi-id-card"></i>
                                            </div>
                                            <span class="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
                                                :class="form.proctoring_mode === 'identity_only' ? 'bg-emerald-500/30 text-emerald-200' : 'bg-emerald-100 text-emerald-700'">
                                                Mode 3 ✨ NEW
                                            </span>
                                        </div>
                                        <h4 class="text-xs font-black uppercase tracking-wide mb-1">Identity Verification Only</h4>
                                        <p class="text-[10px] font-medium leading-relaxed opacity-70">
                                            ID verification (photo capture + ID card + AI face match) before the exam, without live proctoring or webcam recording during the exam.
                                        </p>
                                    </div>
                                    <div class="mt-4 pt-3 border-t text-[9px] font-bold uppercase tracking-widest"
                                        :class="form.proctoring_mode === 'identity_only' ? 'border-white/10 text-emerald-300' : 'border-slate-100 text-slate-400'">
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
                    <Button :label="isSaving ? 'Creating...' : 'Create Partner'" 
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
