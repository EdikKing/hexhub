<template>
  <div :class="`small-check-box ${color?'text-'+color:''} ${disabled?'disabled':''}`" :style="style" :tabindex="tabindex"  v-ripple v-on:click="onClick" v-on:keydown.enter="onClick">
    <v-icon :style="`opacity: ${modelValue?0:1}`"  icon="mdi-checkbox-blank-outline"></v-icon>
    <v-icon :style="`opacity: ${modelValue?1:0}`" :color="color" icon="mdi-checkbox-marked"></v-icon>
  </div>
</template>

<script lang="ts">
import {ref, watch} from "vue";

export default {
  name: "SmallCheckbox",
  props: {
    modelValue: {
      type: Boolean
    },
    disabled: {
      type: Boolean,
      default: false
    },
    color: {
      type: String,
      default: null
    },
    style: {},
    tabindex:{
      type: [String,Number],
      default: 0,
    }
  },
  emits: ['update:modelValue'],
  setup(props,ctx){
    const modelValue = ref(props.modelValue)

    watch(()=>props.modelValue,(v)=>{
      modelValue.value = v
    })

    const onClick = ()=>{
      modelValue.value = !modelValue.value
    }

    return {modelValue,onClick}
  }
}
</script>

<style lang="scss" scoped>
.small-check-box{
  border-radius: 4px;
  width: 22px;
  height: 22px;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  position: relative;
  box-sizing: border-box;
  &:focus{
    outline: none;
  }
  &:focus-visible{
    outline: 2px solid currentColor;
    outline-offset: -2px;
  }
  &.disabled{
    pointer-events: none;
    .v-icon{
      color: rgba(160,160,160,.95) !important
    }
  }
  .v-icon{
    cursor: pointer;
    font-size: 18px;
    transition: color .2s,opacity .35s, transition .2s;
    &:first-child{
      top: 50%;
      left: 50%;
      transform: translate(-50%,-50%);
      position: absolute;
    }
  }
}
</style>