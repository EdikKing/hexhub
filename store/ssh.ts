import { defineStore } from 'pinia'
import {persistedState} from "#imports";

export const useSshListSort = defineStore({
    id: "ssh-list-sort",
    state: () => {
        return ({
            key: <"name"|"host"|"user"|"created">"created",
            isAsc: true,
        })
    },
    actions: {
        setKey(key:"name"|"host"|"user"|"created"){
            this.key = key;
        },
        setIsAsc(isAsc:boolean){
            this.isAsc = isAsc;
        }
    },
    persist: {
        storage: persistedState.localStorage,
    },
})


