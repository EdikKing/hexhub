<template>
  <sql-real-editor
      ref="editor"
      v-model:defaultSchema="defaultSchema"
      :schemas="schemas"
      :show-result="result.length !== 0"
      :loading="loading"
      @stop="doStop"
      @execute="doExecute"
      @executeExplain="doExecuteExplain"
      @resize="onResize">
    <template #result>
      <div class="result-wrapper">
        <div class="tabs">
          <v-btn-toggle mandatory rounded="0" color="primary" v-model="showIdx">
            <v-btn size="x-small" density="compact" v-for="item in result">{{item.title}}</v-btn>
          </v-btn-toggle>
        </div>
        <div class="results">
          <simple-data-table
              ref="table"
              v-if="result.length > 0"
              v-model="result[showIdx].data"
              @contextMenuItem="onContextMenuItem"
              @copy="doCopyTableText(result[showIdx].data,$event,'data')"
          ></simple-data-table>
        </div>
        <div class="sql-info" v-if="result.length > 0">
          <span v-if="showIdx === 0">
              共 {{result[0].data?.rows?.length}} 条Sql语句
          </span>
          <span v-else>
              共返回 {{result[showIdx].rows}} 条数据,{{result[showIdx].sql}}
          </span>
        </div>
      </div>
    </template>
  </sql-real-editor>
</template>

<script lang="ts">
import SqlRealEditor from "~/components/db/common/SqlRealEditor.vue";
import Rpc from "~/lib/rpc"
import {ContextMenu, Prompt, Toast} from "~/lib/layer";
import {ref, nextTick, watch, shallowRef, getCurrentInstance} from "vue";
import {FormatType, ResultRow, ResultSet} from "~/components/db/common/DataTable.vue";
import Channel from "~/lib/rpc/channel";
import Packet from "~/lib/rpc/packet";
import SimpleDataTable, {genTableText} from "~/components/db/common/SimpleDataTable.vue";
import * as clipboard from "clipboard-polyfill";
import {RowTypePlaceholder, SelectionData} from "~/components/db/common/SimpleDataTable.vue";
import {PropType} from "#app/compat/capi";

export const TypeSqlExecute = "sqlExecute"
export const TypeSqlExplainExecute = "sqlExplainExecute"
export const TypeGetSchemaShort = "getSchemaShort"

interface sqlExecuteStatus {
  sql:string
  status:boolean
  isQuery:boolean
  error:string
  lastId:number
  rowsAffected:number
  result:ResultSet
  time:number
}

interface sqlExecuteExplainStatus extends sqlExecuteStatus{
  explainResult:ResultSet
}

export default {
  name: "MysqlEditor",
  components: {SimpleDataTable, SqlRealEditor},
  props:{
    rpc: {
      type: Object as PropType<Rpc>
    },
    defaultSchema: {
      type: String
    }
  },
  emits: [],
  setup(props,ctx) {
    const proxy = <any>getCurrentInstance().proxy
    const defaultSchema = ref(props.defaultSchema)
    const schemas = ref([])
    const loading = ref(false)
    const result = shallowRef(<{title:string,sql?:string,rows:number,data:ResultSet}[]>[])
    const showIdx = ref(0)
    const table = ref()
    const editor = ref()
    let lastChannel = <Channel>null
    const initSchemas = async () => {
      try {
        schemas.value = (await props.rpc.sendWaitReply(TypeGetSchemaShort)).json()
      } catch (e) {
        Toast.error(e.message)
        throw e;
      }
    }
    const doStop = ()=>{
      if(lastChannel!=null){
        lastChannel.close(Channel.CloseInterrupt,"stop")
        lastChannel = null
      }
    }

    const doExecute = (sql:string)=>{
      loading.value = true
      const chan = props.rpc.openChannel(TypeSqlExecute, {
        schema: defaultSchema.value,
        sql
      })
      lastChannel = chan
      chan.onmessage = (v:Packet,chan:Channel)=>{
        const statues = v.json<sqlExecuteStatus[]>()
        const newResult = [{
          title: "摘要",
          sql: undefined,
          rows: 0,
          data: <ResultSet>{
            cols: [{name: "SQL",formatType:FormatType.String},{name: "耗时",formatType:FormatType.String,width:100},{name: "状态",formatType:FormatType.String,width: 80},{name: "结果",formatType:FormatType.String,width:280}],
            rows: statues.map((status):ResultRow=>{
              let msg = status.error
              if(status.status){
                if(status.isQuery){
                  msg = `Result rows: ${status.result.rows.length}`
                }else if(status.lastId){
                  msg = `Affected rows: ${status.rowsAffected}, Last insert id: ${status.lastId}`
                }else{
                  msg = `Affected rows: ${status.rowsAffected}`
                }
              }
              return {
                cols: [status.sql,(status.time/1000).toFixed(3)+"s",status.status?"成功":'失败',msg]
              }
            })
          }
        }]
        statues.forEach((status,i)=>{
          if(status.isQuery && status.status){
            newResult.push({
              title: `结果${i+1}`,
              data: status.result,
              sql: status.sql,
              rows: status.result.rows.length
            })
          }
        })
        if(statues.length > 0){
          const first = statues[0]
          //如果首个是查询并且查询成功，显示首个的数据，否则显示摘要
          showIdx.value = first.isQuery && first.status ? 1 : 0
        }else{
          showIdx.value = 0
        }
        result.value = newResult
      }
      chan.onclose = (code:number,reason:string)=>{
        lastChannel = null
        loading.value = false
        if(code===Channel.CloseFailure){
          Toast.error(reason)
        }
      }
    }

    const doExecuteExplain = (sql:string)=>{
      loading.value = true
      const chan = props.rpc.openChannel(TypeSqlExplainExecute, {
        schema: defaultSchema.value,
        sql
      })
      lastChannel = chan
      chan.onmessage = (v:Packet,chan:Channel)=>{
        const statues = v.json<sqlExecuteExplainStatus[]>()
        const newResult = [{
          title: "摘要",
          sql: undefined,
          rows: 0,
          data: <ResultSet>{
            cols: [{name: "SQL",formatType:FormatType.String},{name: "耗时",formatType:FormatType.String,width:100},{name: "状态",formatType:FormatType.String,width: 80},{name: "结果",formatType:FormatType.String,width:280}],
            rows: statues.map((status):ResultRow=>{
              let msg = status.error
              if(status.status){
                if(status.isQuery){
                  msg = `Query results: ${status.result.rows.length}`
                }else if(status.lastId){
                  msg = `Affected rows: ${status.rowsAffected}, Last insert id: ${status.lastId}`
                }else{
                  msg = `Affected rows: ${status.rowsAffected}`
                }
              }
              return {
                cols: [status.sql,(status.time/1000).toFixed(3)+"s",status.status?"成功":'失败',msg]
              }
            })
          }
        }]
        statues.forEach((status,i)=>{
          if(status.status){
            if(status.isQuery){
              newResult.push({
                title: `结果${i+1}`,
                data: status.result,
                sql: status.sql,
                rows: status.result.rows.length
              })
            }
            newResult.push({
              title: `解释${i+1}`,
              data: status.explainResult,
              sql: status.sql,
              rows: status.result.rows.length
            })
          }
        })

        showIdx.value = newResult.length - 1
        result.value = newResult
      }
      chan.onclose = (code:number,reason:string)=>{
        lastChannel = null
        loading.value = false
        if(code===Channel.CloseFailure){
          Toast.error(reason)
        }
      }
    }

    const copySql = ()=>{
      clipboard.writeText(result.value[showIdx.value].sql).then(()=>{
        Toast.success(proxy.$t('common.copy-success'))
      }).catch(err=>{
        console.log(err)
        Toast.error(proxy.$t('common.copy-failed'))
      });
    }


    const onContextMenuItem = async function (evt: MouseEvent, selection?: SelectionData) {
      evt.stopPropagation()
      evt.preventDefault()
      const dataValue = result.value[showIdx.value].data
      const cols = selection.area.cols
      ContextMenu.open(evt, [
        {
          type: "title",
          title: proxy.$t('common.operate'),
        },
        {type: "line"},
        {
          type: "menu",
          title: "复制为",
          icon: "mdi-content-copy",
          menus: [
            {
              type: "title",
              title: "复制",
            },
            {
              type: "item",
              title: "表格文本-字段和数据",
              click: () => doCopyTableText(dataValue,selection, "column-data")
            },
            {
              type: "item",
              title: "表格文本-数据",
              click: () => doCopyTableText(dataValue,selection, "data")
            },
            {
              type: "item",
              title: "表格文本-字段",
              click: () => doCopyTableText(dataValue,selection, "column")
            },
          ]
        },
        {type: "line"},
        {
          type: "menu",
          title: "跳转行",
          icon: "mdi-arrow-u-right-top",
          menus: [
            {
              type: "item",
              title: "跳转顶部",
              click: () => table.value?.jumpColRow(null, 0, true)
            },
            {
              type: "item",
              title: "跳转底部",
              click: () => table.value?.jumpColRow(null, dataValue.rows.length - 1, true)
            },
            {
              type: "item",
              title: "自定义跳转",
              click: () => {
                Prompt.open("请输入跳转行", 1).then((v: string) => {
                  table.value?.jumpColRow(null, Math.max(0, Number.parseInt(v, 10) - 1), true)
                })
              }
            }
          ]
        },
        {type: "line"},
        {
          type: "item",
          title: "锁定列",
          icon: "mdi-lock-open-plus-outline",
          //能锁定的前提是选中的列，有任一一项是未锁定的
          disabled: !cols.some((mCol) => !dataValue.cols[mCol].sticky),
          click: () => {
            for (const mCol of cols) {
              dataValue.cols[mCol].sticky = true
            }
            //更新sticky偏移位置
            table.value?.calcColPos()
          }
        },
        {
          type: "item",
          title: "解锁列",
          icon: "mdi-lock-open-minus-outline",
          //能解锁的前提是选中的列，有任一一项是锁定的
          disabled: !cols.some((mCol) => dataValue.cols[mCol].sticky),
          click: () => {
            for (const mCol of cols) {
              dataValue.cols[mCol].sticky = false
            }
            //更新sticky偏移位置
            table.value?.calcColPos()
          }
        },
      ], 160).finally(() => {
      });
    };

    const doCopyTableText = (data:ResultSet,selection: SelectionData, type:"data"|"column"|"column-data")=>{
      const text = genTableText(data,selection,type)
      clipboard.writeText(text).then(() => {
        Toast.success(proxy.$t('common.copy-success'))
      }).catch(err => {
        console.log(err)
        Toast.error(proxy.$t('common.copy-failed'))
      });
    }

    const resize = ()=>{
      editor.value?.resize()
    }

    const onResize = ()=>{
      table.value?.resize()
    }


    watch(()=>props.rpc,(rpc)=>{
      if(rpc!=null){
        initSchemas()
      }
    },{immediate:true})
    return {editor,table,result,showIdx,schemas,loading,defaultSchema,initSchemas,doExecute,doExecuteExplain,doStop,copySql,doCopyTableText,onContextMenuItem,resize,onResize}
  }
}
</script>

<style lang="scss" scoped>
.result-wrapper{
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 100%;
  width: 100%;
  padding: 0 5px;
  .tabs{
    flex: 0 0 30px;
    //border-bottom: #e0e0e0 solid 0.5px;
    width: 100%;
    display: flex;
    justify-content: center;
    .v-btn-group{
      height: 30px!important;
    }
  }
  .sql-info{
    flex: 0 0 20px;
    line-height: 20px;
    text-align: center;
    font-size: 12px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .results{
    width: 100%;
    flex: 1 1;
  }
}

</style>