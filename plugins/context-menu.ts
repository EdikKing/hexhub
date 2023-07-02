import {defineNuxtPlugin} from "nuxt/app";
import ContextMenu from "~/lib/layer/context-menu";


export default defineNuxtPlugin((nuxtApp) => {
    let contextmenuListener = null

    nuxtApp.vueApp.directive("context-menu",{
        created(el:HTMLElement, binding, vnode) {
            contextmenuListener = async (evt:MouseEvent)=>{
                const menu = binding.value.menu
                if(menu!=null){
                    evt.preventDefault()
                    let menuVal = menu;
                    if(menu instanceof Function){
                        menuVal = menu(el,binding,vnode)
                    }
                    if(menuVal instanceof Promise){
                        menuVal.then((menu=>{
                            ContextMenu.open(evt,menu,binding.value.width??200).finally(()=>{
                                binding.value.close?.call()
                            }).catch(e=>{})
                        }))
                    }else{
                        ContextMenu.open(evt, menuVal, binding.value.width ?? 200).finally(()=>{
                            binding.value.close?.call()
                        }).catch(e=>{})
                    }
                }
            }
            el.addEventListener("contextmenu",contextmenuListener)
        },
        unmounted(el:HTMLElement, binding, vnode){
            el.removeEventListener("contextmenu",contextmenuListener)
        },
    })
})