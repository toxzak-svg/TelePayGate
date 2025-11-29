export default {
  plugins: {
    // Use the standard Tailwind PostCSS plugin. The repository already
    // depends on `tailwindcss` in devDependencies so reference that name
    // (previous value '@tailwindcss/postcss' caused module-not-found).
    tailwindcss: {},
    autoprefixer: {},
  },
}
