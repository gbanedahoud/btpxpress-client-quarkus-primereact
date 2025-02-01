export default {
    plugins: {
        'postcss-import': {},
        'tailwindcss/nesting': {},
        tailwindcss: {},
        autoprefixer: {
            flexbox: 'no-2009',
        },
        ...(process.env.NODE_ENV === 'production' ? { cssnano: {} } : {})
    },
}