<template>
  <table-struct-editor-frame :tabs="tabs" >
    <template #tooltip>
      <v-btn variant="text" size="small" density="comfortable" prepend-icon="mdi-plus" color="info">添加</v-btn>
      <v-btn variant="text" size="small" density="comfortable" prepend-icon="mdi-close" color="error">删除</v-btn>
    </template>
    <template #content="{tabIdx}" v-if="!loading">
      <table-struct-field-editor
          :metadata="fieldHeaders"
          :schema="schema"
          :table="table"
          v-model="tableStructure.fields"
          v-if="tabIdx === 0"
          :disable-fn="checkFieldDisableFn"
          @update:selectRow="selectFieldRow = $event">
        <template #bottom="{row,field}">
          <mysql-field-editor :model-value="field" :table-structure="tableStructure"></mysql-field-editor>
        </template>
      </table-struct-field-editor>

      <table-struct-field-editor
          :metadata="indexHeaders"
          :schema="schema"
          :table="table"
          v-model="tableStructure.indexes"
          v-else-if="tabIdx === 1"
          @update:selectRow="selectFieldRow = $event">
        <template #customPopup="{item,key,colIdx,idx,header}">
          <mysql-table-index-field-editor  :fields="tableStructure.fields" v-model="item.fields"></mysql-table-index-field-editor>
        </template>
      </table-struct-field-editor>

      <table-struct-field-editor
          :metadata="foreignKeyHeaders"
          :schema="schema"
          :table="table"
          v-model="tableStructure.foreignKeys"
          v-else-if="tabIdx === 2"
          @update:selectRow="selectFieldRow = $event">
      </table-struct-field-editor>

      <table-struct-field-editor
          ref="triggerStruct"
          :metadata="triggerHeaders"
          :schema="schema"
          :table="table"
          v-model="tableStructure.triggers"
          v-else-if="tabIdx === 3"
          @update:selectRow="selectFieldRow = $event">
      </table-struct-field-editor>

      <v-card class="advanced-panel" v-else>
        <div class="advanced-panel-container">
          <div>
            <v-text-field v-model="tableStructure.table.name" label="表名" variant="solo" density="compact" persistent-placeholder></v-text-field>
            <v-text-field v-model="tableStructure.table.comment" label="注释" variant="solo" density="compact" persistent-placeholder></v-text-field>
            <v-autocomplete v-model="tableStructure.table.charset" :items="tableStructure.charsets" item-value="charset" item-title="charset" label="字符集" variant="solo" density="compact" persistent-placeholder></v-autocomplete>
            <v-autocomplete v-model="tableStructure.table.collation" :items="tableStructure.charsets.find((item)=>item.charset === 'utf8mb4')?.collations" label="校对规则" variant="solo" density="compact" persistent-placeholder></v-autocomplete>
            <v-autocomplete v-model="tableStructure.table.engine" :items="Engines" label="引擎" variant="solo" density="compact" persistent-placeholder></v-autocomplete>
            <v-autocomplete v-model="tableStructure.table.rowFormat" :items="RowFormats" label="行格式" variant="solo" density="compact" persistent-placeholder></v-autocomplete>
            <v-text-field v-model="tableStructure.table.autoIncrement" label="自动递增" type="number" variant="solo" density="compact" persistent-placeholder></v-text-field>
          </div>
          <ul>
            <li>行数:{{tableStructure.table.tableRows}}</li>
            <li>创建时间:{{tableStructure.table.createTime??'-'}}</li>
            <li>检查时间:{{tableStructure.table.checkTime??'-'}}</li>
            <li>更新时间:{{tableStructure.table.updateTime??'-'}}</li>
            <li>表数据大小:{{$fileSizeConvert(tableStructure.table.dataLength)}}</li>
            <li>平均行大小:{{$fileSizeConvert(tableStructure.table.avgRowLength)}}</li>
            <li>索引大小:{{$fileSizeConvert(tableStructure.table.indexLength)}}</li>
            <li>最大行大小:{{$fileSizeConvert(tableStructure.table.maxDataLength)}}</li>
          </ul>
        </div>
      </v-card>

    </template>
  </table-struct-editor-frame>
</template>

<script lang="ts">
import TableStructFieldEditor, { StructColumnMetadata } from "~/components/db/common/TableStructFieldEditor.vue";
import TableStructEditorFrame from "~/components/db/common/TableStructEditorFrame.vue";
import {Table} from "~/components/db/common/TablesView.vue";
import {TableField, TableQuery, TypeGetTableFields} from "~/components/db/mysql/MysqlDataTable.vue";
import {Toast} from "~/lib/layer";
import {onMounted, ref, watch} from "vue";
import Rpc from "~/lib/rpc";
import {PropType} from "#app/compat/capi";
import {InputType} from "~/components/db/common/TableStructInput.vue";
import SimpleInput from "~/components/common/SimpleInput.vue";
import SelectView from "~/components/common/SelectView.vue";
import SimpleSelect from "~/components/common/SimpleSelect.vue";
import SmallAutoComplete from "~/components/common/SmallAutoComplete.vue";
import MysqlFieldEditor from "~/components/db/mysql/MysqlFieldEditor.vue";
import MysqlTableIndexFieldEditor from "~/components/db/mysql/MysqlTableIndexFieldEditor.vue";
import { TypeGetSchemaShort } from "./MysqlRealEditor.vue";
import { TypeGetTableSummaryList } from "./MysqlTablesView.vue";

export const FieldTypeMapping = Object.freeze({
  Int: Object.freeze(new Set(['int', 'integer', 'smallint', 'tinyint', 'mediumint', 'bigint'])),
  Decimal: Object.freeze(new Set(['float', 'double', 'decimal'])),
  String: Object.freeze(new Set(['varchar', 'char', 'text', 'tinytext', 'mediumtext', 'longtext'])),
  Date: Object.freeze(new Set(['date', 'datetime', 'timestamp', 'time', 'year'])),
  Json: Object.freeze(new Set(['json'])),
  Bin: Object.freeze(new Set(['binary', 'varbinary', 'tinyblob', 'blob', 'mediumblob', 'longblob'])),
  Enum: Object.freeze(new Set(['enum', 'set'])),
})

export const RowFormats = Object.freeze([
  "DYNAMIC",
  "COMPACT",
  "REDUNDANT",
  "FIXED",
  "COMPRESSED"
])

export const Engines = Object.freeze([
  "InnoDB",
  "MyISAM",
  "CSV",
  "ARCHIVE",
  "MEMORY",
  "MRG_MYISAM",
  "BLACKHOLE",
  "PERFORMANCE_SCHEMA"
])

export const IndexTypes = Object.freeze([
  "BTREE",
  "FULLTEXT",
  "HASH",
  "SPATIAL"
])

export const TriggerTiming = Object.freeze([
  "BEFORE",
  "AFTER"
])

export const TriggerMethods = Object.freeze([
  "INSERT",
  "UPDATE",
  "DELETE"
])

export const ForeignKeyRules = Object.freeze([
    "CASCADE",
    "NO ACTION",
    "RESTRICT",
    "SET NULL"
])

export const FieldTypes = Object.freeze([
  "binary",
  "bigint",
  "bit",
  "blob",
  "boolean",
  "char",
  "date",
  "datetime",
  "decimal",
  "double",
  "enum",
  "float",
  "geography",
  "geometry",
  "int",
  "integer",
  "json",
  "linestring",
  "longblob",
  "longtext",
  "mediumblob",
  "mediumint",
  "mediumtext",
  "multilinestring",
  "multipoint",
  "multipolygon",
  "numeric",
  "point",
  "polygon",
  "set",
  "smallint",
  "text",
  "time",
  "timestamp",
  "tinyblob",
  "tinyint",
  "tinytext",
  "varbinary",
  "varchar",
  "year"
])

const TypeGetTableStructure = "getTableStructure"

export interface TableSummary extends Table{
  schema: string,
  type: string,
  engine: string,
  comment: string,
  rowFormat: string,
  tableRows: number,
  avgRowLength: number,
  dataLength: number,
  maxDataLength:number,
  indexLength: number,
  dataFree: number,
  autoIncrement: number,
  createTime: string,
  updateTime: string,
  checkTime: string,
  collation:string,
  charset:string,
  columns: number,
  indexes: number
}

export interface TableForeignKey {
  schema           :string
  table            :string
  columns          :string[]
  referencedSchema :string
  referencedTable  :string
  referencedColumns:string[]
  constraintName   :string
  updateRule       :string
  deleteRule       :string
}

export interface TableTrigger {
  schema       :string
  table        :string
  name         :string
  manipulation :string
  statement    :string
  orientation  :string
  timing       :string
  created      :string
}

export interface TableIndex {
  name      :string
  isUnique  :boolean,
  type      :string,
  nullable  :boolean,
  comment   :string
  fields    :IndexField[]
}

export interface IndexField {
  id        :string,
  name      :string,
  orderType :string,
  cardinality :string
}

export interface TableIndexField {
  name        :string
  orderType   :string
}

export interface Charset {
  Charset     :string
  Collations  :string[]
}

export interface TableStructure {
  table       :TableSummary
  fields      :TableField[]
  indexes     :TableIndex[]
  foreignKeys :TableForeignKey[]
  triggers    :TableTrigger[]
  charsets    :Charset[]
}

const tabs = Object.freeze(["字段", "索引", "外键", "触发器", "高级"])

export default {
  name: "MysqlTableStructEditor",
  components: {
    MysqlTableIndexFieldEditor,
    MysqlFieldEditor,
    SmallAutoComplete, SimpleSelect, SelectView, SimpleInput, TableStructEditorFrame, TableStructFieldEditor},
  props: {
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
  setup: function (props, ctx) {
    const triggerStruct = ref();
    const loading = ref(true)
    const tableStructure = ref<TableStructure>(null)
    const selectFieldRow = ref(0)
    const schemas = ref([])
    const fieldHeaders = ref(Object.freeze(<StructColumnMetadata[]>[
      {
        key: "order",
        minWidth: 60,
        width: 60,
        type: InputType.SortBtn,
      },
      {
        key: "name",
        title: "字段",
        minWidth: 140,
        width: 140,
        type: InputType.Char
      },
      {
        key: "dbDataType",
        title: "类型",
        minWidth: 80,
        width: 120,
        type: InputType.AutoComplete,
        options: FieldTypes,
      },
      {
        key: "length",
        title: "长度",
        minWidth: 40,
        width: 80,
        type: InputType.Int,
      },
      {
        key: "scala",
        title: "小数位",
        minWidth: 45,
        width: 80,
        type: InputType.Int,
      },
      {
        key: "nullable",
        title: "不为NULL",
        minWidth: 65,
        width: 80,
        type: InputType.Checkbox,
      },
      {
        key: "isVirtual",
        title: "虚拟",
        minWidth: 60,
        width: 80,
        type: InputType.Checkbox,
      },
      {
        key: "priPosition",
        title: "主键",
        minWidth: 60,
        width: 60,
        type: InputType.MulKey,
      },
      {
        key: "comment",
        title: "注释",
        minWidth: 120,
        width: 260,
        type: InputType.Text,
      }
    ]));

    const indexHeaders = ref(Object.freeze(<StructColumnMetadata[]>[
      {
        key: "name",
        title: "名称",
        minWidth: 140,
        width: 140,
        type: InputType.Char,
      },
      {
        key: "fields",
        title: "字段",
        minWidth: 100,
        width: 260,
        type: InputType.CustomPopup,
        options: FieldTypes,
        formatFunc: (row:TableIndex,idx:number)=>{
          return row.fields.map((f)=>{
            if(f.orderType){
              return "`" + f.name + "` " + f.orderType
            }
            return "`" + f.name + "`"
          }).join(",")
        }
      },
      {
        key: "type",
        title: "索引类型",
        minWidth: 80,
        width: 120,
        type: InputType.AutoComplete,
        options: IndexTypes
      },
      {
        key: "isUnique",
        title: "唯一",
        minWidth: 60,
        width: 80,
        type: InputType.Checkbox,
      },
      {
        key: "comment",
        title: "注释",
        minWidth: 120,
        width: 260,
        type: InputType.Text,
      }
    ]));

    const foreignKeyHeaders = ref(Object.freeze(<StructColumnMetadata[]>[
      {
        key: "name",
        title: "名称",
        minWidth: 140,
        width: 140,
        type: InputType.Char,
      },
      {
        key: "columns",
        title: "字段",
        minWidth: 140,
        width: 200,
        type: InputType.MulSelect,
        options: ()=>{
          return tableStructure.value.fields.map(f=>f.name)
        },
        formatFunc: (row:any,idx:number)=>{
          return row?.columns?.map(column=>"`"+column+"`").join(",")
        }
      },
      {
        key: "referencedSchema",
        title: "引用库",
        minWidth: 80,
        width: 100,
        type: InputType.AutoComplete,
        options: ()=>{
          return schemas.value.map(f=>f.name)
        },
      },
      {
        key: "referencedTable",
        title: "引用表",
        minWidth: 80,
        width: 100,
        type: InputType.AutoComplete,
        options: async () => {
          try {
            const idx = triggerStruct.value?.currEditingPos.idx
            const trigger = tableStructure.value.triggers[idx]
            if (trigger.schema) {
              const tables = (await props.rpc.sendWaitReply(TypeGetTableSummaryList, {schema: trigger.schema})).json()
              return tables.value.map(f => f.name)
            }else{
              return []
            }
          }catch (e) {
            Toast.error(e.message)
            return []
          }
        },
      },
      {
        key: "referencedColumns",
        title: "引用字段",
        minWidth: 140,
        width: 200,
        type: InputType.MulSelect,
        formatFunc: (row:any,idx:number)=>{
          return row?.referencedColumns?.map(column=>"`"+column+"`").join(",")
        },
        options: <any>(async () => {
          try {
            const idx = triggerStruct.value?.currEditingPos.idx
            const trigger = tableStructure.value.triggers[idx]
            if (trigger.schema && trigger.table) {
              const fields = <TableField[]>(await props.rpc.sendWaitReply(TypeGetTableFields, <TableQuery>{
                schema: trigger.schema,
                table: trigger.table
              })).json()
              return fields.map(f => f.name)
            }else{
              return []
            }
          }catch (e) {
            Toast.error(e.message)
            return []
          }
        }),
      },
      {
        key: "deleteRule",
        title: "删除规则",
        minWidth: 80,
        width: 100,
        type: InputType.AutoComplete,
        options: ForeignKeyRules
      },
      {
        key: "updateRule",
        title: "更新规则",
        minWidth: 80,
        width: 100,
        type: InputType.AutoComplete,
        options: ForeignKeyRules
      },
    ]));

    const triggerHeaders = ref(Object.freeze(<StructColumnMetadata[]>[
      {
        key: "name",
        title: "名称",
        minWidth: 140,
        width: 140,
        type: InputType.Char,
      },
      {
        key: "timing",
        title: "触发时机",
        minWidth: 70,
        width: 80,
        type: InputType.AutoComplete,
        options: TriggerTiming
      },
      {
        key: "manipulation",
        title: "触发方式",
        minWidth: 70,
        width: 80,
        type: InputType.AutoComplete,
        options: TriggerMethods
      },
      {
        key: "statement",
        title: "执行语句",
        minWidth: 250,
        width: 350,
        type: InputType.Sql,
        options: ()=>schemas.value
      }
    ]));

    const checkFieldDisableFn = (col: StructColumnMetadata, row: TableField) => {
      if (col.key === "scala") {
        if (row.dbDataType) {
          return !FieldTypeMapping.Decimal.has(row.dbDataType)
        }
      } else {
        return false
      }
    }

    const init = async () => {
      loading.value = true
      try {
        tableStructure.value = (await props.rpc.sendWaitReply(TypeGetTableStructure, {
          schema: props.schema,
          table: props.table
        })).json();
        schemas.value = (await props.rpc.sendWaitReply(TypeGetSchemaShort)).json()
      } catch (e) {
        Toast.error(e.message)
        throw e;
      } finally {
        loading.value = false
      }
    }

    watch(() => props.rpc, (rpc) => {
      if (rpc != null) {
        init()
      }
    }, {immediate: true})

    return {
      triggerStruct,
      FieldTypeMapping,
      Engines,RowFormats,
      triggerHeaders,fieldHeaders,indexHeaders,foreignKeyHeaders,
      tabs, loading, tableStructure, selectFieldRow,schemas,
      checkFieldDisableFn
    }
  }
}
</script>

<style lang="scss">
  .advanced-panel{
    width: 600px;
    padding: 30px;
    margin: 20px auto auto;
    .advanced-panel-container{
      margin: auto;
      display: flex;
      ul{
        li{
          font-size: 14px;
          line-height: 55px;
          margin-left: 35px;
        }
      }
    }
  }
</style>