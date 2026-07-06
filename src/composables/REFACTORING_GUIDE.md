# دليل تقسيم ExamView.vue إلى Composables

## 📋 الملف الأصلي: ExamView.vue
- **الحجم الأصلي**: ~1500+ سطر
- **المسؤوليات**: 15+ وظيفة مختلفة
- **المشكلة**: صعب الصيانة والتطوير والاختبار

## ✅ الحل: تقسيم إلى 6 Composables

### 1. **useExamFlow.ts**
**المسؤوليات:**
- إدارة بيانات الامتحان (attempt, questions, skill, level)
- جلب الأسئلة (fetchData, beginExam, fetchNextBatch)
- إدارة مستويات الصعوبة والانتقال بينها

**الحالات:**
- `attempt`, `currentSkill`, `currentLevel`, `questions`, `totalSkillQuestions`, `globalOffset`
- `nextLevelName`, `showLevelTransition`, `showRetryNotification`
- `timerConfig`, `errorMsg`, `isDemo`

**الدوال:**
- `fetchData()`: جلب بيانات الامتحان
- `beginExam()`: بدء امتحان جديد
- `fetchNextBatch()`: جلب مجموعة أسئلة جديدة
- `startNextLevel()`: الانتقال للمستوى التالي

---

### 2. **useAnswerSubmission.ts**
**المسؤوليات:**
- إدارة الإجابات والتحقق من صحتها
- حفظ الإجابات المسودة
- إرسال مجموعات الإجابات
- تتبع محاولات الغش

**الحالات:**
- `answers`, `questionSubmitted`, `isSubmittingBatch`
- `showConfirmAnswerModal`, `cheatWarnings`, `cheatAttempts`

**الدوال:**
- `initializeAnswers()`: تهيئة الإجابات الفارغة
- `submitAnswer()`: التحقق من الإجابة الحالية
- `saveCurrentAnswerDraft()`: حفظ المسودة
- `submitBatch()`: إرسال مجموعة الإجابات
- `recordCheatAttempt()`: تسجيل محاولة غش

**الثوابت:**
- `VALIDATORS`: معايير التحقق لكل نوع سؤال

---

### 3. **useProctoring.ts**
**المسؤوليات:**
- إدارة جلسات المراقبة
- استطلاع حالة الجلسة
- التعامل مع انقطاع الجلسة

**الحالات:**
- `proctoringRequired`, `proctoringComplete`, `proctoringSessionId`, `proctoringSessionToken`

**الدوال:**
- `autoStartProctoring()`: بدء المراقبة تلقائيًا
- `pollSessionStatus()`: فحص حالة الجلسة
- `startSessionPolling()`: بدء الاستطلاع
- `stopSessionPolling()`: إيقاف الاستطلاع
- `endProctoringSession()`: إنهاء الجلسة
- `handleSessionInterruption()`: التعامل مع الانقطاع

---

### 4. **useInactivity.ts**
**المسؤوليات:**
- كشف عدم نشاط المستخدم
- إدارة مؤقت انتهاء الجلسة
- عرض تنبيهات عدم النشاط

**الحالات:**
- `inactivityTimer`, `lastActivityAt`, `showInactivityModal`

**الدوال:**
- `resetInactivityTimer()`: إعادة تعيين المؤقت
- `updateActivity()`: تحديث النشاط
- `stopInactivityTimer()`: إيقاف المؤقت

---

### 5. **useQuestionNavigation.ts**
**المسؤوليات:**
- التنقل بين الأسئلة
- إدارة فهرس السؤال الحالي
- حفظ المسودة عند الانتقال

**الحالات:**
- `currentIndex`, `isNavigatingBack`

**الدوال:**
- `prevQuestion()`: السؤال السابق
- `advanceQuestion()`: السؤال التالي أو إرسال الدفعة
- `goToQuestion()`: الذهاب لسؤال محدد
- `resetIndex()`: إعادة تعيين الفهرس

---

### 6. **useAudioManagement.ts**
**المسؤوليات:**
- تشغيل وإيقاف الصوتيات
- تتبع تقدم الصوت
- معالجة فشل التشغيل التلقائي

**الحالات:**
- `audioRef`, `isAudioPlaying`, `autoplayFailed`, `hasListened`
- `lastAudioUrl`, `audioProgress`, `audioCurrentTime`, `audioDuration`

**الدوال:**
- `playCurrentAudio()`: تشغيل صوت السؤال الحالي
- `stopAudio()`: إيقاف الصوت
- `updateAudioProgress()`: تحديث التقدم
- `resetAudioState()`: إعادة تعيين الحالة

---

## 🔗 الربط بين Composables

```
ExamView.vue
├── useExamFlow (جلب البيانات)
│   ├── يستدعي: fetchNextBatch() → يحدث questions
│   └── يحتاج: proctoringSessionId من useProctoring
│
├── useAnswerSubmission (الإجابات)
│   ├── يستخدم: currentQuestion من useExamFlow
│   └── يستخدم: currentIndex من useQuestionNavigation
│
├── useProctoring (المراقبة)
│   ├── يستدعي: proctoringService API
│   └── يحتاج: skillId من params
│
├── useInactivity (عدم النشاط)
│   └── يستدعي: submitCurrentBatch() عند انتهاء المهلة
│
├── useQuestionNavigation (التنقل)
│   ├── يستخدم: questions و answers
│   └── يستدعي: saveCurrentAnswerDraft()
│
└── useAudioManagement (الصوتيات)
    └── يستخدم: currentQuestion لتحديد الصوت
```

---

## 📝 مثال على الاستخدام في ExamView.vue

```javascript
import { useExamFlow } from '@/composables/useExamFlow';
import { useAnswerSubmission } from '@/composables/useAnswerSubmission';
import { useProctoring } from '@/composables/useProctoring';
import { useInactivity } from '@/composables/useInactivity';
import { useQuestionNavigation } from '@/composables/useQuestionNavigation';
import { useAudioManagement } from '@/composables/useAudioManagement';

export default {
  setup() {
    // تهيئة Composables
    const examFlow = useExamFlow(attemptId, examId, isStarting, isLoading, proctoringSessionId);
    const answers = useAnswerSubmission(attemptId, currentQuestion, examFlow.questions, currentIndex, isStarting);
    const proctoring = useProctoring(showAlert, navigateSafely, currentLang, skillId);
    const inactivity = useInactivity(handleTimeout);
    const navigation = useQuestionNavigation(examFlow.questions, answers.answers, answers.saveCurrentAnswerDraft, answers.submitBatch);
    const audio = useAudioManagement(currentQuestion, isLoading, showLevelTransition, showRetryNotification, isStarting, proctoring.proctoringComplete);

    // إرجاع جميع الحالات والدوال
    return {
      ...examFlow,
      ...answers,
      ...proctoring,
      ...inactivity,
      ...navigation,
      ...audio
    };
  }
};
```

---

## ✨ الفوائد

| الفائدة | التفصيل |
|--------|--------|
| **قابلية الصيانة** | كل composable مسؤول عن وظيفة واحدة |
| **إعادة الاستخدام** | يمكن استخدام هذه الـ composables في مكونات أخرى |
| **الاختبار** | سهل اختبار كل composable بشكل منفصل |
| **الأداء** | تنظيم أفضل للكود والذاكرة |
| **التعاون** | عدة مطورين يعملون على أجزاء مختلفة بدون تضارب |

---

## 🚀 خطوات التنفيذ

1. ✅ إنشاء الـ composables الستة
2. ⏳ تحديث ExamView.vue لاستخدام الـ composables
3. ⏳ اختبار شامل لكل composable
4. ⏳ حذف الكود القديم من ExamView.vue
5. ⏳ توثيق في الملف الرئيسي

---

## 📚 ملفات Composables

```
frontend/src/composables/
├── useExamFlow.ts ✅
├── useAnswerSubmission.ts ✅
├── useProctoring.ts ✅
├── useInactivity.ts ✅
├── useQuestionNavigation.ts ✅
├── useAudioManagement.ts ✅
└── (Existing composables)
    ├── useExamTimer.ts
    ├── useAntiCheat.ts
    ├── useAudioEngine.ts
    ├── useMediaUrl.ts
    └── useVirtualKeyboard.ts
```

