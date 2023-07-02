<template>
  <div class="fill-height">
    <slot name="default" @keydown="handleEvent"></slot>
    <div class="search-menu" v-on:contextmenu.prevent.capture v-on:keydown="handleEvent">
      <transition name="fade">
        <v-card
            v-if="show"
            class="search-card"
            width="350">
          <div class="search-menu-body">
            <v-text-field class="terminal-search-input" single-line ref="searchInput" variant="outlined" density="compact" persistent-placeholder hide-details v-model="value" :label="placeholder">
              <div style="transform: scale(0.8) translateX(25px);">
                <v-btn v-tooltip="$t('common.case-sensitive')" class="mr-1" density="compact" variant="text" icon="mdi-format-letter-case" :color="caseSensitive ? theme.current.value.colors.primary:'gray'" @click="caseSensitive=!caseSensitive"></v-btn>
                <v-btn v-tooltip="$t('common.whole-word')" class="mr-1" density="compact" variant="text" icon="mdi-tray" :color="wholeWord ? theme.current.value.colors.primary:'gray'" @click="wholeWord=!wholeWord"></v-btn>
                <v-btn v-tooltip="$t('common.regex')" class="mr-1" density="compact" variant="text" icon="mdi-regex" :color="regex ? theme.current.value.colors.primary:'gray'" @click="regex=!regex"></v-btn>
              </div>
            </v-text-field>

            <v-divider
                class="search-menu-divider"
                vertical
            ></v-divider>

            <v-btn :disabled="value.length === 0"  @click="$emit('findPrevious',value)" variant="text" density="compact" icon="mdi-chevron-up"></v-btn>
            <v-btn :disabled="value.length === 0" @click="$emit('findNext',value)" variant="text" density="compact" icon="mdi-chevron-down"></v-btn>
            <v-btn :color="theme.current.value.colors.error" variant="text" density="compact" icon="mdi-window-close" @click="close"></v-btn>
          </div>
        </v-card>
      </transition>
    </div>
  </div>
</template>

<script lang="ts">
import { useTheme } from 'vuetify'
import {ref, toRefs, watch} from "vue";
import {VTextField} from "vuetify/components";
import lodash from "lodash";

const matchFunc = (content:string,attr:{caseSensitive:boolean,regex:boolean,wholeWord:boolean,searchStr:string,searchStrLower?:string}):boolean=>{
  if(!content){
    return false
  }
  if(!attr.caseSensitive){
    //不验证大小写时，将内容统一转为小写
    content = content.toLowerCase()
    attr.searchStrLower = attr.searchStr.toLowerCase()
  }
  if(attr.regex){
    //正则匹配
    return new RegExp(attr.searchStr).test(content)
  }else{
    if(attr.wholeWord){
      //转义搜索内容，防止特殊符号报错
      const escapeRegExp = attr.searchStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      //全词搜索
      return new RegExp("\\b" + escapeRegExp + "\\b").test(content)
    }else{
      //判断字符串是否存在，并是否验证大小写
      return content.includes(attr.caseSensitive?attr.searchStr:attr.searchStrLower)
    }
  }
}

export {
  matchFunc
}

export default {
  emits: ["findPrevious","findNext","search","close","update:modelValue","update:caseSensitive","update:wholeWord","update:regex","update:show"],
  props: {
    placeholder: {
      type: String,
    },
    modelValue: {
      type: String,
      default: ""
    },
    show: {
      type: Boolean,
      default: false
    },
    caseSensitive: {
      type: Boolean,
      default: false
    },
    wholeWord: {
      type: Boolean,
      default: false,
    },
    regex: {
      type: Boolean,
      default: false
    },
    disabled: {
      type: Boolean,
      default: false
    }
  },
  setup(props,ctx) {
    const placeholder = ref(props.placeholder)
    const value = ref(props.modelValue)
    const caseSensitive = ref(props.caseSensitive)
    const wholeWord = ref(props.wholeWord)
    const regex = ref(props.regex)

    const theme = useTheme()
    const searchInput = ref<any>()


    watch(()=>value.value,(v)=>{
      ctx.emit("update:modelValue",v)
    })
    watch(()=>caseSensitive.value,(v)=>{
      ctx.emit("update:caseSensitive",v)
    })
    watch(()=>wholeWord.value,(v)=>{
      ctx.emit("update:wholeWord",v)
    })
    watch(()=>regex.value,(v)=>{
      ctx.emit("update:regex",v)
    })

    const handleEvent = (evt:KeyboardEvent)=>{
      if(props.disabled){
        return
      }
      //search key
      if(evt.ctrlKey || evt.metaKey){
        if(evt.key.toLowerCase() === "f"){
          switchShow()
          evt.preventDefault()
          evt.stopPropagation()
        }
      }
      //esc key
      else if(evt.key === "Escape"){
        close()
        evt.preventDefault()
        evt.stopPropagation()
      }
      //enter key
      else if(evt.key === "Enter"){
        onSearch()
        evt.preventDefault()
        evt.stopPropagation()
      }
    }

    const close = ()=>{
      if(!props.show){
        return
      }
      ctx.emit("update:show",false)
      ctx.emit("close")
    }

    const switchShow = ()=>{
      let show = props.show
      show = !show
      ctx.emit("update:show",show)
      if(show){
        lodash.delay(() => {
          searchInput.value.focus();
        }, 100)
      }else{
        ctx.emit("close")
      }
    }

    const onSearch = ()=>{
      if(value.value){
        ctx.emit("search",value.value)
      }
    }
    return {placeholder,value,caseSensitive,wholeWord,regex,theme,searchInput,handleEvent,close,switchShow,onSearch}
  }
}
</script>

<style lang="scss">
  .search-menu {
    z-index: 1000;
    position: fixed;
    right: 30px;
    top: 30px;
    .v-card {
      padding: 10px 3px 10px 10px;
      .search-menu-body {
        display: flex;
        justify-content: center;
        align-items: center;
        .v-field__input{
          flex-direction: row-reverse!important;
        }
      }
      .search-menu-divider {
        height: 30px;
        margin: 5px 5px 0 10px;
      }
    }
  }
  .terminal{
    height: 100%;
  }
</style>