<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import api from '@/services/api';
import RequirementTester from '@/components/RequirementTester.vue';
import StudentHeader from '@/components/StudentHeader.vue';
import Button from 'primevue/button';
import { PROCTORING_ENABLED } from '@/config/features';

const router = useRouter();
const requirements = ref([]);
const checkedRequirements = ref([]);
const autoVerifiedIds = ref([]);
const activeTesterReq = ref(null);
const isLoading = ref(true);

const fetchRequirements = async () => {
    isLoading.value = true;
    try {
        const res = await api.get('/public/system-requirements');
        requirements.value = res.data;
        autoVerifyRequirements(res.data);
    } catch (err) {
        console.error('Failed to fetch requirements', err);
    } finally {
        isLoading.value = false;
    }
};

const autoVerifyRequirements = (reqs) => {
    const ua = navigator.userAgent.toLowerCase();
    const isOnline = navigator.onLine;
    const isChrome = ua.includes('chrome') && !ua.includes('edg');
    const isEdge = ua.includes('edg');
    const isDesktop = !/android|iphone|ipad|mobile/.test(ua);
    const hasMediaDevices = !!(navigator.mediaDevices);

    reqs.forEach(req => {
        if (req.test_type && req.test_type !== 'none') return;

        const cat = req.category?.toLowerCase();
        const title = req.title?.toLowerCase();
        let verified = false;
        
        if (cat === 'internet' || title.includes('internet')) verified = isOnline;
        else if (cat === 'browser' || title.includes('chrome')) verified = (isChrome || isEdge) && isDesktop;
        else if (cat === 'hardware' || title.includes('audio')) verified = hasMediaDevices;

        if (verified) {
            autoVerifiedIds.value.push(req.id);
            if (!checkedRequirements.value.includes(req.id)) checkedRequirements.value.push(req.id);
        }
    });
};

const toggleRequirement = (req) => {
    if (autoVerifiedIds.value.includes(req.id)) return;
    
    // If already checked via test, don't allow unchecking
    if (req.test_type && req.test_type !== 'none' && checkedRequirements.value.includes(req.id)) return;

    if (req.test_type && req.test_type !== 'none' && !checkedRequirements.value.includes(req.id)) {
        activeTesterReq.value = req;
        return;
    }

    const index = checkedRequirements.value.indexOf(req.id);
    if (index === -1) checkedRequirements.value.push(req.id);
    else checkedRequirements.value.splice(index, 1);
};

const handleTestPassed = (req) => {
    if (!checkedRequirements.value.includes(req.id)) {
        checkedRequirements.value.push(req.id);
    }
    activeTesterReq.value = null;
};

const canProceed = computed(() => {
    if (isLoading.value || requirements.value.length === 0) return false;
    const mandatoryIds = requirements.value.filter(r => r.is_mandatory).map(r => r.id);
    if (mandatoryIds.length === 0) return true;
    return mandatoryIds.every(id => checkedRequirements.value.includes(id));
});

const proceed = () => {
    sessionStorage.setItem('requirements_verified', 'true');
    router.push('/skill-selection');
};

onMounted(fetchRequirements);
</script>

<template>
    <div class="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
        <StudentHeader />

        <!-- Background blobs -->
        <div class="fixed inset-0 pointer-events-none overflow-hidden z-0">
            <div class="absolute -top-[15%] -right-[10%] w-[45%] h-[45%] bg-violet-500/8 rounded-full blur-[140px]"></div>
            <div class="absolute bottom-[10%] -left-[10%] w-[35%] h-[35%] bg-brand-primary/6 rounded-full blur-[120px]"></div>
        </div>

        <main class="flex-grow flex items-center justify-center p-6 relative z-10">
            <div class="w-full max-w-7xl">

                <!-- Header -->
                <div class="mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
                    <div class="flex items-center justify-between mb-4">
                        <div>
                            <p class="text-[10px] font-black text-violet-600 uppercase tracking-[0.4em] mb-1">Proctoring System</p>
                            <h1 class="text-2xl font-black text-slate-900 tracking-tight uppercase">Pre-Exam Verification</h1>
                        </div>
                        <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-slate-200">System Check</span>
                    </div>
                </div>

                <!-- Main Card -->
                <div class="bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-700">
                    <div class="flex flex-col md:flex-row min-h-[720px]">

                        <!-- Left Panel - Visual/Info -->
                        <div class="md:w-[40%] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-10 text-white flex flex-col justify-between relative overflow-hidden shrink-0">
                            <div class="absolute top-0 right-0 w-64 h-64 bg-violet-500/15 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                            <div class="absolute bottom-0 left-0 w-48 h-48 bg-brand-primary/15 rounded-full -ml-24 -mb-24 blur-3xl"></div>
                            <div class="relative z-10">
                                <div class="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-10 shadow-2xl border border-white/10 transition-all duration-500 backdrop-blur-sm bg-white/10">
                                    <i class="pi pi-shield"></i>
                                </div>
                                <h2 class="text-4xl font-black tracking-tight uppercase mb-5 leading-[1.1]">System<br/>Readiness<br/><span class="text-violet-400">Check</span></h2>
                                <p class="text-white/60 text-sm font-bold uppercase tracking-widest leading-relaxed">Verify required checks before you proceed to the assessment</p>
                            </div>
                            <div class="relative z-10 space-y-3">
                                <div v-if="PROCTORING_ENABLED" class="flex items-center gap-3 p-3.5 bg-white/8 rounded-xl border border-white/10 backdrop-blur-sm">
                                    <div class="w-2 h-2 rounded-full bg-violet-400 animate-pulse shadow-lg shadow-violet-400/50"></div>
                                    <span class="text-[10px] font-black uppercase tracking-widest text-white/70">Proctoring System Active</span>
                                </div>
                            </div>
                        </div>

                        <!-- Right Panel: Requirements List (keeps existing actions/logic) -->
                        <div class="flex-1 flex flex-col p-6 md:p-10 min-h-0 bg-white">
                            <div class="flex flex-col flex-grow min-h-0">
                                <div class="flex justify-between items-end mb-6 md:mb-10 shrink-0">
                                    <div>
                                        <h2 class="text-xl font-black text-slate-800 uppercase tracking-tight">Required Checks</h2>
                                        <p class="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Verify all mandatory items to proceed</p>
                                    </div>
                                    <div class="text-right">
                                        <span class="text-3xl font-black text-slate-200">{{ checkedRequirements.length }}/{{ requirements.length }}</span>
                                    </div>
                                </div>

                                <div v-if="isLoading" class="flex flex-col items-center justify-center py-12 shrink-0">
                                    <div class="w-12 h-12 border-4 border-slate-100 border-t-violet-500 rounded-full animate-spin"></div>
                                    <p class="mt-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Analyzing System...</p>
                                </div>

                                <div v-else class="pr-2 custom-scrollbar">
                                    <div class="flex flex-col gap-4 pb-2">
                                        <div v-for="req in requirements" :key="req.id" 
                                            @click="toggleRequirement(req)"
                                            class="group flex items-center gap-4 p-5 rounded-2xl border-2 transition-all cursor-pointer relative"
                                            :class="checkedRequirements.includes(req.id) 
                                                ? 'border-emerald-100 bg-emerald-50/20' 
                                                : 'border-slate-50 bg-slate-50/50 hover:border-brand-primary/20 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50'">
                                            
                                            <div class="w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-all duration-500 shrink-0"
                                                :class="checkedRequirements.includes(req.id) ? 'bg-emerald-500 text-white' : 'bg-white text-slate-400 group-hover:text-brand-primary group-hover:scale-110 shadow-sm'">
                                                <i v-if="checkedRequirements.includes(req.id)" class="pi pi-check"></i>
                                                <i v-else :class="req.icon || 'pi pi-cog'"></i>
                                            </div>

                                            <div class="min-w-0">
                                                <h3 class="text-xs font-black text-slate-800 uppercase tracking-tight truncate">{{ req.title }}</h3>
                                                <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">{{ req.category || 'System' }}</p>
                                            </div>

                                            <div v-if="req.is_mandatory && !checkedRequirements.includes(req.id)" class="absolute top-2 right-2">
                                                <div class="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-sm shadow-rose-200"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Footer Action -->
                            <div class="mt-6 pt-5 border-t border-slate-50 shrink-0 flex items-center justify-between">
                                <div></div>
                                <button @click="proceed" :disabled="!canProceed"
                                    class="flex items-center gap-3 px-8 py-3.5 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all duration-500 shadow-xl disabled:opacity-30 disabled:cursor-not-allowed disabled:grayscale"
                                    :class="canProceed ? 'bg-slate-900 text-white hover:bg-violet-600 hover:-translate-y-0.5' : 'bg-slate-100 text-slate-400'">
                                    <span>{{ canProceed ? 'Confirm & Continue' : 'Check Mandatory Items' }}</span>
                                    <i v-if="canProceed" class="pi pi-arrow-right text-[10px]"></i>
                                </button>
                            </div>
                        </div>

                    </div>
                </div>

            </div>
        </main>

        <!-- Requirement Tester Modal -->
        <RequirementTester 
            v-if="activeTesterReq" 
            :requirement="activeTesterReq"
            @close="activeTesterReq = null"
            @passed="handleTestPassed"
        />
    </div>
</template>

<style scoped>
.animate-in {
    animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
}

.custom-scrollbar::-webkit-scrollbar {
    width: 4px;
}

.custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
    background: #E2E8F0;
    border-radius: 10px;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
    transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.fade-slide-enter-from {
    opacity: 0;
    transform: translateX(20px);
}

.fade-slide-leave-to {
    opacity: 0;
    transform: translateX(-20px);
}
</style>
