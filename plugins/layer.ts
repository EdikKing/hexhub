import {defineNuxtPlugin} from "nuxt/app";
import {init,Toast,Prompt,Confirm,FileCoverConfirm} from "~/lib/layer";

export default defineNuxtPlugin((nuxtApp) => {
    init(nuxtApp.vueApp)
    return {
        provide: {
            "toast":Toast.show,
            "error":Toast.error,
            "info":Toast.info,
            "warn":Toast.warn,
            "success":Toast.success,
            "prompt":Prompt.open,
            "confirm":Confirm.open,
            "fileCoverConfirm":FileCoverConfirm.open
        }
    }

})