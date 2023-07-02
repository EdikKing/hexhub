// https://v3.nuxtjs.org/api/configuration/nuxt.config
import {defineNuxtConfig} from "nuxt/config";


export default defineNuxtConfig(<any>{
    ssr: false,
    sourcemap: {
        server: false,
        client: false
    },
    app: {
        head: {
            titleTemplate: 'Hexhub',
            title: 'Hexhub',
            htmlAttrs: {
                lang: 'zh'
            },
            meta: [
                { charset: 'utf-8' },
                { name: 'viewport', content: 'width=device-width, initial-scale=1' },
                { name: 'description', content: 'Hexhub 在线ssh/sftp工具' },
                { name: 'keywords', content: 'Hexhub ssh webssh 在线ssh 在线sftp sftp shell 终端' },
                { name: 'format-detection', content: 'telephone=no' },
                { name: 'referrer', content: 'unsafe-url' }
            ],
            link: [
                // { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
                { rel: 'icon', type: "image/png", sizes: '16x16', href: '/favicon/favicon-16x16.png' },
                { rel: 'icon', type: "image/png", sizes: '32x32', href: '/favicon/favicon-32x32.png' },
                { rel: 'icon', type: "image/png", sizes: '48x48', href: '/favicon/favicon-48x48.png' },
                { rel: 'icon', type: "image/png", sizes: '96x96', href: '/favicon/favicon-96x96.png' },
                { rel: 'icon', type: "image/png", sizes: '192x192', href: '/favicon/favicon-192x192.png' },
            ],
            script: [
                {
                    src: 'https://at.alicdn.com/t/c/font_3620092_e3lsaio1v9d.js'
                }
            ],
        },
    },
    css: ['@mdi/font/css/materialdesignicons.min.css'],
    build: {
        transpile: ['vuetify'],
    },
    nitro: {
        prerender: {
            routes: ['/'],
        },
    },
    pwa: {
        registerType: 'autoUpdate',
        manifest: {
            name: 'Hexhub',
            short_name: 'Hexhub',
            theme_color: '#ffffff',
            icons: [
                {
                    src: '/favicon/favicon-192x192.png',
                    sizes: '192x192',
                    type: 'image/png',
                },
                {
                    src: '/favicon/favicon-512x512.png',
                    sizes: '512x512',
                    type: 'image/png',
                },
                {
                    src: '/favicon/favicon-512x512.png',
                    sizes: '512x512',
                    type: 'image/png',
                    purpose: 'any maskable',
                },

            ],
        },
        workbox: {
            navigateFallback: '/',
            globPatterns: ['**/*.{js,css,html,png,jpg,svg,ico}'],
        },
        client: {
            installPrompt: true,
            periodicSyncForUpdates: 20,
        },
        devOptions: {
            enabled: false,
            type: 'module',
        },
    },
    modules: [
        '@pinia/nuxt',
        '@pinia-plugin-persistedstate/nuxt',
        '@vite-pwa/nuxt',
    ]
})
