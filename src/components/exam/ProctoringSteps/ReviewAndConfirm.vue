<template>
  <div class="review-and-confirm" :dir="currentLang === 'ar' ? 'rtl' : 'ltr'">
    <!-- Summary Cards -->
    <div class="summary-section">
      <h2 class="section-title">
        {{ currentLang === 'ar' ? 'مراجعة الإعدادات' : 'Review Settings' }}
      </h2>

      <!-- System Requirements Summary -->
      <div class="summary-card">
        <div class="card-header">
          <i class="pi pi-check-circle check-icon"></i>
          <span>{{ currentLang === 'ar' ? 'متطلبات النظام' : 'System Requirements' }}</span>
        </div>
        <div class="card-content">
          <div class="check-item">
            <i class="pi pi-check"></i>
            <span>{{ currentLang === 'ar' ? 'المتصفح متوافق' : 'Browser compatible' }}</span>
          </div>
          <div class="check-item">
            <i class="pi pi-check"></i>
            <span>{{ currentLang === 'ar' ? 'سرعة الإنترنت كافية' : 'Internet speed sufficient' }}</span>
          </div>
          <div class="check-item">
            <i class="pi pi-check"></i>
            <span>{{ currentLang === 'ar' ? 'المساحة التخزينية كافية' : 'Storage space sufficient' }}</span>
          </div>
        </div>
      </div>

      <!-- Camera & Microphone Summary -->
      <div class="summary-card">
        <div class="card-header">
          <i class="pi pi-check-circle check-icon"></i>
          <span>{{ currentLang === 'ar' ? 'الأجهزة' : 'Devices' }}</span>
        </div>
        <div class="card-content">
          <div class="check-item">
            <i class="pi pi-camera"></i>
            <span>{{ currentLang === 'ar' ? 'الكاميرا: متصلة' : 'Camera: Connected' }}</span>
          </div>
          <div class="check-item">
            <i class="pi pi-microphone"></i>
            <span>{{ currentLang === 'ar' ? 'الميكروفون: متصل' : 'Microphone: Connected' }}</span>
          </div>
        </div>
      </div>

      <!-- Identity Summary -->
      <div class="summary-card">
        <div class="card-header">
          <i class="pi pi-check-circle check-icon"></i>
          <span>{{ currentLang === 'ar' ? 'التحقق من الهوية' : 'Identity Verification' }}</span>
        </div>
        <div class="card-content">
          <div class="check-item">
            <i class="pi pi-user"></i>
            <span>{{ currentLang === 'ar' ? 'صورة الوجه: مقبولة' : 'Face photo: Accepted' }}</span>
          </div>
          <div class="check-item">
            <i class="pi pi-id-card"></i>
            <span>{{ currentLang === 'ar' ? 'بطاقة الهوية: مقبولة' : 'ID card: Accepted' }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Rules & Agreement Section -->
    <div class="rules-section">
      <h2 class="section-title">
        {{ currentLang === 'ar' ? 'قوانين الامتحان' : 'Exam Rules' }}
      </h2>

      <div class="rules-box">
        <h3>{{ currentLang === 'ar' ? 'يجب عليك الالتزام بـ:' : 'You must comply with:' }}</h3>
        
        <div class="rules-list">
          <div class="rule-item">
            <i class="pi pi-check"></i>
            <span>{{ currentLang === 'ar' 
              ? 'عدم استخدام تطبيقات أو برامج أخرى أثناء الامتحان'
              : 'Do not use other applications or programs during the exam' }}</span>
          </div>

          <div class="rule-item">
            <i class="pi pi-check"></i>
            <span>{{ currentLang === 'ar'
              ? 'الحفاظ على الكاميرا مشغلة وموجهة نحوك طوال الوقت'
              : 'Keep the camera on and pointed at you at all times' }}</span>
          </div>

          <div class="rule-item">
            <i class="pi pi-check"></i>
            <span>{{ currentLang === 'ar'
              ? 'عدم ترك الامتحان أو إخفاء الكاميرا'
              : 'Do not leave the exam or hide the camera' }}</span>
          </div>

          <div class="rule-item">
            <i class="pi pi-check"></i>
            <span>{{ currentLang === 'ar'
              ? 'عدم النسخ واللصق أو استخدام مساعدات خارجية'
              : 'Do not copy and paste or use external aids' }}</span>
          </div>

          <div class="rule-item">
            <i class="pi pi-check"></i>
            <span>{{ currentLang === 'ar'
              ? 'عدم التحدث مع أي شخص آخر'
              : 'Do not communicate with anyone else' }}</span>
          </div>

          <div class="rule-item">
            <i class="pi pi-check"></i>
            <span>{{ currentLang === 'ar'
              ? 'الالتزام بكل متطلبات المراقبة'
              : 'Comply with all proctoring requirements' }}</span>
          </div>
        </div>

        <div class="violation-warning">
          <i class="pi pi-exclamation-triangle"></i>
          <span>{{ currentLang === 'ar'
            ? 'مخالفة هذه القوانين قد تؤدي إلى رفع الامتحان أو حظر الحساب'
            : 'Violating these rules may result in exam rejection or account ban' }}</span>
        </div>
      </div>
    </div>

    <!-- Agreement Checkbox -->
    <div class="agreement-section">
      <label class="agreement-checkbox">
        <input 
          v-model="agreeToRules"
          type="checkbox"
        />
        <span>{{ currentLang === 'ar'
          ? 'أوافق على جميع قوانين وشروط الامتحان والمراقبة'
          : 'I agree to all exam rules and proctoring conditions' }}</span>
      </label>
    </div>

    <!-- Information Cards -->
    <div class="info-cards">
      <div class="info-card">
        <i class="pi pi-info-circle"></i>
        <div>
          <h4>{{ currentLang === 'ar' ? 'المراقبة الفوري' : 'Live Proctoring' }}</h4>
          <p>{{ currentLang === 'ar'
            ? 'قد يكون هناك مراقب بشري يراقب الامتحان بشكل مباشر'
            : 'A human proctor may monitor your exam in real-time' }}</p>
        </div>
      </div>

      <div class="info-card">
        <i class="pi pi-info-circle"></i>
        <div>
          <h4>{{ currentLang === 'ar' ? 'التسجيل' : 'Recording' }}</h4>
          <p>{{ currentLang === 'ar'
            ? 'سيتم تسجيل الفيديو والصوت والشاشة للتحليل اللاحق'
            : 'Video, audio, and screen will be recorded for later analysis' }}</p>
        </div>
      </div>

      <div class="info-card">
        <i class="pi pi-info-circle"></i>
        <div>
          <h4>{{ currentLang === 'ar' ? 'الكشف الآلي' : 'AI Detection' }}</h4>
          <p>{{ currentLang === 'ar'
            ? 'يتم استخدام الذكاء الاصطناعي للكشف عن السلوك المريب'
            : 'AI is used to detect suspicious behavior' }}</p>
        </div>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="action-buttons">
      <button 
        @click="goBack"
        class="btn-secondary"
      >
        <i class="pi pi-arrow-left"></i>
        {{ currentLang === 'ar' ? 'رجوع' : 'Back' }}
      </button>

      <button 
        @click="startExam"
        class="btn-primary"
        :disabled="!agreeToRules"
      >
        <i class="pi pi-play"></i>
        {{ currentLang === 'ar' ? 'ابدأ الامتحان' : 'Start Exam' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  currentLang: {
    type: String,
    default: 'en'
  }
})

const emit = defineEmits(['complete', 'back'])

const agreeToRules = ref(false)

const startExam = () => {
  emit('complete')
}

const goBack = () => {
  emit('back')
}
</script>

<style scoped>
.review-and-confirm {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.section-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

/* Summary Section */
.summary-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
}

.summary-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  border: 2px solid #e2e8f0;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  font-weight: 600;
}

.card-header i {
  font-size: 1.25rem;
}

.check-icon {
  color: #86efac;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.card-content {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.check-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: #64748b;
  font-size: 0.875rem;
}

.check-item i {
  color: #16a34a;
  font-weight: bold;
}

/* Rules Section */
.rules-section {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.rules-box {
  background: #f8fafc;
  border-radius: 8px;
  padding: 1.5rem;
  border-left: 4px solid #3b82f6;
}

.rules-box h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  color: #1e293b;
  font-size: 0.95rem;
}

.rules-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.rule-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  color: #475569;
  font-size: 0.875rem;
  line-height: 1.5;
}

.rule-item i {
  color: #16a34a;
  min-width: 20px;
  text-align: center;
}

.violation-warning {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: #fef3c7;
  border-radius: 6px;
  color: #92400e;
  font-size: 0.875rem;
  font-weight: 600;
}

.violation-warning i {
  font-size: 1.125rem;
}

/* Agreement Section */
.agreement-section {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.agreement-checkbox {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  font-weight: 600;
  color: #1e293b;
}

.agreement-checkbox input[type="checkbox"] {
  width: 20px;
  height: 20px;
  cursor: pointer;
  accent-color: #3b82f6;
}

/* Info Cards */
.info-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
}

.info-card {
  display: flex;
  gap: 1rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, #f8fafc, #f1f5f9);
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  transition: all 0.3s ease;
}

.info-card:hover {
  border-color: #cbd5e1;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.info-card i {
  font-size: 1.5rem;
  color: #3b82f6;
  flex-shrink: 0;
}

.info-card h4 {
  margin: 0 0 0.5rem 0;
  color: #1e293b;
  font-size: 0.95rem;
}

.info-card p {
  margin: 0;
  color: #64748b;
  font-size: 0.85rem;
  line-height: 1.5;
}

/* Action Buttons */
.action-buttons {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1rem;
}

.btn-primary,
.btn-secondary {
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border: none;
  font-size: 0.95rem;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59,130,246,0.4);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: #e2e8f0;
  color: #64748b;
}

.btn-secondary:hover {
  background: #cbd5e1;
}

@media (max-width: 768px) {
  .review-and-confirm {
    gap: 1.5rem;
  }

  .summary-section {
    grid-template-columns: 1fr;
  }

  .info-cards {
    grid-template-columns: 1fr;
  }

  .action-buttons {
    flex-direction: column-reverse;
  }

  .btn-primary,
  .btn-secondary {
    width: 100%;
    justify-content: center;
  }
}
</style>
