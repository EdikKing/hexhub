<template>
  <div
      v-on:mousedown="down"
      v-show="dragData.x"
      ref="dragView"
      class="fixed-drag-view"
      :style="`top: ${dragData.y}px;left: ${dragData.x}px;`"
  >
    <slot name="default">
    </slot>
  </div>
</template>

<script lang="ts">
import {nextTick, onMounted, onUnmounted, reactive, ref} from "vue";
import lodash from "lodash";
const margin = 15;

export default {
  name: "FixedDragView",
  props: {
  },
  setup(props,ctx){
    const dragView = ref<HTMLElement>()
    const dragData = reactive({
      x: <number>null,
      y: 75,
      downX: 0,
      downY: 0,
      width: 0,
      height: 0,
      drag: false,
    })

    onMounted(()=>{
      if(process.client){
        dragData.x = window.innerWidth - 125
        nextTick(init)
        window.addEventListener("resize", onResize);
      }
    })

    onUnmounted(()=>{
      if(process.client){
        window.removeEventListener("resize", onResize);
      }
    })

    const init = ()=>{
      const rect = dragView.value.getBoundingClientRect();
      dragData.width =  rect.width
      dragData.height = rect.height
    };
    const down = (event:MouseEvent)=>{
      //排除右键点击
      if(event.button!==0){
        return
      }
      event.stopPropagation()
      event.preventDefault()
      window.addEventListener("mousemove",move)
      window.addEventListener("touchmove",move)
      window.addEventListener("mouseup",end)
      window.addEventListener("touchend",end)

      dragData.drag = true;
      dragData.downX = event.pageX - dragData.x
      dragData.downY = event.pageY - dragData.y
    }
    const end = (event:MouseEvent)=>{
      if(dragData.drag){
      event.stopPropagation()
      event.preventDefault()
      window.removeEventListener("mousemove",move)
      window.removeEventListener("touchmove",move)
      window.removeEventListener("mouseup",end)
      window.removeEventListener("touchend",end)
    }
      dragData.drag =false;
    }
    const move = (event:MouseEvent|TouchEvent)=>{
      if(dragData.drag) {
        event.stopPropagation()
        event.preventDefault()
        if (event instanceof TouchEvent) {
          const touch = event.touches[0]
          dragData.x = touch.pageX - dragData.downX
          dragData.y = touch.pageY - dragData.downY
        }else{
          dragData.x = event.pageX - dragData.downX
          dragData.y = event.pageY - dragData.downY
        }

        dragData.x = Math.max(margin,Math.min(dragData.x,window.innerWidth - margin - dragData.width))
        dragData.y = Math.max(margin,Math.min(dragData.y,window.innerHeight - margin - dragData.height))
      }
    }

    const onResize = lodash.throttle(()=>{
      dragData.x = Math.min(dragData.x,window.innerWidth - margin - dragData.width)
      dragData.y = Math.min(dragData.y,window.innerHeight - margin - dragData.height)
    }, 250,{trailing:true,leading:false})


    return {
      dragData,dragView,
      down,onResize
    }
  }
}
</script>

<style scoped lang="scss">
  .fixed-drag-view{
    position: fixed;
    z-index: 5;
  }
</style>