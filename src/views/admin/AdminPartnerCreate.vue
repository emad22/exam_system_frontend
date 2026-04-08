<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';

const router = useRouter();

const loading = ref(false);

const form = ref({
    partner_name: '',
    fName_contact: '',
    lName_contact: '',
    email: '',
    phone: '',
    website: '',
    country: '',
    note: '',
    is_active: true
});

const errors = ref({});

const submit = async () => {
    loading.value = true;
    errors.value = {};

    try {
        await api.post('/admin/partners', form.value, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        router.push('/admin/partners');
    } catch (err) {
        if (err.response?.data?.errors) {
            errors.value = err.response.data.errors;
        } else {
            alert('Failed to create partner');
        }
    } finally {
        loading.value = false;
    }
};
</script>

<template>
  <AdminLayout>
    <div class="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
        
        <!-- Header -->
        <div class="flex items-center space-x-6">
            <router-link to="/admin/partners" class="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-slate-400 hover:text-indigo-600 hover:shadow-md transition-all border border-slate-100 group">
                <svg class="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M15 19l-7-7 7-7"/></svg>
            </router-link>
            <div>
                 <h1 class="text-3xl font-black text-slate-800 tracking-tight">Provision Partner</h1>
                 <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">Register new partner entity</p>
            </div>
        </div>

        <div class="premium-card p-10 md:p-16 relative overflow-hidden bg-white shadow-2xl rounded-[2.5rem]">
            <!-- Decorative Accent -->
            <div class="absolute -right-24 -top-24 w-64 h-64 bg-indigo-50/30 rounded-full blur-3xl"></div>

            <form @submit.prevent="submit" class="relative z-10 space-y-16">
                
                <div v-if="Object.keys(errors).length > 0" class="bg-rose-50 border border-rose-100 text-rose-500 text-[10px] font-black uppercase tracking-widest p-5 rounded-2xl animate-in slide-in-from-top-2">
                    ⚠️ PROVISIONING_ERROR: Please check the highlighted fields.
                </div>

                <!-- ── CORE IDENTITY SECTION ── -->
                <div class="space-y-8">
                    <div class="flex items-center space-x-4 mb-4">
                         <div class="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
                         <h3 class="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">Core Identity</h3>
                    </div>
                    
                    <div>
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-4">Partner Name</label>
                        <input v-model="form.partner_name" type="text" required class="premium-input text-sm uppercase" placeholder="ENTER_PARTNER_NAME">
                        <p v-if="errors.partner_name" class="text-rose-500 text-[10px] font-bold mt-2 ml-4">{{ errors.partner_name[0] }}</p>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-4">Contact First Name</label>
                            <input v-model="form.fName_contact" type="text" class="premium-input text-sm uppercase" placeholder="FIRST_NAME">
                        </div>
                        <div>
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-4">Contact Last Name</label>
                            <input v-model="form.lName_contact" type="text" class="premium-input text-sm uppercase" placeholder="LAST_NAME">
                        </div>
                    </div>
                </div>

                <!-- ── CONTACT DETAILS SECTION ── -->
                <div class="space-y-8 p-10 bg-slate-50/50 rounded-[2.5rem] border border-dashed border-slate-200">
                    <div class="flex items-center space-x-4 mb-4">
                         <div class="w-1.5 h-6 bg-blue-500 rounded-full"></div>
                         <h3 class="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">Contact Details</h3>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-4">Identifier (Email)</label>
                            <input v-model="form.email" type="email" class="premium-input font-bold text-sm tracking-wide" placeholder="CONTACT@DOMAIN.COM">
                        </div>
                        <div>
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-4">Contact Phone</label>
                            <input v-model="form.phone" type="text" class="premium-input text-sm" placeholder="+XX XXX XXX XXXX">
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-4">Website</label>
                            <input v-model="form.website" type="text" class="premium-input text-sm" placeholder="HTTPS://WWW.DOMAIN.COM">
                        </div>
                        <div>
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-4">Operational Country</label>
                            <input v-model="form.country" type="text" class="premium-input text-sm uppercase" placeholder="COUNTRY_NAME">
                        </div>
                    </div>
                </div>

                <!-- ── ADDITIONAL METADATA SECTION ── -->
                <div class="space-y-8">
                    <div class="flex items-center space-x-4 mb-4">
                         <div class="w-1.5 h-6 bg-purple-600 rounded-full"></div>
                         <h3 class="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">Additional Metadata</h3>
                    </div>

                    <div>
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-4">Notes</label>
                        <textarea v-model="form.note" class="premium-input text-sm h-32 py-4" placeholder="ADDITIONAL_INFORMATION_OBSERVATIONS"></textarea>
                    </div>

                    <div class="flex flex-col justify-end pb-2">
                        <label class="flex items-center cursor-pointer group w-fit">
                            <div class="relative">
                                <input type="checkbox" v-model="form.is_active" class="sr-only">
                                <div :class="form.is_active ? 'bg-emerald-500' : 'bg-slate-200'" class="block w-14 h-8 rounded-full transition-colors"></div>
                                <div :class="form.is_active ? 'translate-x-6' : 'translate-x-1'" class="absolute left-0 top-1 bg-white w-6 h-6 rounded-full transition-transform shadow-sm"></div>
                            </div>
                            <div class="ml-4">
                                <span class="block text-[10px] font-black text-slate-800 uppercase tracking-widest">Active Status</span>
                                <span class="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Entity is live in the system</span>
                            </div>
                        </label>
                    </div>
                </div>

                <!-- Final Commit -->
                <div class="pt-10 border-t border-slate-50 flex flex-col md:flex-row items-center justify-between space-y-6 md:space-y-0">
                    <div class="flex items-center space-x-3 opacity-30">
                         <div class="w-2 h-2 bg-slate-400 rounded-full"></div>
                         <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Endorsed by System Authority</span>
                    </div>
                    <button type="submit" :disabled="loading" 
                            class="w-full md:w-auto bg-slate-900 text-white font-black py-6 px-20 rounded-[2rem] shadow-2xl hover:shadow-indigo-500/20 hover:-translate-y-1 active:scale-95 transition-all duration-300 disabled:opacity-50 text-[10px] uppercase tracking-[0.4em]">
                        {{ loading ? 'PROVISIONING...' : 'COMMIT PARTNER ➜' }}
                    </button>
                </div>
            </form>
        </div>
    </div>
  </AdminLayout>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
    display: none;
}

/* Base styles for premium inputs (in case they are not globally defined in AdminStudentCreate but are rather expected everywhere or we should just add them here or they are already global) */
.premium-card {
    background-color: white;
}
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

.premium-input::placeholder {
    color: #cbd5e1;
    font-weight: 800;
}
</style>