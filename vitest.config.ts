import { defineConfig } from 'vite'
import Vue from '@vitejs/plugin-vue/'
import vuetify from 'vite-plugin-vuetify'
import path from 'path'

export default defineConfig({
    plugins: [Vue(),vuetify()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, ''),
        },
    },
    build: {
        manifest: true,
        ssrManifest: true,

        // cssCodeSplit: true,
        // modulePreload: {
        //     polyfill: true,
        // }
    }
})