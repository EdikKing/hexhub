<template>
  <template>
    <v-snackbar
        v-if="installingList?.length > 0"
        location="bottom end"
        :model-value="installingList?.length > 0"
        :timeout="-1"
    >
      <div>
        <v-progress-linear
            v-for="(item,idx) in installingList"
            :key="item.id"
            class="plugin-download-progress"
            :model-value="item.downloadedSize/item.totalSize*100"
            color="blue-grey"
            height="15"
            rounded
            striped
        >
          <template v-slot:default="{ value }">
          <span style="font-size: 12px">
            插件 {{item.name}} 安装中 <strong>{{ Math.ceil(item.downloadedSize/item.totalSize*100) }}%</strong>
          </span>
          </template>
        </v-progress-linear>
      </div>
    </v-snackbar>
    <template v-if="!data.startedClient">
      <v-snackbar
          :model-value="true"
          color="error"
          multi-line
          :timeout="-1"
      >
        <v-icon icon="mdi-alert"></v-icon>
        <span style="font-size: 12px">
          未下载或启动本地程序,无法正常使用相关功能,请安装并启动程序刷新后尝试!
        </span>
        <template v-slot:actions>
          <v-btn
              size="small"
              variant="tonal"
              class="mr-1"
              href="hexhub://-not-open-page"
          >
            尝试启动
          </v-btn>
          <v-btn
              size="small"
              variant="tonal"
              @click="data.showDownloadDialog = true"
          >
            下载
          </v-btn>
        </template>
      </v-snackbar>
      <client-download-dialog v-model="data.showDownloadDialog"></client-download-dialog>
    </template>
  </template>
</template>

<script lang="ts">
import {onMounted, onUnmounted, reactive, ref, shallowRef} from "vue"
import {PluginInfo, pluginManager, PluginStatus} from "~/apis/client/master";
import {Confirm, Toast} from "~/lib/layer";
import {api, genApiUri} from "~/apis/client/base";
import common from "~~/lib/util/common";
import lodash from "lodash";

export default {
  name: "PluginStarter",
  props: {
    pluginId: {
      type: String,
      required: true
    }
  },
  emits: ["clientConnected","pluginConnected"],
  setup(props,ctx){
    const installingList = shallowRef<PluginInfo[]>()
    let installingCount = 0
    let getInstallingIntervalId

    const data = reactive({
      startedClient: true,
      showDownloadDialog: false
    })

    // let checkCount = 0
    let checkClientIntervalId = null

    const getInstallingList = ()=>{
        pluginManager.list().then((list)=>{
          list = list.filter((item)=>{
            return item.status === PluginStatus.Downloading
          })
          installingList.value = list
          if(installingCount <= 0 && list.length === 0 && getInstallingIntervalId){
            clearInterval(getInstallingIntervalId)
            getInstallingIntervalId = null
          }
        }).catch((err)=>{
          if(installingCount <= 0 && getInstallingIntervalId){
            installingList.value = null
            clearInterval(getInstallingIntervalId)
            getInstallingIntervalId = null
          }
        })
    }

    const uninstallConfirm = async (pluginId: string,title: string, body: string): Promise<void> => {
      await Confirm.open(title, body)
      try{
        await pluginManager.uninstall(pluginId)
      }catch (err) {
        Toast.error(`插件: ${pluginId} 卸载失败,原因:${err.message}`)
        throw err
      }
    }

    const checkPluginInstallAndStart = async (pluginId: string,confirmUninstall=true) => {
      installingCount ++
      if(!getInstallingIntervalId){
        lodash.delay(getInstallingList,300)
        getInstallingIntervalId = setInterval(getInstallingList,750)
      }
      pluginManager.checkUpdate(pluginId).then(async (updateResult) => {
        if (updateResult.installed) {
          Toast.success(`插件: ${updateResult.pluginInfo.name} 安装成功`)
        }
      }).catch(err=>{

      }).finally(async () => {
        installingCount--
        try{
          await pluginManager.start(pluginId)
        }catch (err){
          if (confirmUninstall) {
            uninstallConfirm(
                pluginId,
                "启动失败,是否重新安装",
                `插件: ${pluginId} 启动失败,原因:${err.message}`
            ).then(() => {
              checkPluginInstallAndStart(pluginId, false)
            })
          } else {
            Toast.error(`插件: ${pluginId} 启动失败,原因:${err.message}`)
          }
        }
        ctx.emit("pluginConnected", pluginId)
      })
    }

    const checkPluginStartStatus = async (pluginId: string) => {
      for (let i = 0; i < 15; i++) {
        try {
          await pluginManager.ping(pluginId)
          return
        }catch (e){
          await common.sleep(150)
        }
      }
      throw new Error(`plugin ${pluginId} start failed`)
    };

    const checkClientStatus = ()=>{
      //判断是否安装或启动客户端
      api.get(genApiUri(null,"ping"),{timeout: 1000}).then(()=>{
        data.startedClient = true
        if(checkClientIntervalId){
          clearInterval(checkClientIntervalId)
          checkClientIntervalId = null
        }
        //客户端已启动,然后发送事件并开始检测插件是否启动
        checkPluginInstallAndStart(props.pluginId)
        ctx.emit("clientConnected")
      }).catch((e)=>{
        // if(checkCount == 0){
          // location.href = "hexhub:"
        // }
        data.startedClient = false
      }).finally(()=>{
        // checkCount ++
      })
    }

    onMounted(()=>{
      if(checkClientIntervalId){
        clearInterval(checkClientIntervalId)
      }
      checkClientIntervalId = setInterval(checkClientStatus,1000)
      checkClientStatus()
    })

    onUnmounted(()=>{
      if(getInstallingIntervalId){
        clearInterval(getInstallingIntervalId)
        getInstallingIntervalId = null
      }
      if(checkClientIntervalId){
        clearInterval(checkClientIntervalId)
        checkClientIntervalId = null
      }
    })

    return {
      data,
      installingList,
      checkPluginInstallAndStart
    }
  }
}
</script>

<style lang="scss" scoped>
  .plugin-download-progress{
    position: relative!important;
    margin-bottom: 10px;
    &:last-child{
      margin-bottom: 0;
    }
  }
</style>