<template>
  <div ref="codeEditorContainer" class="code-editor-container" :style="style" >
    <codemirror
        v-if="show"
        ref="codemirror"
        :style="{height: `${height}px`,outline:'none!important'}"
        :model-value="modelValue"
        @update:modelValue="updateValue"
        :autofocus="true"
        auto-destroy
        :indent-with-tab="true"
        :tab-size="2"
        :extensions="extensions"
        @ready="handleReady"
        :phrases="phrases"
      />
  </div>
</template>

<script lang="ts">
import {onMounted, ref, shallowRef, getCurrentInstance, watch, nextTick} from 'vue'
import {Codemirror} from 'vue-codemirror'
import {oneDark} from '@codemirror/theme-one-dark'
import {useTheme} from 'vuetify'
import {EditorState, SelectionRange} from "@codemirror/state";
import {EditorView} from "codemirror";

const phrasesKeys = [
  "Control character",
  "Selection deleted",
  "Folded lines",
  "Unfolded lines",
  "to",
  "folded code",
  "unfold",
  "Fold line",
  "Unfold line",
  "Go to line",
  "go",
  "Find",
  "Replace",
  "next",
  "previous",
  "all",
  "match case",
  "by word",
  "replace",
  "replace all",
  "close",
  "current match",
  "replaced $ matches",
  "replaced match on line $",
  "on line",
  "Completions",
  "Diagnostics",
  "No diagnostics",
  "regexp"
]

export default {
  props:{
    modelValue: {
      type: String
    },
    extensions: {
      type: Array,
      default: [],
    },
    style: {
      type: [String,Object],
      default: "",
    }
  },
  components: {
    Codemirror
  },
  emits:["handleReady","update:modelValue"],
  setup(props,ctx) {
    const theme = useTheme()
    const extensions = shallowRef([])
    const show = ref(false)
    const codemirror = ref()
    const modelValue = ref(props.modelValue)
    const codeEditorContainer = ref<HTMLElement>()
    const instance = getCurrentInstance()
    const proxy = <any>instance.proxy
    const phrases={}
    phrasesKeys.forEach(key=>{
      phrases[key] = proxy.$t(`codemirror.${key}`)
    })
    const height = ref(0)

    const handleReady = (payload:{state:EditorState,view:EditorView}) => {
      //首次加载将输入光标移至末尾
      const end = payload.state.doc.length
      payload.view.dispatch({selection: {anchor: end,head:end}})
      ctx.emit("handleReady",payload)
    }

    watch(()=>props.extensions,(exts)=>{
      exts = [...exts]
      if(theme.global.name.value === "dark"){
        exts.push(oneDark)
      }
      extensions.value = exts
      show.value = false
      nextTick(()=>{
        show.value = true
      })
    },{immediate: true})

    watch((()=>props.modelValue),(val)=>{
      modelValue.value = val
    })

    const updateValue = (v)=>{
      ctx.emit("update:modelValue",v)
    }

    const resize = ()=>{
      height.value = codeEditorContainer.value.clientHeight
    }

    const focus = ()=>{
      nextTick(()=>{
        const input = <HTMLElement>(<HTMLElement>codemirror.value.$el).querySelector("div[contenteditable=true]")
        if(input){
          input.focus()
          //将光标移动到最后
          const range = document.createRange();
          range.selectNodeContents(input);
          range.collapse(false);
          const selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
        }
      })
    }

    onMounted(()=>{
      resize()
    })

    return {
      show,
      codeEditorContainer,
      codemirror,
      height,
      extensions,
      modelValue,
      phrases,
      updateValue,
      handleReady,
      resize,
      focus,
    }
  }
}
</script>

<style lang="scss">
.v-theme--dark{
  .code-editor-container{
    background: #000;
  }
}

.code-editor-container{
  padding: 1px;
  height: 100%;
  div,ul{
    font-size: 14px;
    font-family: "JetBrainsMono", sans-serif!important;
  }
}
</style>