export function useMediaUrl() {

    const getMediaBaseUrl = () => {
        let apiUrl = import.meta.env.VITE_API_BASE_URL;

        if (!apiUrl) {
            const isLocal =
                ['localhost', '127.0.0.1'].includes(window.location.hostname);

            apiUrl = isLocal
                ? 'http://localhost:8000/api/v1'
                : `${window.location.origin}/api/v1`;
        }

        try {
            const url = new URL(apiUrl);
            const isLocal = ['localhost', '127.0.0.1'].includes(url.hostname);

            if (isLocal) {
                // On local, storage is served directly from the root of the server
                return url.origin;
            }

            // On production, storage is served from the /api subdirectory
            return url.origin + '/api';
        } catch (e) {
            const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
            return isLocal ? window.location.origin : `${window.location.origin}/api`;
        }
    };

    const resolveUrl = (path) => {
        if (!path) return null;

        // full url
        if (/^https?:\/\//i.test(path)) {

            const isLocalPath =
                path.includes('localhost') ||
                path.includes('127.0.0.1');

            const isLocalBrowser =
                ['localhost', '127.0.0.1'].includes(window.location.hostname);

            // لو الصورة متخزنة بلينك localhost
            if (isLocalPath && !isLocalBrowser) {
                try {
                    const url = new URL(path);

                    return `${getMediaBaseUrl()}${url.pathname}`;
                } catch {
                    return path;
                }
            }

            // إصلاح الروابط الغلط
            return path
                .replace('/public/storage/', '/storage/')
                .replace('/api/public/storage/', '/api/storage/')
                .replace('alpt.arabacademy.com/storage/', 'alpt.arabacademy.com/api/storage/');
        }

        // relative path
        const cleanPath = path
            .replace(/^\/+/, '')
            .replace(/^storage\//, '')
            .replace(/^public\//, '');

        return `${getMediaBaseUrl()}/storage/${cleanPath}`;
    };

    return {
        resolveUrl
    };
}