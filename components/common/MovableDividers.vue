<template>
  <div ref="root" :class="rootClass">
    <div ref="first" :style="firstStyle" class="movable-body first" v-show="data.showFirst && (showSingle === null || showSingle === 'first')">
      <slot name="first" v-if="data.loaded"></slot>
    </div>

    <div
        ref="divider"
        class="divider"
        :style="dividerStyle"
        v-on:mousedown="down"
        v-on:touchstart.passive="down"
        v-show="showSingle === null"
        v-on:drop.prevent
        v-on:dragenter.prevent
        v-on:dragover.prevent>
      <v-icon v-if="dividerSize >= 8" :icon="vertical?'mdi-drag-horizontal':'mdi-drag-vertical'"></v-icon>
    </div>

    <div ref="last" :style="lastStyle" class="movable-body last" v-show="data.showLast && (showSingle === null || showSingle === 'last')">
      <slot name="last" v-if="data.loaded"></slot>
    </div>
  </div>
</template>

<script lang="ts">

import {PropType} from "#app/compat/capi";
import {nextTick, onMounted, reactive, ref, watch} from "vue";

export default {
  name: "MovableDividers",
  props: {
    initData: {
      type: Object as PropType<{size:string,slot:"first"|"last"}>,
    },
    showSingle: {
      type: String as PropType<"first"|"last"|null>,
      default: null
    },
    realTimeDrag: {
      type: Boolean,
      default: false
    },
    dividerSize: {
      type: Number,
      default: 12
    },
    vertical:{
      type: Boolean,
      default: ()=>{
        return false
      }
    },
    minSize:{
      type: Number,
      default: ()=>{
        return 25
      }
    }
  },
  emits: ["end"],
  setup(props,ctx){
    const rootClass = ref<string>(null)
    const firstStyle = ref<any>(null)
    const dividerStyle = ref<any>(null)
    const lastStyle = ref<any>(null)

    const first = ref<HTMLElement>()
    const last = ref<HTMLElement>()
    const root = ref<HTMLElement>()
    const divider = ref<HTMLElement>()
    const data = reactive({
      drag: false,
      loaded: false,
      showLast: true,
      showFirst: true,
    })

    let firstSizeValue = 0
    let lastSizeValue = 0
    let rootSizeValue = 0
    let firstProportion = .5
    let downX = 0
    let downY = 0
    let downFirstSizeValue = 0
    let downLastSizeValue = 0
    let maxSize = 0
    let isInit = false

    const init = (force=false)=>{
      if(isInit&&!force){
        return false
      }
      isInit = true
      //是否只显示单个
      const showSingle = props.showSingle
      //是否垂直，否则为水平
      const isVertical = props.vertical
      rootClass.value = isVertical ? "movable-dividers vertical" : "movable-dividers horizontal";
      const initData = props.initData
      //初始化大小
      let firstSize;
      let lastSize;
      let lastOffset;
      let dividerOffset;
      let dividerSize;
      if(showSingle){
        if(showSingle === "first"){
          firstSize = "100%"
          lastSize = "0"
          lastOffset = "0"
          dividerOffset = "0"
          dividerSize = "0"
        }else{
          firstSize = "0"
          lastSize = "100%"
          lastOffset = "0"
          dividerOffset = "0"
          dividerSize = "0"
        }
      }else {
        dividerSize = `${props.dividerSize}px`
        if (initData) {
          if (initData.slot === "first") {
            firstSize = initData.size
            lastSize = `calc(100% - ${dividerSize} - ${firstSize})`
            lastOffset = `calc(${firstSize} + ${dividerSize})`
          } else {
            lastSize = initData.size
            firstSize = `calc(100% - ${dividerSize} - ${lastSize})`
            lastOffset = `calc(100% - ${lastSize})`
          }
          dividerOffset = firstSize
        } else {
          const halfSize = (props.dividerSize / 2 + "px")
          firstSize = `calc(50% - ${halfSize})`
          lastSize = firstSize
          lastOffset = `calc(50% + ${halfSize})`
          dividerOffset = firstSize
        }
      }

      //垂直只计算高度，水平只计算宽度
      if(isVertical){
        firstStyle.value = {
          height: firstSize,
        }
        lastStyle.value = {
          height: lastSize,
          top: lastOffset,
        }
        dividerStyle.value = {
          height: dividerSize,
          top: dividerOffset
        }
      }else{
        firstStyle.value = {
          width: firstSize,
        }
        lastStyle.value = {
          width: lastSize,
          left: lastOffset,
        }
        dividerStyle.value = {
          width: dividerSize,
          left: dividerOffset
        }
      }
      data.loaded = true

      nextTick(()=>{
        getSize()
        ctx.emit('end')
      })
      return true
    }

    const getSize = ()=>{
      if(props.vertical){
        firstSizeValue = first.value.clientHeight
        lastSizeValue = last.value.clientHeight
        rootSizeValue = root.value.clientHeight
      }else{
        firstSizeValue = first.value.clientWidth
        lastSizeValue = last.value.clientWidth
        rootSizeValue = root.value.clientWidth
      }
      maxSize = rootSizeValue - props.dividerSize
      firstProportion = firstSizeValue/(firstSizeValue+lastSizeValue)
    }

    const down = (event:MouseEvent)=>{
      //只有左键点击触发
      if(event.button === 0) {
        getSize()
        data.drag = true;
        // if(event instanceof TouchEvent){
        //   event = event.touches[0]
        // }
        downX = event.clientX
        downY = event.clientY

        downFirstSizeValue = firstSizeValue
        downLastSizeValue = lastSizeValue

        document.addEventListener("mousemove", move)
        document.addEventListener("mouseup", end)
        document.addEventListener("touchmove", move)
        document.addEventListener("touchend", end)
      }
    }
    const end = (event:MouseEvent)=>{
      document.removeEventListener("mousemove",move)
      document.removeEventListener("mouseup",end)
      document.removeEventListener("touchmove",move)
      document.removeEventListener("touchend",end)
      move(event)
      data.drag =false;
      if(!props.realTimeDrag) {
        //非实时拖动,鼠标松开才改变实际大小
        updateSize(true)
      }
      nextTick(()=>ctx.emit('end'))
    }
    const move = (event)=>{
      if(data.drag){
        event.preventDefault()
        event.stopPropagation()
        if(event instanceof TouchEvent){
          event = event.touches[0]
        }

        const x = event.clientX
        const y = event.clientY

        const isVertical = props.vertical
        if(isVertical){
          const diff = y - downY
          firstSizeValue = Math.min(downFirstSizeValue + diff, maxSize)
          lastSizeValue = Math.min(downLastSizeValue - diff, maxSize)
        }else{
          const diff = x - downX
          firstSizeValue = Math.min(downFirstSizeValue + diff, maxSize)
          lastSizeValue = Math.min(downLastSizeValue - diff, maxSize)
        }
        updateSize(props.realTimeDrag)
        return false;
      }
    }

    const onResize = ()=>{
      const firstRect = first.value.getBoundingClientRect();
      const lastRect = last.value.getBoundingClientRect();
      //如果为显示单侧模式, 或者两侧为大小都为0时则进入初始化大小方法
      const isZeroSize = props.vertical?(firstRect.height === 0 && lastRect.height === 0):(firstRect.width === 0 && lastRect.width === 0)
      if(props.showSingle || isZeroSize){
        if(init(isZeroSize)){
          return
        }
      }
      const isVertical = props.vertical
      const rootSize = isVertical ? root.value.clientHeight : root.value.clientWidth
      const dividerSize = props.dividerSize
      const rootAvailableSize = rootSize - dividerSize
      firstSizeValue = rootAvailableSize * firstProportion
      lastSizeValue = rootAvailableSize - firstSizeValue

      nextTick(()=>{
        updateSize(true)
        ctx.emit('end')
      })
    }

    const updateSize = (isRealMove:boolean)=>{
      const isVertical = props.vertical
      const minSize = props.minSize

      if(firstSizeValue <= minSize){
        firstSizeValue = 0
        data.showFirst = false
      }else{
        data.showFirst = true
      }
      if(lastSizeValue <= minSize){
        lastSizeValue = 0
        data.showLast = false
      }else{
        data.showLast = true
      }

      const dividerSize = props.dividerSize
      const dividerSizeStr = `${dividerSize}px`
      const firstSizeStr = `${firstSizeValue}px`

      if(isRealMove){
        if(isVertical){
          firstStyle.value = {
            height: firstSizeStr,
          }
          lastStyle.value = {
            height: `${lastSizeValue}px`,
            top: `${firstSizeValue+dividerSize}px`,
          }
          dividerStyle.value = {
            height: dividerSizeStr,
            top: firstSizeStr
          }
        }else{
          const firstSizeStr = `${firstSizeValue}px`
          firstStyle.value = {
            width: firstSizeStr,
          }
          lastStyle.value = {
            width: `${lastSizeValue}px`,
            left: `${firstSizeValue+dividerSize}px`,
          }
          dividerStyle.value = {
            width: dividerSizeStr,
            left: firstSizeStr
          }
        }
      }else{
        if(isVertical){
          dividerStyle.value = {
            height: dividerSizeStr,
            top: firstSizeStr
          }
        }else{
          dividerStyle.value = {
            width: dividerSizeStr,
            left: firstSizeStr
          }
        }
      }
      firstProportion = firstSizeValue/(firstSizeValue+lastSizeValue)
    }

    watch(()=>props.showSingle,()=>{
      nextTick(()=>init(true))
    })

    watch(()=>[props.initData, props.dividerSize,props.minSize],(v)=>{
      nextTick(init)
    },{deep:true,immediate:true})

    return {
      rootClass,firstStyle,lastStyle,dividerStyle,
      first,last,divider,root,data,
      down,move,end,onResize
    }
  },
}
</script>

<style lang="scss" scoped>
.movable-dividers{
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
  .movable-body{
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    &.first{
    }
    &.last{
    }
  }
  .divider{
    position: absolute;
    z-index: 5;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    width: 100%;
    top: 0;
    left: 0;
    &::after {
      content: '';
      position: absolute;
      height: 100%;
      width: 100%;
      min-width: 8px;
      min-height: 8px;
    }
  }
  &.vertical{
    .divider{
      cursor: row-resize;
      background: #ADADAD6B;
    }
  }
  &.horizontal{
    .divider{
      cursor: col-resize;
      background: #ADADAD66;
    }
  }
}
</style>
