<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import api from '@/services/api';

const route = useRoute();
const code = route.params.code;
const certData = ref(null);
const isLoading = ref(true);
const error = ref(null);

onMounted(async () => {
    try {
        const res = await api.get(`/verify-certificate/${code}`);
        certData.value = res.data;
    } catch (err) {
        error.value = err.response?.data?.error || 'Verification failed.';
    } finally {
        isLoading.value = false;
    }
});
</script>

<template>
    <div class="min-h-screen bg-slate-200 flex items-center justify-center p-4 sm:p-10 font-sans">
        <!-- Error State -->
        <div v-if="error" class="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 text-center border border-slate-100">
            <div class="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <i class="pi pi-times text-2xl"></i>
            </div>
            <h2 class="text-lg font-black text-slate-800 uppercase tracking-tight">Record Not Found</h2>
            <p class="text-slate-400 text-[10px] uppercase font-bold mt-2 leading-relaxed">
                The provided verification code is invalid or has been revoked.
            </p>
            <button @click="$router.push('/')" class="mt-8 px-8 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-brand-primary transition-all">
                Return to Home
            </button>
        </div>

        <!-- Loading State -->
        <div v-else-if="isLoading" class="text-center">
            <div class="w-12 h-12 border-4 border-white/30 border-t-brand-primary rounded-full animate-spin mx-auto mb-4"></div>
            <p class="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Authenticating Record...</p>
        </div>

        <!-- Certificate Design -->
        <div v-else class="cert-page-wrapper bg-white shadow-2xl relative">
            <div class="cert-container">
                <!-- Logos & Photos -->
                <div class="header-logo">
                    <img src="https://www.arabacademy.com/wp-content/uploads/2021/04/arab-academy-logo.png" style="width: 150px;" />
                </div>
                <div class="student-photo">PHOTO</div>

                <!-- Titles -->
                <div class="main-title">
                    <h1>ARAB ACADEMY</h1>
                    <p>certifies that</p>
                </div>

                <div class="student-name">{{ certData.student_name }}</div>

                <div class="description">
                    Has sat for the Arabic Language Proficiency Test (ALPT) and attained the following scores:
                </div>

                <!-- Detailed Table -->
                <table class="scores-table">
                    <thead>
                        <tr>
                            <th>Test</th>
                            <th>Score</th>
                            <th>Score%</th>
                            <th>Level (CEFR)</th>
                            <th>Level (ACTFL)</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="skill in certData.skills" :key="skill.name">
                            <td class="text-left pl-4">Section: {{ skill.name }}</td>
                            <td>{{ skill.points }}/900</td>
                            <td>{{ Number(skill.score).toFixed(1) }}%</td>
                            <td>{{ skill.cefr }}</td>
                            <td>{{ skill.actfl }}</td>
                            <td>{{ skill.date }}</td>
                        </tr>
                        <tr class="overall-row">
                            <td class="text-left pl-4">Overall Score</td>
                            <td>{{ certData.total_points }}/900</td>
                            <td>{{ Number(certData.score).toFixed(1) }}%</td>
                            <td>{{ certData.cefr }}</td>
                            <td>{{ certData.actfl }}</td>
                            <td>{{ certData.issue_date }}</td>
                        </tr>
                    </tbody>
                </table>

                <!-- Signatures -->
                <div class="signatures">
                    <div class="signature-box">
                        <p class="signature-sign" style="font-family: 'Dancing Script', cursive;">Sayed Ramadan</p>
                        <p class="signature-name">Sayed Ramadan</p>
                        <p class="signature-title">Program Director</p>
                    </div>
                    <div class="signature-box flex flex-col items-center">
                        <img src="https://www.arabacademy.com/wp-content/uploads/2021/04/arab-academy-logo.png" style="width: 60px;" />
                        <p style="font-size: 7px; margin: 0; color: #64748b;">3 alif Al-Nabataat Street,</p>
                        <p style="font-size: 7px; margin: 0; color: #64748b;">Garden City, Cairo, Egypt</p>
                    </div>
                    <div class="signature-box">
                        <p class="signature-sign" style="font-family: 'Dancing Script', cursive;">Hanan Dawah</p>
                        <p class="signature-name">Hanan Dawah</p>
                        <p class="signature-title">Registrar</p>
                    </div>
                </div>

                <!-- Footer Info -->
                <div class="footer flex justify-between items-end px-10">
                    <div class="flex items-center gap-4">
                        <div class="qr-code-box">
                            <img :src="'https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=' + $route.fullPath" class="w-full h-full" />
                        </div>
                        <div class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                            Certificate S.N.: {{ certData.certificate_number }}
                        </div>
                    </div>
                    <div class="text-[10px] font-black italic text-slate-800">
                        Certificate Awarded on: {{ certData.issue_date }}
                    </div>
                </div>
            </div>

            <!-- Verification Badge -->
            <div class="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 bg-emerald-500 text-white px-6 py-2 rounded-full font-black uppercase text-[10px] tracking-[0.3em] shadow-xl border-4 border-white">
                <i class="pi pi-verified mr-2"></i> Verified Official Record
            </div>
        </div>
    </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap');

.cert-page-wrapper {
    width: 1000px;
    height: 707px; /* A4 Ratio */
    padding: 40px;
    border: 1px solid #e2e8f0;
}

.cert-container {
    width: 100%;
    height: 100%;
    border: 2px solid #1e293b;
    position: relative;
    padding: 30px;
}

.header-logo { position: absolute; top: 20px; left: 20px; }
.student-photo { 
    width: 100px; height: 120px; border: 1px solid #cbd5e1; 
    position: absolute; top: 20px; right: 20px; 
    background: #f8fafc; color: #94a3b8; font-size: 8px;
    display: flex; align-items: center; justify-content: center;
    font-weight: bold;
}

.main-title { text-align: center; margin-top: 20px; }
.main-title h1 { font-family: serif; font-size: 32px; font-weight: 900; margin-bottom: 2px; color: #000; }
.main-title p { font-style: italic; font-size: 16px; margin: 0; color: #475569; }

.student-name { 
    text-align: center; margin-top: 15px; font-size: 36px; 
    font-weight: 900; text-decoration: underline; color: #000;
}

.description { 
    text-align: center; margin-top: 20px; font-size: 14px; 
    font-style: italic; color: #334155; padding: 0 80px;
}

.scores-table { width: 100%; margin-top: 25px; border-collapse: collapse; font-size: 11px; }
.scores-table th, .scores-table td { border: 1px solid #444; padding: 8px; text-align: center; }
.scores-table th { background-color: #f8fafc; font-weight: 900; text-transform: uppercase; }
.overall-row { font-weight: 900; background-color: #f1f5f9; }

.signatures { margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-end; }
.signature-box { width: 30%; text-align: center; }
.signature-sign { font-size: 20px; color: #2563eb; margin-bottom: -5px; }
.signature-name { font-weight: 900; font-size: 12px; margin: 0; border-top: 1px solid #cbd5e1; padding-top: 4px; }
.signature-title { font-size: 10px; color: #64748b; font-weight: bold; }

.footer { position: absolute; bottom: 30px; width: calc(100% - 60px); }
.qr-code-box { width: 60px; height: 60px; }

@media (max-width: 1024px) {
    .cert-page-wrapper {
        transform: scale(0.8);
        margin: -100px;
    }
}

@media (max-width: 768px) {
    .cert-page-wrapper {
        transform: scale(0.5);
        margin: -250px;
    }
}
</style>
