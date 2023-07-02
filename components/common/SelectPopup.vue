<template>
  <v-dropdown
      :disabled="disabled"
      :theme="theme.global.name.value"
      :placement="placement"
      :delay="delay"
      :triggers="triggers"
      :popper-triggers="popperTriggers"
      :hide-triggers="hideTriggers"
      :shown="shown && items.length > 0"
      :auto-hide="autoHide"
      :container="container"
      :handleResize="false"
      @update:shown="$emit('update:shown',$event)"
      @apply-show="onShow"
      @apply-hide="$emit('applyHide',$event)"
  >
    <template #default="{shown,show,hide}">
      <div class="fill-height" ref="defaultSlot" v-on:keydown="onkeydown">
        <slot name="default" :value="value" :show="show" :hide="hide" :shown="shown"></slot>
      </div>
    </template>

    <template #popper>
      <select-view
          @onContextItem="(evt,item)=>$emit('onContextItem',evt,item)"
          :style="`${width?'width:'+width:''};${minWidth?'min-width:'+minWidth:''};${maxWidth?'max-width:'+maxWidth:''}`"
          ref="selectView"
          :filter="filter"
          :value-key="valueKey"
          :label-key="labelKey"
          :icon-key="iconKey"
          :items="items"
          :title="title"
          :multiple="multiple"
          @clickItem="autoHide?$emit('update:shown',false):null"
          :model-value="modelValue"
          @update:modelValue="$emit('update:modelValue',$event)">
      </select-view>
    </template>
  </v-dropdown>
</template>

<script lang="ts">
import {PropType} from "nuxt/dist/app/compat/capi";
import {nextTick, reactive, ref, watch, onMounted} from "vue";
import SelectView from "~/components/common/SelectView.vue";
import {useTheme} from "vuetify";

export default {
  name: "SelectPopup",
  components: {SelectView},
  props:{
    title: {
      type: String,
    },
    modelValue:{
      type: [Object,Number,Array,String]
    },
    items: {
      type: [Array,Function as PropType<()=>any[]>],
      default: [],
    },
    filter: {
      type: [String,Function as PropType<(item:any)=>boolean>]
    },
    labelKey: {
      type: [String,Function as PropType<(item:any)=>string>],
      default: ()=>(item)=>item
    },
    valueKey: {
      type: [String,Function as PropType<(item:any)=>string>],
      default: ()=>(item)=>item
    },
    iconKey: {
      type: [String,Function as PropType<(item:any)=>string>],
      default: null
    },
    childrenKey:  {
      type: [String,Function as PropType<(item:any)=>null|undefined|false|any[]>],
      default: null
    },
    disabledKey: {
      type: [String,Function as PropType<(item:any)=>string>],
      default: null
    },
    disabled: {
      type: Boolean
    },
    multiple:{
      type: Boolean,
      default: false
    },
    width: {
      type: String,
      default: "auto",
    },
    minWidth: {
      type: String,
      default: "80px"
    },
    maxWidth: {
      type: String,
    },
    placement: {
      type: String as PropType<'auto'|'auto-start'|'auto-end'|'top'|'top-start'|'top-end'|'right'|'right-start'|'right-end'|'bottom'|'bottom-start'|'bottom-end'|'left'|'left-start'|'left-end'>,
      default: "bottom"
    },
    delay: {
      type: Object,
      default: {show: 0,hide: 350}
    },
    triggers: {
      type: Array as PropType<Array<"click"|"focus"|"hover"|"touch">>,
      default: ["click"]
    },
    popperTriggers: {
      type: Array as PropType<Array<"click"|"focus"|"hover"|"touch">>,
      default: ["hover"]
    },
    hideTriggers: {
      type: Array as PropType<Array<"click"|"focus"|"hover"|"touch">>,
    },
    shown: {
      type: Boolean,
    },
    autoHide: {
      type: Boolean,
      default: false
    },
    container: {}
  },
  emits: ["applyShow","applyHide","update:modelValue","update:shown","onContextItem"],
  setup(props, ctx){
    const selectView = ref()
    const value = ref<any>(null)
    const modelValue = ref(props.modelValue)
    const theme = useTheme()
    const shown = ref(props.shown)

    const getChildren = (item:any)=>{
      const key = props.childrenKey
      if(!key){
        return null
      }
      if(typeof key === 'string'){
        return item[key]
      }else{
        return key(item)
      }
    }

    const getValue = (item:any)=>{
      const key = props.valueKey
      if(typeof key === 'string'){
        return item[key]
      }else{
        return key(item)
      }
    }

    const onUpdateValue = (value,items:any[])=>{
      if(value!==null&&value!==undefined){
        if(props.multiple){
          const arr = []
          const valSet = new Set(value)
          for (const item of items) {
            const children = getChildren(item)
            if(children){
              for (const subItem of children) {
                const val = getValue(subItem)
                if(valSet.has(val)){
                  arr.push(subItem)
                }
              }
            }else{
              const val = getValue(item)
              if(valSet.has(val)){
                arr.push(item)
              }
            }
          }
          value.value = arr
        }else{
          for (const item of items) {
            const children = getChildren(item)
            if(children){
              for (const subItem of children) {
                const val = getValue(subItem)
                if(val === value){
                  value.value = subItem
                  return
                }
              }
            }else{
              const val = getValue(item)
              if(val === value){
                value.value = item
                return
              }
            }
          }
        }
      }
    }

    const onkeydown = (evt:KeyboardEvent)=>{
      switch (evt.key){
        case "ArrowUp":
          if(selectView.value?.cursorUp()){
            evt.stopPropagation()
            evt.preventDefault()
          }
          break
        case "ArrowDown":
          if(selectView.value?.cursorDown()){
            evt.stopPropagation()
            evt.preventDefault()
          }
          break
        case "Enter":
          if(selectView.value?.selectCursor()){
            evt.stopPropagation()
            evt.preventDefault()
          }
          break
      }
    }

    const onShow = (evt)=>{
      ctx.emit('applyShow',evt)
      if(props.items instanceof Function){
        selectView.value.updateItems(props.items);
      }
    }

    watch(()=>props.shown,(s)=>{
      shown.value = s
    })

    watch(()=>props.modelValue,(v)=>{
      modelValue.value = v
      let items = props.items
      if(items instanceof Function){
        items = items()
      }
      if(items instanceof Promise){
        items.then((items)=>{
          onUpdateValue(value,items)
        })
      }else{
        onUpdateValue(value,items)
      }
    },{immediate: true})

    return {
      shown,
      theme,
      selectView,
      modelValue,
      value,
      onkeydown,
      onShow,
    }
  }
}
</script>

<style scoped lang="scss">
</style>