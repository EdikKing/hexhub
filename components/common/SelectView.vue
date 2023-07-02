<template>
  <div class="selects-view" ref="selectsView" :style="style" v-on:mousedown.stop.prevent>
    <v-progress-linear
        v-if="loading"
        indeterminate
        absolute
    ></v-progress-linear>
    <div class="title" v-if="title">{{title}}</div>
    <ul>
      <span class="empty-data">暂无数据</span>
      <template v-for="(item,idx) in items" :key="idx">
        <template v-if="getChildren(item) && isShowItem(item)">
          <li class="selects-title">{{getLabel(item)}}</li>
          <li v-for="(subItem,idx) in getChildren(item)"
              v-show="isShowItem(subItem)"
              :key="idx"
              :class="`sub-item ${cursorSelectItem === subItem?'cursor-selected':''} ${getValue(subItem) === value?' selected':''} ${isDisabled(subItem)?'disabled':''}`"
              v-on:click="clickItem(subItem)"
              v-on:contextmenu.prevent="$emit('onContextItem',subItem)"
          >
            <template v-if="multiple">
              <template v-if="modelValue?.includes(getValue(subItem))">
                <v-btn variant="text" :color="isDisabled(subItem)?null:'primary'" icon="mdi-checkbox-marked" size="small" density="compact"></v-btn>
              </template>
              <template v-else>
                <v-btn variant="text" icon="mdi-checkbox-blank-outline" size="small" density="compact"></v-btn>
              </template>
            </template>
            <div class="item-content">
              <v-icon v-if="getIcon(subItem)" size="small" class="icon" :icon="getIcon(subItem)"></v-icon>
              <span >{{getLabel(subItem)}}</span>
            </div>
          </li>
        </template>
        <template v-else>
          <li
              :class="`item ${cursorSelectItem === item?'cursor-selected':''} ${getValue(item) === value?' selected':''} ${isDisabled(item)?'disabled':''}`"
              v-on:click="clickItem(item)"
              v-if="isShowItem(item)"
              v-on:contextmenu="$emit('onContextItem',$event,item)"
          >
            <template v-if="multiple">
              <template v-if="modelValue?.includes(getValue(item))">
                <v-btn variant="text" :color="isDisabled(item)?null:'primary'" icon="mdi-checkbox-marked" size="small" density="compact"></v-btn>
              </template>
              <template v-else>
                <v-btn variant="text" icon="mdi-checkbox-blank-outline" size="small" density="compact"></v-btn>
              </template>
            </template>
            <div class="item-content">
              <v-icon v-if="getIcon(item)" class="icon" size="small" :icon="getIcon(item)"></v-icon>
              <span>{{getLabel(item)}}</span>
            </div>
          </li>
        </template>
      </template>
    </ul>
  </div>
</template>

<script lang="ts">
import { List } from 'linqts';
import {PropType} from "#app/compat/capi";
import {nextTick, reactive, ref, shallowRef, watch} from "vue";

export default {
  name: "SelectView",
  props: {
    style: {
      type: [Object,String]
    },
    title: {
      type: String,
    },
    modelValue:{
      type: [Object,Number,Array,String]
    },
    items: {
      type: [Array,Function as PropType<()=>any[]>],
      default: [],
    },
    filter: {
      type: [String,Function as PropType<(item:any)=>boolean>]
    },
    labelKey: {
      type: [String,Function as PropType<(item:any)=>string>],
      default: ()=>(item)=>item
    },
    valueKey: {
      type: [String,Function as PropType<(item:any)=>string>],
      default: ()=>(item)=>item
    },
    iconKey: {
      type: [String,Function as PropType<(item:any)=>string>],
      default: null
    },
    childrenKey:  {
      type: [String,Function as PropType<(item:any)=>null|undefined|false|any[]>],
      default: null
    },
    disabledKey: {
      type: [String,Function as PropType<(item:any)=>string>],
      default: null
    },
    multiple:{
      type: Boolean,
      default: false
    }
  },
  emits: ["update:modelValue","clickItem","onContextItem"],
  setup(props,ctx){
    const loading = ref(false)
    const selectsView = ref<HTMLElement>()
    const filter = ref(props.filter)
    const value = ref<any>(props.value)
    const items = shallowRef([])

    let cursorSelectIdx = 0
    const cursorSelectItem = ref(null)
    let flatArr = <Array<any>>null

    const isDisabled = (item:any)=>{
      const key = props.disabledKey
      if(!key){
        return null
      }
      if(typeof key === 'string'){
        return item[key]
      }else{
        return key(item)
      }
    }

    const getLabel = (item:any)=>{
      const key = props.labelKey
      if(typeof key === 'string'){
        return item[key]
      }else{
        return key(item)
      }
    }

    const getIcon = (item:any)=>{
      const key = props.iconKey
      if(!key){
        return null
      }
      if(typeof key === 'string'){
        return item[key]
      }else{
        return key(item)
      }
    }

    const getChildren = (item:any):any[]=>{
      const key = props.childrenKey
      if(!key){
        return null
      }
      if(typeof key === 'string'){
        return item[key]
      }else{
        return key(item)
      }
    }

    const getValue = (item:any)=>{
      const key = props.valueKey
      if(typeof key === 'string'){
        return item[key]
      }else{
        return key(item)
      }
    }

    const isNotFiltered = (item:any):boolean=>{
      const filter = props.filter
      if (!filter){
        return true
      }
      const isString = typeof filter === "string"
      if(isString){
        const label = <string>getLabel(item)
        if(label){
          return label.includes(filter)
        }else{
          return false
        }
      }else{
        return filter(item)
      }
    }

    const isShowItem = (item:any):boolean=>{
      const filter = props.filter
      if (!filter){
        return true
      }
      const isString = typeof filter === "string"
      const children = getChildren(item)
      if(children){
        return children.some((subItem)=>{
          if(isString){
            const label = <string>getLabel(subItem)
            if(label){
              return label.includes(filter)
            }else{
              return false
            }
          }else{
            return filter(subItem)
          }
        })
      }else{
        if(isString){
          const label = <string>getLabel(item)
          if(label){
            return label.includes(filter)
          }else{
            return false
          }
        }else{
          return filter(item)
        }
      }
    }

    const clickItem = (item:any)=>{
      if(isDisabled(item)){
        return
      }
      const itemValue = getValue(item)
      if(props.multiple){
        const modelValue = <Array<any>>props.modelValue??[]
        const idx = modelValue.indexOf(itemValue)
        if(idx === -1){
          modelValue.push(itemValue)
        }else{
          modelValue.splice(idx,1)
        }
        ctx.emit("update:modelValue",[...modelValue])
      }else{
        ctx.emit("update:modelValue",itemValue)
        ctx.emit("clickItem",item)
      }
    }

    const selectCursor = ()=>{
      const idx = cursorSelectIdx
      if(idx >= 0 && idx < flatArr.length){
        clickItem(flatArr[idx])
      }
    }

    const cursorUp = ()=>{
      if(!cursorSelectItem.value){
        cursorSelectIdx = flatArr.length
      }
      const max = flatArr.length - 1
      const idx = Math.min(cursorSelectIdx - 1,max)
      if(idx < 0){
        return null
      }
      for (let i = idx; i >= 0; i--) {
        const item = flatArr[i]
        if(isNotFiltered(item)){
          cursorSelectIdx = i
          const val = getValue(item)
          cursorSelectItem.value = item
          nextTick(()=>{
            selectsView.value.querySelector("ul>li.cursor-selected")?.scrollIntoView()
          })
          return val
        }
      }
      return null
    }

    const cursorDown = ()=>{
      const idx = cursorSelectIdx + 1
      if(idx < 0){
        return null
      }
      for (let i = idx; i < flatArr.length; i++) {
        const item = flatArr[i]
        if(isNotFiltered(item)){
          cursorSelectIdx = i
          const val = getValue(item)
          cursorSelectItem.value = item
          nextTick(()=>{
            selectsView.value.querySelector("ul>li.cursor-selected")?.scrollIntoView()
          })
          return val
        }
      }
      return null
    }

    const onUpdateItems = (mItems:any[])=>{
      //将所有项及分组子项转换为扁平的一维数组
      flatArr =  new List(mItems).SelectMany((item,idx)=>{
        const child =  getChildren(item)
        if(child){
          return new List(child)
        }else{
          return new List([item])
        }
      }).ToArray()
      items.value = mItems
    }

    const updateItems = (mItems)=>{
      if(mItems instanceof Function){
        mItems =  mItems()
      }
      if(mItems instanceof Promise){
        loading.value = true
        mItems.then((items)=>{
          onUpdateItems(items);
        }).finally(()=>loading.value = false)
      }else{
        onUpdateItems(mItems);
      }
    }

    watch(()=>props.items,updateItems,{immediate: true})

    watch(()=>props.modelValue,(v,lastV)=>{
      if(v!==null&&v!==undefined&&!props.multiple){
        cursorSelectIdx = flatArr.findIndex((item, idx)=>{
          const val = getValue(item)
          if(val === v) {
            value.value = val
            if(!lastV){
              nextTick(()=>{
                selectsView.value.querySelector("ul>li.selected")?.scrollIntoView()
              })
            }
            return true
          }else{
            return false
          }
        })
        if(cursorSelectIdx === -1){
         value.value = null
        }
        cursorSelectItem.value = null
      }
    },{immediate: true})

    watch(()=>props.filter,(v)=>{
      filter.value = v
      cursorSelectItem.value = null
    })

    return {
      loading,
      items,
      selectsView,
      value,
      filter,
      cursorSelectItem,
      updateItems,
      clickItem,
      isDisabled,
      getLabel,
      getIcon,
      getValue,
      getChildren,
      isNotFiltered,
      isShowItem,
      selectCursor,
      cursorUp,
      cursorDown
    }
  }
}
</script>

<style lang="scss" scoped>
.selects-view{
  width: 100%;
  height: 100%;
  user-select: none;
  color: #222;
  font-size: 13px;
  margin: 0;
  padding: 5px;
  border: 0.5px solid #cdcdcd;
  border-radius: 8px;
  background-color: rgba(234, 232, 233, 0.55);
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(35px);
  .title{
    text-align: left;
    color: #666666;
    font-size: 12px;
    padding: 2px;
    line-height: 22px;
    border-bottom: .5px solid rgba(190, 190, 190, 0.75);
  }
  ul{
    max-height: 47vh;
    overflow-y: auto;
    overflow-x: hidden;
    & > :nth-child(1):last-child{
      display: inline-block !important;
    }
    .empty-data{
      padding: 10px 0 5px 0;
      width: 100%;
      min-width: 100px;
      text-align: center;
      display: none;
    }
    li{
      padding: 0 4px;
      border-radius: 3px;
      display: block;
      list-style: none;
      cursor: default;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      margin-bottom: 1px;
      box-sizing: border-box;
      & > *{
        pointer-events: none;
      }
      &.selects{
        width: 100%;
        justify-content: space-between;
      }
      &.cursor-selected{
        border: rgba(104, 161, 249, 0.75) solid 1px;
      }
      &.item,&.sub-item,&.selects{
        height: 26px;
        transition-property: width,background-color,color;
        transition-duration: .35s;
        color: #222222;
        display: flex;
        align-items: center;
        position: relative;
        .item-content{
          display: flex;
          align-items: center;
        }
        &:hover,&.selected{
          background: rgba(104, 161, 249, 0.75);
          color: #fff;
          &.cursor-selected{
            border: #ffffff double 3px;
          }
        }
        &.expand{
          .selects-icon{
            transform: rotateX(180deg);
          }
        }
        &.disabled{
          color: #a8a8a8!important;
          background: unset!important;
        }
        .icon{
          margin: 0 5px 0 0;
        }
        .selects-icon{
          position: absolute;
          right: 2px;
          top: 5px;
          transition: transform .2s,color .2s;
        }
      }
      &.sub-item{
        .item-content {
          margin-left: 5px;
        }
      }
    }
  }
}
.v-popper--theme-dark{
  .selects-view{
    color: #ffffff;
    border: 0.5px solid #666666;
    background-color: rgba(30, 30, 30, 0.75);
    box-shadow: 0 2px 6px 0 rgba(135, 135, 135, 0.1);
    .title {
      color: #eee;
      border-bottom: .5px solid rgba(105, 105, 105, 0.75);
    }
    ul{
      li{
        &.menu{
          color: rgba(255,255,255,.9);
        }
        &.item{
          color: rgba(255,255,255,.9);
          &.disabled{
            color: #a8a8a8!important;
            background: unset!important;
          }
          &:hover,&.selected{
            &.cursor-selected{
              border: rgba(255,255,255,.9) double 3px;
            }
          }
        }
      }
    }
  }
}
</style>