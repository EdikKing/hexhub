<template>
  <div>
    <v-dialog v-model="show" persistent width="400px">
      <v-card v-drag="'.v-overlay__content'">
        <v-card-title>
          请选择私钥
          <v-card-subtitle class="pl-0">双击或者回车选择私钥</v-card-subtitle>
        </v-card-title>

        <v-divider></v-divider>
        <div style="height: 400px;">
          <advanced-table
              v-model:sort-key="sortData.key"
              v-model:sort-asc="sortData.isAsc"
              :headers="headers"
              :items="items"
              after-th
              :search-provider="(idx,item)=>item.name"
              @clickItem="doSelectItem"
              @delete="doDel"
              @contextMenuItem="onContextMenuItem">
          </advanced-table>
        </div>
        <v-divider></v-divider>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
              color="warning"
              density="comfortable"
              variant="text"
              v-on:click="close"
          >
            取消
          </v-btn>
          <v-btn
              color="info"
              density="comfortable"
              variant="text"
              v-on:click="doOpenEditor()"
          >
            新建
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <ssh-private-key-editor @refresh="getData" ref="editor"></ssh-private-key-editor>
  </div>

</template>

<script lang="ts">
import AdvancedTable from "../common/AdvancedTable.vue";
import {SshPrivateKeyKeyModel,} from "~/db/model/ssh-conf-model";
import {Confirm, ContextMenu, Prompt, Toast} from "~/lib/layer";
import {getCurrentInstance, reactive, ref, shallowRef, watch} from "vue";
import lodash from "lodash";
import common from "~~/lib/util/common";
import AssetConfigService from "~/db/service/asset-config-service";
import {AssetConfModel, AssetType} from "~/db/model/asset-conf-model";
import SshPrivateKeyEditor from "~/components/ssh/SshPrivateKeyEditor.vue";

export default {
  name: "SshPrivateKeyChoice",
  components: {SshPrivateKeyEditor, AdvancedTable},
  setup(props,ctx){
    const service = AssetConfigService.getInstance()

    let promiseExecutor = <{resolve:(SshPrivateKeyKeyModel)=>void, reject:(any)=>void}>null;
    const show = ref(false)
    const sortData = reactive({key:"name",isAsc:false})
    let rawItems = <Array<AssetConfModel<SshPrivateKeyKeyModel>>>[]
    const items = shallowRef<Array<AssetConfModel<SshPrivateKeyKeyModel>>>([])
    const proxy = <any>getCurrentInstance().proxy
    const editor = ref()
    const headers = [
      {title:"名称",key:"name",tdClass:'text-left pl-1',sortable: true,minWidth: 100},
      {title:"文件名",key:"filename",tdClass:'text-left pl-1',sortable: true,minWidth: 100,
        formatFunc: (item:AssetConfModel<SshPrivateKeyKeyModel>,idx:number)=>{
          return item.data.filename ?? "-"
        }
      },
      {title:"类型",key:"type",tdClass:'text-left pl-1',sortable: true,minWidth: 90,
        formatFunc: (item:AssetConfModel<SshPrivateKeyKeyModel>,idx:number)=>{
          return item.data.type
        }
      },
      {
        title:"更新时间",key:"updated",tdClass:'text-left pl-1',sortable: true,minWidth: 100,
        formatFunc: (item:AssetConfModel<SshPrivateKeyKeyModel>,idx:number)=>{
          return common.dateFormat(item.updated,"MM-DD HH:mm")
        }
      },
    ]

    const getData = async () => {
      service.query<SshPrivateKeyKeyModel>(AssetType.SSHPrivateKey,null,true).then((list)=>{
        rawItems = list
        handleData()
      }).catch(e=>{
        console.error(e)
        Toast.error(e.message)
      })
    }

    const handleData = ()=> {
      const isAsc = sortData.isAsc
      let newRawItems = lodash.clone(rawItems)
      switch (sortData.key) {
        case "name":
          if (isAsc) {
            //升序
            items.value = newRawItems.sort((a, b) => a.name.localeCompare(b.name))
          } else {
            //降序
            items.value = newRawItems.sort((b, a) => a.name.localeCompare(b.name))
          }
          break
        case "filename":
          if (isAsc) {
            //升序
            items.value = newRawItems.sort((a: any, b: any) => (a.filename).localeCompare(b.filename))
          } else {
            //降序
            items.value = newRawItems.sort((b: any, a: any) => (a.filename).localeCompare(b.filename))
          }
          break
        case "type":
          if (isAsc) {
            //升序
            items.value = newRawItems.sort((a: any, b: any) => (a.type).localeCompare(b.type))
          } else {
            //降序
            items.value = newRawItems.sort((b: any, a: any) => (a.type).localeCompare(b.type))
          }
          break
        case "updated":
          if (isAsc) {
            //升序
            items.value = newRawItems.sort((a, b) => a.updated.getTime() - b.updated.getTime())
          } else {
            //降序
            items.value = newRawItems.sort((b, a) => a.updated.getTime() - b.updated.getTime())
          }
          break
      }
    }

    const onContextMenuItem = function (evt:MouseEvent,items:Array<AssetConfModel<SshPrivateKeyKeyModel>>){
      ContextMenu.open(evt,[
        {
          type: "title",
          title: proxy.$t('common.operate'),
        },
        {type: "line"},
        {
          type: "item",
          title: proxy.$t('common.new'),
          icon: "mdi-link-plus",
          click: ()=>doOpenEditor()
        },
        {
          type: "item",
          title: proxy.$t('common.edit'),
          icon: "mdi-file-edit-outline",
          //只能同时编辑一个
          disabled: items.length !== 1,
          click: ()=>doOpenEditor(items[0])
        },
        {
          type: "item",
          title: proxy.$t('common.rename'),
          icon: "mdi-pencil-outline",
          disabled: items.length !== 1,
          click: ()=>doRename(items[0])
        },
        {
          type: "item",
          title: '删除',
          icon: "mdi-close",
          disabled: items.length === 0,
          click: ()=>doDel(items)
        },
      ],160).catch((err)=>{});
    };

    const doRename = (item:AssetConfModel<SshPrivateKeyKeyModel>)=> {
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

    const doDel = (items:Array<AssetConfModel<SshPrivateKeyKeyModel>>)=> {
      Confirm.open("确认是否删除选择项").then(async () => {
        try {
          await service.del(items.map((item)=>item.id),AssetType.SSHPrivateKey)
          Toast.success("删除成功")
        }catch (e){
          Toast.error(e.message)
        }finally {
          await getData()
        }
      })
    }

    const doOpenEditor = (model?:AssetConfModel<SshPrivateKeyKeyModel>)=>{
      if(model){
        editor.value.openEdit(model.id)
      }else{
        editor.value.openCreate()
      }
    }

    const doSelectItem = (model:AssetConfModel<SshPrivateKeyKeyModel>)=>{
      if(promiseExecutor){
        promiseExecutor.resolve(model.data)
        promiseExecutor = null
      }
      show.value = false
    }

    const open = ():Promise<SshPrivateKeyKeyModel>=>{
      return new Promise<SshPrivateKeyKeyModel>((resolve, reject)=>{
        promiseExecutor = {resolve,reject}
        show.value = true
      })
    }

    const close = ()=>{
      if(promiseExecutor){
        promiseExecutor.reject("cancel")
        promiseExecutor = null
      }
      show.value = false
    }

    watch(()=>sortData,()=>{
      handleData()
    },{deep:true})

    watch(()=>show.value, (s) => {
      if (s) {
        getData()
      }
    },{immediate:true})

    return {
      show,
      items,
      sortData,
      editor,
      headers,
      getData,
      doDel,
      onContextMenuItem,
      doOpenEditor,
      doSelectItem,
      open,
      close
    }
  }
}
</script>

<style scoped>

</style>