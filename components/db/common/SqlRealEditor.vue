<template>
  <div class="real-sql-editor" v-if="pureEditMode">
    <sql-editor @handleReady="handleReady" v-context-menu="{width:160,close:focus,menu:initMenu}" ref="sqlEditor" v-if="sqlConf" :sql-conf="sqlConf" v-model="sql"></sql-editor>
  </div>
  <div class="real-sql-editor" v-else>
    <v-toolbar
        height="55"
        class="action-bar"
        density="comfortable"
    >
      <div style="width: 250px;transform: scale(0.8)">
        <v-autocomplete
            hide-details
            hide-spin-buttons
            hide-no-data
            density="compact"
            label="当前数据库"
            variant="solo"
            :model-value="defaultSchema"
            @update:modelValue="updateDefaultSchema"
            :items="schemas"
        ></v-autocomplete>
      </div>
      <v-btn size="small" variant="tonal" color="error" prepend-icon="mdi-stop-circle-outline" v-on:click="$emit('stop')" v-if="loading">停止</v-btn>
      <div v-else>
        <v-btn size="small" variant="tonal" color="info" prepend-icon="mdi-arrow-right-drop-circle-outline" :loading="loading" v-on:click="$emit('execute',sql)">运行</v-btn>
        <v-btn class="ml-2" size="small" variant="tonal" color="primary" prepend-icon="mdi-cog-play-outline" :loading="loading" v-on:click="$emit('executeExplain',sql)">执行计划</v-btn>
      </div>
      <v-btn class="ml-2" size="small" variant="tonal" @click="doFormat" prepend-icon="mdi-code-braces">格式化</v-btn>
      <v-btn class="ml-2" size="small" variant="tonal" @click="doCompress" prepend-icon="mdi-code-json">压缩</v-btn>
      <v-btn class="ml-2" size="small" variant="tonal" prepend-icon="mdi-application-export">导出</v-btn>
      <v-btn class="ml-2" size="small" variant="tonal" prepend-icon="mdi-content-save-outline"  v-on:click="$emit('save',sql)">保存</v-btn>
    </v-toolbar>
    <movable-dividers ref="dividers" :show-single="showResult?null:'first'" vertical @end="$nextTick(()=>$nextTick(()=>{sqlEditor.resize();$emit('resize');}))">
      <template #first>
        <sql-editor @handleReady="handleReady" v-context-menu="{width:160,close:focus,menu:initMenu}" ref="sqlEditor" v-if="sqlConf" :sql-conf="sqlConf" v-model="sql"></sql-editor>
      </template>
      <template #last>
        <slot name="result"></slot>
      </template>
    </movable-dividers>
  </div>
</template>

<script lang="ts">
import { format } from 'sql-formatter';
import {PropType} from "#app/compat/capi";
import SqlEditor, {MySQL} from "~/components/editor/SqlEditor.vue";
import {watch, shallowRef, ref, getCurrentInstance, nextTick} from "vue";
import {Completion} from "@codemirror/autocomplete";
import MovableDividers from "~/components/common/MovableDividers.vue";
import {EditorState} from "@codemirror/state";
import {EditorView} from "codemirror";
import * as clipboard from "clipboard-polyfill";
import {Toast} from "~/lib/layer";

interface Column{
  name:string,
  type:string,
  comment:string
}

interface Table{
  schema:string,
  name:string,
  type:string,
  comment:string,
  columns:Column[]
}

interface Schema{
  name:string,
  tables:Table[]
}

export {
  Column,Table,Schema
}

export default {
  name: "SqlRealEditor",
  components: {MovableDividers, SqlEditor},
  props:{
    defaultSchema: {
      type: String,
      default: ""
    },
    schemas: {
      type: [Function,Array as PropType<Schema[]>]
    },
    modelValue: {
      type: String
    },
    showResult: {
      type: Boolean,
      default: false,
    },
    language: {
      type: String,
      default: "mysql"
    },
    loading: {
      type: Boolean,
      default: false,
    },
    pureEditMode: {
      type: Boolean,
      default: false
    }
  },
  emits: ["save","execute","stop","executeExplain","update:defaultSchema","resize"],
  setup(props,ctx) {
    const instance = getCurrentInstance()
    const proxy = <any>instance.proxy

    const sql = ref(props.modelValue)
    const sqlEditor = ref()
    const dividers = ref()
    const sqlConf = shallowRef(null)
    const schemas = ref<string[]>([])
    const defaultSchema = ref(props.defaultSchema)
    let codeInstance = <{state:EditorState,view:EditorView}>null

    watch(()=>props.defaultSchema,(d)=>{
      defaultSchema.value = d
    })

    watch(() => [props.schemas,defaultSchema.value], (arr) => {
      let currentSchemas = arr[0]
      if(currentSchemas instanceof Function){
        currentSchemas = currentSchemas()
      }
      const currentDefaultSchema = arr[1]
      const finalSchemas = new Array(currentSchemas.length)
      const allTables = currentSchemas.map((item:Schema,idx)=>{
        finalSchemas[idx] = item.name
        return item
      }).flatMap(item => item.tables)
      schemas.value = finalSchemas
      //数据表列表
      const tables = allTables.map((item:Table, idx) => {
        //当前默认数据库不用添加数据库的名称前缀
        const isDefault = item.schema === currentDefaultSchema
        const label = item.schema === currentDefaultSchema ? item.name : item.schema + "." + item.name
        return {
          label: label,
          info: item.type,
          detail: item.comment,
          type: "type",
          //默认选择的库表提示优先级更高
          boost: isDefault ? 1.5 : 1 - (idx / allTables.length)
        }
      })
      //数据表字段列表
      const schema = <{ [table: string]: readonly (string | Completion)[] }>{}
      allTables.forEach((table) => {
        //当前默认数据库不用添加数据库的名称前缀
        const isDefault = table.schema === currentDefaultSchema
        const label = isDefault ? table.name : table.schema + "." + table.name
        schema[label] = table.columns.map((item:Column, idx) => {
          return {
            label: item.name,
            info: item.type,
            detail: item.comment,
            type: "variable",
            boost: 1 - (idx / table.columns.length)
          }
        })
      })
      // console.log("currentDefaultSchema",currentDefaultSchema)
      // console.log("tables",tables)
      // console.log("schema",schema)

      sqlConf.value = {
        dialect: MySQL,
        tables,
        schema,
      }
    },{immediate:true})

    const handleReady = (payload:{state:EditorState,view:EditorView}) => {
      codeInstance = payload
    }

    const initMenu = async () => {
      let copyText = null
      try {
        copyText = await clipboard.readText()
      } catch (e) {

      }
      const selection = codeInstance.view.state.selection.main
      const selectStr = codeInstance.view.state.doc.sliceString(selection.from,selection.to)
      if(props.pureEditMode){
        return[
          {
            type: "title",
            title: proxy.$t('common.operate'),
          },
          {
            type: "item",
            title: "格式化",
            icon: "mdi-content-copy",
            click: doFormat
          },
          {
            type: "item",
            title: "压缩",
            icon: "mdi-content-copy",
            click: doCompress
          },
          {
            type: "item",
            title: proxy.$t('common.copy'),
            icon: "mdi-content-copy",
            disabled: selectStr === null || selectStr === '',
            click: () => {
              clipboard.writeText(selectStr).then(()=>{
              }).catch(err=>{
                console.log(err)
                Toast.error(proxy.$t('common.copy-failed'))
              });
            }
          },
          {
            type: "item",
            title: proxy.$t('common.cut'),
            icon: "mdi-content-cut",
            disabled: selectStr === null || selectStr === '',
            click: () => {
              const spec = codeInstance.view.state.replaceSelection("")
              codeInstance.view.dispatch(spec)
              clipboard.writeText(selectStr).then(()=>{
              }).catch(err=>{
                console.log(err)
                Toast.error(proxy.$t('common.copy-failed'))
              });
            }
          },
          {
            type: "item",
            title: proxy.$t('common.paste'),
            icon: "mdi-content-paste",
            disabled: copyText === null || copyText === "",
            click: () => {
              const spec = codeInstance.view.state.replaceSelection(copyText)
              codeInstance.view.dispatch(spec)
            }
          },
          {
            type: "item",
            title: "清空",
            icon: "mdi-content-paste",
            click: () => {
              sql.value = ""
            }
          },
        ]
      }else{
        return[
          {
            type: "title",
            title: proxy.$t('common.operate'),
          },
          {
            type: "item",
            title: "仅运行选择的",
            icon: "mdi-repeat",
            disabled: selectStr === null || selectStr === '',
            click: () => {
              ctx.emit("execute",selectStr)
            }
          },
          {
            type: "item",
            title: proxy.$t('common.copy'),
            icon: "mdi-content-copy",
            disabled: selectStr === null || selectStr === '',
            click: () => {
              clipboard.writeText(selectStr).then(()=>{
              }).catch(err=>{
                console.log(err)
                Toast.error(proxy.$t('common.copy-failed'))
              });
            }
          },
          {
            type: "item",
            title: proxy.$t('common.cut'),
            icon: "mdi-content-cut",
            disabled: selectStr === null || selectStr === '',
            click: () => {
              const spec = codeInstance.view.state.replaceSelection("")
              codeInstance.view.dispatch(spec)
              clipboard.writeText(selectStr).then(()=>{
              }).catch(err=>{
                console.log(err)
                Toast.error(proxy.$t('common.copy-failed'))
              });
            }
          },
          {
            type: "item",
            title: proxy.$t('common.paste'),
            icon: "mdi-content-paste",
            disabled: copyText === null || copyText === "",
            click: () => {
              const spec = codeInstance.view.state.replaceSelection(copyText)
              codeInstance.view.dispatch(spec)
            }
          },
          {
            type: "item",
            title: "清空",
            icon: "mdi-content-paste",
            click: () => {
              sql.value = ""
            }
          },
        ]
      }

    }

    const updateDefaultSchema = (v)=>{
      ctx.emit("update:defaultSchema",v)
    }

    const focus = ()=>{
      sqlEditor.value.focus()
    }

    const doFormat = ()=>{
      sql.value = format(sql.value, { language: props.language })
    }

    const doCompress = ()=>{
      sql.value = format(sql.value, { language: props.language,tabWidth:0,denseOperators:false,newlineBeforeSemicolon:false,linesBetweenQueries:0})
          .replaceAll("\n"," ")
          .replaceAll(";",";\n")
          .replaceAll("\n ","\n")
    }

    const resize = ()=>{
      dividers.value.onResize()
    }

    return {dividers,sqlEditor,schemas,sql,defaultSchema,sqlConf,resize,doFormat,doCompress,initMenu,focus,updateDefaultSchema,handleReady}
  }
}
</script>

<style lang="scss">
.real-sql-editor{
  display: flex;
  height: 100%;
  flex-direction: column;
  .action-bar{
    flex: 0 0 48px;
    display: flex;
    align-items: center;
  }
}
</style>