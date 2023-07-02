<template>
  <mix-tables-view
      :tooltip="getTooltip"
      :loading="loading"
      :model-value="tables"
      :headers="headers"
      @contextMenuItem="onContextMenuItem"
      @refresh="initTables"
  ></mix-tables-view>
</template>

<script lang="ts">
import Rpc from "~/lib/rpc"
import {ContextMenu, Toast} from "~/lib/layer";
import {ref, nextTick, watch, getCurrentInstance, readonly} from "vue";
import {FileItem} from "~/components/file/FileBrowser.vue";
import common, {pathJoin} from "~/lib/util/common";
import MixTablesView from "~/components/db/common/MixTablesView.vue";
import {PropType} from "#app/compat/capi";
import xss from "xss";

export const TypeGetTableSummaryList = "getTableSummaryList"

export interface Table {
  schema:        string
  name:          string
  type:          string
  comment:       string
  engine:        string
  rowFormat:     string
  tableRows:     number
  avgRowLength:  number
  dataLength:    number
  maxDataLength: number
  indexLength:   number
  dataFree:      number
  autoIncrement: number
  createTime:    string
  updateTime:    string
  checkTime:     string
  collation:     string
  charset:       string
  columns:       number
  indexes:       number
}

export default {
  name: "MysqlTablesView",
  components: {MixTablesView},
  props:{
    rpc: {
      type: Object as PropType<Rpc>
    },
    schema: {
      type: String,
      default: "nms"
    }
  },
  emits: [],
  setup(props,ctx) {
    const loading = ref(false)
    const proxy = <any>getCurrentInstance().proxy
    const tables = ref<Table[]>([])
    const headers = readonly([
      {title:"名称",key:"name",minWidth:260,sortable: true,tdClass:"text-left pl-1"},
      {title:"注释",key:"comment",minWidth:120,sortable: true,tdClass:"text-left"},
      {title:"行",key:"tableRows",minWidth:80,sortable: true,tdClass:"text-left"},
      {title:"数据长度",key:"dataLength",minWidth:80,sortable: true,tdClass:"text-left",formatFunc:(item,idx)=>common.fileSizeConvert(item.dataLength)},
      {title:"索引长度",key:"indexLength",minWidth:80,sortable: true,tdClass:"text-left",formatFunc:(item,idx)=>common.fileSizeConvert(item.indexLength)},
      {title:"自增",key:"autoIncrement",minWidth:80,sortable: true,tdClass:"text-left"},
      {title:"引擎",key:"engine",minWidth:80,sortable: true,tdClass:"text-left"},
      {title:"字段",key:"columns",minWidth:80,sortable: true,tdClass:"text-left"},
      {title:"索引",key:"indexes",minWidth:80,sortable: true,tdClass:"text-left"},
      {title:"编码",key:"charset",minWidth:100,sortable: true,tdClass:"text-left"},
      {title:"更新时间",key:"updateTime",minWidth:150,sortable: true,tdClass:"text-left"},
      {title:"创建时间",key:"createTime",minWidth:150,sortable: true,tdClass:"text-left"},
    ])
    const getTooltip = (item:Table)=>{
      return`<ul class="pl-3" style="font-size: 12px">
      <li>名称:${xss(item.name)}</li>
      <li>注释:${xss(item.comment)}</li>
      <li>行:${item.tableRows}</li>
      <li>数据长度:${xss(common.fileSizeConvert(item.dataLength))}</li>
      <li>索引长度:${xss(common.fileSizeConvert(item.indexLength))}</li>
      <li>自增:${item.autoIncrement}</li>
      <li>引擎:${xss(item.engine)}</li>
      <li>字段:${item.columns}</li>
      <li>索引:${item.indexes}</li>
      <li>编码:${xss(item.charset)}</li>
      <li>更新时间:${xss(item.updateTime)}</li>
      <li>创建时间:${xss(item.createTime)}</li></ul>`

    }
    const onContextMenuItem = function (evt:MouseEvent,items:FileItem[]){
      ContextMenu.open(evt,[
        {
          type: "title",
          title: proxy.$t('common.operate'),
        },
        {type: "line"},
        {
          type: "item",
          title: "打开表",
          icon: "mdi-database-eye-outline",
          disabled: items.length === 0,
        },
        {
          type: "item",
          title: "编辑表结构",
          icon: "mdi-database-cog-outline",
          disabled: items.length === 0,
        },
        {
          type: "item",
          title: "新建表",
          icon: "mdi-database-plus-outline",
          disabled: items.length === 0,
        },
        {
          type: "item",
          title: "重命名",
          icon: "mdi-database-settings-outline",
          disabled: items.length === 0,
        },
        {
          type: "item",
          title: "刷新",
          icon: "mdi-database-refresh-outline",
          disabled: items.length === 0,
        },
        {
          type: "menu",
          title: "复制",
          icon: "mdi-database-export-outline",
          disabled: items.length === 0,
          menus: [
            {
              type: "title",
              title: "复制",
            },
            {type: "line"},
            {
              type: "item",
              title: "结构及数据",
              disabled: items.length === 0,
            },
            {
              type: "item",
              title: "表结构",
              disabled: items.length === 0,
            },
          ]
        },
        {
          type: "menu",
          title: "删除",
          icon: "mdi-database-minus-outline",
          disabled: items.length === 0,
          menus: [
            {
              type: "title",
              title: "删除",
            },
            {type: "line"},
            {
              type: "item",
              title: "删除表",
              disabled: items.length === 0,
            },
            {
              type: "item",
              title: "清空数据",
              disabled: items.length === 0,
            },
            {
              type: "item",
              title: "快速清空数据",
              disabled: items.length === 0,
            },
          ]
        },
        {
          type: "menu",
          title: "导出",
          icon: "mdi-database-arrow-down-outline",
          disabled: items.length === 0,
          menus: [
            {
              type: "title",
              title: "导出",
            },
            {type: "line"},
            {
              type: "item",
              title: "导出向导",
              disabled: items.length === 0,
            },
            {
              type: "item",
              title: "数据字典",
              disabled: items.length === 0,
            },
            {
              type: "item",
              title: "表结构及数据SQL",
              disabled: items.length === 0,
            },
            {
              type: "item",
              title: "表结构SQL",
              disabled: items.length === 0,
            },
            {
              type: "item",
              title: "表数据SQL",
              disabled: items.length === 0,
            }
          ]
        },
        {
          type: "item",
          title: "导入向导",
          icon: "mdi-database-arrow-up-outline",
          disabled: items.length === 0,
        }
      ],140).finally(()=>{
        // tablesView.value.clearContextMenuItem()
      });
    };
    const initTables = async () => {
      loading.value = true
      try {
        const value = (await props.rpc.sendWaitReply(TypeGetTableSummaryList,{schema:props.schema})).json()
        // const testData = []
        // for (let i = 0; i < 10; i++) {
        //   testData.push(...lodash.cloneDeep(value))
        // }
        tables.value = value
      } catch (e) {
        Toast.error(e.message)
        throw e;
      }finally {
        loading.value = false
      }
    }
    watch(()=>props.rpc,(rpc)=>{
      if(rpc!=null){
        initTables()
      }
    },{immediate:true})
    return {
      loading,
      tables,headers,
      initTables,onContextMenuItem,getTooltip
    }
  }
}
</script>

<style lang="scss">
</style>