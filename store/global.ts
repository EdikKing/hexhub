import { defineStore } from 'pinia'
import {persistedState} from "#imports";

export const useCurrentTheme = defineStore({
    id: "theme",
    state: () => {
        return ({
            mode: <"auto"|"dark"|"light">"auto",
        })
    },
    actions: {
        switchMode(){
            switch (this.mode) {
                case "auto":
                    this.mode = "dark"
                    break
                case "dark":
                    this.mode = "light"
                    break
                case "light":
                    this.mode = "auto"
                    break
            }
        }
    },
    persist: {
        storage: persistedState.localStorage,
    },
})


