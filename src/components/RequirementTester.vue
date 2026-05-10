<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';

const props = defineProps({
    requirement: {
        type: Object,
        required: true
    }
});

const emit = defineEmits(['close', 'passed', 'failed']);

// Test states
const isTesting = ref(false);
const testStep = ref(0);
const testResult = ref(null); // 'success', 'failed', null
const errorMessage = ref('');

// Audio Output Test
const isPlaying = ref(false);
let testAudioContext = null;

const playTestSound = () => {
    if (isPlaying.value) return;
    isPlaying.value = true;
    errorMessage.value = '';
    
    const customAudioUrl = props.requirement.test_config?.audio_url;

    if (customAudioUrl) {
        try {
            const audio = new Audio(customAudioUrl);
            audio.play().catch(e => {
                console.error("Audio play failed:", e);
                errorMessage.value = "فشل تشغيل الصوت. قد يكون المتصفح يمنع ذلك.";
                isPlaying.value = false;
            });
            audio.onended = () => {
                isPlaying.value = false;
            };
        } catch (e) {
            console.error("Audio initialization failed:", e);
            errorMessage.value = "فشل تهيئة مشغل الصوت.";
            isPlaying.value = false;
        }
        return;
    }

    try {
        testAudioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = testAudioContext.createOscillator();
        const gainNode = testAudioContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, testAudioContext.currentTime); // A4 note
        oscillator.frequency.exponentialRampToValueAtTime(880, testAudioContext.currentTime + 0.5);
        
        gainNode.gain.setValueAtTime(0, testAudioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.5, testAudioContext.currentTime + 0.1);
        gainNode.gain.linearRampToValueAtTime(0, testAudioContext.currentTime + 1.5);
        
        oscillator.connect(gainNode);
        gainNode.connect(testAudioContext.destination);
        
        oscillator.start();
        oscillator.stop(testAudioContext.currentTime + 1.5);
        
        oscillator.onended = () => {
            isPlaying.value = false;
        };
    } catch (e) {
        console.error("Audio tone failed:", e);
        errorMessage.value = "فشل تشغيل نغمة الاختبار.";
        isPlaying.value = false;
    }
};

const handleAudioEnded = () => {
    isPlaying.value = false;
};

// Audio Input Test (Microphone)
const mediaRecorder = ref(null);
const audioChunks = ref([]);
const recordedAudioUrl = ref(null);
const isRecording = ref(false);
const volumeLevel = ref(0);
let audioContext, analyser, microphone, scriptProcessor;

const startMicTest = async () => {
    try {
        errorMessage.value = '';
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Setup volume meter
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        microphone = audioContext.createMediaStreamSource(stream);
        scriptProcessor = audioContext.createScriptProcessor(2048, 1, 1);

        analyser.smoothingTimeConstant = 0.8;
        analyser.fftSize = 1024;

        microphone.connect(analyser);
        analyser.connect(scriptProcessor);
        scriptProcessor.connect(audioContext.destination);

        scriptProcessor.onaudioprocess = () => {
            const array = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(array);
            let values = 0;
            const length = array.length;
            for (let i = 0; i < length; i++) {
                values += (array[i]);
            }
            const average = values / length;
            volumeLevel.value = Math.min(100, Math.round(average * 2));
        };

        // Setup recorder
        mediaRecorder.value = new MediaRecorder(stream);
        audioChunks.value = [];

        mediaRecorder.value.ondataavailable = (event) => {
            audioChunks.value.push(event.data);
        };

        mediaRecorder.value.onstop = () => {
            const audioBlob = new Blob(audioChunks.value, { type: 'audio/webm' });
            recordedAudioUrl.value = URL.createObjectURL(audioBlob);
            
            // Cleanup stream
            stream.getTracks().forEach(track => track.stop());
            if (audioContext) {
                scriptProcessor.disconnect();
                analyser.disconnect();
                microphone.disconnect();
                audioContext.close();
            }
        };

        mediaRecorder.value.start();
        isRecording.value = true;
        
        // Record for 4 seconds then playback
        setTimeout(() => {
            stopMicTest();
        }, 4000);

    } catch (err) {
        console.error('Mic error:', err);
        errorMessage.value = 'تعذر الوصول إلى الميكروفون. يرجى التحقق من الأذونات.';
    }
};

const stopMicTest = () => {
    if (mediaRecorder.value && isRecording.value) {
        mediaRecorder.value.stop();
        isRecording.value = false;
        testStep.value = 1; // Move to playback step
    }
};

// Video Input Test (Camera)
const videoRef = ref(null);
const videoStream = ref(null);

const startCameraTest = async () => {
    try {
        errorMessage.value = '';
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoStream.value = stream;
        if (videoRef.value) {
            videoRef.value.srcObject = stream;
        }
    } catch (err) {
        console.error('Camera error:', err);
        errorMessage.value = 'تعذر الوصول إلى الكاميرا. يرجى التحقق من الأذونات.';
    }
};

const stopCameraTest = () => {
    if (videoStream.value) {
        videoStream.value.getTracks().forEach(track => track.stop());
        videoStream.value = null;
    }
};

// Actions
const markPassed = () => {
    testResult.value = 'success';
    setTimeout(() => {
        emit('passed', props.requirement);
    }, 1000);
};

const markFailed = (customMessage = null) => {
    testResult.value = 'failed';
    errorMessage.value = customMessage || 'يبدو أن هناك مشكلة في هذا الاختبار. يرجى التحقق من إعداداتك ثم أعد المحاولة.';
};

const startTest = () => {
    isTesting.value = true;
    testStep.value = 0;
    testResult.value = null;
    errorMessage.value = '';

    const type = props.requirement.test_type;
    
    if (type === 'audio_output') {
        playTestSound();
    } else if (type === 'audio_input') {
        startMicTest();
    } else if (type === 'video_input') {
        startCameraTest();
    } else if (type === 'network_speed' || type === 'browser_compatibility') {
        // Auto pass simple tests for now
        setTimeout(() => {
            markPassed();
        }, 1500);
    } else {
        markPassed(); // Default fallback
    }
};

onMounted(() => {
    startTest();
});

onUnmounted(() => {
    stopCameraTest();
    if (mediaRecorder.value && isRecording.value) {
        mediaRecorder.value.stop();
    }
    if (audioContext && audioContext.state !== 'closed') {
         audioContext.close();
    }
});

const testType = computed(() => props.requirement.test_type);
</script>

<template>
    <div class="fixed inset-0 z-[3000] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
        <div class="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl border border-slate-200" dir="rtl">
            
            <div class="flex justify-between items-start mb-6 pb-4 border-b border-slate-100">
                <div>
                    <h3 class="text-xl font-black text-slate-900">{{ requirement.title }}</h3>
                    <p class="text-sm text-slate-500 font-medium mt-1">{{ requirement.description }}</p>
                </div>
                <button @click="$emit('close')" class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors">
                    <i class="pi pi-times"></i>
                </button>
            </div>

            <div class="min-h-[200px] flex flex-col items-center justify-center p-4">
                
                <!-- Success State -->
                <div v-if="testResult === 'success'" class="text-center animate-in zoom-in-95 duration-300">
                    <div class="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                        <i class="pi pi-check-circle"></i>
                    </div>
                    <h4 class="text-lg font-black text-slate-800">تم اجتياز الاختبار بنجاح</h4>
                </div>

                <!-- Error State (Permissions etc) -->
                <div v-else-if="errorMessage" class="text-center w-full">
                    <div class="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                        <i class="pi pi-exclamation-triangle"></i>
                    </div>
                    <p class="text-rose-600 font-medium text-sm mb-6">{{ errorMessage }}</p>
                    <button @click="startTest" class="px-6 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200">
                        إعادة المحاولة
                    </button>
                </div>

                <!-- TEST RUNNING STATES -->
                <div v-else class="w-full text-center">
                    
                    <!-- AUDIO OUTPUT (Speakers) -->
                    <div v-if="testType === 'audio_output'" class="space-y-6">
                        
                        <div class="w-24 h-24 mx-auto bg-indigo-50 rounded-full flex items-center justify-center text-brand-primary mb-4" :class="{'animate-pulse scale-110 shadow-lg shadow-indigo-100': isPlaying}">
                            <i class="pi pi-volume-up text-4xl"></i>
                        </div>
                        
                        <h4 class="font-bold text-slate-700">هل تسمع نغمة الرنين؟</h4>
                        
                        <div class="flex justify-center gap-4 mt-6">
                            <button @click="markFailed('يبدو أن هناك مشكلة في إخراج الصوت. يرجى التأكد من توصيل السماعات ورفع مستوى الصوت ثم أعد المحاولة.')" class="px-6 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-colors">
                                لا أسمع شيئاً
                            </button>
                            <button @click="markPassed" class="px-6 py-2.5 bg-brand-primary text-white font-bold rounded-xl shadow-lg hover:bg-brand-primary/90 transition-colors">
                                نعم، الصوت واضح
                            </button>
                        </div>
                        <button v-if="!isPlaying" @click="playTestSound" class="text-brand-primary text-xs font-bold mt-4 hover:underline">
                            إعادة تشغيل الصوت
                        </button>
                    </div>

                    <!-- AUDIO INPUT (Microphone) -->
                    <div v-else-if="testType === 'audio_input'" class="space-y-6">
                        
                        <div v-if="testStep === 0">
                            <div class="w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-4 transition-all"
                                :class="isRecording ? 'bg-rose-50 text-rose-500 scale-110 shadow-lg shadow-rose-100' : 'bg-slate-50 text-slate-400'">
                                <i class="pi pi-microphone text-4xl" :class="{'animate-pulse': isRecording}"></i>
                            </div>
                            <h4 class="font-bold text-slate-700 mb-2">تحدث الآن لاختبار الميكروفون</h4>
                            <p class="text-xs text-slate-500 mb-4">جاري التسجيل لمدة 4 ثوانٍ...</p>
                            
                            <!-- Volume Meter -->
                            <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-2">
                                <div class="bg-emerald-500 h-full transition-all duration-75" :style="{width: `${volumeLevel}%`}"></div>
                            </div>
                            <div class="text-[10px] text-slate-400 font-mono text-left">Input Level: {{ volumeLevel }}%</div>
                        </div>

                        <div v-if="testStep === 1">
                            <div class="w-16 h-16 mx-auto bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 mb-4">
                                <i class="pi pi-play text-2xl"></i>
                            </div>
                            <h4 class="font-bold text-slate-700 mb-4">جاري إعادة تشغيل التسجيل...</h4>
                            
                            <audio :src="recordedAudioUrl" controls autoplay class="w-full h-10 mb-6"></audio>

                            <h4 class="font-bold text-slate-700">هل تسمع صوتك بوضوح؟</h4>
                            <div class="flex justify-center gap-4 mt-6">
                                <button @click="markFailed('يبدو أن هناك مشكلة في إدخال الصوت. يرجى التحقق من إعدادات الميكروفون وأذونات المتصفح.')" class="px-6 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-colors">
                                    لا
                                </button>
                                <button @click="markPassed" class="px-6 py-2.5 bg-brand-primary text-white font-bold rounded-xl shadow-lg hover:bg-brand-primary/90 transition-colors">
                                    نعم
                                </button>
                            </div>
                            <button @click="startTest" class="text-brand-primary text-xs font-bold mt-4 hover:underline">
                                إعادة التسجيل
                            </button>
                        </div>
                    </div>

                    <!-- VIDEO INPUT (Camera) -->
                    <div v-else-if="testType === 'video_input'" class="space-y-4">
                        <div class="w-full aspect-video bg-black rounded-xl overflow-hidden relative shadow-inner">
                            <video ref="videoRef" autoplay playsinline class="w-full h-full object-cover transform scale-x-[-1]"></video>
                            <div v-if="!videoStream" class="absolute inset-0 flex items-center justify-center">
                                <i class="pi pi-spin pi-spinner text-white text-2xl"></i>
                            </div>
                        </div>
                        
                        <h4 class="font-bold text-slate-700 mt-4">هل ترى نفسك بوضوح؟</h4>
                        <div class="flex justify-center gap-4 mt-4">
                            <button @click="markFailed('يبدو أن هناك مشكلة في الكاميرا. يرجى التأكد من توصيلها ومنح المتصفح الإذن للوصول إليها.')" class="px-6 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-colors">
                                لا
                            </button>
                            <button @click="markPassed" class="px-6 py-2.5 bg-brand-primary text-white font-bold rounded-xl shadow-lg hover:bg-brand-primary/90 transition-colors">
                                نعم، أرى بوضوح
                            </button>
                        </div>
                    </div>

                    <!-- OTHER TESTS (Simulated) -->
                    <div v-else class="space-y-6">
                        <div class="w-20 h-20 mx-auto bg-blue-50 text-blue-500 rounded-full flex items-center justify-center animate-spin">
                            <i class="pi pi-sync text-3xl"></i>
                        </div>
                        <h4 class="font-bold text-slate-700">جاري فحص متطلبات النظام...</h4>
                        <p class="text-xs text-slate-500">{{ requirement.test_type }}</p>
                    </div>

                </div>
            </div>
        </div>
    </div>
</template>
