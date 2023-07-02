<template>
  <div ref="textEditorContainer" class="fill-height" v-on:keydown="onKeydown" v-on:contextmenu.stop.prevent="openMenu" v-show="show">
    <div style="position: absolute;width: 100%;z-index: 2">
      <v-progress-linear color="primary" :active="loading" :indeterminate="progress >= 100 && loading" :query="true" :model-value="progress"></v-progress-linear>
    </div>
    <fixed-drag-view  v-if="loaded && formattable">
      <v-btn icon="mdi-code-json" size="small" v-on:click="format"></v-btn>
    </fixed-drag-view>
    <code-editor ref="codeEditor" @handleReady="onHandleReady" :extensions="extensions" v-model="text" v-if="loaded"></code-editor>
    <v-row class="fill-height" justify="center" align-content="center"  align="center" no-gutters v-else>
      <v-progress-circular color="primary" size="150" indeterminate>LOADING...</v-progress-circular>
    </v-row>
  </div>

</template>

<script lang="ts">
import {ref, getCurrentInstance, watch, nextTick, onUnmounted, onMounted} from 'vue'
import {Confirm, ContextMenu, Prompt, Toast} from '~~/lib/layer';
import {getFileExt} from '~~/lib/util/common';
import {StreamLanguage} from "@codemirror/language";
import lodash from 'lodash';
import CodeEditor from "~/components/editor/CodeEditor.vue";
import FixedDragView from "~/components/common/FixedDragView.vue";
import { api } from '~~/apis/client/base';
import { MD5 } from 'crypto-js';
import {EditorState} from "@codemirror/state";
import {EditorView} from "codemirror";
import * as clipboard from "clipboard-polyfill";

//支持格式化的文件
const FormattableExts = new Set(["sql","css","html","js","json","xml","svg"])

export default {
  props:{
    url: {
      type: String
    },
    show: {
      type: Boolean,
      default: true
    },
    changed: {
      type: Boolean,
      default: false,
    }
  },
  components: {
    FixedDragView,
    CodeEditor,
  },
  emits: ["update:changed"],
  setup(props,ctx) {
    const instance = getCurrentInstance()
    const proxy = <any>instance.proxy

    let codeInstance = <{state:EditorState,view:EditorView}>null

    let changed = false;
    const codeEditor = ref()
    const text = ref("")
    const extensions = []
    const loaded = ref(false)
    const progress = ref(0)
    const loading = ref(false)
    const langSupportMap = new Map<string,()=>Promise<any>>()
    const formattable = ref(false)
    let fileExt = null
    let md5 = ""

    const initSupportMap =()=> {
      langSupportMap.set("java", async () => (await import("@codemirror/lang-java")).java())
      langSupportMap.set("sql", async () => (await import("~/thirdparty/codemirror/lang-sql")).sql())

      const html = async () => (await import("@codemirror/lang-html")).html()
      langSupportMap.set("html", html)
      langSupportMap.set("xhtml", html)

      const css = async () => (await import("@codemirror/lang-css")).css()
      langSupportMap.set("css", css)
      langSupportMap.set("scss", css)
      langSupportMap.set("less", css)

      const js = async () => (await import("@codemirror/lang-javascript")).javascript()
      langSupportMap.set("js", js)
      langSupportMap.set("ts", js)

      const cpp = async () => (await import("@codemirror/lang-cpp")).cpp()
      langSupportMap.set("c", cpp)
      langSupportMap.set("cpp", cpp)

      langSupportMap.set("php", async () => (await import("@codemirror/lang-php")).php())
      langSupportMap.set("json", async () => (await import("@codemirror/lang-json")).json())

      const xml = async () => (await import("@codemirror/lang-xml")).xml()
      langSupportMap.set("xml", xml)
      langSupportMap.set("svg", xml)

      const md = async () => (await import("@codemirror/lang-markdown")).markdown()
      langSupportMap.set("md", md)
      langSupportMap.set("markdown", md)

      langSupportMap.set("rs", async () => (await import("@codemirror/lang-rust")).rust())

      langSupportMap.set("lua", async ()=> StreamLanguage.define((await import("@codemirror/legacy-modes/mode/lua")).lua))

      langSupportMap.set("py", async ()=> StreamLanguage.define((await import("@codemirror/legacy-modes/mode/python")).python))


      const sh = async ()=> StreamLanguage.define((await import("@codemirror/legacy-modes/mode/shell")).shell)
      langSupportMap.set("sh", sh)
      langSupportMap.set("shell", sh)
      langSupportMap.set("bat", sh)

      const yaml = async ()=> StreamLanguage.define((await import("@codemirror/legacy-modes/mode/yaml")).yaml)
      langSupportMap.set("yaml", yaml)
      langSupportMap.set("yml", yaml)

      langSupportMap.set("conf", async ()=> StreamLanguage.define((await import("@codemirror/legacy-modes/mode/nginx")).nginx))

      langSupportMap.set("sass", async ()=> StreamLanguage.define((await import("@codemirror/legacy-modes/mode/sass")).sass))
      langSupportMap.set("cmake", async ()=> StreamLanguage.define((await import("@codemirror/legacy-modes/mode/cmake")).cmake))
      langSupportMap.set("dockerfile", async ()=> StreamLanguage.define((await import("@codemirror/legacy-modes/mode/dockerfile")).dockerFile))
      langSupportMap.set("toml", async ()=> StreamLanguage.define((await import("@codemirror/legacy-modes/mode/toml")).toml))
      langSupportMap.set("rb", async ()=> StreamLanguage.define((await import("@codemirror/legacy-modes/mode/ruby")).ruby))
      langSupportMap.set("pl", async ()=> StreamLanguage.define((await import("@codemirror/legacy-modes/mode/perl")).perl))

    }
    initSupportMap()

    const openMenu = async (evt: MouseEvent) => {
      const selection = codeInstance.view.state.selection.main
      const selectStr = codeInstance.view.state.doc.sliceString(selection.from, selection.to)
      let copyText = null
      try {
        copyText = await clipboard.readText()
      } catch (e) {

      }
      await ContextMenu.open(evt, [
        {
          type: "title",
          title: proxy.$t('common.operate'),
        },
        {type: "line"},
        {
          type: "item",
          title: "刷新",
          icon: "mdi-refresh",
          click: () => {
            if (changed) {
              Confirm.open("确认是否刷新", "将导致已修改内容丢失").then(() => {
                getContent()
              })
            } else {
              getContent()
            }
          },
        },
        {
          type: "item",
          title: proxy.$t('common.copy'),
          icon: "mdi-content-copy",
          disabled: !selectStr,
          click: () => {
            clipboard.writeText(selectStr).then(() => {
            }).catch(err => {
              console.log(err)
              Toast.error(proxy.$t('common.copy-failed'))
            });
          },
        },
        {
          type: "item",
          title: proxy.$t('common.cut'),
          icon: "mdi-content-cut",
          disabled: selectStr === null || selectStr === '' || codeInstance === null,
          click: () => {
            const spec = codeInstance.view.state.replaceSelection("")
            codeInstance.view.dispatch(spec)
            clipboard.writeText(selectStr).then(() => {
            }).catch(err => {
              console.log(err)
              Toast.error(proxy.$t('common.copy-failed'))
            });
          }
        },
        {
          type: "item",
          title: proxy.$t('common.paste'),
          icon: "mdi-content-paste",
          disabled: codeInstance === null || copyText === null || copyText === "",
          click: () => {
            const spec = codeInstance.view.state.replaceSelection(copyText)
            codeInstance.view.dispatch(spec)
          }
        },
        {
          type: "item",
          title: "保存",
          icon: "mdi-content-save-outline",
          click: saveContent,
        },
      ], 140)
    }

    const resize = ()=>{
      if(props.show){
        codeEditor.value.resize()
      }
    }

    const format = async () => {
      try {

        switch (fileExt) {
          case "sql":
            //sql格式化，使用懒加载模式，防止首次进入页面等待过长
            text.value = (await import("sql-formatter")).format(text.value)
            break
          case "svg":
          case "xml":
            const xmlFormat = (await import("xml-formatter")).default
            text.value = xmlFormat(text.value)
            break
          case "json":
            //检查json格式
            JSON.parse(text.value)
            const json_beautify = (await import("js-beautify")).js_beautify
            text.value = json_beautify(text.value)
            break
          case "js":
            const js_beautify = (await import("js-beautify")).js_beautify
            text.value = js_beautify(text.value)
            break
          case "css":
            const css_beautify = (await import("js-beautify")).css_beautify
            text.value = css_beautify(text.value)
            break
          case "html":
            const html_beautify = (await import("js-beautify")).html_beautify
            text.value = html_beautify(text.value)
            break
        }
      }catch (e){
        Toast.error(e.message)
      }
    }

    const getContent = async ()=>{
      if(!props.url){
        return
      }
      loading.value = true
      await api.request({
        method: 'get',
        url: props.url,
        responseType: "blob",
        baseURL: "",
        // 下载进度
        onDownloadProgress: (progressEvent) => {
          progress.value = (progressEvent.loaded / progressEvent.total) * 100
        },
      }).then(async r => {
        const data = <Blob>r.data
        const dataText = await data.text()
        md5 = MD5(dataText).toString()
        if(!loaded.value){
          try {
            const contentDisposition = r.headers["content-disposition"]
            const lastIdx = contentDisposition.lastIndexOf("filename=")
            let fileName = ""
            if(lastIdx !== -1){
              fileName = decodeURIComponent(contentDisposition.substring(lastIdx+9,contentDisposition.length))
            }
            //解析文件类型
            fileExt = getFileExt(fileName).toLowerCase()
            formattable.value = FormattableExts.has(fileExt)
            if(fileExt){
              const func = langSupportMap.get(fileExt)
              if(func){
                const result = await func()
                extensions.push(result)
              }
            }
          }catch (err){
            console.log("err",err)
          }
          loaded.value = true
        }

        text.value = dataText
        loaded.value = true
        loading.value = false
      }).catch(res => {
        console.log("res", res)
        Toast.error(res?.response?.data?.message?res.response.data.message:res?.message)
        loading.value = false
      });
    }

    const saveContent = lodash.throttle(()=>{
      if(!props.url){
        return
      }
      const form = new FormData()
      loading.value = true
      const textValue = text.value
      const blob = new Blob([textValue])
      form.append("file",blob)
      api.request({
        method: 'post',
        data: form,
        url: props.url,
        baseURL: "",
        // 上传进度
        onUploadProgress: (progressEvent) => {
          progress.value = (progressEvent.loaded / progressEvent.total) * 100
        },
      }).then(()=>{
        Toast.info(proxy.$t("common.save-success"))
        md5 = MD5(textValue).toString()
        changed = false
        ctx.emit("update:changed",false)
      }).catch(res => {
        console.log("res", res)
        Toast.error(res?.response?.data?.message?res.response.data.message:res?.message)
      }).finally(() => {
        loading.value = false
      });
    },1000)

    const onResize = lodash.debounce(()=>{
      if(props.show){
        nextTick(resize)
      }
    },500)

    getContent()

    const onKeydown = (evt:KeyboardEvent)=>{
      if(evt.metaKey || evt.ctrlKey){
        if(evt.key.toLowerCase() == "s"){
          saveContent()
          evt.stopPropagation()
          evt.preventDefault()
        }
      }
    }

    const onHandleReady = (payload:{state:EditorState,view:EditorView})=>{
      codeInstance = payload
    }

    const checkChanged = lodash.debounce((str)=>{
      const currentMd5 = MD5(str).toString()
      const isChanged = md5 !== null && md5 !== currentMd5
      if(isChanged !== changed){
        changed = isChanged
        ctx.emit("update:changed",changed)
      }
    },500,{leading:true})

    watch(()=>text.value,checkChanged)

    watch(()=>props.show,(s)=>{
      if(s){
        nextTick(()=>{
          codeEditor.value.resize()
        })
      }
    })


    onMounted(()=>{
      window.addEventListener("resize",onResize)
    })

    onUnmounted(()=>{
      window.removeEventListener("resize",onResize)
    })


    return {
      formattable,
      codeEditor,
      progress,
      loading,
      text,
      extensions,
      loaded,
      onHandleReady,
      resize,
      onKeydown,
      format,
      openMenu
    }
  }
}
</script>

<style lang="scss">
</style>