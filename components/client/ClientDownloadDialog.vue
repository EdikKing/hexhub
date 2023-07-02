<template>
  <div>
    <v-dialog width="550px" :model-value="modelValue" @update:modelValue="$emit('update:modelValue',$event)">
      <v-card class="pa-2 pb-16" v-drag="'.v-overlay__content'">
        <v-btn variant="text" density="compact" icon="mdi-close" class="close-btn" v-on:click="$emit('update:modelValue',false)"></v-btn>
        <v-card-title class="pt-3">
          本地客户端下载
        </v-card-title>
        <v-alert density="compact">
          <div style="font-size: 12px">
            <v-icon color="warning" icon="mdi-alert-box-outline"></v-icon>
            由于浏览器相关技术限制,本地文件与本地网络连接均需要依赖本地客户端进行处理,本程序不会上传任何用户信息,请放心使用!
          </div>
        </v-alert>

        <v-card :loading="pageData.loading" :title="pageData?.current?.versionName??'Loading...'" class="mt-2 mb-2" variant="tonal">
          <v-card-subtitle style="min-height: 70px">
            <ul v-if="pageData.current" class="pl-4">
              <li>文件大小:{{$fileSizeConvert(pageData.current.totalSize)}}</li>
              <li>更新时间:{{pageData.current.created}}</li>
              <li>更新说明:{{pageData.current.updateDescription}}</li>
            </ul>
            <p></p>
          </v-card-subtitle>
          <div class="arch-btns" v-if="pageData.os === 'linux'">
            <v-btn-toggle v-model="pageData.distro" mandatory class="mb-1" color="info" variant="outlined" density="compact">
              <v-btn size="small" value="deb">
                Deb
              </v-btn>
              <v-btn size="small" value="rpm">
                RPM
              </v-btn>
              <v-btn size="small" value="tar">
                Tar
              </v-btn>
            </v-btn-toggle>
          </div>
          <div class="arch-btns" v-if="pageData.os !== 'windows'">
            <v-btn-toggle v-model="pageData.arch" mandatory color="primary" variant="outlined" density="compact">
              <v-btn size="small" value="amd64">
                x86_64
              </v-btn>
              <v-btn size="small" value="arm64">
                arm64
              </v-btn>
            </v-btn-toggle>
          </div>
          <div class="download-btn mt-1 mb-2">
            <v-btn variant="tonal" color="success" size="small" :disabled="pageData.current == null" :href="pageData?.current?.downloadUrl" :download="pageData?.current?.fileName"  @click.stop.prevent="openUrl(pageData?.current?.downloadUrl)">
              Download
            </v-btn>
          </div>
        </v-card>

        <v-bottom-navigation grow class="pt-1 pb-1" mandatory v-model="pageData.os">
          <v-btn value="windows">
            <v-icon icon="mdi-microsoft-windows" color="blue"></v-icon>
            Windows
          </v-btn>

          <v-btn value="darwin">
            <v-icon icon="mdi-apple"></v-icon>
            OSX
          </v-btn>

          <v-btn value="linux">
            <v-icon icon="mdi-linux" color="rgb(102,102,102)"></v-icon>
            Linux
          </v-btn>
        </v-bottom-navigation>
      </v-card>
    </v-dialog>

    <v-dialog width="500px" v-model="showTips" persistent>
      <v-card class="pa-3 pb-0" v-drag="'.v-overlay__content'">
        <v-card-title style="color: red">重要:</v-card-title>
        <template v-if="pageData.os === 'darwin'">
          <span>由于Apple的策略,对未签名的安装包会进行拦截,安装时会弹出无法验证开发者提示,可按照下列图中所示进行操作:</span>
          <img src="/img/img1.png" style="width: 50%;margin: 10px auto"/>
          <img src="/img/img2.png"/>
        </template>
        <template v-else-if="pageData.os === 'windows'">
          <span>由于win10自带的策略,对未知无签名的exe文件可能会进行拦截,可按照下列图中所示进行操作:</span>
          <img src="/img/img4.png" style="width: 80%;margin: 10px auto"/>
          <img src="/img/img3.png" style="width: 80%;margin: auto"/>
        </template>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
              color="primary"
              text
              @click="showTips=false"
          >
            我知道了
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script lang="ts">

import lodash from "lodash";
import {reactive, ref, watch} from "vue";
import {getMasterLatestVersionList, PluginVersionResult} from "~/apis/server/client-plugin";
import {Toast} from "~/lib/layer";

export default {
  name: "ClientDownloadDialog",
  props: {
    modelValue: {
      type: Boolean,
      default: true,
    }
  },
  emits: ['update:modelValue'],
  setup(props, ctx) {
    const pageData = reactive({
      os: <"windows" | "darwin" | "linux">'windows',
      arch: <"amd64" | "arm64">"amd64",
      distro: <"deb" | "rpm" | "tar">"deb",
      loading: false,
      current: <PluginVersionResult | undefined | null>null,
    })
    const showTips = ref(false)
    let latestVersions = <Record<string, PluginVersionResult>>null
    const openUrl = lodash.debounce((url) => {
      if(pageData.os === 'windows' || pageData.os === 'darwin'){
        showTips.value=true
      }
      // window.location.href = url
      window.open(url)
    },500)
    watch(() => [pageData.os, pageData.arch, pageData.distro, pageData.loading], (v) => {
      if (!latestVersions) {
        return
      }
      const os = v[0]
      const arch = v[1]
      const distro = v[2]
      let id: string;
      switch (os) {
        case "windows":
          id = "windows-amd64"
          break
        case "darwin":
          id = `darwin-${arch}`
          break
        case "linux":
          id = `linux-${distro}-${arch}`
          break
      }
      pageData.current = latestVersions[id]
    }, {immediate: true,})
    watch(() => props.modelValue, async (s) => {
      if (s) {
        pageData.loading = true
        try {
          latestVersions = await getMasterLatestVersionList()
        } catch (e) {
          Toast.error(e.message)
        } finally {
          pageData.loading = false
        }
      }
    })
    return {openUrl, pageData, latestVersions, showTips}
  }
}
</script>

<style lang="scss" scoped>
  .close-btn{
    position: absolute;
    right: 5px;
    top: 5px;
  }
  .arch-btns{
    display: flex;
    justify-content: center;
    .v-btn-group{
      height: 28px;
    }
  }
  .download-btn{
    display: flex;
    justify-content: center;
  }
</style>