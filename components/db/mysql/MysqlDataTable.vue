<template>
  <div class="mysql-data-table-container">
    <v-toolbar density="compact" :height="46">
      <v-btn prepend-icon="mdi-timer-play-outline" size="small" density="comfortable" color="primary" class="mr-1" v-if="!txStatus.begin" :loading="txStatus.loading" v-on:click="beginTx">开始事务</v-btn>
      <v-btn prepend-icon="mdi-timer-check-outline" size="small" density="comfortable" color="primary" class="mr-1" v-if="txStatus.begin" :loading="txStatus.loading" v-on:click="commitTx">提交</v-btn>
      <v-btn prepend-icon="mdi-timer-cancel-outline" size="small" density="comfortable" color="error" class="mr-1" v-if="txStatus.begin" :loading="txStatus.loading" v-on:click="rollbackTx">回滚</v-btn>
      <v-btn prepend-icon="mdi-table-plus" size="small" density="comfortable" color="info" class="mr-1" v-on:click="doAdd">添加</v-btn>
      <v-btn
          prepend-icon="mdi-table-headers-eye"
          size="small"
          density="comfortable"
          :variant="tableOptions.editingOption==='select'?'tonal':'text'"
          class="mr-1"
          v-on:click="swiftEditingOption('select')">字段</v-btn>
      <v-btn
          prepend-icon="mdi-filter-settings-outline"
          size="small"
          density="comfortable"
          :variant="tableOptions.editingOption==='where'?'tonal':'text'"
          class="mr-1"
          v-on:click="swiftEditingOption('where')">筛选</v-btn>
      <v-btn
          prepend-icon="mdi-sort"
          size="small"
          density="comfortable"
          :variant="tableOptions.editingOption==='sort'?'tonal':'text'"
          class="mr-1"
          v-on:click="swiftEditingOption('sort')">排序</v-btn>
      <v-btn prepend-icon="mdi-table-arrow-left" size="small" density="comfortable" class="mr-1">导入</v-btn>
      <v-btn prepend-icon="mdi-table-arrow-right" size="small" density="comfortable" class="mr-1">导出</v-btn>
      <v-spacer></v-spacer>
      <v-btn icon="mdi-database-search-outline" size="small" density="comfortable" v-on:click="showSearch"></v-btn>
    </v-toolbar>
    <div class="toolbar-detail" v-show="tableOptions.editingOption!==null">
      <table-sort-bar
          @apply="getTableData"
          :fields="fields"
          :sorts="sortMap"
          v-model="sortList"
          height="120px"
          v-show="tableOptions.editingOption === 'sort'"
      ></table-sort-bar>
      <v-select
          v-if="tableOptions.editingOption === 'select'"
          persistent-hint
          persistent-placeholder
          hide-details
          chips
          label="SELECT"
          placeholder="*"
          item-title="name"
          item-value="name"
          :items="fields"
          multiple
          v-model="tableOptions.select"
          @update:modelValue="getTableData"
          :menu-props="{location:'bottom left',offset:2,height:'55vh',minWidth:350,maxWidth:350,width:350}"
      ></v-select>
      <v-textarea
          v-if="tableOptions.editingOption === 'where'"
          autofocus
          persistent-hint
          persistent-placeholder
          hide-details
          label="WHERE"
          placeholder="id = xx or name = 'xx'"
          clearable
          @keydown.enter.prevent="getTableData"
          v-model="tableOptions.where"
      >
        <template #prepend-inner>
          <v-btn variant="text" density="comfortable" icon="mdi-bug-play-outline" color="primary" v-on:click="getTableData"></v-btn>
        </template>
      </v-textarea>
    </div>
    <div class="data-table-wrapper">
      <data-table
          ref="dataTable"
          :sorts="sortMap"
          v-model="dataValue.data"
          :loading="loading"
          :col-tooltip="getColTooltip"
          @paste="doPaste"
          @saveRow="doSave([$event])"
          @save="doSaveAll"
          @delete="doDel"
          @insert="doAdd"
          @contextMenuItem="onContextMenuItem"
          @copy="doCopyTableText($event,'data')"
      ></data-table>
    </div>
    <div class="bottom-bar">
      <div class="left-area">
        <div class="copy-btn">
          <v-btn icon="mdi-content-copy" size="x-small" density="comfortable" variant="text" v-on:click="copyLastSql"></v-btn>
        </div>
        <div class="sql-info">
        <span v-tooltip="tableOptions.lastSql">
          {{tableOptions.lastSql}}
        </span>
        </div>
        <span class="count-info">
        第{{dataValue.offset + 1 + (dataTable?.table?.currentColRow?.row??0)}}条,共{{dataValue.totalCount}}条,第{{tableOptions.page}}页,共{{dataValue.totalPage}}页
      </span>
      </div>
      <div class="btn-group">
        <div v-if="tableOptions.showPageSetting">
          <span class="ml-1 mr-1">每页显示</span>
          <input
              class="mr-1"
              v-model="tableOptions.size"
              v-on:keydown.enter="dataTable.focus()"
              v-on:focusout="getTableData"
              onkeyup="this.value=this.value.replace(/\D|^0/g,'')"
              type="number"
              min="1"
          >
          <span>条</span>
          <v-btn icon="mdi-cog-outline" size="x-small" density="comfortable" variant="text" v-on:click="tableOptions.showPageSetting = !tableOptions.showPageSetting"></v-btn>
        </div>
        <div v-else>
          <v-btn v-on:click="tableOptions.page = 1;getTableData()" :disabled="tableOptions.page <= 1" icon="mdi-chevron-double-left" size="x-small" density="comfortable" variant="text"></v-btn>
          <v-btn  v-on:click="tableOptions.page --;getTableData()" :disabled="tableOptions.page <= 1" icon="mdi-chevron-left" size="x-small" density="comfortable" variant="text"></v-btn>
          <input
              v-model="tableOptions.page"
              v-on:keydown.enter="dataTable.focus()"
              v-on:focusout="getTableData"
              onkeyup="this.value=this.value.replace(/\D|^0/g,'')"
              type="number"
              min="1"
          >
          <v-btn v-on:click="tableOptions.page ++;getTableData()" icon="mdi-chevron-right" size="x-small" density="comfortable" variant="text"></v-btn>
          <v-btn v-on:click="tableOptions.page = dataValue.totalPage;getTableData()" :disabled="tableOptions.page >= dataValue.totalPage" icon="mdi-chevron-double-right" size="x-small" density="comfortable" variant="text"></v-btn>
          <v-btn icon="mdi-cog-outline" size="x-small" density="comfortable" variant="text" v-on:click="tableOptions.showPageSetting = !tableOptions.showPageSetting"></v-btn>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Rpc from "~/lib/rpc"
import {ContextMenu, Prompt, Toast} from "~/lib/layer";

import {getCurrentInstance, nextTick, onUnmounted, reactive, ref, shallowRef, watch} from "vue";
import TablesView from "~/components/db/common/TablesView.vue";
import * as clipboard from "clipboard-polyfill";
import DataTable, {ResultCol,ResultRow, ResultSet,NotQuoteTypeSet} from "~/components/db/common/DataTable.vue";
import {emptySet,SelectionData,RowTypePlaceholder,RowTypeNormal,RowTypeNewAdd,getItemsByArea,genTableText} from "~/components/db/common/SimpleDataTable.vue";

import lodash from "lodash";
import TableSortBar, {FieldSort} from "~/components/db/common/TableSortBar.vue";
import Packet from "~/lib/rpc/packet";
import {encodeTableStr, parserTableStr} from "~/lib/util/common";
import {escapeParam, escapeString} from "~/lib/util/sql";
import Confirm from "~/lib/layer/confirm";
import {htmlEncode} from "~/lib/el";
import {PropType} from "#app/compat/capi";
export const TypeGetTableFields = "getTableFields"
export const TypeGetTableData = "getTableData"
const TypeShowLastSql = "showLastSql"
const TypeUpdateTableData = "updateTableData"
const TypeInsertTableData = "insertTableData"
const TypeDeleteTableData = "deleteTableData"
const TypeBatchUpdateTableData = "batchUpdateTableData"

const TypeGetTxStatus = "getTxStatus"
const TypeBeginTx = "beginTx"
const TypeCommitTx = "commitTx"
const TypeRollbackTx = "rollbackTx"


export interface TableField {
  schema:string
  table:string
  name:string
  default:string
  nullable:boolean
  datatype:string
  dbDataType:string
  fieldType:string
  charMaxLen:number
  charByteLen:number
  numScale:number
  numPrecision:number
  datetimePrecision:number
  charset:string
  collation :string
  order: number,
  extra:string
  type:string
  key:string
  enums: string[]
  privileges:string
  comment:string
  isVirtual: boolean
  zeroFile: boolean
  autoIncrement: boolean
  unsigned: boolean
}

export interface TableQuery {
  schema:string
  table:string
  txId:string
}

interface TxReq {
  txId:string
  schema:string
  table:string
}

interface TableDataQuery {
  txId:string
  schema:string
  table:string
  where?:string
  select?:string[]
  order?:{field:string,isAsc:boolean}[]
  size:number
  page:number
}

interface TableDataResponse {
  data:ResultSet
  offset:number
  totalCount:number
  totalPage:number
}

interface LastSqlResponse {
  schema:string
  table:string
  sql:string
}

export default {
  name: "MysqlDataTable",
  components: {TableSortBar, DataTable, TablesView},
  props:{
    rpc: {
      type: Object as PropType<Rpc>
    },
    schema: {
      type: String,
      default: "nms"
    },
    table: {
      type: String,
      default: "t_device"
    }
  },
  emits: [],
  setup(props,ctx) {
    const dataTable = ref()
    const txStatus = reactive({
      begin: false,
      txId: null,
      loading: false
    })
    const proxy = <any>getCurrentInstance().proxy
    const priKeyFields = new Set<string>()
    const uniKeyFields = new Set<string>()
    const fields = shallowRef<TableField[]>([])
    const fieldMap = new Map<string,TableField>()
    const loading = ref(true)
    const sortMap = ref(new Map<string,boolean>())
    const sortList = ref<FieldSort[]>([])
    const dataValue = shallowRef(<TableDataResponse>{
      data: emptySet,
      offset: 0,
      totalCount: 0,
      totalPage: 0,
    })

    const tableOptions = reactive({
      editingOption: <string|null>null,
      lastSql: "",
      where: "",
      select: [],
      showPageSetting: false,
      page: 1,
      size: 1000,
    })

    let isLoaded = false

    const onContextMenuItem = async function (evt: MouseEvent, selection?: SelectionData) {
      evt.stopPropagation()
      evt.preventDefault()
      let copyText = null
      try{
        copyText = await clipboard.readText()
      }catch (e){

      }

      const cols = selection.area.cols
      const field = dataValue.value.data.cols[selection.colRow.dataCol]
      const columns = cols.map(mCol => dataValue.value.data.cols[mCol]);
      const columnNames = columns.map(col => col.name).join(",")
      const fieldSort = sortMap.value.get(field.name)
      ContextMenu.open(evt, [
        {
          type: "title",
          title: proxy.$t('common.operate'),
        },
        {type: "line"},
        {
          type: "item",
          title: "添加",
          icon: "mdi-database-plus-outline",
          disabled: !isLoaded,
          click: () => doAdd()
        },
        {
          type: "item",
          title: "删除记录",
          icon: "mdi-database-minus-outline",
          //空白占位行不能删除
          disabled: !isLoaded || dataValue.value.data.rows[selection.colRow.row].type === RowTypePlaceholder,
          click: () => doDel(selection)
        },
        {
          type: "item",
          title: "刷新",
          icon: "mdi-database-refresh-outline",
          click: refresh,
        },
        {type: "line"},
        {
          type: "menu",
          title: "填充",
          icon: "mdi-database-outline",
          disabled: !isLoaded,
          menus: [
            {
              type: "item",
              title: "填充空白字符串",
              disabled: !isLoaded,
              click: () => doFill(selection, "")
            },
            {
              type: "item",
              title: "填充NULL",
              disabled: !isLoaded,
              click: () => doFill(selection, null)
            },
            {
              type: "item",
              title: "自定义",
              disabled: !isLoaded,
              click: () => {
                Prompt.open("请输入填充字符串", "").then((s: string) => {
                  doFill(selection, s)
                })
              }
            },
          ]
        },
        {type: "line"},
        {
          type: "menu",
          title: "复制为",
          icon: "mdi-content-copy",
          disabled: !isLoaded,
          menus: [
            {
              type: "title",
              title: "复制",
            },
            {type: "line"},
            {
              type: "item",
              title: "InsertSQL(批量)",
              click: () => doCopySql(selection, "insert-batch")
            },
            {
              type: "item",
              title: "InsertSQL",
              click: () => doCopySql(selection, "insert")
            },
            {
              type: "item",
              title: "UpdateSQL",
              click: () => doCopySql(selection, "update")
            },
            {
              type: "item",
              title: "DeleteSQL",
              click: () => doCopySql(selection, "delete")
            },
            {type: "line"},
            {
              type: "item",
              title: "表格文本-字段和数据",
              click: () => doCopyTableText(selection, "column-data")
            },
            {
              type: "item",
              title: "表格文本-数据",
              click: () => doCopyTableText(selection, "data")
            },
            {
              type: "item",
              title: "表格文本-字段",
              click: () => doCopyTableText(selection, "column")
            },
          ]
        },
        {
          type: "menu",
          title: "粘贴",
          disabled: !isLoaded && copyText,
          icon: "mdi-content-paste",
          menus: [
            {
              type: "title",
              title: "粘贴",
            },
            {type: "line"},
            {
              type: "item",
              title: "仅粘贴文本",
              click: () => doPaste(selection, "text")
            },
            {
              type: "item",
              title: "粘贴至选中区",
              click: () => doPaste(selection, "selection")
            },
            {
              type: "item",
              title: "新建并粘贴",
              click: () => doPaste(selection, "insert")
            },
          ]
        },
        {type: "line"},
        {
          type: "menu",
          title: "跳转行",
          icon: "mdi-arrow-u-right-top",
          disabled: !isLoaded,
          menus: [
            {
              type: "title",
              title: `跳转`,
            },
            {type: "line"},
            {
              type: "item",
              title: "顶部",
              click: () => dataTable.value.jumpColRow(null, 0, true)
            },
            {
              type: "item",
              title: "底部",
              click: () => dataTable.value.jumpColRow(null, dataValue.value.data.rows.length - 1, true)
            },
            {
              type: "item",
              title: "自定义",
              click: () => {
                Prompt.open("请输入跳转行", 1).then((v: string) => {
                  dataTable.value.jumpColRow(null, Math.max(0, Number.parseInt(v, 10) - 1), true)
                })
              }
            },
          ]
        },
        {
          type: "menu",
          title: "全选",
          disabled: !isLoaded,
          icon: "mdi-selection-remove",
          menus: [
            {
              type: "title",
              title: `权限`,
            },
            {type: "line"},
            {
              type: "item",
              title: "全选",
              click: () => dataTable.value.selectAll("all")
            },
            {
              type: "item",
              title: "行全选",
              click: () => dataTable.value.selectAll("row")
            },
            {
              type: "item",
              title: "列全选",
              click: () => dataTable.value.selectAll("col")
            },
            {
              type: "item",
              title: "取消选择",
              click: () => dataTable.value.resetSelectedData()
            },
          ]
        },
        {
          type: "menu",
          title: "列锁定",
          icon: "mdi-table-lock",
          disabled: !isLoaded,
          menus: [
            {
              type: "title",
              title: `${columnNames} 锁定`,
            },
            {type: "line"},
            {
              type: "item",
              title: "锁定",
              //能锁定的前提是选中的列，有任一一项是未锁定的
              disabled: !cols.some((mCol) => !dataValue.value.data.cols[mCol].sticky),
              click: () => {
                for (const mCol of cols) {
                  dataValue.value.data.cols[mCol].sticky = true
                }
                //更新sticky偏移位置
                dataTable.value.table.calcColPos()
              }
            },
            {
              type: "item",
              title: "解锁",
              //能解锁的前提是选中的列，有任一一项是锁定的
              disabled: !cols.some((mCol) => dataValue.value.data.cols[mCol].sticky),
              click: () => {
                for (const mCol of cols) {
                  dataValue.value.data.cols[mCol].sticky = false
                }
                //更新sticky偏移位置
                dataTable.value.table.calcColPos()
              }
            },
          ]
        },
        {
          type: "menu",
          title: "排序",
          icon: "mdi-sort",
          disabled: !isLoaded,
          menus: [
            {
              type: "title",
              title: `${field.name} 排序`,
            },
            {type: "line"},
            {
              type: "item",
              title: "升序(0-9|a-Z)",
              disabled: fieldSort === true,
              click: () => sortMap.value.set(field.name, true)
            },
            {
              type: "item",
              title: "降序(9-0|Z-a)",
              disabled: fieldSort === false,
              click: () => sortMap.value.set(field.name, true)
            },
            {
              type: "item",
              title: "删除排序",
              disabled: fieldSort === undefined,
              click: () => sortMap.value.delete(field.name)
            },
          ]
        },
      ], 160).finally(() => {
        dataTable.value.focus()
      });
    };

    const getTxStatus = async ()=>{
      if(!txStatus.txId){
        txStatus.txId = props.schema + "-" + props.table
      }
      try {
        txStatus.loading = true
        await props.rpc.sendWaitReply(TypeGetTxStatus, <TxReq>{
          schema: props.schema,
          table: props.table,
          txId: txStatus.txId,
        })
        txStatus.begin = true
      }catch (e){
        txStatus.begin = false
      }finally {
        txStatus.loading = false
      }
    }

    const beginTx = async ()=>{
      if(txStatus.begin){
        return
      }
      txStatus.txId = props.schema + "-" + props.table
      try {
        txStatus.loading = true
        await props.rpc.sendWaitReply(TypeBeginTx, <TxReq>{
          schema: props.schema,
          table: props.table,
          txId: txStatus.txId,
        })
        txStatus.begin = true
      }catch (e){
        Toast.error(e.message)
      }finally {
        txStatus.loading = false
      }
    }

    const commitTx = async ()=>{
      if(!txStatus.begin){
        return
      }
      try {
        txStatus.loading = true
        await props.rpc.sendWaitReply(TypeCommitTx, <TxReq>{
          schema: props.schema,
          table: props.table,
          txId: txStatus.txId,
        })
        txStatus.begin = false
      }catch (e){
        Toast.error(e.message)
      }finally {
        txStatus.loading = false
      }
    }

    const rollbackTx = async ()=>{
      if(!txStatus.begin){
        return
      }
      try {
        txStatus.loading = true
        await props.rpc.sendWaitReply(TypeRollbackTx, <TxReq>{
          schema: props.schema,
          table: props.table,
          txId: txStatus.txId,
        })
        txStatus.begin = false
        await getTableData()
      }catch (e){
        Toast.error(e.message)
      }finally {
        txStatus.loading = false
      }
    }

    const initTableSchema = async ()=>{
      loading.value = true
      try {
        fields.value = <TableField[]>(await props.rpc.sendWaitReply(TypeGetTableFields, <TableQuery>{
          schema: props.schema,
          table: props.table
        })).json()
        priKeyFields.clear()
        fieldMap.clear()
        uniKeyFields.clear()
        fields.value.forEach((field,idx)=>{
          fieldMap.set(field.name,field)
          //查找主键和唯一键
          switch (field.key) {
            case "PRI":
              priKeyFields.add(field.name)
              break
            case "UNI":
              uniKeyFields.add(field.name)
              break
          }
        })
        await getTxStatus()
      } catch (e) {
        Toast.error(e.message)
        throw e;
      }
    }

    const getColTooltip = (idx:number,col: ResultCol)=>{
      const filed = fieldMap.get(col.name)
      console.log("fff",fieldMap)
      let html = "<ul class=\"pl-3 pr-3\" style=\"font-size: 12px\">"
      if(filed){
        switch (filed.key) {
          case "PRI":
            html += "<li>键:主键</li>"
            break
          case "MUL":
            html += "<li>键:联合唯一键</li>"
            break
          case "UNI":
            html += "<li>键:唯一键</li>"
            break
        }
        html += `<li>类型:${htmlEncode(filed.fieldType)}</li><li>注释:${htmlEncode(filed.comment)}</li><li>允许空:${filed.nullable}</li>`
        if(filed.collation){
          html+=`<li>编码:${htmlEncode(filed.collation)}</li>`
        }
      }else{
        html+=`<li>类型:${htmlEncode(col.type)}</li><li>允许空:${filed.nullable}</li>`
      }
      return  html+"</ul>"
    }

    const getTableData = async () => {
      loading.value = true
      try {
        const order = sortList.value.filter(item=>item.check).map((item)=>{
          return {field:item.name,isAsc:item.isAsc}
        })
        const req = <TableDataQuery>{
          txId: txStatus.begin ? txStatus.txId : null,
          schema:props.schema,
          table:props.table,
          size:tableOptions.size,
          page:tableOptions.page,
          order,
          select: tableOptions.select,
          where:tableOptions.where
        }
        const response = <TableDataResponse>(await props.rpc.sendWaitReply(TypeGetTableData,req)).json()
        response.data.cols.forEach(col=>{
          const field = fieldMap.get(col.name)
          if(field){
            col.sticky = field.key === 'PRI'
          }
        })
        lodash.delay(()=>{
          isLoaded = true
          dataValue.value = response
          loading.value = false
        },100)
      } catch (e) {
        loading.value = false
        Toast.error(e.message)
        throw e;
      }
    }

    const doFill = (selection: SelectionData,str:string) => {
      const cols = selection.area.cols
      const rows = selection.area.rows.map(row=>dataValue.value.data.rows[row])

      const normalRows = rows.filter(row=>row.type === RowTypeNormal)
      const nowAddRows = rows.filter(row=>row.type === RowTypeNewAdd)
      //普通数据走批量更新逻辑
      if(normalRows.length > 0) {
        const updateValues = lodash.fill(new Array(cols.length), str)
        doBatchUpdate(normalRows, cols, updateValues)
      }
      //待保存数据只走本地更新逻辑
      if(nowAddRows.length > 0){
        nowAddRows.forEach((row)=>{
          for (const col of cols) {
            row.cols[col] = str
          }
        })
      }
    }

    const doBatchUpdate = async (rows: ResultRow[],updateCols:number[],updateValues:string[]) => {
      let whereKeys = await checkHasFullKey(dataValue.value.data.cols.map(col=>col.name))
      let whereFields = whereKeys.map(k=>k.field)
      const req = {
        txId: txStatus.begin ? txStatus.txId : null,
        schema:props.schema,
        table:props.table,
        whereFields,
        whereValues: rows.map(row=>{
          return whereKeys.map(k=>{
            return row.cols[k.idx]
          })
        }),
        fields: updateCols.map(col=>{
          return dataValue.value.data.cols[col].name
        }),
        values: updateValues
      }
      try{
        rows.forEach((row)=>{
          row.loading = true
        })
        //批量更新要么全部成功，要么全部失败
        dataTable.value.updateView()
        const response = <{rowsAffected:number}>(await props.rpc.sendWaitReply(TypeBatchUpdateTableData, req)).json()
        //更新成功进行赋值
        rows.forEach((row)=>{
          updateCols.forEach((col,idx)=>{
            row.cols[col] = updateValues[idx]
          })
          row.loading = false
        })

      }catch (e){
        //前置错误验证，未进行到更新步骤就报错即所有行都更新失败，取消所有行的loading效果
        rows.forEach(row=>row.loading = false)
        Toast.error(e.message)
      }
      dataTable.value.updateView()
    }

    const doSaveAll = ()=>{
      const saveRows = dataValue.value.data.rows
          .filter((row)=>
              row.type === RowTypeNewAdd || (row.changeCols!==null&&row.changeCols!==undefined&&row.changeCols.size!==0)
          )
      if(saveRows.length > 0){
        doSave(saveRows)
      }
    }

    const doSave = async (rows: ResultRow[]) =>{
      const inserts = rows.filter(row=>row.type === RowTypeNewAdd)
      const updates = rows.filter(row=>row.type === RowTypeNormal)
      if(inserts.length > 0){
        await doInsert(inserts)
      }
      if(updates.length > 0){
        await doUpdate(updates)
      }
    }

    const doUpdate = async (rows: ResultRow[]) => {
      let whereKeys = await checkHasFullKey(dataValue.value.data.cols.map(col=>col.name))
      let whereFields = whereKeys.map(k=>k.field)
      const dataCols = dataValue.value.data.cols
      const req = {
        txId: txStatus.begin ? txStatus.txId : null,
        schema:props.schema,
        table:props.table,
        list: rows.map((row)=>{
          const cols = Array.from(row.changeCols).sort((a,b)=>a-b)
          const fields = []
          const values = []
          for (const col of cols) {
            fields.push(dataCols[col].name)
            values.push(row.cols[col])
          }
          //where条件使用oldCol中数据(修改前的数据)，防止修改了主键id导致无法更新本次内容
          const whereValues = whereKeys.map(k=>row.oldCol[k.idx])
          return {
            whereFields,
            whereValues,
            fields,
            values
          }
        })
      }
      try{
        rows.forEach(row=>row.loading = true)
        dataTable.value.updateView()
        const response = <{error:string,rowsAffected:number}>(await props.rpc.sendWaitReply(TypeUpdateTableData, req)).json()
        //有任一错误输出错误提示
        if(response.error){
          Toast.error(response.error)
        }
        //通过返回的更新成功数判断将更新成功的行并将其已改变的列重置，以及所有的行loading重置
        rows.forEach((row,idx)=>{
          if(!response.error || idx < response.rowsAffected){
            row.changeCols.clear()
            row.oldCol = [...row.cols]
          }
          row.loading = false
        })

      }catch (e){
        //前置错误验证，未进行到更新步骤就报错即所有行都更新失败，取消所有行的loading效果
        rows.forEach(row=>row.loading = false)
        Toast.error(e.message)
      }
      dataTable.value.updateView()
    }

    const doInsert = async (rows: ResultRow[]) => {
      const dataCols = dataValue.value.data.cols
      const req = {
        txId: txStatus.begin ? txStatus.txId : null,
        schema:props.schema,
        table:props.table,
        select: tableOptions.select,
        list: rows.map((row)=>{
          const cols = Array.from(row.changeCols).sort((a,b)=>a-b)
          const fields = []
          const values = []
          for (const col of cols) {
            fields.push(dataCols[col].name)
            values.push(row.cols[col])
          }
          return {
            fields,
            values
          }
        })
      }
      try{
        rows.forEach(row=>row.loading = true)
        dataTable.value.updateView()
        const response = <{data:ResultRow|null[],error:string,rowsAffected:number}>(await props.rpc.sendWaitReply(TypeInsertTableData, req)).json()
        //有任一错误输出错误提示
        if(response.error){
          Toast.error(response.error)
        }
        //通过返回的回显数据列表判断那些行更新成功，更新成功的重置已改变列，以及所有的行loading重置
        rows.forEach((row,idx)=>{
          const newRow = response.data[idx]
          //数据为空则表示该行插入或回显数据查询失败,不为空表示插入成功并查询到回显数据
          if(newRow !== null){
            row.cols = newRow.cols
            row.changeCols.clear()
            row.type = RowTypeNormal
          }
          row.loading = false
        })

      }catch (e){
        //前置错误验证，未进行到更新步骤就报错即所有行都更新失败，取消所有行的loading效果
        rows.forEach(row=>row.loading = false)
        Toast.error(e.message)
      }
      dataTable.value.updateView()
    }

    const doDel = async (selection: SelectionData) => {
      const rows = <ResultRow[]>selection.area.rows.map((rowIdx)=>{
        return dataValue.value.data.rows[rowIdx]
      })
      try {
        //正常数据，走数据库删除逻辑
        const normalRows = rows.filter((row)=>{
          return row.type === RowTypeNormal
        })
        const rowSet = new Set(rows)

        //如果有普通数据需要走数据库删除逻辑
        if(normalRows.length > 0){
          //普通数据删除需要确认
          await Confirm.open("警告", `请确认是否删除选择的${rows.length}条数据`).finally(()=>{
            dataTable.value.focus()
          })
          //判断是否具有唯一主键
          const keyCols = await checkHasFullKey(dataValue.value.data.cols.map(col=>col.name))
          const fieldIdxSet = new Set(keyCols.map(col=>col.idx))
          const req = {
            txId: txStatus.begin ? txStatus.txId : null,
            schema: props.schema,
            table: props.table,
            fields: keyCols.map(col=>col.field),
            values: normalRows.map((item)=>{
              //过滤掉非唯一主键条件列的值，删除只需要传递唯一主键列
              return item.cols.filter((c,idx)=>fieldIdxSet.has(idx))
            })
          }
          try {
            rows.forEach(row=>{
              row.loading = true
            })
            //触发更新loading效果
            dataTable.value.updateView()
            const count = <TableField[]>(await props.rpc.sendWaitReply(TypeDeleteTableData,req)).string()
            // console.log("delete count",count)
            dataValue.value.data.rows = dataValue.value.data.rows.filter((row)=>{
              return !rowSet.has(row)
            })
            //触发更新
            dataTable.value.init()
          }catch (err){
            //删除失败取消加载效果
            rows.forEach(row=>{
              row.loading = false
            })
            Toast.error(err.message,0)
          }
          dataTable.value.resetSelectedData()
        }else{
          //未入库数据，可直接前台清理
          dataValue.value.data.rows = dataValue.value.data.rows.filter((row)=>{
            return !rowSet.has(row)
          })
          //触发更新
          dataTable.value.init()
          dataTable.value.resetSelectedData('reposition')
        }
      }catch (e) {
      }
    }

    const doAdd = ()=>{
      const rows = dataValue.value.data.rows
      const lastRow = rows[rows.length-1]
      if(lastRow.type === RowTypePlaceholder){
        //如果最后一行是占位行，则直接使用此行
        lastRow.type = RowTypeNewAdd
      }else{
        //否则在末尾添加一行数据
        rows.push(<ResultRow>{
          changeCols: new Set(),
          type: RowTypeNewAdd,
          cols: lodash.fill(new Array(dataValue.value.data.cols.length),null)
        })
      }
      //触发更新
      dataTable.value.init()
      lodash.delay(()=>{
        //跳转末尾,并选择该行
        dataTable.value.jumpColRow(null,dataValue.value.data.rows.length-1,true)
      },50)
    }

    const doCopyTableText = (selection: SelectionData, type:"data"|"column"|"column-data")=>{
      const text = genTableText(dataValue.value.data,selection,type)
      clipboard.writeText(text).then(() => {
        Toast.success(proxy.$t('common.copy-success'))
      }).catch(err => {
        console.log(err)
        Toast.error(proxy.$t('common.copy-failed'))
      });
    }

    const doCopySql = async (selection: SelectionData, type: "insert" | "insert-batch" | "update" | "delete") => {
      let sql = ""
      if (type === "insert" || type === "insert-batch") {
        const result = getItemsByArea(dataValue.value.data,selection)
        const fields = "(" + result.cols.map(field => `\`${field}\``).join(", ") + ")"
        const head = `INSERT INTO \`${props.schema}\`.\`${props.table}\` ${fields} VALUES `
        if (type === "insert-batch") {
          const values = result.rows.map(arr => {
            return "(" + arr.map((v, i) => {
              const colInfo = result.colInfo[i]
              if (NotQuoteTypeSet.has(colInfo.formatType)) {
                return escapeParam(v)
              } else {
                return escapeString(v)
              }
            }).join(", ") + ")"
          }).join(", \n") + ";"
          sql = head + values
        } else {
          sql = result.rows.map(arr => {
            return head + "(" + arr.map((v, i) => {
              const colInfo = result.colInfo[i]
              if (NotQuoteTypeSet.has(colInfo.formatType)) {
                return escapeParam(v)
              } else {
                return escapeString(v)
              }
            }).join(", ") + ");"
          }).join("\n") + ";"
        }
      } else if(type === "delete"){
        //删除忽略选中列，直接默认为所有列
        selection.area.cols = dataValue.value.data.cols.map((_,i)=>i)
        const result = getItemsByArea(dataValue.value.data,selection)
        const keyCols = await checkHasFullKey(result.cols)
        const head = `DELETE FROM \`${props.schema}\`.\`${props.table}\` WHERE `
        let where = null
        if(keyCols.length === 1){
          //只有一个where字段时走where in
          const keyCol = keyCols[0]
          const colInfo = result.colInfo[keyCol.idx]
          where = `\`${colInfo.name}\` IN (`+result.rows.map((r)=>{
            const v = r[keyCol.idx]
            if (NotQuoteTypeSet.has(colInfo.formatType)) {
              return  escapeParam(v)
            } else {
              return  escapeString(v)
            }
          }).join(", ")+")"
        }else{
          //否则走or条件
          where = result.rows.map((r)=>{
            return "(" + keyCols.map(keyCol=>{
              const v = r[keyCol.idx]
              const colInfo = result.colInfo[keyCol.idx]
              if (NotQuoteTypeSet.has(colInfo.formatType)) {
                return `\`${keyCol.field}\` = ${escapeParam(v)}`
              } else {
                return `\`${keyCol.field}\` = ${escapeString(v)}`
              }
            }).join(" AND ") + ")"
          }).join(" OR ")
        }
        sql = head + where
      } else if(type === "update") {
        const result = getItemsByArea(dataValue.value.data,selection)
        const keyCols = await checkHasFullKey(result.cols)
        const head = `UPDATE \`${props.schema}\`.\`${props.table}\` SET `
        sql = result.rows.map(arr => {
          let where = ""
          for (const keyCol of keyCols) {
            const colInfo = result.colInfo[keyCol.idx]
            if(where !== ""){
              where += " AND "
            }
            where += `\`${keyCol.field}\` = `
            if (NotQuoteTypeSet.has(colInfo.formatType)) {
              where += escapeParam(arr[keyCol.idx])
            } else {
              where += escapeString(arr[keyCol.idx])
            }
          }
          return head + arr.map((v, i) => {
            const colInfo = result.colInfo[i]
            if (NotQuoteTypeSet.has(colInfo.formatType)) {
              return `\`${colInfo.name}\` = ${escapeParam(v)}`
            } else {
              return `\`${colInfo.name}\` = ${escapeString(v)}`
            }
          }).join(", ") + ` WHERE ${where}`
        }).join(";\n") + ";"
      }
      clipboard.writeText(sql).then(() => {
        Toast.success(proxy.$t('common.copy-success'))
      }).catch(err => {
        console.log(err)
        Toast.error(proxy.$t('common.copy-failed'))
      });
    }

    const doPaste = async (selection: SelectionData, type: undefined | "text" | "selection" | "insert") => {
      const text = await clipboard.readText()
      if(!text){
        return
      }
      //如果未设置类型则自动判断粘贴类型
      if(type === undefined){
        if(selection.area.cols.length === 1 && selection.area.rows.length === 1){
          //如果只选择一行一列，那么则为文本粘贴模式
          type = "text"
        }else if(selection.area.rows.length === 0 || selection.area.cols.length === 0){
          //如果未选择则插入到末尾1
          type = "insert"
        }else{
          type = "selection"
        }
      }
      const rows = dataValue.value.data.rows
      let tabs = parserTableStr(text)
      switch (type) {
        case "text":
          selection.area.rows.forEach(r=>{
            const rowData = rows[r]
            if(!rowData.changeCols){
              rowData.changeCols = new Set<number>()
            }
            rowData.oldCol = [...rowData.cols]
            selection.area.cols.forEach(c=>{
              rowData.cols[c] = text
              rowData.changeCols.add(c)
            })
          })
          dataTable.value.updateView()
          break
        case "insert":
          //按照列的显示顺序进行排序
          const allCols = dataValue.value.data.cols.map((c,i)=>{
            return {dataIdx:i,showIdx:c.showIdx}
          }).sort((a,b)=>a.showIdx-b.showIdx)
          for (let i = 0; i < tabs.length; i++) {
            let line = tabs[i]
            const rowData = new Array(allCols.length)
            for (let j = 0; j < line.length && j < allCols.length; j++) {
              rowData[allCols[j].dataIdx] = line[j]
            }
            //更新变化列
            rows.push({
              changeCols: new Set(allCols.slice(0,line.length).map(c=>c.dataIdx)),
              type: RowTypeNewAdd,
              cols: rowData
            })
            dataTable.value.init()
            //跳转至底部
            lodash.delay(()=>{
              dataTable.value.jumpColRow(null,dataValue.value.data.rows.length-1,true)
            },50)
          }
          break
        case "selection":
          const cols = selection.area.cols
          const selectRows = selection.area.rows.map(r=>rows[r])
          for (let i = 0; i < tabs.length && i < selectRows.length; i++) {
            const line = tabs[i]
            const rowData = selectRows[i]
            if(!rowData.changeCols){
              rowData.changeCols = new Set<number>()
            }
            rowData.oldCol = [...rowData.cols]
            for (let j = 0; j < line.length && j < cols.length; j++) {
              const colDataIdx = cols[j]
              rowData.cols[colDataIdx] = line[j]
              rowData.changeCols.add(colDataIdx)
            }
          }
          dataTable.value.updateView()
          break
      }
    }

    /**
     * 检查列是否具有判断唯一的键（主键或唯一键）
     * @param cols
     */
    const checkHasFullKey = (cols:string[]):Promise<{field:string,idx:number}[]> => {
      let hasFullKey = false
      let keyCols = <{field:string,idx:number}[]>[]
      //判断是否有完整主键
      if(priKeyFields.size > 0){
        let priKeyCols = <{field:string,idx:number}[]>[]
        const priKeyFieldArr = Array.from(priKeyFields)
        hasFullKey = priKeyFieldArr.every((field)=>{
          const idx = cols.indexOf(field)
          if(idx === -1){
            return false
          }else{
            priKeyCols.push({field,idx})
            return true
          }
        })
        if(hasFullKey){
          keyCols = priKeyCols
        }
      }
      //如果没有主键，再判断是否有唯一键
      if(!hasFullKey && uniKeyFields.size > 0){
        const uniKeyFieldIdx = cols.findIndex((col)=>{
          return uniKeyFields.has(col)
        })
        if(uniKeyFieldIdx !== -1){
          keyCols = [{field:cols[uniKeyFieldIdx],idx:uniKeyFieldIdx}]
          hasFullKey = true
        }
      }
      if (hasFullKey) {
        return new Promise((resolve, reject) => {
          resolve(keyCols)
        })
      }else {
        return new Promise((resolve, reject) => {
          Confirm.open("警告", "当前选择数据无完整主键或唯一键，将使用全部数据作为查询条件，可能导致查询不准确！").then(()=>{
            keyCols = []
            cols.forEach((item,idx)=>{
              keyCols.push({
                field: keyCols[item],
                idx
              })
            })
            resolve(keyCols)
          }).catch((err)=>{
            reject(err)
          })
        })

      }
    }

    const copyLastSql = ()=>{
      clipboard.writeText(tableOptions.lastSql).then(()=>{
        Toast.success(proxy.$t('common.copy-success'))
      }).catch(err=>{
        console.log(err)
        Toast.error(proxy.$t('common.copy-failed'))
      });
    }

    const onUpdateLastSql = (p:Packet)=>{
      const response = p.json<LastSqlResponse>()
      if(response.table === props.table && response.schema === props.schema){
        tableOptions.lastSql = response.sql
      }
    }

    const resize = ()=>{
      dataTable.value.resize()
    }

    const showSearch = ()=>{
      dataTable.value.showSearch()
    }

    const swiftEditingOption = (type:string)=>{
      if(tableOptions.editingOption === type){
        tableOptions.editingOption = null
      }else{
        tableOptions.editingOption = type
      }
    }

    const refresh = async () => {
      await initTableSchema()
      await getTableData()
    }

    watch(()=>tableOptions.editingOption,()=>{
      nextTick(()=>{
        resize()
      })
    })

    watch(()=>props.rpc,(rpc) => {
      if (rpc != null) {
        rpc.on(TypeShowLastSql,onUpdateLastSql)
        refresh()
      }
    },{immediate:true})
    onUnmounted(()=>{
      props.rpc.clearOn(TypeShowLastSql,onUpdateLastSql)
      if(txStatus.begin){
        commitTx()
      }
    })
    return {
      dataTable,
      tableOptions,dataValue,loading,sortMap,sortList,fields,txStatus,
      getTableData,onContextMenuItem,resize,showSearch,swiftEditingOption,copyLastSql,
      getColTooltip,getTxStatus,beginTx,commitTx,rollbackTx,
      doCopyTableText,doAdd,doDel,doSave,doPaste,doSaveAll
    }
  }
}
</script>

<style lang="scss">
.mysql-data-table-container{
  height: 100%;
  display: flex;
  flex-direction: column;
  .v-toolbar{
    flex: 0 0 30px;
  }
  .toolbar-detail{
    flex: 0 0 auto;
    .v-field__field{
      height: 90px;
      textarea{
        resize: none;
      }
    }
  }
  .data-table-wrapper{
    filter: none!important;
    position: relative;
    flex: 1 1;
  }
  .bottom-bar{
    flex: 0 0 25px;
    display: flex;
    font-size: 10px;
    padding: 0 2px;
    .left-area{
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: calc(100% - 150px);
      .copy-btn{
        flex: 0 0 20px;
      }
      .sql-info{
        flex: 1 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        border-right: 1px solid #cdcdcd;
      }
      .count-info{
        flex: 0 0 auto;
        padding: 0 5px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        border-right: 1px solid #cdcdcd;
        text-align: center;
      }
    }
    .btn-group{
      width: 150px;
      display: flex;
      align-items: center;
      > div{
        display: flex;
        flex: 1 1;
        justify-content: space-between;
        align-items: center;
        input{
          height: 80%;
          width: 50px;
          border: 1px solid #cdcdcd;
          text-align: center;
          &:focus{
            outline: none;
          }
        }
      }
    }
  }
}
</style>