<template>
    <v-layout :class="data.showServerInfo?'my-container expand':'my-container'">
      <client-only>
        <div class="ssh-tooltip">

<!--          <div class="tooltip-btn" @click="switchShowServerInfo" :disabled="disabled">-->
<!--&lt;!&ndash;              <v-btn variant="text" density="compact" size="small" :icon="data.showServerInfo?'mdi-menu-open':'mdi-menu'"></v-btn>&ndash;&gt;-->
<!--          </div>-->
          <div class="tooltip-tabs">
            <flex-tabs
                ref="tabs"
                @onDragMoveOut="doOpenNewWindow($event.x,$event.y,$event.item.label,$event.item.url)"
                @onNewWindow="newWindow([$event])"
                @onClone="doCloneTab([$event])"
                v-model="data.tabIdx"
                v-model:items="tabItems">
            </flex-tabs>
          </div>

          <div style="border-right-width: 1px;padding-right: 4px" class="tooltip-item"  @click="switchShowServerInfo" v-show="!data.showServerInfo && data.tabIdx > 0">
            <server-info-summary :rpc="selectItem?.sshRpc" :ready="!data.showServerInfo && data.tabIdx > 0 && (selectItem?.connected ?? false)"></server-info-summary>
          </div>

          <div class="tooltip-btn tooltip-item hover-rotation" :disabled="disabled">
            <select-popup
                :disabled="disabled"
                :triggers="['hover']"
                :hide-triggers="['click','hover']"
                title="快捷命令"
                :items="quickCmdList"
                label-key="name"
                :value-key="item=>item"
                max-width="400px"
                min-width="150px"
                placement="bottom-end"
                :model-value="null"
                @onContextItem="doRightClickQuickCmd"
                @update:modelValue="doExecQuickCmd"
                @apply-show="updateQuickCmd"
                :delay="{show: 0,hide: 250}">
              <v-icon v-on:click="doOpenQuickCmdCreator" density="compact" size="small" icon="mdi-shape-square-plus" v-ripple.circle></v-icon>
            </select-popup>
          </div>
          <div class="tooltip-btn tooltip-item" v-on:click="currentTheme.switchMode">
            <v-icon density="compact" size="small" :icon="ThemeIcons[currentTheme.mode]" v-ripple.circle></v-icon>
          </div>
          <div class="tooltip-btn tooltip-item" :disabled="disabled">
            <v-menu :close-on-content-click="true" content-class="bar-menu" :disabled="disabled">
              <template v-slot:activator="{ props }">
                <v-icon variant="text" density="compact" size="small" v-bind="props" icon="mdi-cog-outline" v-ripple.circle></v-icon>
              </template>
              <v-list subheader width="280px" :rounded="0">
                <v-list-subheader>SCP</v-list-subheader>
                <v-list-item @click="selectItem?.component.term.openScpUpload()" :title="$t('ssh.scp-upload')" :subtitle="$t('ssh.scp-upload-hint')"></v-list-item>
                <v-list-item @click="selectItem?.component.term.openScpDownload()" :title="$t('ssh.scp-download')" :subtitle="$t('ssh.scp-download-hint')"></v-list-item>
                <v-list-subheader>SFTP</v-list-subheader>
                <v-list-item class="pl-0" :active="selectItem?.showSftp" :title="$t('ssh.show-sftp')" :subtitle="$t('ssh.show-sftp-hint')" @click="selectItem?selectItem.showSftp=!selectItem.showSftp:null">
                  <template v-slot:prepend="{ isActive }">
                    <v-checkbox :model-value="isActive"></v-checkbox>
                  </template>
                </v-list-item>
                <v-list-item class="pl-0" :disabled="!selectItem?.showSftp" :active="data.syncTermPath" :title="$t('ssh.listen-path')" :subtitle="$t('ssh.listen-path-hint')" @click="data.syncTermPath=!data.syncTermPath">
                  <template v-slot:prepend="{ isActive }">
                    <v-checkbox :disabled="!selectItem?.showSftp" :model-value="isActive"></v-checkbox>
                  </template>
                </v-list-item>
                <v-list-subheader>设置</v-list-subheader>
                <v-list-item class="pl-0" :active="selectItem?.bell" title="声音" subtitle="是否启用终端警铃" @click="selectItem?selectItem.bell=!selectItem.bell:null">
                  <template v-slot:prepend="{ isActive }">
                    <v-checkbox :model-value="isActive"></v-checkbox>
                  </template>
                </v-list-item>
              </v-list>
            </v-menu>
          </div>
        </div>

        <server-info-widget v-if="data.showServerInfo" v-model="data.showServerInfo" :rpc="selectItem?.sshRpc" :ready="selectItem?.connected ?? false"></server-info-widget>

        <div style="display: flex;justify-content: center;align-items: center;height: 100%" v-if="disabled">
          <ssh-list
              v-model:loading="sshLoading"
              @open="doOpenTerm"
              @openExec="(ids,cmd)=>doOpenTermExec(ids,cmd)"
              @openNewLabel="doOpenTerm($event,true)"
              @openNewWindow="newWindowById">
          </ssh-list>
        </div>
          <template v-for="(item,idx) in tabItems" :key="item.id">
            <ssh-mix
                v-if="idx >= 1"
                :ref="(com)=>item.component = com"
                :model-value="data.tabIdx === idx"
                :bell="item.bell"
                :conf-id="item.confId"
                :ftp-only-show-remote="data.showServerInfo"
                :sync-term-path="data.syncTermPath"
                :show-sftp="item.showSftp"
                @onNewTerminal="newWindow([item])"
                @onSshConnected="onSshConnected(item)"
                @onSshDisconnect="onSshDisconnect(item)"
                @update:sshRpc="item.sshRpc = $event"
                @closeWindow="tabs.doClose(idx,item)">
            </ssh-mix>
          </template>

        <plugin-starter plugin-id="remote-control" @pluginConnected="init"></plugin-starter>
        <ssh-file-sync-history :rpc="basicRpc" v-show="tabItems.length > 1" @onTaskSucceed="onTaskSucceed"></ssh-file-sync-history>
        <ssh-quick-cmd-editor ref="quickCmdEditor"></ssh-quick-cmd-editor>
      </client-only>
    </v-layout>

</template>

<script lang="ts">
import SshMix from "~/components/ssh/SshMix.vue";
import ServerInfoWidget from "~/components/ssh/ServerInfoWidget.vue";
import ServerInfoSummary from "~/components/ssh/ServerInfoSummary.vue";
import FlexTabs, {FlexTab} from "~/components/common/FlexTabs.vue";

import {nextTick, onMounted, onUnmounted, reactive, ref, shallowRef, watch} from "vue";
import {useRoute} from "vue-router"
import Rpc from '~~/lib/rpc'
import lodash from "lodash";
import {useCurrentTheme} from "~/store/global";
import PluginStarter from "~/components/client/PluginStarter.vue";
import SshList from "~/components/ssh/SshList.vue";
import {TypeShell} from "~/components/ssh/SshTerminal.vue";
import SshFileSyncHistory from "~/components/ssh/SshFileSyncHistory.vue";
import {genApiUrl} from "~/apis/client/base";
import {SyncType} from "~~/components/file/FileSyncHistory.vue";
import AssetConfigService from "~/db/service/asset-config-service";
import {SshConfModel} from "~~/db/model/ssh-conf-model";
import SelectPopup from "~/components/common/SelectPopup.vue";
import QuickCmdEditor from "~/components/ssh/QuickCmdEditor.vue";
import {AssetConfModel, AssetType} from "~/db/model/asset-conf-model";
import {Confirm} from "~/lib/layer";
import ContextMenu from "~/lib/layer/context-menu";
import Prompt from "~/lib/layer/prompt";


interface SshTab extends FlexTab{
  confId?: string
  connected?: boolean
  showSftp: boolean
  bell: boolean
  component?: any
  sshRpc?: Rpc
  execCmd?: string
}

const ThemeIcons = Object.freeze({
  auto: "mdi-theme-light-dark",
  dark: "mdi-brightness-2",
  light: "mdi-brightness-7"
})

export default {
  name: 'SshPage',
  components: {
    QuickCmdEditor,ServerInfoSummary,ServerInfoWidget,
    SelectPopup, SshFileSyncHistory, SshList, PluginStarter , FlexTabs,SshMix},
  setup(props,ctx){
    const service = AssetConfigService.getInstance()
    let queryIds

    const currentTheme = useCurrentTheme()

    const route = useRoute()
    const sshLoading = ref(true)
    const quickCmdEditor = ref()
    const data = reactive({
      tabIdx: 0,
      syncTermPath: true,
      showServerInfo: false,
    })

    const selectItem = ref<SshTab>(null)

    const tabs = ref()
    const tabItems = ref<SshTab[]>([
      <SshTab>{
        id: "列表",
        label: "列表",
        icon: "mdi-tab",
        sticky: true
      }
    ])
    const disabled = ref(true)
    const quickCmdList = ref<AssetConfModel<any>[]>([])

    const basicRpc = shallowRef<Rpc>()

    const newWindowById = async (ids: string[]) => {
      if(ids.length === 0){
        return
      }
      const x = (window.screen.width - 960) / 2
      const y = (window.screen.height - 720) / 2
      const items = await service.list(ids)
      doOpenNewWindow(x, y, items.map(item=>item.name).join("-"), `/ssh?id=${items.map(item=>item.id).join(",")}&tab=1`)
    }

    const doCloneTab = (items:SshTab[])=>{
      doOpenTerm(items.map((item)=>item.confId),true)
    }

    const newWindow = (items:SshTab[])=>{
      const x = (window.screen.width - 960) / 2
      const y = (window.screen.height - 720) / 2
      items.forEach((item)=>doOpenNewWindow(x,y,item.label,item.url))
    }

    const doOpenNewWindow = (x:number,y:number,title:string,url:string)=>{
      // Puts focus on the newWindow
      const newWindow = window.open(url, title, `toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=yes, copyhistory=no, width=960, height=720, left=${x}, top=${y}`)
      if (window.focus) {
        newWindow.focus()
      }
    };

    const doOpenTermExec = async (confIds: string[], execCmd:string=null) => {
      //如果末尾没有换行符添加换行符，使命令立即生效
      if(!execCmd.endsWith("\n")){
        execCmd = execCmd + "\n"
      }
      const tabItemsVal = tabItems.value
      let notSetShowIdx = true;
      for (const id of confIds) {
        let conf = await service.find<SshConfModel>(id)
        const idx = tabItemsVal.findIndex((item)=>item.confId == id && item.connected)
        if(idx != -1){
          if(notSetShowIdx){
            notSetShowIdx = false
            data.tabIdx = idx;
          }
          const item = tabItemsVal[idx]
          //如果已经有打开的连接,则直接使用该连接
          item.sshRpc.send(TypeShell, execCmd)
        }else{
          //否则打开新的连接执行
          let label = conf.name
          //判断是否有重名则在名字前加序号
          for (let i=2;tabItemsVal.some((item)=>item.label == label);i++){
            label = `${conf.name}-${i}`
          }
          tabItemsVal.push(<SshTab>{
            id: label,
            label: label,
            url: `/ssh?id=${conf.id}&tab=1`,
            icon: "mdi-console",
            confId: conf.id,
            connected: false,
            iconColor: "error",
            showSftp: conf.data.enableSftp,
            execCmd: execCmd,
          })
          if(notSetShowIdx){
            notSetShowIdx = false
            data.tabIdx = tabItemsVal.length-1;
          }
        }
      }
    }

    const doOpenTerm = async (confIds: string[], forceNewLabel=false,restIdx=true) => {
      let newConfIds = null
      const tabItemsVal = tabItems.value
      if (!forceNewLabel) {
        //去除重复已打开连接
        newConfIds = confIds.filter((id)=>!tabItemsVal.some((item)=>item.confId === id))
      }else{
        newConfIds = confIds
      }

      for (const id of newConfIds) {
        let conf = await service.find<SshConfModel>(id)
        if(conf){
          let label = conf.name
          //判断是否有重名则在名字前加序号
          for (let i=2;tabItemsVal.some((item)=>item.label == label);i++){
            label = `${conf.name}-${i}`
          }
          tabItemsVal.push(<SshTab>{
            id: label,
            label: label,
            url: `/ssh?id=${conf.id}&tab=1`,
            icon: "mdi-console",
            confId: conf.id,
            connected: false,
            iconColor: "error",
            showSftp: conf.data.enableSftp
          })
        }
      }
      //将显示标签页指向最后一个打开的标签
      if(forceNewLabel){
        if(restIdx){
          data.tabIdx = tabItemsVal.length - 1
        }
      }else{
        if(restIdx) {
          const lastId = confIds[confIds.length - 1]
          data.tabIdx = tabItemsVal.findIndex((item) => item.confId === lastId)
        }
      }
    }

    const doOpenQuickCmdCreator = ()=>{
      quickCmdEditor.value.openCreator(tabItems.value[data.tabIdx].confId).then(()=>{
        updateQuickCmd()
      });
    }

    const doRightClickQuickCmd = (evt:MouseEvent,item:AssetConfModel<any>)=>{
      evt.preventDefault();
      let sshId = tabItems.value[data.tabIdx].confId
      ContextMenu.open(
          evt,
    [
            {title:item.name,type:"title"},
            {type:"line"},
            {title:"重命名",type:"item",click:()=>{
                Prompt.open("重命名",item.name).then((newName)=>{
                  service.rename(item.id,newName)
                })
            }},
            {title:"编辑",type:"item",click:()=>{
                quickCmdEditor.value.openEditor(sshId,item.id).then(()=>{
                  updateQuickCmd()
                });
            }},
            {title:"删除",type:"item",click:()=>{
                Confirm.open("确认是否删除",`删除快捷命令[${item.name}]`).then(()=>{
                  service.del([item.id],AssetType.QuickCmd).then(()=>{
                    updateQuickCmd()
                  })
                })
              }},
          ],
          140,
      )
    }

    const doExecQuickCmd = (item:AssetConfModel<any>)=>{
      let cmd = item.description
      cmd = lodash.trimEnd(cmd,"\n")+"\n"
      tabItems.value[data.tabIdx].component.term.writeStr(cmd)
    }

    const updateQuickCmd = async () => {
      if(tabItems.value.length > 0){
        quickCmdList.value = await service.rootOrSubList(AssetType.QuickCmd, tabItems.value[data.tabIdx].confId)
      }
    }

    const switchShowServerInfo = ()=>{
      if(data.tabIdx === 0){
        data.showServerInfo = false
        return
      }
      data.showServerInfo = !data.showServerInfo
    }

    const onSshConnected = (item:SshTab)=>{
      item.iconColor = 'success';
      item.connected = true;
      if(item.execCmd){
        //发送命令
        item.sshRpc.send(TypeShell, item.execCmd)
        item.execCmd = undefined
      }
    }

    const onSshDisconnect = (item:SshTab)=>{
      item.iconColor = 'error';
      item.connected = false;
    }

    const onUpdateUrl = lodash.throttle(()=>{
      const items = tabItems.value
      const i = data.tabIdx
      if(i===0){
        if(data.showServerInfo){
          data.showServerInfo = false
        }
      }
      if(process.client){
        if(i <= 0 || i >= items.length ){
          document.title = "Hexhub-SSH"
        }else{
          document.title = `Hexhub-${items[i].label}`
        }
        const ids = items.filter(item=>item.confId).map(item=>item.confId).join(",")
        let url = "/ssh"
        if(ids || i){
          if(ids && i){
            url =`/ssh?id=${items.filter(item=>item.confId).map(item=>item.confId).join(",")}&tab=${i}`
          }else if(ids){
            url =`/ssh?id=${items.filter(item=>item.confId).map(item=>item.confId).join(",")}`
          }
        }
        history.replaceState(null,null,url)
      }
      if(i<items.length && i>=0){
        selectItem.value = items[i]
      }
    },250)

    const onTaskSucceed = lodash.throttle((evt)=>{
      selectItem.value?.component?.ftp.refresh(evt.type === SyncType.Upload)
    },1000)

    const onResize = lodash.debounce(()=>{
      tabs.value?.resize()
    },250)

    const init = ()=>{
      sshLoading.value = false
      let rpc = basicRpc.value
      if(!rpc){
        rpc = new Rpc(genApiUrl("ws", "remote-control", "basic"), 5000)
        rpc.open()
        basicRpc.value = rpc
      }else if(rpc && !rpc.isOpened()){
        rpc.open()
      }
      if(queryIds){
        doOpenTerm(queryIds.split(","),true,false)
        const idx = <string>route.query.tab
        if(idx){
          data.tabIdx = Number(idx)
        }
      }
    }

    watch(()=>[tabItems.value.length,data.tabIdx],()=>{
      disabled.value = data.tabIdx === 0;
      onUpdateUrl()
    },{deep: true})


    onMounted(()=>{
      queryIds = <string>route.query.id
      if(process.client){
        window.addEventListener("resize",onResize)
      }
    })

    if(process.client) {
      onUnmounted(()=>{
        if(basicRpc.value) {
          basicRpc.value.close(1000, "destroy")
          basicRpc.value = null
        }
        window.removeEventListener("resize",onResize)
      })
      window.onbeforeunload = function (evt){
        if(tabItems.value.some((item)=>item.connected)){
          const msg = "存在未关闭的连接,请确认是否退出"
          evt.returnValue = msg
          return msg
        }
      }
    }

    return {
      basicRpc,tabs,data,tabItems,selectItem,currentTheme,ThemeIcons,sshLoading,quickCmdEditor,quickCmdList,disabled,
      doOpenTermExec,doOpenTerm,doCloneTab,doOpenNewWindow,newWindow,newWindowById,switchShowServerInfo,onSshConnected,onSshDisconnect,init,onTaskSucceed,
      doOpenQuickCmdCreator,updateQuickCmd,doRightClickQuickCmd,doExecQuickCmd
    }
  },
}
</script>

<style lang="scss">
.v-theme--dark {
  .ssh-tooltip{
    .tooltip-item{
      background: #1d1e21;
      border-color: rgba(100, 100, 100, 0.75);
    }
  }
}
.ssh-tooltip{
  display: flex;
  .hover-rotation{
    i{
      transition: transform ease .35s;
    }
    &:hover{
      i{
        transform: rotate(90deg);
      }
    }
  }
  .tooltip-item{
    display: flex;
    cursor: pointer;
    border-color: rgba(200, 200, 200, 0.95);
    border-style: solid;
    border-top-width: .5px;
    border-bottom-width: .5px;
    border-left-width: 0;
    border-right-width: 0;
    background: #eee;
  }
  .tooltip-btn{
    width: 28px;
    justify-content: center;
    align-items: center;
    &[disabled=true]{
      cursor: not-allowed!important;
      i{
        transform: none!important;
        cursor: not-allowed!important;
      }
      &.hover-rotation{
        cursor: pointer!important;
        i{
          cursor: pointer!important;
        }
      }
    }
  }
  .tooltip-tabs{
    width: calc(100% - 84px)
  }
}
.bar-menu{
  .v-list {
    overflow: hidden!important;
    .v-list-subheader {
      font-size: 12px;
      height: 25px;
      min-height: 25px;
      letter-spacing: 2px;
      font-weight: bold;
      pointer-events: none;
    }

    .v-list-item {
      .v-input {
        height: 45px;
        transform: scale(0.75) translateY(-7.5px);
      }

      .v-list-item__content {
        .v-list-item-title {
          font-size: 12px;
        }

        .v-list-item-subtitle {
          font-size: 12px;
          -webkit-line-clamp: 2;
        }
      }
    }
  }
}
.my-container{
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  transition: none;
  &.expand{
    width: calc(100vw - 450px);
    margin-right: 450px;
  }
}
</style>
