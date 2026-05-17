import { ref } from 'vue';

const modalConfig = ref({
    visible: false,
    title: '',
    message: '',
    type: 'info',
    showCancel: false,
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    resolvePromise: null
});

export const useModal = () => {
    const showAlert = (message, title = 'Notification', type = 'info') => {
        if(typeof message === 'object' && message.title) {
            // Support options object
            return new Promise((resolve) => {
                modalConfig.value = {
                    visible: true,
                    title: message.title || 'Notification',
                    message: message.message || '',
                    type: message.type || 'info',
                    showCancel: message.showCancel || false,
                    confirmText: message.confirmText || 'OK',
                    cancelText: message.cancelText || 'Cancel',
                    resolvePromise: resolve
                };
            });
        }
        return new Promise((resolve) => {
            modalConfig.value = {
                visible: true,
                title,
                message,
                type,
                showCancel: false,
                confirmText: 'OK',
                resolvePromise: resolve
            };
        });
    };

    const showConfirm = (message, title = 'Confirm', type = 'warning', confirmText = 'Yes', cancelText = 'Cancel') => {
        return new Promise((resolve) => {
            modalConfig.value = {
                visible: true,
                title,
                message,
                type,
                showCancel: true,
                confirmText,
                cancelText,
                resolvePromise: resolve
            };
        });
    };

    const handleModalConfirm = () => {
        modalConfig.value.visible = false;
        if (modalConfig.value.resolvePromise) {
            modalConfig.value.resolvePromise(true);
            modalConfig.value.resolvePromise = null;
        }
    };

    const handleModalCancel = () => {
        modalConfig.value.visible = false;
        if (modalConfig.value.resolvePromise) {
            modalConfig.value.resolvePromise(false);
            modalConfig.value.resolvePromise = null;
        }
    };

    return {
        modalConfig,
        showAlert,
        showConfirm,
        handleModalConfirm,
        handleModalCancel
    };
};
