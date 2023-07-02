import * as FloatingVue from "floating-vue";
const {VTooltip,Dropdown} = FloatingVue

import {defineNuxtPlugin} from "nuxt/app";
import 'floating-vue/dist/style.css'
import lodash from "lodash";


export default defineNuxtPlugin((nuxtApp) => {
    nuxtApp.vueApp.directive('drag', {
        mounted: function (el:HTMLElement, binding, vnode, prevVNode){
            let currentEl = el;
            let parentSelector = binding.value
            if(parentSelector){
                let p = currentEl.parentElement
                while (p){
                    if(p.matches(parentSelector)){
                        currentEl = p
                        break
                    }
                    p = p.parentElement
                }
            }
            el.style.cursor = "move"
            const dragData = {
                x:0,
                y:0,
                downX:0,
                downY:0,
            }
            el.addEventListener("mousedown",function (evt) {
                //排除右键点击
                if(evt.button!==0){
                    return
                }
                const target = (<HTMLElement>evt.target)
                if(window.getComputedStyle(target,null).cursor != "move" || target.matches("input,button,[tabindex]")){
                    return;
                }
                evt.stopPropagation()
                evt.preventDefault()

                dragData.downX = evt.pageX - dragData.x
                dragData.downY = evt.pageY - dragData.y
                const rect = currentEl.getBoundingClientRect()
                const wRadius = rect.width / 2;
                const hRadius = rect.height / 2;
                const xOffset = rect.x - dragData.x
                const yOffset = rect.y - dragData.y
                const onMove = function (evt:MouseEvent){
                    evt.stopPropagation()
                    evt.preventDefault()

                    dragData.x = evt.pageX - dragData.downX
                    dragData.y = evt.pageY - dragData.downY

                    dragData.x = Math.max(-xOffset-wRadius,Math.min(dragData.x,document.body.clientWidth-xOffset+wRadius-rect.width))
                    dragData.y = Math.max(-yOffset,Math.min(dragData.y,document.body.clientHeight-yOffset+hRadius-rect.height))

                    // currentEl.style.transform = `translate(${dragData.x}px, ${dragData.y}px)`
                    currentEl.style.setProperty('transform', `translate(${dragData.x}px, ${dragData.y}px)`, 'important');
                }
                const onUp = function (){
                    evt.stopPropagation()
                    evt.preventDefault()
                    window.removeEventListener("mousemove",onMove)
                    window.removeEventListener("mouseup",onUp)
                }
                window.addEventListener("mousemove",onMove)
                window.addEventListener("mouseup",onUp)
            })
        },
        beforeUnmount: function (el, binding, vnode, prevVNode){

        },
    })
})


