<template>
  <div
      :class="dense?'file-browser dense':'file-browser'"
      @keydown.esc="back"
      v-on:drop.stop.prevent
      v-on:dragenter.stop.prevent
      v-on:dragover.stop.prevent
  >
    <v-progress-linear :indeterminate="true" :active="loading" :height="2"></v-progress-linear>
    <v-toolbar :density="dense?'compact':'comfortable'">
      <v-toolbar-title style="min-width: 90px;flex: 0;margin-left: 10px">{{title}}</v-toolbar-title>

      <div style="flex: 1;position: relative">
        <v-text-field
            ref="searchInput"
            v-if="showSearch"
            density="compact"
            :disabled="loading || (errorMsg !== null && errorMsg !== '')"
            hide-details
            v-model="search"
            style="transform: scale(0.8) translateX(-12.5%);width: 122.5%;position: relative;"
            label="Search"
            persistent-placeholder
            variant="outlined"
            clearable
            v-on:keydown="(evt)=>{if((evt.ctrlKey || evt.metaKey) && evt.key.toLowerCase() === 'f'){evt.stopPropagation();evt.preventDefault();showSearch=false}}"
        ></v-text-field>

        <v-combobox
            v-else
            @update:search="updatePathAutoCompleteItems()"
            ref="pathInput"
            :loading="pathLoading"
            density="compact"
            class="path-input"
            :disabled="loading || (errorMsg !== null && errorMsg !== '')"
            hide-details
            v-model="inputDir"
            style="transform: scale(0.8) translateX(-12.5%);width: 122.5%;position: relative;"
            label="Path"
            persistent-placeholder
            variant="outlined"
            :items="pathAutoCompleteItems"
            @keydown.enter="cd(inputDir)"
        >
          <template #prepend-inner>
            <v-icon icon="mdi-home-import-outline" style="transform: rotateY(180deg)" v-on:click.stop="cd('')" v-on:mousedown.stop></v-icon>
          </template>
          <template #append-inner>
            <div style="border-radius: 4px;display: flex;padding:0 2px;background: rgba(168,168,168,.05);border: rgba(168,168,168,.75) solid 1px;transform: translate(4px,-1px)" v-on:mousedown.stop>
              <v-icon icon="mdi-chevron-right" v-on:click.stop="back"></v-icon>
              <v-divider vertical color="rgba(148,148,148,0.2)"></v-divider>
              <v-icon icon="mdi-chevron-up" v-on:click.stop="open('..',true)"></v-icon>
            </div>
          </template>
        </v-combobox>
      </div>

      <v-btn icon="mdi-chevron-up" :size="dense?'small':'default'" density="comfortable" v-on:click="showSearch=false" v-if="showSearch"></v-btn>
      <v-btn icon="mdi-magnify" :size="dense?'small':'default'" density="comfortable" v-on:click="showSearch=true" v-else></v-btn>

      <v-dropdown
        placement="auto"
        :delay="{show: 150,hide: 450}"
        :triggers="['hover']"
        :popperTriggers="['hover']"
        :handleResize="true"
        :disabled="!roots"
        @apply-show="showTree=true"
        @apply-hide="showTree=false"
        :theme="theme.global.name.value"
      >
        <v-btn icon="mdi-chevron-down" :size="dense?'small':'default'" density="comfortable" :class="showTree?'show-tree-btn active':'show-tree-btn'" :ripple="false" v-on:mouseenter="()=>{if(!showTree)updateTree()}"></v-btn>
        <template #popper>
          <v-card rounded :loading="treeLoading">
            <base-tree class="tree-container" default-open v-model="treeItems" :watermark="false">
              <template #default="{ node:item, stat }">
                <div class="tree-item" v-ripple v-on:click="doClickTree(item,stat)">
                  <v-progress-circular
                      size="x-small"
                      style="margin-left: 7px;margin-right: 7px"
                      width="2"
                      v-if="item.loading"
                      indeterminate>
                  </v-progress-circular>
                  <v-icon size="small" v-else-if="!item.loaded" class="first-icon">
                    mdi-folder-question
                  </v-icon>
                  <v-icon size="small" v-else-if="stat.open" class="first-icon">
                    mdi-folder-open
                  </v-icon>
                  <v-icon size="small" v-else class="first-icon">
                    mdi-folder
                  </v-icon>
                  <span class="text">
                    {{item.name}}
                  </span>
                  <div class="tree-btn-group">
                    <v-btn size="small" density="comfortable" variant="text" icon="mdi-folder-refresh-outline" v-on:click.stop="doClickTree(item,stat,true)"></v-btn>
                    <v-btn size="small" density="comfortable" variant="text" icon="mdi-arrow-right-circle-outline" v-on:click.stop="cd(item.path)"></v-btn>
                  </div>
                </div>
              </template>
            </base-tree>
          </v-card>
        </template>
      </v-dropdown>
      <v-menu transition="slide-x-transition">
        <template v-slot:activator="{ props }">
          <v-btn icon="mdi-dots-vertical" :size="dense?'small':'default'" density="comfortable" v-bind="props"></v-btn>
        </template>
        <v-list :width="160" density="compact">
          <v-list-item :title="$t('common.refresh')" v-ripple v-on:click="refresh">
            <template v-slot:prepend>
              <v-icon icon="mdi-refresh" class="mr-4 ml-1"></v-icon>
            </template>
          </v-list-item>
          <slot name="menu"></slot>
          <v-list-item title="显示隐藏文件" density="compact" :active="showHideFile" v-on:click="showHideFile=!showHideFile">
            <template v-slot:prepend="{isActive}">
              <v-checkbox-btn density="compact" class="mr-2" :model-value="isActive"></v-checkbox-btn>
            </template>
          </v-list-item>
        </v-list>
      </v-menu>
    </v-toolbar>
    <v-divider></v-divider>
    <div class="total-info">
      共 {{totalInfo.files}} 个文件 和 {{totalInfo.dirs}} 个文件夹，大小总计：{{totalInfo.size}}
    </div>
    <v-divider></v-divider>
    <div class="alert-container" v-if="errorMsg!=null">
      <v-card class="mx-auto pt-5" width="350px" variant="flat" elevation="4">
        <v-list-item three-line>
          <template v-slot:default>
            <v-list-item-title class="headline" :style="{color:'rgb(var(--v-theme-error))'}">
              ERROR
            </v-list-item-title>
            <div class="overline" >加载过程中发生了错误</div>
            <h6>{{errorMsg}}</h6>
          </template>

          <template v-slot:prepend>
            <v-avatar size="65" color="error">
              <v-icon size="large">mdi-alert</v-icon>
            </v-avatar>
          </template>
        </v-list-item>

        <v-divider class="ml-2 mr-2"></v-divider>
        <v-card-actions>
          <v-row class="pa-3" justify="end">
            <v-btn text color="primary" v-on:click="back" :disabled="lastDir===null || loading">返回</v-btn>
            <v-btn text color="error" :loading="loading" v-on:click="refresh" >重试</v-btn>
          </v-row>
        </v-card-actions>
      </v-card>
    </div>

    <div v-show="errorMsg==null" class="advanced-table-wrapper">
      <advanced-table
          @copy="$emit('copy',$event)"
          @paste="$emit('paste',$event)"
          @delete="$emit('delete',$event)"
          @cut="$emit('cut',$event)"
          :id="id"
          :group="group"
          ref="table"
          @search="showSearch=!showSearch"
          :headers="headers"
          :items="list"
          :sort-asc="false"
          sort-key="type"
          :row-height="isRoot?45:30"
          :search-provider="(idx,item)=>item.name"
          :item-class="getItemClass"
          @sort="doSort"
          @clickItem="clickItem"
          @contextMenuItem="contextMenuItem"
          @receiveData="$emit('receiveData',$event)"
          @receiveFile="$emit('receiveFile',$event)"
      >
        <template #td="{item,key,dragging}">
          <td v-if="key==='name'" class="text-left pl-2">
            <div
                class="file-icon"
                v-tooltip="{ content: dragging?undefined:item.name, delay:{show: 1500,hide: 0} }"
                v-bind="item._static?undefined:{style:'cursor: pointer',draggable:true}"
                v-on:mousedown="(evt:MouseEvent)=>{if(!evt.shiftKey && !evt.metaKey && !evt.ctrlKey){evt.stopPropagation()}}"
            >
              <svg class="iconfont" aria-hidden="true">
                <use :xlink:href="item._icon"></use>
              </svg>
              <span>{{item.name}}</span>
            </div>
          </td>
          <td v-else>
            {{getTdText(item,key)}}
          </td>
        </template>
      </advanced-table>
    </div>
  </div>
</template>

<script lang="ts">
import {PropType} from "nuxt/dist/app/compat/capi";
import {getFileByExt} from "~/lib/util/file-icons"
import {nextTick, ref, shallowRef, watch} from "vue"
import common, {isRootPath, pathJoin, pathName, pathParent} from "~/lib/util/common";
import lodash from "lodash";
import {useTheme} from 'vuetify'
import AdvancedTable, {TableHeader} from "~/components/common/AdvancedTable.vue";
import {Toast} from "~/lib/layer";
import SmallAutoComplete from "~/components/common/SmallAutoComplete.vue";
import {BaseTree} from "@he-tree/vue";

const rootTypes= Object.freeze([
  {},
  {
    "icon":"#icon-morenwenjianjia"
  },
  {
    "icon":"#icon-yonghu"
  },
  {
    "icon":"#icon-zhuomian",
    "name":"桌面"
  },
  {
    "icon":"#icon-wendang",
    "name":"文档"
  },
  {
    "icon":"#icon-xiazai",
    "name":"下载"
  },
])

const headers:Array<TableHeader> = <Array<TableHeader>>Object.freeze([
  {title:'名称',key:'name',minWidth:160,sortable: true},
  {title:'修改时间',key:'time',minWidth:120,sortable: true},
  {title:'类型',key:'type',minWidth:70,sortable: true},
  {title:'大小',key:'size',minWidth:60,sortable: true},
  {title:'权限',key:'mode',minWidth:70,sortable: true},
  {title:'用户/组',key:'userGroup',minWidth:70,sortable: true},
])

interface FileItem {
  name:string
  isDir:boolean
  isLink:boolean
  updatedTime:number
  size:number
  user:string
  mode:string
  group:string
  target:string
  _modeText: string
  _userGroupText: string
  _typeText: string
  _icon: string
  _sizeText: string
  _timeText: string
  _relativePath: string
  _static: boolean
  _dropable: boolean
}


interface RootItem {
  type: number
  name: string
  path: string
}

enum RootDirType{
  Root = 1,
  User,
  Desktop,
  Document,
  Download
}
export {FileItem,RootItem,RootDirType}

export default {
  name: "FileBrowser",
  components:{BaseTree, SmallAutoComplete, AdvancedTable},
  props: {
    id: {
      type: String,
    },
    group: {
      type: String,
    },
    separator: {
      type: String,
    },
    dense: {
      type: Boolean,
      default: false
    },
    getFilesCallback: {
      type: Function as PropType<(path: string) => Promise<FileItem[]>>,
    },
    roots: {
      type: Array as PropType<Array<RootItem>>,
    },
    title: {
      type: String,
      default: ""
    },
    path : {
      type: String,
      default: ""
    }
  },
  emits: ["contextMenuItem","init","openFile","update:path","onChangePath","copy","paste","cut","delete","receiveData","receiveFile"],
  setup(props,ctx){
    const pathAutoCompleteItems = shallowRef<string[]>([])
    let rawList = shallowRef<Array<FileItem>>([])
    const theme = useTheme()
    const showSearch = ref(false)
    const search = ref(null)
    const showTree = ref(false)
    const treeItems = ref([])
    const openDir = ref([])
    const isRoot = ref(false)
    const totalInfo = ref({
      files: 0,
      dirs: 0,
      size: '0'
    })
    const showHideFile = ref(true)
    const errorMsg = ref(null)
    const loading = ref(false)
    const list = ref([])
    let inputDir = ref("")

    const searchInput = ref()
    const pathInput = ref()
    const pathLoading = ref(false)
    const treeLoading = ref(false)
    const table = ref()

    let lastDir = ""

    const fileListCache = {
      files: <FileItem[]>[],
      path: ""
    }

    const getFiles = async (path: string, force=false)=> {
      if(!path){
        return []
      }
      if(path!==fileListCache.path || force){
        fileListCache.files = await props.getFilesCallback(path)
        fileListCache.path = path
      }
      return fileListCache.files
    }

    const updatePathAutoCompleteItems = lodash.throttle(async () => {
      pathLoading.value = true
      try {
        const path = inputDir.value
        let dir = path
        if(!dir.endsWith(props.separator)){
          dir = pathParent(path)
        }
        const files = await getFiles(dir)
        const paths = files.filter((f) => f.isDir && f.name !== "..").map((f) => {
          return pathJoin(props.separator, [dir, f.name])
        })
        paths.push(dir)
        pathAutoCompleteItems.value = paths
      }finally {
        pathLoading.value = false
      }
    },350,{trailing:true,leading:true});

    const contextMenuItem = (evt:MouseEvent,items:FileItem[])=>{
      ctx.emit("contextMenuItem",evt,items)
    };
    const refresh = ()=>{
      if(props.roots){
        cd(props.path,true)
      }else{
        //如果未初始化则触发重新初始化
        ctx.emit("init")
      }
    };
    const back = ()=>{
      cd(lastDir,true)
    };
    const showRoots = ()=>{
      if(!props.roots){
        hideLoading()
        return
      }
      errorMsg.value = null
      totalInfo.value = {
        files: 0,
        dirs: props.roots.length,
        size: '0',
      }
      list.value = props.roots.map((item)=>{
        return {
          isDir: true,
          isLink: false,
          name: rootTypes[item.type].name??item.name,
          _typeText: "文件夹",
          _icon: rootTypes[item.type].icon,
          _timeText: '-',
          _sizeText: '-',
          _modeText: '-',
          _userGroupText: '-/-',
          _relativePath: item.path,
          _static: true,
        }
      })
      hideLoading()
    };
    const clickItem = (item:FileItem)=>{
      if(loading.value){
        return
      }
      if(item.isDir){
        open(item._relativePath,item.isDir).finally(()=>{

        })
      }else{
        ctx.emit("openFile",item)
      }
    };
    const open = async (file, isDir)=>{
      //如果在全局根目录则直接cd
      if (isRoot.value) {
        if(file !== ".."){
          await cd(file)
        }
      } else {
        let path
        if (file === "..") {
          const firstIdx = props.path.indexOf(props.separator)
          const lastIdx = props.path.lastIndexOf(props.separator)

          //如果只有一个分割线
          if (firstIdx === lastIdx) {
            //如果分割线在最后则说明是根目录，根目录再往上就是全局根目录
            if (lastIdx === props.path.length - 1) {
              path = ""
            } else {
              path = props.path.substring(0, lastIdx + 1)
            }
          } else {
            path = props.path.substring(0, lastIdx)
          }
        } else {
          path = common.pathJoin(props.separator, [props.path, file])
        }
        await cd(path)
      }
    };

    const getTdText = (item:FileItem,key:string):string=>{
      switch (key){
        case "name":
          return item.name
        case "time":
          return item._timeText
        case "type":
          return item._typeText
        case "size":
          return item._sizeText
        case "mode":
          return item._modeText
        case "userGroup":
          return item._userGroupText
      }
      return ""
    };

    const doFilter = ()=>{
      const searchVal = search.value
      const hideFile = !showHideFile.value
      if(hideFile || searchVal){
        return rawList.value.filter((item)=>{
          if(item.isDir && item.name === '..'){
            return true
          }
          if(!item.name.includes(searchVal)){
            return false
          }
          if(hideFile){
            return !item.name.startsWith(".")
          }
          return true;
        });
      }
      return rawList.value
    };

    const doSort = (type:string,asc:boolean)=>{
      if(isRoot.value){
        return
      }
      let oldList = list.value
      let newList;
      switch (type) {
        case "name":
          if(asc){
            //升序
            newList = oldList.sort((a,b)=>{
              if(a.isDir && a.name === '..'){
                return -1
              }else if(b.isDir && b.name === '..'){
                return 1
              }
              return a.name.localeCompare(b.name)
            })
          }else {
            //降序
            newList = oldList.sort((b, a) => {
              if(b.isDir && b.name === '..'){
                return -1
              }else if(a.isDir && a.name === '..'){
                return 1
              }
              return a.name.localeCompare(b.name)
            })
          }
          break
        case "time":
          if(asc){
            //升序
            newList = oldList.sort((a,b)=>{
              if(a.isDir && a.name === '..'){
                return -1
              }else if(b.isDir && b.name === '..'){
                return 1
              }
              return a.updatedTime - b.updatedTime
            })
          }else {
            //降序
            newList = oldList.sort((b,a)=>{
              if(b.isDir && b.name === '..'){
                return -1
              }else if(a.isDir && a.name === '..'){
                return 1
              }
              return a.updatedTime - b.updatedTime
            })
          }
          break
        case "size":
          if(asc){
            //升序
            newList = oldList.sort((a,b)=>{
              if(a.isDir && a.name === '..'){
                return -1
              }else if(b.isDir && b.name === '..'){
                return 1
              }
              return a.size - b.size
            })
          }else{
            //降序
            newList = oldList.sort((b,a)=>{
              if(b.isDir && b.name === '..'){
                return -1
              }else if(a.isDir && a.name === '..'){
                return 1
              }
              return a.size - b.size
            })
          }
          break
        case "mode":
          if(asc){
            //升序
            newList = oldList.sort((a,b)=>{
              if(a.isDir && a.name === '..'){
                return -1
              }else if(b.isDir && b.name === '..'){
                return 1
              }
              return a._modeText.localeCompare(b._modeText)
            })
          }else{
            //降序
            newList = oldList.sort((b,a)=>{
              if(b.isDir && b.name === '..'){
                return -1
              }else if(a.isDir && a.name === '..'){
                return 1
              }
              return a._modeText.localeCompare(b._modeText)
            })
          }
          break
        case "userGroup":
          if(asc){
            //升序
            newList = oldList.sort((a,b)=>{
              if(a.isDir && a.name === '..'){
                return -1
              }else if(b.isDir && b.name === '..'){
                return 1
              }
              return a._userGroupText.localeCompare(b._userGroupText)
            })
          }else{
            //降序
            newList = oldList.sort((b,a)=>{
              if(b.isDir && b.name === '..'){
                return -1
              }else if(a.isDir && a.name === '..'){
                return 1
              }
              return a._userGroupText.localeCompare(b._userGroupText)
            })
          }
          break
        case "type":
          newList = oldList.sort((a,b)=> {
            //不管任何排序方式，".."上级目录永远在最上面
            if(a.name === '..'){
              return -1
            }else if(b.name === '..'){
              return 1
            }
            //都是目录，则按名称排序
            //否则文件夹和文件类型排序
            if(a.isDir && b.isDir){
              return a.name.localeCompare(b.name)
            }else if(a.isDir){
              return asc?1:-1
            }else if(b.isDir){
              return asc?-1:1
            }else{
              if(asc){
                return a._typeText.localeCompare(b._typeText)
              }else{
                return b._typeText.localeCompare(a._typeText)
              }
            }
          })
          break
      }
      list.value = newList
    };

    const showLoading = ()=>{
      loading.value = true;
    };

    const showError = (err)=>{
      errorMsg.value = err;
      hideLoading();
    };

    const hideLoading = ()=>{
      loading.value =false;
    };

    const doClickTree = async(item,stat,force=false)=>{
      if(item.loading){
        return
      }
      if(!item.loaded || force){
        await loadTree(item,force)
         treeItems.value = lodash.clone(treeItems.value)
        stat.open = true
      }else{
        stat.open = !stat.open
      }
    }

    const loadTree = async(item,force=false)=>{
      item.loading = true
      return getFiles(item.path,force).then((currentList)=>{
        let dirs = []
        const mShowHideFile = showHideFile.value
        currentList.forEach((file)=>{
          if(file.isDir && file.name!=".." && (mShowHideFile||!file.name.startsWith("."))){
            dirs.push({
              name: file.name,
              path: common.pathJoin(props.separator,[item.path,file.name]),
              children: [],
              loaded: false,
            })
          }
        })
        item.children = dirs
        item.loaded = true
      }).catch((e)=>{
        Toast.error(e.message)
      }).finally(()=>{
        item.loading = false
      })
    };

    const updateTree = async () => {
      if (!props.roots) {
        return;
      }

      treeLoading.value = true
      try {
        const tree = new Array(props.roots.length)
        let notLoad = true
        //排序路径字符串越长越排前面
        const roots = props.roots.sort((a, b) => b.path.length - a.path.length)
        for (let i = 0; i < tree.length; i++) {
          let root = roots[i]
          let item = {
            name: root.name,
            path: root.path,
            children: [],
            loaded: false,
          }
          if (props.path.startsWith(item.path) && notLoad) {
            const currentOpenDir = []
            notLoad = false
            const subPath = props.path.substring(item.path.length)
            const subPaths = subPath.split(props.separator).filter((name) => name !== '')
            let currentItem = item
            //只显示最后一个目录的所有同级目录
            if (subPaths.length === 1) {
              await loadTree(item)
            }
            for (let j = 0; j < subPaths.length; j++) {
              currentOpenDir.push(currentItem.name)
              const name = subPaths[j]

              let nextItem = {
                name: name,
                path: common.pathJoin(props.separator, [currentItem.path, name]),
                children: [],
                loaded: false,
              }
              //只显示最后一个目录的所有同级目录
              if (j === subPaths.length - 2) {
                await loadTree(nextItem)
              }
              currentItem.children[0] = nextItem
              currentItem = nextItem
            }
            openDir.value = currentOpenDir
          }
          tree[i] = item
        }
        treeItems.value = tree
      }finally {
        treeLoading.value = false
      }
    };

    const cd = async (path:string,force:boolean=false)=>{
      // //去除末尾分割符，如果只有一个分割符则不trim
      if (path.indexOf(props.separator) !== path.length - 1) {
        path = lodash.trimEnd(path, props.separator)
      }
      //在非强制刷新情况下，如果当前路径跟上次路径相同则不执行
      if(!force&&path === props.path){
        return
      }
      pathAutoCompleteItems.value = []
      //如果当前路径跟上次路径相同则为刷新，不更新上次路径和触发路径变化事件
      if(path !== props.path){
        lastDir = props.path
        ctx.emit("update:path", path)
        inputDir.value = path
        ctx.emit("onChangePath",path)
      }
      //处理文件列表数据
      try {
        showLoading()
        //如果路径为空字符串则直接显示根目录
        if(path === ""){
          isRoot.value = true
          showRoots()
        }else {
          try {
            let currentList = await getFiles(path,true)
            //..返回上级
            currentList.unshift(<FileItem>{
              isDir: true,
              name: "..",
              _static: true
            })
            rawList.value = currentList
            errorMsg.value = null
            handleFileInfo(currentList)
            list.value = doFilter()
            hideLoading();
          }finally {
            isRoot.value = false
          }
        }
      }catch (e){
        console.log(e)
        showError(e.message)
      }
    };

    const handleFileInfo = (list:FileItem[])=>{
      let currentTotalInfo = {
        files: 0,
        dirs: 0,
        size: '0',
      }
      let totalSize = 0
      list.forEach((item:FileItem)=>{
        item._relativePath = item.name
        if(item.isDir && item.name === '..'){
          item._typeText = "文件夹"
          item._icon = "#icon-wenjianjia"
          item._timeText = '-'
          item._sizeText = '-'
          item._modeText = '-'
          item._userGroupText = '-/-'
          //如果当前路径已经是根目录，则不允许拖拽文件至上级
          item._dropable = !isRootPath(props.separator,props.path)
        }else{
          totalSize += item.size
          item._timeText = common.dateFormat(item.updatedTime,"yyyy-MM-DD HH:mm")
          item._sizeText = common.fileSizeConvert(item.size)
          item._modeText = item.mode??'-'
          item._userGroupText = `${item.user?item.user:'-'}/${item.group?item.group:'-'}`
          item._dropable = item.isDir
          if(item.isDir){
            currentTotalInfo.dirs += 1
            item._typeText = "文件夹"
            item._icon = "#icon-wenjianjia"
          }else{
            currentTotalInfo.files += 1
            let ext = common.getFileExt(item.name).toLowerCase()
            if(ext){
              const icon = getFileByExt(ext)
              if(icon){
                item._icon = icon
              }else if(item.mode.includes("x")){
                ext = "执行文件"
                item._icon = "#icon-kezhihangwenjian-exe"
              }else{
                item._icon = "#icon-weizhiwenjian"
              }
            }else{
              if(item.mode.includes("x")){
                ext = "执行文件"
                item._icon = "#icon-kezhihangwenjian-exe"
              }else{
                ext = "未知文件"
                item._icon = "#icon-weizhiwenjian"
              }

            }
            item._typeText = ext
          }
        }
      })
      currentTotalInfo.size = common.fileSizeConvert(totalSize)
      totalInfo.value = currentTotalInfo
    };

    const resize = ()=>{
      table.value.resize()
    };

    const doSearch = lodash.throttle(function (){
      list.value = doFilter()
    },500);

    const getItemClass = (idx:number,item:FileItem):string[]|string=>{
      if(isRoot.value){
        return "root-dir"
      }
      if(item.isLink){
        return "link"
      }
      return null
    }

    watch(()=>showSearch.value,(mNew,old)=>{
      if(mNew){
        nextTick(()=>{
          searchInput.value.focus()
        })
      }else{
        doSearch()
        table.value.focus()
      }
    })

    watch(()=>search.value,()=>{
      doSearch()
    })

    watch(()=>showHideFile.value,()=>{
      list.value = doFilter()
    })

    return {
      table,searchInput,pathInput,rawList,pathAutoCompleteItems,pathLoading,treeItems,treeLoading,
      headers,inputDir,loading,errorMsg,showSearch,lastDir,totalInfo,showTree,isRoot,list,showHideFile,search,theme,
      open,refresh,showError,hideLoading,showLoading,resize,cd,back,getTdText,doSort,clickItem,contextMenuItem,getItemClass,updateTree,loadTree,doClickTree,updatePathAutoCompleteItems
    }

  },
}
</script>

<style lang="scss">
.v-progress-linear{
  position: absolute!important;
  z-index: 3;
}
.v-theme--dark{
  .v-toolbar{
    background: #1d1e21;
  }
  .file-browser {
    .total-info{
      background: #111111;
    }
  }
}
.dense.file-browser{
  user-select: none;
  .total-info {
    padding: 7px;
    font-size: 12px;
  }
  .alert-container {
    height: calc(100% - 80px);
  }
  .advanced-table-wrapper{
    height: calc(100% - 83px);
  }
}
.advanced-table-wrapper{
  height: calc(100% - 91px);
}
.hide-file-switch-label{
  font-size: 14px;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}
.show-tree-btn{
  margin-right: 2px;
  transition: all 350ms;
  &.active{
    transform: rotate(-180deg);
  }
}
.tree-container{
  max-height: 65vh;
  overflow-x: hidden;
  overflow-y: auto;
  .tree-item{
    cursor: default;
    user-select: none;
    display: flex;
    align-items: center;
    min-width: 200px;
    &:hover{
      background: rgba(var(--v-theme-on-background),var(--v-hover-opacity));
    }
    .text{
      max-width: 55vw;
      white-space:nowrap;
      overflow:hidden;
      text-overflow:ellipsis;
      font-size: 14px;
      margin-right: 5px;
    }
    .first-icon{
      margin: 0 7px 0 5px;
    }
    .tree-btn-group{
      margin: 5px 5px 5px auto;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      .v-btn{

      }
    }
  }
}

.file-browser {
  height: 100%;
  width: 100%;
  position: relative;
  .path-input{
    .mdi-menu-down{
      display: none!important;
    }
    .v-combobox__selection{
      overflow: hidden;
      white-space: nowrap;
    }
  }
  .total-info{
    padding: 10px;
    font-size: 14px;
    font-weight: bold;
    text-align: center;
    background: #ffffff;
  }
  .alert-container{
    height: calc(100% - 120px);
    width: 100%;
    display: flex;
    justify-content: center;
    align-content: center;
    flex-direction: column
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
      .link{
        opacity: .7;
      }
      .root-dir{
        font-size: 14px;
        .file-icon {
          .iconfont {
            flex: 0 1 25px;
            width: 25px;
            height: 25px;
            margin-right: 8px
          }
        }
      }
    }
  }
}
</style>
