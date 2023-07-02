import {defineNuxtPlugin} from "nuxt/app";
import {init} from "~/lib/client/plugin"

export default defineNuxtPlugin((nuxtApp) => {
    init()
})