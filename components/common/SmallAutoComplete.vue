<template>
  <select-popup
      v-model:shown="show"
      :items="items"
      :filter="autoCompleteFilter"
      :value-key="valueKey"
      :label-key="valueKey"
      :icon-key="iconKey"
      :disabled-key="disabledKey"
      :children-key="childrenKey"
      :title="title"
      :multiple="multiple"
      :width="width"
      :min-width="width"
      :max-width="width"
      :hide-triggers="['hover','focus']"
      :popper-triggers="['hover','focus']"
      :triggers="['click']"
      :delay="{show:0,hide:250}"
      :model-value="modelValue"
      @update:modelValue="$emit('update:modelValue',$event)"
  >
    <template #default="{}">
      <slot name="default">
        <div class="small-auto-complete" :style="style">
          <simple-input
              :color="color"
              :model-value="modelValue"
              @update:modelValue="$emit('update:modelValue',$event)"
              v-on:focusin="show = true"></simple-input>
          <v-icon :color="color" icon="mdi-chevron-down" size="small" :class="show?'showing':''"></v-icon>
        </div>
      </slot>
    </template>
  </select-popup>
</template>

<script lang="ts">
import SimpleInput from "~/components/common/SimpleInput.vue";
import SelectPopup from "~/components/common/SelectPopup.vue";
import {ref, watch} from "vue";
import {PropType} from "#app/compat/capi";
export default {
  name: "SmallAutoComplete",
  components: {SelectPopup, SimpleInput},
  props: {
    color:{},
    style:{},
    title: {
      type: String,
    },
    modelValue:{
      type: [Object,Number,Array,String]
    },
    items: {
      type: Array as PropType<Array<any>>,
      default: [],
    },
    filter: {
      type: [String,Function as PropType<(item:any)=>boolean>],
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
  },
  emits: ["update:modelValue"],
  setup(props,ctx){
    const show = ref(false)
    const modelValue = ref(props.modelValue)

    const autoCompleteFilter = (item:any)=>{
      if(props.filter){
        return props.filter(item)
      }
      const valueStr = props.modelValue
      if(valueStr){
        if(props.items.findIndex((item)=>{
          return props.valueKey(item) == valueStr
        }) >= 0){
          return true;
        }
        return props.valueKey(item).includes(valueStr)
      }else{
        return true
      }
    }

    watch(()=>props.modelValue,(v)=>{
      modelValue.value = v
    })

    return {show,modelValue,autoCompleteFilter}
  }
}
</script>

<style lang="scss" scoped>
.small-auto-complete{
  display: flex;
  align-items: center;
  .v-icon{
    transition: .2s background-color,.2s color,.2s transform;
    &.showing{
      transform: rotateX(180deg) translateY(1px);
    }
  }
}
</style>