<template>
  <input
      ref="input"
      :value="value"
      :style="style"
      :class="clazz"
      :placeholder="placeholder"
      :tabindex="tabindex"
      :type="type"
      :onkeyup="onkeyup"
      :autofocus="autofocus"
      v-on:input="onChange"
      draggable="true"
      v-on:dragstart.stop.prevent
  >
</template>

<script lang="ts">
import {ref, watch,defineComponent} from "vue";

export default defineComponent({
  name: "SimpleInput",
  props: {
    autofocus: {

    },
    style: {
      type: [String,Object]
    },
    color: {
      type: String
    },
    class: {
      type: [String,Array]
    },
    type: {

    },
    tabindex: {

    },
    placeholder: {

    },
    modelValue: {

    },
    onkeyup: {

    },
  },
  emits: ["update:modelValue"],
  setup(props,ctx){
    const input = ref<HTMLInputElement>()
    const value = ref(props.modelValue)
    const clazz = ref(props.class)

    watch(()=>props.modelValue,(v)=>{
      value.value = v
    })

    watch(()=>[props.class,props.color],(arr)=>{
      if(!props.class){
        if(props.color){
          clazz.value = `text-${props.color}`
        }
      }if(typeof props.class === "string"){
        if(props.color){
          clazz.value = `${props.class} text-${props.color}`
        }
      }else if (props.class instanceof Array){
        if(props.color){
          const mClass = [...props.class]
          mClass.push(`text-${props.color}`)
          clazz.value = mClass
        }else{
          clazz.value = props.class
        }
      }
    },{immediate:true,deep:true})

    const onChange = (evt:InputEvent)=>{
      const v = <HTMLInputElement>evt.target
      ctx.emit("update:modelValue",v.value)
    }

    const focus = ()=>{
      input.value.focus()
    }

    return {value,clazz,input,onChange,focus}
  }
})
</script>

<style lang="scss" scoped>
  input{
    outline: none;
    padding: 0 2px;
    &:focus{
      outline: none;
    }
  }
</style>