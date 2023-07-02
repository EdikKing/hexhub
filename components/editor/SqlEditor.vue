<template>
  <div class="fill-height">
    <code-editor ref="sqlEditor" :extensions="extensions" v-model="modelValue" @handleReady="$emit('handleReady',$event)"></code-editor>
  </div>

</template>

<script lang="ts">
import {ref, watch, shallowRef} from 'vue'
import CodeEditor from "~/components/editor/CodeEditor.vue";
import {sql,SQLConfig,MySQL,SQLDialect} from "~/thirdparty/codemirror/lang-sql"
import {PropType} from "#app/compat/capi";

export {
  SQLDialect,
  MySQL,
}

export default {
  props:{
    sqlConf: {
      type: Object as PropType<SQLConfig>
    },
    modelValue:{
      type: String
    }
  },
  components: {
    CodeEditor,
  },
  emits:["update:modelValue","handleReady"],
  setup(props,ctx) {
    const sqlEditor = ref()
    const modelValue = ref(props.modelValue)
    const extensions = shallowRef([sql(props.sqlConf)])

    watch(()=>props.modelValue,(val)=>{
      modelValue.value = val
    })
    watch(()=>modelValue.value,(val)=>{
      ctx.emit("update:modelValue",val)
    })
    watch(()=>props.sqlConf,()=>{
      extensions.value = [sql(props.sqlConf)]
    })

    const resize = ()=>{
      sqlEditor.value.resize()
    }

    const focus = ()=>{
      sqlEditor.value.focus()
    }

    return {
      modelValue,
      extensions,
      sqlEditor,
      resize,
      focus
    }

  }
}
</script>

<style lang="scss">
</style>
