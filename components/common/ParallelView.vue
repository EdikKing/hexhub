<template>
  <div class="parallel-view" ref="root" v-on:dragenter.stop.prevent="onDragenter" v-on:dragleave.stop.prevent="onDragleave" v-on:dragover.stop.prevent="onDragover" v-on:drop.stop.prevent="onDrop">
    <movable-dividers v-bind="modeBinds[modelValue.mode]">
      <template #first>
        <template v-if="modelValue.first instanceof ParallelViewItem">
          <parallel-view v-model="modelValue.first">
            <slot></slot>
          </parallel-view>
        </template>
        <template v-else-if="modelValue.first">
          <slot></slot>
        </template>
      </template>
      <template #last>
        <template v-if="modelValue.last instanceof ParallelViewItem">
          <parallel-view v-model="modelValue.last">
            <slot></slot>
          </parallel-view>
        </template>
        <template v-else-if="modelValue.last">
          <slot></slot>
        </template>
      </template>
    </movable-dividers>
    <div :class="`virtual-view ${virtualViewData.mode}`" v-if="virtualViewData.show"></div>
  </div>
</template>

<script lang="ts">
import MovableDividers from "~/components/common/MovableDividers.vue";
import {ref} from "vue";
import {PropType} from "#app/compat/capi";

export class ParallelViewItem{
  mode: "single"|"vertical"|"horizontal"
  first: ParallelViewItem | any
  last: ParallelViewItem | any

  constructor(mode: "single"|"vertical"|"horizontal",first: ParallelViewItem | any,last: ParallelViewItem | any){
    this.mode = mode
    this.first = first
    this.last = last
  }
}

const modeBinds = Object.freeze({
  "single": {
    dividerSize: 1,
    realTimeDrag: false,
    vertical: false,
    showSingle: "first",
  },
  "vertical": {
    dividerSize: 1,
    realTimeDrag: false,
    vertical: true,
    showSingle: null,
  },
  "horizontal": {
    dividerSize: 1,
    realTimeDrag: false,
    vertical: false,
    showSingle: null,
  }
})

export default {
  name: "ParallelView",
  components: {MovableDividers},
  props: {
    modelValue: {
      type: Object as PropType<ParallelViewItem>,
      default: ()=>{
        return new ParallelViewItem("single", new Date(), null)
      }
    }
  },
  setup(props,ctx){
    const virtualViewData = ref({
      show: false,
      mode: <"left"|"right"|"bottom"|"top">"left"
    })
    const root = ref<HTMLElement>()
    let rootRect:DOMRect;

    const onDragenter = (evt:DragEvent)=>{
      const relatedTarget = <HTMLElement>evt.relatedTarget
      if(relatedTarget?.parentElement=== null || (<HTMLElement>evt.currentTarget).contains(relatedTarget) || virtualViewData.value.show){
        return
      }

      rootRect = root.value.getBoundingClientRect()
      virtualViewData.value.show = true
    }

    const onDragleave = (evt:DragEvent)=>{
      const relatedTarget = <HTMLElement>evt.relatedTarget
      if(relatedTarget?.parentElement=== null || (<HTMLElement>evt.currentTarget).contains(relatedTarget)){
        return
      }
      virtualViewData.value.show = false
    }


    const onDrop = (evt:DragEvent)=>{
      virtualViewData.value.show = false
      const mode = virtualViewData.value.mode
      if(props.modelValue.mode === "single"){
        switch (mode) {
          case "bottom":
            props.modelValue.mode = "vertical";
            props.modelValue.first = new ParallelViewItem("single",props.modelValue.first ?? props.modelValue.last,null)
            props.modelValue.last = new ParallelViewItem("single",new Date(),null)
            break
          case "top":
            props.modelValue.mode = "vertical";
            props.modelValue.last = new ParallelViewItem("single",props.modelValue.first ?? props.modelValue.last,null)
            props.modelValue.first = new ParallelViewItem("single",new Date(),null)
            break
          case "left":
            props.modelValue.mode = "horizontal";
            props.modelValue.first = new ParallelViewItem("single",props.modelValue.first ?? props.modelValue.last,null)
            props.modelValue.last = new ParallelViewItem("single",new Date(),null)
            break
          case "right":
            props.modelValue.mode = "horizontal";
            props.modelValue.last = new ParallelViewItem("single",props.modelValue.first ?? props.modelValue.last,null)
            props.modelValue.first = new ParallelViewItem("single",new Date(),null)
            break
        }
      }

    }

    const onDragover = (evt:DragEvent)=>{
      if(!virtualViewData.value.show){
        return
      }
      //根据宽高比例进行换算,使四个方向不会因为宽高比例不同产生权重不同
      const aspectRatio = rootRect.width / rootRect.height
      const x = evt.clientX - rootRect.x
      const y = (evt.clientY - rootRect.y) * aspectRatio
      const width = rootRect.width
      const height = rootRect.height * aspectRatio
      const halfWidth = width / 2
      const halfHeight = height / 2

      //4个方向的xy坐标
      const pos = [[0,halfHeight,"left"],[width,halfHeight,"right"],[halfWidth,0,"top"],[halfWidth,height,"bottom"]]
      const currPos = [x,y]
      //计算距离当前鼠标坐标最近的方向
      virtualViewData.value.mode = <any>pos.sort((a, b) => {
        const adx = Math.abs(currPos[0] - <number>a[0]);
        const ady = Math.abs(currPos[1] - <number>a[1]);
        const aDis = Math.sqrt(Math.pow(adx, 2) + Math.pow(ady, 2));

        const bdx = Math.abs(currPos[0] - <number>b[0]);
        const bdy = Math.abs(currPos[1] - <number>b[1]);
        const bDis = Math.sqrt(Math.pow(bdx, 2) + Math.pow(bdy, 2));
        return aDis - bDis
      })[0][2]
    }

    return {
      virtualViewData,root,modeBinds,ParallelViewItem,
      onDragenter,onDragleave,onDrop,onDragover
    }
  }
}
</script>

<style lang="scss" scoped>
  .parallel-view{
    position: relative;
    width: 100%;
    height: 100%;
    .virtual-view{
      position: absolute;
      z-index: 1;
      top: 0;
      left: 0;
      background: rgba(104,161,249,0.15);
      pointer-events: none;
      &.left{
        width: 50%;
        height: 100%;
        left: 0;
        top: 0;
        right: unset;
        bottom: unset;
      }
      &.right{
        width: 50%;
        height: 100%;
        top: 0;
        right: 0;
        left: unset;
        bottom: unset;
      }
      &.top{
        width: 100%;
        height: 50%;
        left: 0;
        top: 0;
        right: unset;
        bottom: unset;
      }
      &.bottom{
        width: 100%;
        height: 50%;
        left: 0;
        bottom: 0;
        right: unset;
        top: unset;
      }
    }
  }
</style>