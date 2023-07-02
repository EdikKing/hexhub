<template>
  <div class="flex-tabs-container">
    <div ref="flexTabsWrapper" v-on:scroll="onScroll">
      <table ref="tabs" class="flex-tabs">
        <thead>
        <draggable
            :model-value="items"
            @update:modelValue="updateTabSeq"
            handle=".handle"
            :move="onMove"
            @end="onDragEnd"
            :animation="200"
            item-key="label"
            tag="tr"
            :component-data="{
              tag: 'tr',
              type: 'transition-group',
              name: 'fade',
            }"
        >
          <template #item="{ element: tab,index:idx }" :key="tab.id" >
            <th
                :key="idx"
                v-tooltip="{ content: !wrap||drag||scrolling?null:tab.label, delay:{show: 1500,hide: 500} }"
                tabindex="0"
                v-on:keydown.enter="onClick($event,idx,tab)"
                v-on:click="onClick($event,idx,tab)"
                v-on:dragstart="onDragStart($event,tab)"
                v-on:contextmenu="onContextMenuItem($event,idx,tab)"
            >
              <div :class="getItemClass(idx,tab)">
                <v-btn class="close-btn" icon="mdi-close" variant="text" density="compact" size="small" style="background: transparent" v-if="!tab.sticky" v-on:click.stop="doClose(idx,tab)" v-ripple></v-btn>
                <v-icon :color="tab.iconColor" size="small" :icon="tab.icon" v-if="tab.icon"></v-icon>
                <span>{{tab.label}}</span>
              </div>
            </th>
          </template>
        </draggable>
        </thead>
      </table>
    </div>
  </div>
</template>

<script lang="ts">
import {PropType} from "nuxt/dist/app/compat/capi";
import {getCurrentInstance, nextTick, ref, watch, computed} from "vue";
import draggable from "vuedraggable";
import lodash from "lodash";
import {ContextMenu, Toast} from "~/lib/layer";
import * as clipboard from "clipboard-polyfill";

interface FlexTab {
  id: string,
  label:string,
  icon?:string,
  iconColor?:string
  sticky?:boolean,
  url?:string,
  _selected?: boolean,
}

export {FlexTab}

export default {
  name: "FlexTabs",
  components:{draggable},
  props: {
    modelValue: {
      type: Number,
      default: 0,
    },
    items: {
      type: Array as PropType<FlexTab[]>,
      default: [
        // {
        //   label: "列表",
        //   icon: "mdi-grid",
        //   sticky: true
        // },
        // {
        //   label: "sdfsdf",
        //   icon: "mdi-table"
        // },
        // {
        //   label: "dadaf",
        //   icon: "mdi-table"
        // },
        // {
        //   label: "CCCCCCCCCC",
        //   icon: "mdi-table"
        // },
      ]
    },
    closeConfirm: {
      type: Function as PropType<(item:FlexTab)=>Promise<any>>
    },
  },
  emits: ["update:modelValue","update:items","onDragMoveOut","onClone","onNewWindow"],
  setup(props, ctx) {
    const proxy = <any>getCurrentInstance().proxy
    const value = ref(props.modelValue)
    const flexTabsWrapper = ref<HTMLElement>()
    const tabs = ref<HTMLElement>()
    const items = ref(props.items)
    const drag = ref(false)
    const wrap = ref(false)
    const scrolling = ref(false)
    const instance = getCurrentInstance()

    const getItemClass = (idx:number,item:FlexTab)=>{
      const classes = ["tab",`tab-${idx}`]
      if(item._selected){
        classes.push("selected")
      }
      if(wrap.value){
        classes.push("wrap")
      }
      if(item.sticky){
        classes.push("sticky")
      }else{
        classes.push("handle")
      }
      return classes
    }

    const doClose = async (idx: number, item: FlexTab) => {
      props.closeConfirm && await props.closeConfirm(item)
      items.value.splice(idx, 1)
      if (idx === value.value) {
        //如果关闭的元素为选择的元素，更新选择元素位置
        ctx.emit("update:items", items.value)
        ctx.emit("update:modelValue", Math.max(0, idx - 1))
      } else {
        updateTabSeq(items.value)
      }
    }

    const onClick = (evt:MouseEvent,idx:number,item:FlexTab)=>{
      ctx.emit("update:modelValue",idx)
    }

    const onScrollEnd = lodash.debounce(()=>{
      scrolling.value = false
    },500)

    const onScroll = (evt:WheelEvent)=>{
      if(!scrolling.value){
        scrolling.value = true
      }
      onScrollEnd()
    }

    const onMove = (evt)=>{
      //sticky显示的tab不能移动顺序
      return !evt.relatedContext.element.sticky;
    }

    const onDragStart = (evt:DragEvent,item:FlexTab)=>{
      if(item.url){
        let url = item.url
        if(!url.toLowerCase().startsWith("http")){
          //相对地址转绝对地址
          url = new URL(url, location.href).href;
        }
        evt.dataTransfer.setData("text/uri-list", url);
      }
      drag.value = true
    }

    const onDragEnd = (evt)=>{
      // console.log("end",evt)
      const originalEvent = <DragEvent>evt.originalEvent
      const thEl = <HTMLElement>originalEvent.target
      const rect = thEl.getBoundingClientRect()
      if(Math.abs(rect.y - originalEvent.offsetY) > 50){
        //拖拽出界
        ctx.emit("onDragMoveOut",{x:originalEvent.screenX,y:originalEvent.screenY,item:items.value[evt.newIndex]})
      }
      drag.value = false
    }

    const onContextMenuItem = function (evt:MouseEvent,idx:number,tab:FlexTab){
      const itemsVal = items.value
      ContextMenu.open(evt,[
        {
          type: "item",
          title: proxy.$t('common.close'),
          icon: "mdi-close",
          disabled: tab.sticky,
          click: ()=>doClose(idx,tab)
        },
        {
          type: "item",
          title: "复制名称",
          icon: "mdi-content-copy",
          disabled: itemsVal.length <= 1,
          click: async () => {
            clipboard.writeText(tab.label).then(() => {
              Toast.success(proxy.$t('common.copy-success'))
            }).catch(err => {
              console.log(err)
              Toast.error(proxy.$t('common.copy-failed'))
            });
          }
        },
        {
          type: "item",
          title: "关闭其他",
          icon: "mdi-tab-minus",
          disabled: itemsVal.length <= 1,
          click: async () => {
            //倒序遍历删除，防止遍历过程中删除改变下标地址
            for (let i = itemsVal.length - 1; i >= 0; i--) {
              const item = itemsVal[i]
              if (i != idx && !item.sticky) {
                try {
                  await doClose(i, item)
                } catch (e) {

                }
              }
            }
            ctx.emit("update:modelValue", Math.max(0, itemsVal.indexOf(tab)))
          }
        },
        {
          type: "item",
          title: "关闭所有",
          icon: "mdi-tab-remove",
          disabled: itemsVal.length <= 1,
          click: async () => {
            //倒序遍历删除，防止遍历过程中删除改变下标地址
            for (let i = itemsVal.length - 1; i >= 0; i--) {
              const item = itemsVal[i]
              if (!item.sticky) {
                try {
                  await doClose(i, item)
                } catch (e) {

                }
              }
            }
            ctx.emit("update:modelValue", 0)
          }
        },
        {
          type: "item",
          title: "关闭左边",
          icon: "mdi-close-circle-multiple-outline",
          disabled: idx <= 1,
          click: async () => {
            //倒序遍历删除，防止遍历过程中删除改变下标地址
            for (let i = itemsVal.length - 1; i >= 0; i--) {
              const item = itemsVal[i]
              if (i < idx && !item.sticky) {
                try {
                  await doClose(i, item)
                }catch (e){

                }
              }
            }
            ctx.emit("update:modelValue", Math.max(0, itemsVal.indexOf(tab)))
          }
        },
        {
          type: "item",
          title: "关闭右边",
          icon: "mdi-close-box-multiple-outline",
          disabled: idx <= 1 && idx >= itemsVal.length - 1,
          click: async () => {
            //倒序遍历删除，防止遍历过程中删除改变下标地址
            for (let i = itemsVal.length - 1; i >= 0; i--) {
              const item = itemsVal[i]
              if (i > idx && !item.sticky) {
                try {
                  await doClose(i, item)
                }catch (e){

                }
              }
            }
            ctx.emit("update:modelValue", Math.max(0, itemsVal.indexOf(tab)))
          }
        },
        {
          type: "item",
          title: "新窗口打开",
          icon: "mdi-open-in-new",
          disabled: tab.sticky,
          click: ()=>{
            ctx.emit('onNewWindow',tab)
          }
        },
        {
          type: "item",
          title: "新标签页打开",
          icon: "mdi-tab-plus",
          disabled: tab.sticky,
          click: ()=>{
            ctx.emit('onClone',tab)
          }
        },
      ],135).catch((err)=>{});
    };

    const resize = ()=>{
      if(process.client) {
        nextTick(() => {
          const canvas = <HTMLCanvasElement>document.createElement("canvas")
          const context = canvas.getContext("2d")
          context.font = "normal 12px JetBrainsMono"
          //预算所有tab将占用的宽度
          const totalWidth = props.items.reduce((previousValue,currentValue,idx,arr)=>{
            let initWidth = currentValue.icon?50:35
            let {width:textWidth} = context.measureText(currentValue.label)
            return previousValue + initWidth + textWidth
          },0);
          //如果tab宽度大于上级容器宽度，那么缩小每个tab至最新宽度
          wrap.value = totalWidth >= flexTabsWrapper.value?.clientWidth
        })
      }
    }

    const updateTabSeq = (items:FlexTab[])=>{
      //更新tab顺序可能会导致选中的tab变更了下标位置,需要根据上次选中的元素重新计算下标
      const idx = items.findIndex((item)=>item._selected)
      if(idx!==-1){
        ctx.emit('update:modelValue',idx)
      }
      ctx.emit('update:items',items)
    }

    const ids = computed(()=>props.items.map(item=>item.id))

    watch(()=>props.modelValue,(v)=>{
      value.value = v
      if(v > 0){
        nextTick(()=>{
          const el = (<HTMLElement>instance.proxy.$el).querySelector(`.tab-${v}`)
          if(el){
            el.scrollIntoView()
          }
        })
      }
      props.items.forEach((item,idx)=>{
        item._selected = idx === v
      })
    },{immediate: true})

    watch(ids,(v)=>{
      items.value = props.items
      const val = props.modelValue
      nextTick(()=>{
        resize()
      })
      props.items.forEach((item,idx)=>{
        item._selected = idx === val
      })
    },{immediate:true})

    return {wrap,drag,scrolling,items,flexTabsWrapper,tabs,value,
      getItemClass,onScroll,onClick,resize,onMove,onDragStart,onDragEnd,doClose,onContextMenuItem,updateTabSeq
    }
  }
}
</script>

<style lang="scss" scoped>
.v-theme--dark{
  .flex-tabs-container{
    & > div {
      border: .5px solid rgba(100, 100, 100, .75);
    }
    .flex-tabs{
      th{
        background: #1d1e21;
        color: rgba(255,255,255,0.75);
        .tab{
          border-right: .5px solid rgba(100, 100, 100, .75);
          .close-btn{
            background: rgba(0, 0, 0, .45);
            color: rgba(255,255,255,0.85);
          }
          &:hover{
            color: #ffffff;
          }
          &.selected{
            color: rgba(30, 136, 229, 0.9);
          }
        }
        &.sticky {
          box-shadow: 2px 0 12px 0 rgb(100 100 100 / 20%);
        }
      }
    }
  }
}
.flex-tabs-container{
  overflow: hidden;
  user-select: none;
  width: 100%;
  height: 100%;
  & > div{
    border: .5px solid rgba(200, 200, 200, .95);
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-height: 2px;
    &::-webkit-scrollbar {
      height: 2px;
    }
  }
  .flex-tabs{
    height: 25px;
    table-layout: fixed;
    border-spacing: 0;
    border-collapse: separate;
    width: auto;
    th{
      transition: none;
      font-size: 12px;
      background: #ffffff;
      color: #555555;
      font-weight: normal;
      position: relative;
      &:focus-visible{
        outline: 2px solid currentColor;
        outline-offset: -2px;
      }
      .tab{
        display: flex;
        justify-content: center;
        align-items: center;
        border-right: .5px solid rgba(200, 200, 200, .95);
        padding: 0 5px;
        transition: .2s linear color;
        &.wrap{
          max-width: 80px;
        }
        .close-btn{
          background: rgba(255,255,255,0.75);
          color: #111111;
        }
        & > .v-icon{
          margin-right: 3px;
        }
        &:hover{
          color: #000000;
        }
        &.selected{
          color: rgb(var(--v-theme-primary));
        }
      }
      span{
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      &:last-child{
        &.wrap{
          .tab{
            border-right: none;
          }
        }
      }
      &:has(.sticky){
        box-shadow: 2px 0 12px 0 rgb(0 0 0 / 20%);
        left: 0;
        z-index: 1;
        flex: 1;
        position: sticky;
        padding-left: 10px;
        .tab{
          border-right: 0;
          span{
            padding-right: 10px;
          }
        }
      }
    }
  }
}
</style>