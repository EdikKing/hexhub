<template>
  <div :style="style">
    <div ref="jsonEditorContainer" class="json-editor-container">
      <div class="btn-group">
        <v-btn-toggle color="primary" variant="outlined" divided>
          <v-btn icon="mdi-code-json" size="small" value="format" v-on:click="format"></v-btn>
          <v-btn icon="mdi-code-braces" size="small" value="compress" v-on:click="compress"></v-btn>
        </v-btn-toggle>
      </div>
      <code-editor ref="codeEditor" :extensions="extensions" :model-value="value" @update:modelValue="updateValue"></code-editor>
    </div>
  </div>
</template>

<script lang="ts">
import {ref, getCurrentInstance, watch} from 'vue'
import CodeEditor from "~/components/editor/CodeEditor.vue";
import pkg from "js-beautify"
const { js_beautify } = pkg;
import {json} from "@codemirror/lang-json"
import { Toast } from '~~/lib/layer';

export default {
  props:{
    modelValue: {
      type: String,
    },
    style: {
      type: [String,Object],
    }
  },
  components: {
    CodeEditor,
  },
  emits: ["update:modelValue"],
  setup(props,ctx) {
    const instance = getCurrentInstance()
    const proxy = <any>instance.proxy
    const codeEditor = ref()
    const value = ref(props.modelValue)
    const extensions = [json()]

    const updateValue=(v)=>{
      if(v!=value.value){
        ctx.emit("update:modelValue",v)
      }
    }

    const resize = ()=>{
      codeEditor.value.resize()
    }

    const format = async () => {
      try {
        //检查json格式
        JSON.parse(value.value)
        updateValue(js_beautify(value.value))
      }catch (e){
        Toast.error(e.message)
      }
    }

    const compress = ()=>{
      try {
        updateValue(JSON.stringify(JSON.parse(value.value)))
      }catch (e){
        Toast.error(e.message)
      }
    }

    watch(()=>props.modelValue,(v)=>{
      value.value = v
    })

    return {
      codeEditor,
      value,
      extensions,
      resize,
      format,
      compress,
      updateValue
    }
  }
}
</script>

<style lang="scss">
.json-editor-container{
  height: 100%;
  position: relative;
  .btn-group{
    position: absolute;
    z-index: 2;
    right: 25px;
    bottom: 25px;
    opacity: .7;
    .v-btn-group{
      height: 35px;
    }
  }
}

</style>