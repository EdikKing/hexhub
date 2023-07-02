<template>
  <div
      v-on:mousedown.stop="down"
      ref="dragBtn"
      class="file-sync-history-drag-btn"
      tabindex="0"
      v-on:keydown.enter="dragData.show = !dragData.show"
      :style="`top: ${dragData.y}px;left: ${dragData.x}px;`"
  >
    <v-dropdown
        placement="auto-start"
        v-model:shown="dragData.show"
        :triggers="[]"
        :popperTriggers="[]"
        :theme="theme.global.name.value"
    >
      <v-badge :model-value="counts[0]+counts[1] > 0" :content="counts[0]+counts[1]" color="error">
        <div class="btn-wrapper" v-tooltip="tooltip" v-ripple>
          <div class="icon-wrapper">
            <v-icon size="small" icon="mdi-folder-arrow-up-down-outline"></v-icon>
          </div>
          <v-progress-circular
              size="45"
              :model-value="progress"
              color="blue-grey"
          ></v-progress-circular>
        </div>
      </v-badge>

      <template #popper>
        <v-card class="popper-container" :loading="loading" v-on:mousedown.stop>
          <div class="container-title">{{title}}</div>
          <v-divider></v-divider>
          <v-row justify="center" no-gutters>
            <v-btn-toggle v-model="status" mandatory rounded="0">
              <v-btn size="x-small" density="compact">
                <v-badge floating :model-value="counts[0] > 0" :max="99" :content="counts[0]" color="success">
                  <span>{{$t("file.sync-status[0]")}}</span>
                </v-badge>
              </v-btn>
              <v-btn size="x-small" density="compact">
                <v-badge floating :model-value="counts[1] > 0" :max="99" :content="counts[1]" color="primary">
                  <span>{{$t("file.sync-status[1]")}}</span>
                </v-badge>
              </v-btn>
              <v-btn size="x-small" density="compact">
                <v-badge floating :model-value="counts[2] > 0" :max="99" :content="counts[2]" color="info">
                  <span>{{$t("file.sync-status[2]")}}</span>
                </v-badge>
              </v-btn>
              <v-btn size="x-small" density="compact">
                <v-badge floating :model-value="counts[3] > 0" :max="99" :content="counts[3]" color="error">
                  <span>{{$t("file.sync-status[3]")}}</span>
                </v-badge>
              </v-btn>
              <v-btn size="x-small" density="compact">
                <v-badge floating :model-value="counts[4] > 0" :max="99" :content="counts[4]" color="warning">
                  <span>{{$t("file.sync-status[4]")}}</span>
                </v-badge>
              </v-btn>
            </v-btn-toggle>
          </v-row>
          <v-divider></v-divider>
          <div style="height: 300px;">
            <advanced-table
                @contextMenuItem="contextMenuItem"
                :draggable="false"
                v-model:headers="header"
                :items="items"
                :search-provider="(idx,item)=>item.name"
                :row-height="status === SyncStatus.Stop || status === SyncStatus.Processing || status === SyncStatus.Failed ? 40 : 25">
              <template #td="{item,key,dragging}">
                <td v-if="key==='name'" class="text-left pl-2">
                  <div class="file-icon">
                    <svg class="iconfont" aria-hidden="true">
                      <use :xlink:href="getItemIcon(item)"></use>
                    </svg>
                    <span v-tooltip="{ content: dragging?undefined:item.name, delay:{show: 1500,hide: 0} }">{{item.name}}</span>
                  </div>
                </td>
                <td v-else-if="key==='status'">
                  <div style="width: 90%;margin: auto;">
                    <template v-if="item.status === SyncStatus.Processing">
                      <v-progress-linear
                          style="position: relative!important;"
                          color="info"
                          :model-value="item.total === 0 ? 100 : item.current/item.total*100"
                          height="14"
                      >
                        <strong style="color: rgba(255,255,255,.95);line-height: 0">{{ (item.total === 0 ? '100.0' : (item.current/item.total*100).toFixed(1)) }}%</strong>
                      </v-progress-linear>
                      <div style="display: flex;align-items: center">
                        <v-icon icon="mdi-triangle-small-up" color="warning" v-if="item.type === SyncType.Upload"></v-icon>
                        <v-icon icon="mdi-triangle-small-down" color="error" v-else-if="item.type === SyncType.Download"></v-icon>
                        <span>
                          {{$fileSizeConvert(item.current)}}/{{$fileSizeConvert(item.total)}}
                        </span>
                      </div>
                    </template>
                    <template v-else-if="item.status === SyncStatus.Queueing">
                      <div style="display: flex;align-items: center">
                        <v-icon icon="mdi-triangle-small-up" color="warning" v-if="item.type === SyncType.Upload"></v-icon>
                        <v-icon icon="mdi-triangle-small-down" color="error" v-else-if="item.type === SyncType.Download"></v-icon>
                        <span :style="`color:${theme.current.value.colors.primary}`">{{$t("file.sync-status[1]")}}</span>
                      </div>
                    </template>
                    <template v-else-if="item.status === SyncStatus.Stop">
                      <v-progress-linear
                          style="position: relative!important;"
                          color="info"
                          :model-value="item.total === 0 ? 100 : item.current/item.total*100"
                          height="14"
                      >
                        <strong style="color: rgba(255,255,255,.95);line-height: 0">{{ (item.total === 0 ? '100.0' : (item.current/item.total*100).toFixed(1)) }}%</strong>
                      </v-progress-linear>
                      <div style="display: flex;align-items: center">
                        <v-icon icon="mdi-triangle-small-up" color="warning" v-if="item.type === SyncType.Upload"></v-icon>
                        <v-icon icon="mdi-triangle-small-down" color="error" v-else-if="item.type === SyncType.Download"></v-icon>
                        <span :style="`color:${theme.current.value.colors.warning}`">{{$t("file.sync-status[2]")}}</span>
                      </div>
                    </template>
                    <template v-else-if="item.status === SyncStatus.Failed">
                      <div style="display: flex;align-items: start" v-tooltip="item.error">
                        <v-icon icon="mdi-triangle-small-up" color="warning" v-if="item.type === SyncType.Upload"></v-icon>
                        <v-icon icon="mdi-triangle-small-down" color="error" v-else-if="item.type === SyncType.Download"></v-icon>
                        <span :style="`color:${theme.current.value.colors.error};line-height:12px;`">
                          <div>{{$t("file.sync-status[3]")}}</div>
                          <div style="white-space: nowrap;overflow: hidden;text-overflow: ellipsis;">{{item.error}}</div>
                        </span>
                      </div>
                    </template>
                    <template v-else-if="item.status === SyncStatus.Completed">
                      <div style="display: flex;align-items: center">
                        <v-icon icon="mdi-triangle-small-up" color="warning" v-if="item.type === SyncType.Upload"></v-icon>
                        <v-icon icon="mdi-triangle-small-down" color="error" v-else-if="item.type === SyncType.Download"></v-icon>
                        <span :style="`color:${theme.current.value.colors.success}`">{{$t("file.sync-status[4]")}}</span>
                      </div>

                    </template>
                  </div>
                </td>
                <td v-else-if="key==='info'">
                  <template v-if="item.status === SyncStatus.Processing">
                    {{$fileSizeConvert(item.speed)}}/s
                  </template>
                  <template v-else-if="item.status === SyncStatus.Stop || item.status === SyncStatus.Failed">
                    {{$fileSizeConvert(item.current)}}/{{$fileSizeConvert(item.total)}}
                  </template>
                  <template v-else>
                    {{$fileSizeConvert(item.total)}}
                  </template>
                </td>
              </template>
            </advanced-table>
          </div>
        </v-card>
      </template>
    </v-dropdown>
  </div>
</template>

<script lang="ts">
import { useTheme } from 'vuetify'
import {reactive, ref, onMounted, onUnmounted, getCurrentInstance, watch,nextTick} from "vue";
import lodash from "lodash";
import AdvancedTable from "~/components/common/AdvancedTable.vue";
import {PropType} from "#app/compat/capi";
import common from "~/lib/util/common";
import {getFileByExt} from "~/lib/util/file-icons";
import {ContextMenu} from "~/lib/layer";
const margin = 15;

enum SyncType {
  Download = 0,
  Upload,
}

enum SyncStatus {
  Processing = 0,
  Queueing,
  Stop,
  Failed,
  Completed,
}

interface FileItem {
  id:number,
  type:number,
  status:number,
  error?:string,
  total:number,
  current:number,
  speed:number,
  name:string,
  srcPath:string,
  targetPath:string,
  createdTime:number,
  completedTime:number,
  allowRestart: boolean
}

export {SyncType,SyncStatus,FileItem}

export default {
  name: "FileSyncHistory",
  components: {AdvancedTable},
  props: {
    title: {
      type: String,
    },
    items: {
      type: Array as PropType<FileItem[]>,
    },
    tooltip: {
      type: [Boolean,String],
      default: false,
    },
    progress: {
      type: Number,
      default: 0,
    },
    status: {
     type: Number,
     default: SyncStatus.Processing,
    },
    loading: {
      type: Boolean,
      default: false,
    },
    counts: {
      type: Array as PropType<number[]>,
      default: [0,0,0,0,0]
    }
  },
  emits:["contextMenuItem","update:status"],
  setup(props,ctx){
    const proxy = <any>getCurrentInstance().proxy

    let rect = {
      right: margin,
      x: document.body.clientWidth - 45 - margin,
      y: 75,
      width: 45,
      height: 45,
    }
    let dragging = false
    let downX = 0;
    let downY = 0;
    let downedStatus = false
    let downTime = 0

    const status = ref(props.status)
    const theme = useTheme()
    const dragBtn = ref<HTMLElement>()
    const dragData = ref({
      x:rect.x,
      y:rect.y,
      show: false,
    })
    const header = ref([
      {title:proxy.$t("common.name"),key:"name",minWidth:60,sortable: false},
      {title:proxy.$t("common.status"),key:"status",minWidth:120,sortable: false},
      {title:proxy.$t("common.info"),key:"info",minWidth:70,sortable: false},
    ])

    watch(()=>status.value,()=>{
      ctx.emit("update:status",status.value)
    })

    onMounted(()=>{
      window.addEventListener("resize", onResize);
    })

    onUnmounted(()=>{
      window.removeEventListener("resize", onResize);
    })

    const onBlur = (evt:MouseEvent)=>{
      window.removeEventListener("mousedown",onBlur)
      dragData.value.show = false
    }

    const down = (event:MouseEvent)=>{
      //排除右键点击
      if(event.button!==0){
        return
      }
      event.stopPropagation()
      event.preventDefault()
      window.addEventListener("mousedown",onBlur)
      window.addEventListener("mousemove",move)
      window.addEventListener("touchmove",move)
      window.addEventListener("mouseup",end)
      window.addEventListener("touchend",end)

      downedStatus = dragData.value.show
      downTime = new Date().getTime()
      dragging = true;
      downX = event.pageX - dragData.value.x
      downY = event.pageY - dragData.value.y
    }
    const end = (event:MouseEvent)=>{
      if(dragging){
        event.stopPropagation()
        event.preventDefault()
        window.removeEventListener("mousemove",move)
        window.removeEventListener("touchmove",move)
        window.removeEventListener("mouseup",end)
        window.removeEventListener("touchend",end)
        if(new Date().getTime() - downTime < 250){
          dragData.value.show = !downedStatus
        }
        let x = dragData.value.x
        let y = dragData.value.y
        rect.x = x
        rect.y = y
        rect.right = document.body.clientWidth - (x+rect.width)
      }
      dragging =false;
    }
    const move = (event:MouseEvent|TouchEvent)=>{
      if(dragging) {
        dragData.value.show = false
        event.stopPropagation()
        event.preventDefault()
        if (event instanceof TouchEvent) {
          const touch = event.touches[0]
          dragData.value.x = touch.pageX - downX
          dragData.value.y = touch.pageY - downY
        }else{
          dragData.value.x = event.pageX - downX
          dragData.value.y = event.pageY - downY
        }

        dragData.value.x = Math.max(margin,Math.min(dragData.value.x,document.body.clientWidth - margin - rect.width))
        dragData.value.y = Math.max(margin,Math.min(dragData.value.y,document.body.clientHeight - margin - rect.height))
      }
    }
    const onResize = lodash.throttle(()=>{
      //窗口发生变化时，通过对比右上角距离作为相对坐标
      let x = document.body.clientWidth - rect.right - rect.width
      let y = rect.y
      x = Math.max(margin,Math.min(x,document.body.clientWidth - margin - rect.width))
      y = Math.max(margin,Math.min(y,document.body.clientHeight - margin - rect.height))

      rect.x = x
      rect.y = y
      rect.right = document.body.clientWidth - (x+rect.width)

      dragData.value.x = x
      dragData.value.y = y
    }, 250,{trailing:true,leading:false})

    const contextMenuItem = (evt:MouseEvent,items:FileItem[])=>{
      ctx.emit("contextMenuItem",evt,items)
    };

    const getItemIcon = (file:FileItem):string=> {
      let ext = common.getFileExt(file.name).toLowerCase()
      let icon = null
      if (ext) {
        icon = getFileByExt(ext)
      }
      if (!icon) {
        return "#icon-weizhiwenjian"
      }
      return icon
    }

    return {
      // tooltip,items,status,progress,title,
      SyncStatus,SyncType,
      status,
      dragData,header,
      dragBtn,theme,
      down,onResize,getItemIcon,contextMenuItem
    }
  }
}
</script>

<style lang="scss">
  .file-sync-history-drag-btn{
    border-radius: 100%;
    position: fixed;
    z-index: 5;
    height:45px;
    width:45px;
    .btn-wrapper{
      box-shadow: 0 3px 1px -2px var(--v-shadow-key-umbra-opacity, rgba(0, 0, 0, .2)),0 2px 2px 0 var(--v-shadow-key-penumbra-opacity, rgba(0, 0, 0, .14)),0 1px 5px 0 var(--v-shadow-key-penumbra-opacity, rgba(0, 0, 0, .12));
      background: rgb(var(--v-theme-surface));
      color: rgba(var(--v-theme-on-surface),var(--v-high-emphasis-opacity));
      opacity:.75;
      border-radius: 100%;
      cursor:grab;
      .icon-wrapper{
        position: absolute;
        height: 100%;
        width: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
      }
      .progress-wrapper{
        position: absolute;
      }
    }
  }
  .v-popper__popper{
    .v-popper__wrapper{
      .popper-container{
        width: 305px;
        .container-title{
          font-size: 14px;
          font-weight: bold;
          padding: 9px 15px;
        }
        .table-container{
          border: none!important;
        }
        .v-btn-group{
          height: 30px!important;
          overflow: visible;
          .v-badge__badge{
            z-index: 2;
            padding: 4px 1px;
          }
        }
        table{
          tbody{
            .file-icon{
              display: flex;
              align-items: center;
              width: 100%;
              height: 100%;
              .iconfont{
                flex: 0 1 18px;
                width: 18px;
                height: 18px;
                margin-right: 3px
              }
            }
            span{
              flex: 1;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
          }
        }
      }
    }

  }
</style>