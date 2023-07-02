<template>
  <div style="max-height: 100vh;height: 100vw;position: relative;display: flex;flex-direction: column">
    <div>
      <flex-tabs
          ref="tabs"
          style="flex: 1 1 30px"
          @onDragMoveOut="openNew($event.item.url,$event.item.label,$event.x,$event.y)"
          @onNewWindow="openNew($event.url,$event.label)"
          @onClone="newTab($event.url,$event.label)"
          :close-confirm="onCloseConfirm"
          v-model="showIdx"
          v-model:items="editingFiles">
      </flex-tabs>
    </div>
    <div style="flex: 1 1 calc(100% - 30px);overflow: hidden;">
      <template v-for="(file,idx) in editingFiles" :key="file.id">
        <text-editor :url="file.url" :show="idx === showIdx" @update:changed="file.iconColor=$event?'warning':undefined"></text-editor>
      </template>
    </div>
  </div>
</template>

<script lang="ts">
import {ref, onUnmounted, watch, onMounted, nextTick} from 'vue'
import TextEditor from "~/components/editor/OnlineTextEditor.vue";
import lodash from 'lodash';
import FlexTabs, {FlexTab} from "~/components/common/FlexTabs.vue";
import { v4 as uuidv4 } from 'uuid';
import { useRoute } from 'nuxt/app';
import {Confirm} from "~/lib/layer";

let currentEditorWindow = <Window>null;

const open = (fileUrl:string,title?:string)=>{
  if(currentEditorWindow && !currentEditorWindow.closed){
    currentEditorWindow.postMessage({url:fileUrl,title:title})
    currentEditorWindow.focus()
  }else{
    openNew(fileUrl,title)
  }
}

const openNew = (fileUrl:string,title?:string,x?:number,y?:number)=>{
  const left = x ?? ((window.screen.width - 960) / 2)
  const top = y ?? ((window.screen.height - 720) / 2)
  let jumpUrl = `/editor?url=${encodeURIComponent(fileUrl)}&title=${encodeURIComponent(title)}`
  currentEditorWindow = window.open(jumpUrl, title, `toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=yes, copyhistory=no, width=960, height=720, left=${left}, top=${top}`)
  currentEditorWindow.focus()
}

export {open,openNew}

export default {
  name: "editor",
  components: {FlexTabs, TextEditor},
  setup(props) {
    const route = useRoute()

    const textEditor = ref()
    const editingFiles = ref<FlexTab[]>([])
    const showIdx = ref(0)

    const newTab = (url:string,filename:string)=>{
      const files = editingFiles.value
      lodash.delay(()=>{
        document.title = filename
      },500)

      const idx = files.findIndex((item)=>item.url === url)
      //编辑同一个文件不打开新编辑
      if(idx === -1){
        showIdx.value = files.length
        files.push(<FlexTab>{url:url,label: filename,icon:'mdi-content-save-outline',id: uuidv4()})
      }else{
        showIdx.value = idx
      }
    }

    const onCloseConfirm = (item:FlexTab)=>{
      if(item.iconColor === "warning"){
        return Confirm.open("确认是否关闭", "将导致已修改内容丢失")
      }else{
        return Promise.resolve()
      }
    }

    const onMessage = (evt:MessageEvent)=>{
      const data = evt.data;
      newTab(data.url,data.title);
    }

    if(process.client){
      window.onbeforeunload = function (evt){
        if(editingFiles.value.some((item)=>item.iconColor === 'warning')){
          const msg = "存在未保存的文件,请确认是否退出"
          evt.returnValue = msg
          return msg
        }
      }

      watch(()=>[showIdx.value,editingFiles.value.length],(v)=>{
        if(v[1]>0){
          document.title = editingFiles.value[v[0]].label
        }else{
          window.close()
        }
      })

      onMounted(()=>{
        const fileUrl = <string>route.query.url
        const filename = <string>route.query.title
        newTab(fileUrl,filename);
      })

      window.addEventListener("message", onMessage)
      onUnmounted(()=>{
        window.removeEventListener("message",onMessage)
      })
    }
    return {
      editingFiles,
      textEditor,
      showIdx,
      onCloseConfirm,
      openNew,
      newTab,
    }
  }
}
</script>

<style scoped>

</style>