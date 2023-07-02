<template>
  <div class="simple-select" v-on:focusin="show=true" v-on:focusout="show=false">
    <select-popup
        :triggers="[]"
        :hide-triggers="[]"
        :popper-triggers="[]"
        :shown="show"
        :title="title"
        :filter="filter"
        :items="items"
        :placement="placement"
        :disabled-key="disabledKey"
        :label-key="labelKey"
        :value-key="valueKey"
        :children-key="childrenKey"
        :icon-key="iconKey"
        :multiple="multiple"
        :width="width"
        :max-width="maxWidth"
        :min-width="minWidth"
        :model-value="modelValue"
        @update:modelValue="$emit('update:modelValue',$event)">
      <div class="select-label-text" autofocus tabindex="0">
        {{modelValue}}
      </div>
      <div class="icon-tag">
        <v-icon icon="mdi-chevron-down"></v-icon>
      </div>
    </select-popup>
  </div>
</template>

<script lang="ts">
import {PropType} from "#app/compat/capi";
import SimpleInput from "~/components/common/SimpleInput.vue";
import SelectPopup from "~/components/common/SelectPopup.vue";
import {ref} from "vue";

export default {
  name: "SimpleSelect",
  components: {SelectPopup, SimpleInput},
  emits: ['update:modelValue'],
  props: {
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
  },
  setup(props,ctx){
    const show = ref(false)

    return {show}
  }
}
</script>

<style lang="scss" scoped>
  .simple-select{
    .select-label-text{

    }
    .icon-tag{
      pointer-events: none;
    }
  }
</style>