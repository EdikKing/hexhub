<template>
  <div :class="loading?'ssh-list-root loading':'ssh-list-root'">
    <v-progress-linear indeterminate :height="2" :active="loading" style="position: absolute;z-index: 3"></v-progress-linear>
    <v-toolbar density="compact" height="50" border>
      <v-toolbar-title style="font-size: 16px">
        连接列表
      </v-toolbar-title>
      <simple-input
          ref="searchInput"
          v-on:keydown="onKeydown($event,true)"
          v-model="searchVal"
          placeholder="(名称,IP,User)过滤关键字"
          style="width: 175px;font-size: 12px; height: 25px; border: 1px solid #9e9e9e9e; padding: 2px 3px;margin-right: 7px">
      </simple-input>
      <v-btn icon="mdi-link-plus" size="small" density="comfortable" v-on:click="doOpenCreate"></v-btn>
      <v-btn icon="mdi-folder-plus-outline" size="small" density="comfortable" v-on:click="doCreateDir"></v-btn>
    </v-toolbar>
    <div style="max-height: 350px;min-height: 200px;height: 40vw">
      <advanced-table
          ref="table"
          v-on:keydown="onKeydown($event,false)"
          :headers="headers"
          :items="items"
          after-th
          group="ssh-list"
          :search-provider="(idx,item)=>item.name"
          v-model:sort-key="sortData.key"
          v-model:sort-asc="sortData.isAsc"
          @contextMenuItem="onContextMenuItem"
          @clickItem="doOpen([$event])"
          @delete="doDel"
          @copy="onCopy"
          @cut="onCut"
          @paste="onPaste"
          @receiveData="receiveData"
          >
        <template #empty>
          <div>
            <dark-cloud-ani style="transform: scale(0.8)" model-value="暂无数据,可以鼠标右键创建或导入"></dark-cloud-ani>
            <v-btn size="x-small" variant="outlined" class="ml-4 mt-7" v-on:click="test" :loading="loading">测试一下?</v-btn>
          </div>

        </template>
        <template #td="{item,key,colIdx,idx,header}">
          <td v-if="key==='name'" class="text-left pl-1">
            <div class="first-col" v-bind="item._static?undefined:{style:'cursor: pointer',draggable:true}" v-on:mousedown="(evt:MouseEvent)=>{if(!evt.shiftKey && !evt.metaKey && !evt.ctrlKey){evt.stopPropagation()}}">
              <template v-if="item.type === AssetType.SSH">
                <svg class="iconfont term" aria-hidden="true">
                  <use xlink:href="#icon-terminal-fill"></use>
                </svg>
              </template>
              <template v-else>
                <svg class="iconfont folder" aria-hidden="true">
                  <use xlink:href="#icon-wenjianjia"></use>
                </svg>
              </template>
              <span>{{item.name}}</span>
            </div>
          </td>
          <td v-else-if="key==='host'" class="text-left pl-1">
            {{item.host??'-'}}
          </td>
          <td v-else-if="key==='user'" class="text-left pl-1">
            {{item.user??'-'}}
          </td>
          <td v-else-if="key==='created'" class="text-left pl-1">
            {{item.created?$dateFormat(item.created,"yyyy-MM-DD HH:mm"):'-'}}
          </td>
        </template>
      </advanced-table>
    </div>
    <v-divider></v-divider>
    <ssh-config-editor ref="editor" @refresh="getData"></ssh-config-editor>
    <input ref="importInput" v-on:change="onImportConf" accept="application/json" type="file" style="display: none">
  </div>
</template>

<script lang="ts">
import AdvancedTable from "@/components/common/AdvancedTable.vue";
import SimpleInput from "~/components/common/SimpleInput.vue";
import {Confirm, ContextMenu, Prompt, Toast} from "~/lib/layer";
import {getCurrentInstance, onMounted, onUnmounted, reactive, ref, shallowRef, watch} from "vue";
import {AuthTypes, SshConfModel} from "~/db/model/ssh-conf-model";
import lodash from "lodash";
import {pathEqual, pathParent} from "~/lib/util/common";
import SshConfigEditor from "~/components/ssh/SshConfigEditor.vue";
import DarkCloudAni from "~/components/animation/DarkCloudAni.vue";
import AssetConfigService from "~~/db/service/asset-config-service";
import {AssetConfModel, AssetType} from "~~/db/model/asset-conf-model";
import {useSshListSort} from "~/store/ssh";
import * as clipboard from "clipboard-polyfill";

export default {
  name: "SshList",
  components: {DarkCloudAni, SshConfigEditor, SimpleInput, AdvancedTable},
  props:{
    loading: {
      type:Boolean,
      default: false
    }
  },
  emits: ['open','openExec',"openNewLabel",'openNewWindow','update:loading'],
  setup(props,ctx){
    const editor = ref()
    const table = ref()
    const importInput = ref<HTMLInputElement>()
    const searchInput = ref()
    const proxy = <any>getCurrentInstance().proxy
    const service = AssetConfigService.getInstance()

    const searchVal = ref("")
    let currentPath = "/"
    let copySrc = <{items:AssetConfModel<SshConfModel>[],dirPath:string,isCut:boolean}>null


    const headers = [
      {title:"名称",key:"name",sortable: true,minWidth: 130},
      {title:"Host",key:"host",sortable: true,minWidth: 130},
      {title:"User",key:"user",sortable: true,minWidth: 90},
      {title:"创建时间",key:"created",sortable: true,minWidth: 135},
    ]

    const sortData = reactive(useSshListSort())

    let rawItems = <Array<AssetConfModel<SshConfModel|undefined>>>[]
    const items = shallowRef<Array<AssetConfModel<SshConfModel|undefined>>>([])

    const onContextMenuItem = function (evt:MouseEvent,items:AssetConfModel<SshConfModel|undefined>[]){
      ContextMenu.open(evt,[
        {
          type: "title",
          title: proxy.$t('common.operate'),
        },
        {type: "line"},
        {
          type: "item",
          title: proxy.$t('common.open'),
          icon: "mdi-link",
          disabled: items.length === 0,
          click: ()=>doOpen(items)
        },
        {
          type: "item",
          title: '新标签打开',
          icon: "mdi-label-multiple-outline",
          //选择了普通ssh连接才能新窗口打开
          disabled: !items.some((item)=>item.type===AssetType.SSH),
          click: ()=>doOpen(items.filter((item)=>item.type===AssetType.SSH),"newLabel")
        },
        {
          type: "item",
          title: proxy.$t('common.new'),
          icon: "mdi-link-plus",
          click: doOpenCreate
        },
        {
          type: "item",
          title: "新建目录",
          icon: "mdi-folder-plus-outline",
          click: doCreateDir
        },
        {
          type: "item",
          title: proxy.$t('common.edit'),
          icon: "mdi-file-edit-outline",
          click: ()=>doOpenEdit(<AssetConfModel<SshConfModel>>items[0]),
          //只能同时编辑一个且只能编辑ssh配置，不能编辑目录
          disabled: items.length !== 1 || items.some((item:any)=>item.host === undefined)
        },
        {
          type: "item",
          title: '删除',
          icon: "mdi-close",
          disabled: items.length === 0,
          click: ()=>doDel(items)
        },
        {
          type: "menu",
          title: proxy.$t('common.more'),
          icon: "mdi-chevron-down",
          menus: [
            {
              type: "item",
              title: proxy.$t('common.refresh'),
              icon: "mdi-refresh",
              click: getData
            },
            {
              type: "item",
              title: '新窗口打开',
              icon: "mdi-open-in-new",
              //选择了普通ssh连接才能新窗口打开
              disabled: !items.some((item:any)=>item.host!==undefined),
              click: ()=>doOpen(items.filter((item:any)=>item.host!==undefined),"newWindow")
            },
            {
              type: "item",
              title: '批量执行命令',
              icon: "mdi-console",
              disabled: items.length === 0,
              click: async () => {
                const execItems = <AssetConfModel<SshConfModel>[]>(await service.listAndSub(AssetType.SSH, items.map((item) => item.id))).filter((item) => item.type === AssetType.SSH)
                doOpenExec(execItems)
              }
            },
            {
              type: "item",
              title: proxy.$t('common.rename'),
              icon: "mdi-pencil-outline",
              click: ()=>doRename(items[0]),
              disabled: items.length !== 1,
            },
            {
              type: "item",
              title: proxy.$t('common.copy'),
              icon: "mdi-content-copy",
              click: () => {
                onCopy(items)
              }
            },
            {
              type: "item",
              title: proxy.$t('common.cut'),
              icon: "mdi-content-cut",
              click: () => {
                onCut(items)
              }
            },
            {
              type: "item",
              title: proxy.$t('common.paste'),
              icon: "mdi-content-paste",
              disabled: !canPaste(),
              click: ()=>{
                onPaste()
              }
            },
            {
              type: "item",
              title: '导入',
              icon: "mdi-file-import-outline",
              click: ()=>importInput.value.click()
            },
            {
              type: "item",
              title: '导出',
              icon: "mdi-file-export-outline",
              disabled: items.length === 0 && rawItems.length === 0,
              click: ()=>doExport(items.length === 0?rawItems:items)
            },
          ]
        },
      ],160).catch((err)=>{});
    };

    const getData = async () => {
      service.query<SshConfModel>(AssetType.SSH,currentPath).then((list)=>{
        list.forEach((item:any)=>{
          if(!item.host){
            item._dropable = true
          }
        })
        rawItems = list
        handleData()
      }).catch(e=>{
        console.log("err",e)
        Toast.error(e.message)
      })
    }

    const handleData = ()=> {
      const searchText = searchVal.value
      let list = searchText !== '' ? rawItems.filter((item: any) => {
        if (item.host) {
          return item.name.includes(searchText) || item.host.includes(searchText) || item.user.includes(searchText)
        } else {
          return item.name.includes(searchText)
        }
      }) : lodash.clone(rawItems)
      const isAsc = sortData.isAsc
      let newItems = null
      switch (sortData.key) {
        case "name":
          if (isAsc) {
            //升序
            newItems = list.sort((a, b) => a.name.localeCompare(b.name))
          } else {
            //降序
            newItems = list.sort((b, a) => a.name.localeCompare(b.name))
          }
          break
        case "host":
          if (isAsc) {
            //升序
            newItems = list.sort((a: any, b: any) => (a.host ?? '').localeCompare(b.host ?? ''))
          } else {
            //降序
            newItems = list.sort((b: any, a: any) => (a.host ?? '').localeCompare(b.host ?? ''))
          }
          break
        case "user":
          if (isAsc) {
            //升序
            newItems = list.sort((a: any, b: any) => (a.user ?? '').localeCompare(b.user ?? ''))
          } else {
            //降序
            newItems = list.sort((b: any, a: any) => (a.user ?? '').localeCompare(b.user ?? ''))
          }
          break
        case "created":
          if (isAsc) {
            //升序
            newItems = list.sort((a, b) => a.accessed.getTime() - b.accessed.getTime())
          } else {
            //降序
            newItems = list.sort((b, a) => a.accessed.getTime() - b.accessed.getTime())
          }
          break
      }
      if (newItems) {
        list = newItems
      }
      if (lodash.trim(currentPath,"/")) {
        const parentDir = new AssetConfModel<undefined>()
        parentDir.name = ".."
        parentDir.dirPath = pathParent(currentPath)
        const temp = (<any>parentDir)
        temp._static = true
        temp._dropable = true
        list.unshift(parentDir)
      }
      items.value = list
    }

    const doCreateDir = ()=>{
      Prompt.open("请输入目录名称","").then((name:string)=>{
        service.mkdir(currentPath,name,AssetType.SSH).catch(e=>{
          Toast.error(e.message)
        }).then(()=>{
          getData()
        })
      })
    }

    const doOpenEdit = (item:AssetConfModel<SshConfModel>)=> {
      editor.value.openEdit(item.id)
    }

    const doOpenCreate = ()=> {
      editor.value.openCreate(currentPath)
    }

    const doRename = (item:AssetConfModel<any>)=> {
      Prompt.open("请输入重命名名称",item.name).then(async (name:string) => {
        item.name = name
        try {
          await service.rename(item.id,name)
        }catch (e) {
          Toast.error(e.message)
        }
        await getData()
      })
    }

    const doDel = (items:AssetConfModel<any>[])=> {
      Confirm.open("确认是否删除选择项").then(async () => {
        try {
          await service.del(items.map((item)=>item.id),AssetType.SSH)
          Toast.success("删除成功")
        }catch (e){
          Toast.error(e.message)
        }finally {
          await getData()
        }
      })
    }

    const doOpenExec = (items: AssetConfModel<SshConfModel>[])=>{
      Prompt.open("请输入执行命令","",true).then((cmd)=>{
        cmd = cmd.trim()
        if(!cmd){
          return
        }
        const ids = items.map((item) => {
          return item.id
        })
        ctx.emit("openExec",ids,cmd)
      })
    }

    const doOpen = lodash.throttle(async (items: AssetConfModel<SshConfModel>[],method?: "newWindow"|"newLabel") => {
      const firstItem = items[0]
      const isDir = (<any>firstItem).host === undefined
      if (isDir) {
        if (firstItem.id) {
          currentPath = service.joinPath([firstItem.dirPath,firstItem.name])
        } else {
          //上一级
          currentPath = firstItem.dirPath
        }
        await getData()
      }
      const ids = items.filter((item:any)=>item.host!==undefined).map((item)=>{
        return item.id
      })
      if(ids.length > 0){
        if(method === "newWindow"){
          ctx.emit("openNewWindow",ids)
        }else if(method === "newLabel"){
          ctx.emit("openNewLabel",ids)
        }else{
          ctx.emit("open",ids)
        }
      }
    },250)

    const onImportConf = async () => {
      const files = importInput.value.files
      if (files.length > 0) {
        const file = files[0]
        try {
          const confJSON = await file.text()
          await service.importJSON(confJSON,currentPath,(localSshConf,sshConf)=>{
            return Confirm.open("发生冲突",`本地连接"${localSshConf.name}"与配置连接"${sshConf.name}"同名,是否覆盖?`)
          })
          await getData()
        }catch (e){
          Toast.error(e.message)
        }
        importInput.value.value = null
      }
    }

    const doExport = async (items: Array<any>) => {
      Confirm.open("注意","请妥善保管该配置文件,不要发送给非信任者!").then(async () => {
        try{
          const confJSON = service.exportJSON(AssetType.SSH, currentPath, items.map((item) => item.id))
          const blob = new Blob([await confJSON])
          //触发下载弹窗
          let blobUrl = window.URL.createObjectURL(blob)
          let link = document.createElement('a')
          link.download = "Hexhub-SSH配置.json"
          link.style.display = 'none'
          link.href = blobUrl
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
        }catch (e){
          Toast.error(e.message)
        }
      });
    }

    const onKeydown = (evt:KeyboardEvent,focusSearch:boolean)=>{
      if(evt.ctrlKey || evt.metaKey){
        if(evt.key.toLowerCase() == "f"){
          if(focusSearch){
            searchInput.value.focus()
          }else{
            table.value.focus()
          }
        }
      }else if(evt.key === "f5"){
        getData()
      }
    }

    const onCopy = function (items:AssetConfModel<SshConfModel>[]){
      if(items.length > 0){
        copySrc = {
          items,
          dirPath:currentPath,
          isCut: false,
        }
        clipboard.writeText(items.map((item)=>item.name).join("\n")).then(()=>{
          Toast.success(proxy.$t('common.copy-success'))
        }).catch(err=>{
          Toast.error(proxy.$t('common.copy-failed'))
        });
      }
    }
    const onCut = function (items:AssetConfModel<SshConfModel>[]){
      if(items.length > 0){
        copySrc = {
          items,
          dirPath:currentPath,
          isCut: true,
        }
        clipboard.writeText(items.map((item)=>item.name).join("\n")).then(()=>{
          Toast.success(proxy.$t('common.copy-success'))
        }).catch(err=>{
          Toast.error(proxy.$t('common.copy-failed'))
        });
      }
    }
    const canPaste = function (){
      //没有复制源不可粘贴
      if(!copySrc){
        return false
      }
      //不能原地剪切粘贴
      if(copySrc.isCut && pathEqual(copySrc.dirPath,currentPath)){
        return false
      }
      //当前粘贴目录不在任意一个复制源文件夹的下级时才可粘贴
      return !copySrc.items.some((item)=>currentPath.startsWith(service.joinPath([copySrc.dirPath,item.name])))
    }
    const onPaste = function (){
      if(canPaste){
        if(copySrc.isCut){
          service.move(copySrc.items.map((item)=>item.id),currentPath).catch((e)=>{
            Toast.error(e.message)
          }).then(()=>{
            getData()
          })
        }else{
          //复制粘贴,出现同名自动在名字后面增加序号
          service.copy(copySrc.items.map(item=>item.id),currentPath,AssetType.SSH).catch((e)=>{
            Toast.error(e.message)
          }).then(()=>{
            getData()
          })
        }
      }
    }

    const receiveData = async function (data: { items: AssetConfModel<any>[], targetItem?: AssetConfModel<any> }) {
      try {
        if (data.targetItem) {
          const targetItem = data.targetItem
          if(targetItem.name === ".."){
            await service.move(data.items.map((item) => item.id), pathParent(currentPath))
          }else{
            await service.move(data.items.map((item) => item.id), service.joinPath([data.targetItem.dirPath, data.targetItem.name]))
          }
        }
        await getData()
      }catch (e){
        Toast.error(e.message)
      }
    }

    const test = lodash.throttle(async () => {
      try{
        let model = new SshConfModel()
        model.name = "test"
        model.host = "123.60.167.5"
        model.port = 22
        model.user = "test"
        model.password = "uq5H1ivLEaYCUcdavJbe"
        model.language = "zh_CN"
        model.authType = AuthTypes.Password
        const result = await service.add<SshConfModel>(AssetType.SSH, model, currentPath)
        await doOpen([result])
      }catch (e){
        Toast.error(e.message)
      }
    },1000)

    const onResize = lodash.throttle(()=>{
      table.value?.resize()
    },500)

    watch(()=>[searchVal.value,sortData.key,sortData.isAsc],()=>handleData())

    onMounted(()=>{
      getData()
      onResize()
      window.addEventListener("resize",onResize)
    })

    onUnmounted(()=>{
      window.removeEventListener("resize",onResize)
    })

    return {
      sortData,
      importInput,
      searchInput,
      editor,
      table,
      headers,
      items,
      searchVal,
      AssetType,
      handleData,
      onImportConf,
      onContextMenuItem,
      receiveData,
      onCopy,
      onCut,
      onPaste,
      onKeydown,
      getData,
      doOpen,
      doDel,
      doCreateDir,
      doOpenCreate,
      test,
    }
  }
}
</script>

<style lang="scss" scoped>
.ssh-list-root{
  position: relative;
  max-width: 500px;
  min-width: 350px;
  width: 65vw;

  &.loading{
    cursor: not-allowed;
    & > *{
      pointer-events: none;
    }
  }
}
.v-theme--dark {
  .first-col{
    height: 100%;
    .iconfont{
      &.term{
        filter: invert(1);
      }
    }
  }
}
.first-col{
  display: flex;
  align-items: center;
  .iconfont{
    width: 18px;height: 18px;margin-right: 7px;
    &.term{

    }
  }
}


</style>