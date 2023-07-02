<template>
  <div class="fill-height">
    <div v-on:contextmenu="showContextMenu($event)" class="fill-height">
      <slot name="default"></slot>
    </div>
    <transition name="fade">
      <div class="menu-overlay" v-if="mShow" v-on:mousedown.stop v-on:click="hideContextMenu" v-on:contextmenu="hideContextMenu">
        <ul
            class="menu-body"
            ref="menuBody"
            :style="`left:${mPos.x}px;top:${mPos.y}px;width:${mWidth}px`">
          <li
              v-for="(item,idx) in mMenu"
              v-on:mouseover="onMouseover($event,item)"
              v-ripple="item.type === 'item' && !item.disabled"
              :class="`${item.type} ${item._expand?' expand':''} ${item.disabled?'disabled':''}`"
              :key="idx"
              v-on:click="clickItem($event,item)"
          >
            <v-icon v-if="item.icon" class="icon" :icon="item.icon"></v-icon>
            <span v-if="item.title">{{item.title}}</span>
            <v-icon v-if="item.type === 'menu'" class="menu-icon" icon="mdi-menu-down"></v-icon>
          </li>
        </ul>
        <ul
            v-if="mSubMenu"
            ref="subMenuBody"
            class="menu-body"
            :style="`left:${mSubPos.x}px;top:${mSubPos.y}px;width:${mWidth}px`"
        >
          <li
              v-for="(subItem,subIdx) in mSubMenu"
              v-ripple="subItem.type === 'item' && !subItem.disabled"
              :class="`${subItem.type} ${subItem.disabled?'disabled':''}`"
              :key="subIdx"
              v-on:click="clickItem($event,subItem)"
          >
            <v-icon v-if="subItem.icon" class="icon" :icon="subItem.icon"></v-icon>
            <span v-if="subItem.title">{{subItem.title}}</span>
          </li>
        </ul>
      </div>
    </transition>

  </div>
</template>

<script lang="ts">
import { PropType } from "nuxt/dist/app/compat/capi";
import {ref, reactive, nextTick} from "vue";
import lodash from "lodash";

interface MenuItem {
  type: "line"|"item"|"menu"|"title"
  title?: string
  icon?: string
  disabled?:boolean,
  menus?: MenuItem[]
  click?: (item:MenuItem)=>void,
  _expand?:boolean,
}

export {MenuItem}

export default {
  name: "PopperSelect",
  props:{
    observer: {
      type: Function,
    },
    items: {
      type: Array,
      default: [],
    },
    title: {
      type: String
    },

    width: {
      type: Number,
      default: 200,
    },
  },
  emits: ["show","hide"],
  setup(props, ctx){
    const menuBody = ref<HTMLElement>()
    const subMenuBody = ref<HTMLElement>()
    const mPos = reactive({x:0,y:0})
    const mShow = ref(false)
    const mMenu = ref<Array<MenuItem>>([])
    const mWidth = ref(0)
    const mParentMenu = ref<MenuItem>(null)
    const mSubMenu = ref<Array<MenuItem>>(null)
    const mSubPos = reactive({x:0,y:0})

    let promiseExecutor = null

    const hideContextMenu = (evt:UIEvent)=>{
      if(!mShow.value){
        return
      }
      ctx.emit("hide")
      if(promiseExecutor!=null){
        promiseExecutor.reject("cancel")
        promiseExecutor = null
      }
      //拦截浏览器右键弹窗
      if(evt instanceof PointerEvent){
        evt.preventDefault()
        evt.stopPropagation()
      }
      mShow.value = false
      mSubMenu.value = null
      mParentMenu.value = null
    }

    const showContextMenu = (evt:MouseEvent,menu:Array<MenuItem>=null,width:number=null):Promise<MenuItem>=>{
      if(menu){
        mMenu.value = menu
      }else{
        mMenu.value = props.menu
      }
      if(width){
        mWidth.value = width
      }else{
        mWidth.value = props.width
      }
      ctx.emit("show")
      evt.preventDefault()
      evt.stopPropagation()
      mShow.value = true
      nextTick(()=>{
        const cx = evt.pageX
        const cy = evt.pageY
        const fw = window.innerWidth
        const fh = window.innerHeight
        const bw = menuBody.value.clientWidth
        const bh = menuBody.value.clientHeight
        //限制菜单不能超出屏幕
        mPos.x = Math.max(5,Math.min(cx,fw-bw-5))
        mPos.y = Math.max(5,Math.min(cy,fh-bh-5))
      })
      return new Promise((resolve, reject) => {
        if(promiseExecutor!=null){
          promiseExecutor.reject("cancel");
        }
        promiseExecutor = {resolve, reject}
      })
    }

    const showSubContextMenu = (evt:MouseEvent, item:MenuItem)=>{
      evt.preventDefault()
      evt.stopPropagation()
      mSubMenu.value = item.menus
      nextTick(()=> {
        const cx = evt.pageX
        const cy = evt.pageY
        const fw = window.innerWidth
        const fh = window.innerHeight
        const bw = subMenuBody.value.clientWidth
        const bh = subMenuBody.value.clientHeight
        //限制菜单不能超出屏幕
        let y = cy - (bh/2)
        if(y+bh+5 >= fh){
          mSubPos.y = fh - bh - 5
        }else{
          mSubPos.y = y
        }
        const rect = menuBody.value.getBoundingClientRect()
        let x = rect.x + rect.width - 10
        if(x+bw > fw){
          mSubPos.x = rect.x - bw + 10
        }else{
          mSubPos.x = x
        }
      })
    }

    const clickItem = (evt:MouseEvent,item)=>{
      if(item.type === 'item' && !item.disabled){
        item?.click?.call(item)
        if(promiseExecutor!=null){
          promiseExecutor.resolve(item)
          promiseExecutor = null
        }
      }else{
        evt.preventDefault()
        evt.stopPropagation()
      }
    }

    const onMouseover = (evt:MouseEvent,item:MenuItem)=>{
      if(item.disabled){
        if(mParentMenu!=null){
          mParentMenu.value._expand = false
          mParentMenu.value = null
        }
        mSubMenu.value = null
        return
      }
      if(mParentMenu.value){
        if(mParentMenu.value!=item){
          mParentMenu.value._expand = false
          mParentMenu.value = null
        }
      }
      if(item.type !== "menu"){
        mSubMenu.value = null
        return
      }
      mParentMenu.value = item
      if(!item._expand){
        item._expand = true
        showSubContextMenu(evt, item)
      }
    }

    const result = {subMenuBody,menuBody,mPos, mWidth,mParentMenu,mSubPos, mSubMenu, mMenu, mShow, hideContextMenu,showContextMenu,clickItem,onMouseover}
    props.observer(result)
    return result
  }
}
</script>

<style scoped lang="scss">
.menu-overlay{
  user-select: none;
  z-index: 9999999999;
  position: fixed;
  width: 100vw;
  height: 100vh;
  top: 0;
  left: 0;
  .menu-body{
    color: #222;
    font-size: 13px;
    margin: 0;
    padding: 5px 4px;
    border: 0.5px solid #cdcdcd;
    border-radius: 8px;
    background-color: rgba(234, 232, 233, 0.55);
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.2);
    backdrop-filter: blur(35px);
    position: absolute;
    li{
      border-radius: 3px;
      display: block;
      list-style: none;
      cursor: default;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      margin-bottom: 1px;
      & > *{
        pointer-events: none;
      }
      &.item,&.menu{
        padding: 0 10px;
        height: 30px;
        transition: all .2s;
        color: #222222;
        display: flex;
        align-items: center;
        position: relative;
        &:hover,&.expand{
          background: rgba(104, 161, 249, 0.75);
          color: #fff;
        }
        &.expand{
          .menu-icon{
            transform: rotateX(180deg);
          }
        }
        &.disabled{
          color: #a8a8a8!important;
          background: unset!important;
        }
        .icon{
          margin-right: 8px;
        }
        .menu-icon{
          position: absolute;
          right: 2px;
          top: 5px;
          transition: all linear .1s;
        }
      }
      &.line{
        pointer-events: none;
        height: 0.5px;
        margin: 3px auto;
        width: calc(100% - 10px);
        background: rgba(190, 190, 190, 0.75);
      }
      &.title{
        padding: 3px 5px 5px 5px;
        color: #666666;
        font-size: 12px;
      }
    }
  }
}
.v-theme--dark{
  .menu-overlay{
    .menu-body{
      color: #ffffff;
      border: 0.5px solid #666666;
      background-color: rgba(30, 30, 30, 0.75);
      box-shadow: 0 2px 6px 0 rgba(135, 135, 135, 0.1);
      li{
        &.item{
          color: rgba(255,255,255,.9);
          &.disabled{
            color: #a8a8a8!important;
            background: unset!important;
          }
        }
        &.line{
          background: rgba(105, 105, 105, 0.75);
        }
        &.title{
          color: #eee;
        }
      }
    }
  }
}
</style>