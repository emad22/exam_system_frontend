<script setup>
import AdminLayout from '@/components/AdminLayout.vue';
</script>

<template>
  <AdminLayout>
    <div class="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <!-- Header -->
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center space-y-6 md:space-y-0">
            <div>
                 <h1 class="text-3xl font-black text-slate-800 tracking-tight">Financial Ledger</h1>
                 <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">Transaction Monitoring & Revenue Streams</p>
            </div>
        </div>

        <!-- Empty State -->
        <div class="bg-white rounded-[3rem] shadow-[0_32px_120px_rgba(0,0,0,0.02)] border border-slate-100 p-24 text-center group mt-10">
            <div class="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 text-5xl group-hover:rotate-12 transition-transform duration-500">💳</div>
            <h3 class="text-3xl font-black text-slate-800 mb-4 tracking-tight uppercase">Economic Cluster Inactive</h3>
            <p class="text-slate-400 font-medium max-w-sm mx-auto mb-12 text-sm leading-relaxed italic">
                Monitor student payments, refund requests, and platform throughput. The financial integration layer is currently in staging.
            </p>
            <div class="flex justify-center space-x-2">
                 <div class="w-1.5 h-1.5 bg-indigo-600/40 rounded-full"></div>
                 <div class="w-1.5 h-1.5 bg-indigo-600/20 rounded-full"></div>
                 <div class="w-1.5 h-1.5 bg-indigo-600/10 rounded-full"></div>
            </div>
        </div>
    </div>
  </AdminLayout>
</template>

<style scoped>
.animate-in {
    animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
}
</style>
