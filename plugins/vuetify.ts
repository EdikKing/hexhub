import {defineNuxtPlugin} from "nuxt/app";
import { createVuetify } from 'vuetify'

// Styles
// import '~/assets/vuetify.css'
import 'vuetify/styles'
import '~/assets/variables.scss'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
// Vuetify
// import {VBtn,VCard,VIcon,VDialog,VList,VItem,VAlert,VSnackbar,VAppBar,VTextField,VLayout,} from 'vuetify/components'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

export default defineNuxtPlugin((nuxtApp) => {
    const vuetify = createVuetify({
        // components:{VBtn,VCard,VIcon},
        components,
        directives,
        ssr: true,
        icons: {
            defaultSet: 'mdi',
            aliases,
            sets: {
                mdi,
            }
        },
        theme: {
            defaultTheme: "light",
            themes: {
                light: {
                    colors: {
                        background: '#ffffff',
                        surface: '#fefefe',
                        primary: "#1e88e5",
                        accent: "#424242",
                        secondary: "#ffe57f",
                        info: "#26a69a",
                        warning: "#ffa000",
                        error: "#d84315",
                        success: "#00d214",
                        'on-background': "#000",
                        'on-surface': "#111",
                        'on-primary': "#fefefe",
                        'on-secondary': "#111",
                        'on-success': "#fff",
                        'on-warning': "#fff",
                        'on-error': "#eee",
                        'on-info': "#fff",
                    },
                    dark: false,
                    variables: {},
                },
                dark: {
                    colors: {
                        background: '#111',
                        surface: '#212121',
                        primary: "#82b1ff",
                        accent: "#eee",
                        secondary: "#ffe082",
                        info: "#00897b",
                        warning: "#EF6C00",
                        error: "#B71C1C",
                        success: "#689f38",
                        'on-background': "#eee",
                        'on-surface': "#ddd",
                        'on-primary': "#eee",
                        'on-secondary': "#fff",
                        'on-success': "#eee",
                        'on-warning': "#eee",
                        'on-error': "#eee",
                        'on-info': "#fff",
                    },
                    dark: true,
                    variables: {},
                }
            },
        },
    })
    nuxtApp.vueApp.use(vuetify)
})