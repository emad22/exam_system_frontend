import { ref } from 'vue';

/**
 * useQuestionNavigation - إدارة التنقل بين الأسئلة
 */
export const useQuestionNavigation = (questions, answers, saveCurrentAnswerDraft, submitBatch) => {
    // States
    const currentIndex = ref(0);
    const isNavigatingBack = ref(false);

    /**
     * الانتقال للسؤال السابق
     */
    const prevQuestion = async () => {
        if (currentIndex.value > 0) {
            isNavigatingBack.value = true;
            currentIndex.value--;
        }
    };

    /**
     * الانتقال للسؤال التالي أو إرسال الإجابات
     */
    const advanceQuestion = async () => {
        const prevAns = answers.value[currentIndex.value];
        const prevQ = questions.value[currentIndex.value];

        if (currentIndex.value < questions.value.length - 1) {
            // Save draft and move to next question
            saveCurrentAnswerDraft(prevAns, prevQ); // Non-blocking background save
            currentIndex.value++;
            window.scrollTo(0, 0);
        } else {
            // Last question - save draft and submit batch
            await saveCurrentAnswerDraft(prevAns, prevQ); // Await last draft before submitting
            await submitBatch();
        }
    };

    /**
     * الذهاب إلى سؤال محدد
     */
    const goToQuestion = (index) => {
        if (index >= 0 && index < questions.value.length) {
            currentIndex.value = index;
            window.scrollTo(0, 0);
        }
    };

    /**
     * الذهاب إلى السؤال الأول
     */
    const goToFirstQuestion = () => {
        goToQuestion(0);
    };

    /**
     * الذهاب إلى السؤال الأخير
     */
    const goToLastQuestion = () => {
        goToQuestion(questions.value.length - 1);
    };

    /**
     * إعادة تعيين الفهرس (عند جلب مجموعة جديدة من الأسئلة)
     */
    const resetIndex = () => {
        currentIndex.value = 0;
    };

    return {
        // States
        currentIndex,
        isNavigatingBack,

        // Methods
        prevQuestion,
        advanceQuestion,
        goToQuestion,
        goToFirstQuestion,
        goToLastQuestion,
        resetIndex
    };
};
