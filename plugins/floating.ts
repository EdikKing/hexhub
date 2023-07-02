import * as FloatingVue from "floating-vue";
const {VTooltip,Dropdown} = FloatingVue

import {defineNuxtPlugin} from "nuxt/app";
import 'floating-vue/dist/style.css'


export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive('tooltip', VTooltip)
// nuxtApp.vueApp.directive('close-popper', VClosePopper)

  FloatingVue.Dropdown.props = {theme: {type:String,default: "dark"}}
  nuxtApp.vueApp.component('VDropdown', Dropdown)
// nuxtApp.vueApp.component('VFloatingTooltip', Tooltip)
// nuxtApp.vueApp.component('VFloatingMenu', Menu)

})


