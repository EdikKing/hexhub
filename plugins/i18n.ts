import { createI18n } from 'vue-i18n/dist/vue-i18n.cjs.js'
import {defineNuxtPlugin} from "nuxt/app";
import en from "~/locales/en";
import zh from "~/locales/zh";

export default defineNuxtPlugin(({ vueApp }) => {
    const i18n = createI18n({
        legacy: false,
        locale: 'zh',
        messages: {
            en: en,
            zh: zh
        }
    })
    vueApp.use(i18n)
})