// PostCSS config for the frontend project.
// Tailwind CSS is handled via the @tailwindcss/vite plugin in vite.config.ts,
// so we do NOT include tailwindcss here as a PostCSS plugin.
export default {
    plugins: {
        autoprefixer: {},
    },
};
