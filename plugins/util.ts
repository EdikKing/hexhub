import {defineNuxtPlugin} from "nuxt/app";
import {dateFormat,fileSizeConvert} from "~/lib/util/common";

export default defineNuxtPlugin((/* nuxtApp */) => {
  return {
    provide: {
      dateFormat,
      fileSizeConvert
    }
  }
})