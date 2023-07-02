<template>
  <simple-data-table
      ref="table"
      :sortable="true"
      :sorts="sorts"
      :row-height="rowHeight"
      :model-value="modelValue"
      :item-class="itemClass"
      :loading="loading"
      :col-tooltip="colTooltip"
      v-on:keydown="onKeydown"
      @saveRow="$emit('saveRow',$event)"
      @copy="$emit('copy',$event)"
      @cut="$emit('cut',$event)"
      @paste="$emit('paste',$event)"
      @delete="$emit('delete',$event)"
      @save="$emit('save',$event)"
      @clickItem="onClickItem"
      @changeSelected="current.show = false"
      @sort="$emit('sort',$event)"
      @contextMenuItem="(evt,area)=>$emit('contextMenuItem',evt,area)"
  >
    <template #default="{row,col,originCol,x,y}">
      <div class="data-table-input-container">
        <div v-if="!current.show || current.col !== x || current.row !== y" :class="row.cols[col.originIdx] === null?'text null':'text'">
          {{row.cols[col.originIdx]??(row.type === rowConstants.RowTypePlaceholder?"NaN":"NULL")}}
        </div>
        <div class="input-wrapper" v-else v-on:mousemove.stop v-on:mousedown.stop v-on:mouseup.stop>
          <simple-input class="data-input" :value="current.val" @update:modelValue="updateValue($event,originCol,y)" v-on:keydown="onInputKeydown"></simple-input>
          <div class="icon-btn">
            <v-dropdown
                placement="bottom"
                :arrow-padding="8"
                :triggers="[]"
                :hideTriggers="[]"
                :showTriggers="[]"
                :handleResize="false"
                v-model:shown="current.showMore"
                :theme="theme.global.name.value"
            >
              <v-icon :style="current.showMore?'visibility: hidden':'visibility: visible'" icon="mdi-dots-horizontal" v-ripple v-on:click.stop="current.showMore = !current.showMore"></v-icon>
              <template #popper>
                <div class="popper-container" v-on:mousemove.stop v-on:mousedown.stop v-on:mouseup.stop v-on:keydown.esc="current.showMore=false" v-on:focusout="current.showMore=false">
                  <input v-if="FormatType.Decimal === current.type || FormatType.Int === current.type" type="number" :value="current.val" v-on:keydown.enter="current.showMore=false" v-on:keyup="onInputChange($event,originCol,y)" v-on:change="onInputChange($event,originCol,y)"/>
                  <input v-else-if="FormatType.Date === current.type" type="time" :value="current.val" v-on:keyup="onInputChange($event,originCol,y)" v-on:change="onInputChange($event,originCol,y)"/>
                  <json-editor v-else-if="FormatType.Json === current.type" style="width: 55vw;height: 300px" :model-value="current.val" @update:modelValue="updateValue($event,originCol,y)"></json-editor>
                  <code-editor v-else style="width: 55vw;height: 300px" :model-value="current.val" @update:modelValue="updateValue($event,originCol,y)"></code-editor>
<!--                  <textarea r v-else style="width: 55vw;height: 300px" :value="current.val" @update:value="updateValue(current.val,originCol,y)"></textarea>-->
                </div>
              </template>
            </v-dropdown>
          </div>
        </div>
      </div>
    </template>
  </simple-data-table>
</template>

<script lang="ts">
import {PropType} from "nuxt/dist/app/compat/capi";
import {getCurrentInstance, nextTick, onUnmounted, reactive, ref, watch} from "vue";
import SimpleDataTable, {
  emptySet,
  RowType,
  ClickPos,
  Constants as RowConstants,
  SimpleResultRow,
  SimpleResultCol
} from "~/components/db/common/SimpleDataTable.vue";
import {useTheme} from "vuetify";
import CodeEditor from "~/components/editor/CodeEditor.vue";
import JsonEditor from "~/components/editor/JsonEditor.vue";
import lodash from "lodash";
import SimpleInput from "~/components/common/SimpleInput.vue";

enum FormatType {
  Decimal = 0,
  Int,
  String,
  Bool,
  Date,
  Time,
  Datetime,
  Year,
  Json,
  Enum,
  Blob,
}

const NotQuoteTypeSet = Object.freeze(new Set<number>([FormatType.Bool,FormatType.Int,FormatType.Decimal]))

interface ResultCol extends SimpleResultCol{
  type:string,
  nullable?:boolean,
  length?:number,
  scale?:number,
  precision?:number,
  formatType:number,
}

interface ResultRow extends SimpleResultRow{

}

interface ResultSet {
  cols:ResultCol[],
  rows:ResultRow[]
}

export {NotQuoteTypeSet,ResultRow,ResultCol,ResultSet,FormatType}

export default {
  name: "DataTable",
  props: {
    itemClass: {
      type: Function as PropType<(idx:number,item:any)=>string[]|string>,
      default: null
    },
    modelValue: {
      type: Object as PropType<ResultSet>,
      default: emptySet,
    },
    rowHeight: {
      type: Number,
      default: 30
    },
    loading: {
      type: Boolean,
      default: false
    },
    sorts: {
      type: Object as PropType<Map<string,boolean>>,
    },
    colTooltip: {
      type: Function as PropType<(idx:number,col:SimpleResultCol)=>void>,
    },
  },
  emits: ["saveRow","save","insert","copy","cut","paste","delete","clickItem","contextMenuItem","sort"],
  components:{SimpleInput, JsonEditor, CodeEditor, SimpleDataTable},
  setup(props, ctx) {
    const ins = getCurrentInstance()
    const theme = useTheme()
    const table = ref()
    const current = reactive({
      type: 0,
      show: false,
      showMore: false,
      originCol: -1,
      col: -1,
      row: -1,
      val: null,
    })

    watch(()=>[current.show,current.showMore,current.col,current.row],(v)=>{
      //表格输入框展示与否
      if(v[0]){
          //详情输入框展示与否
          if(v[1]){
            //展示详情输入框时，将焦点移动输入框内
            lodash.delay(()=>{
              const input = <HTMLElement>document.querySelector(".v-popper__popper > div.v-popper__wrapper > div.v-popper__inner > div > div input,textarea,[contenteditable=true]")
              if(input){
                input.focus()
              }
            },100)
          }else{
            nextTick(()=>{
              //否则将焦点移动到表格内编辑输入框
              const el = <HTMLElement>ins.proxy.$el;
              (<HTMLElement>el.querySelector(".data-input"))?.focus()
            })
          }
      }else{
        //输入框隐藏则将焦点还给表格
        focus()
      }
    })

    const focus = ()=>{
      table.value.focus()
    }

    const onInputChange = (evt:Event,col:number,row:number)=>{
      const input = <HTMLTextAreaElement>evt.target
      const v = input.value
      updateValue(v,col,row)
    }

    const onClickItem = (colRow:ClickPos)=>{
      //col为显示的列顺序，originCol为数据原始顺序（因为列可以拖动变更显示顺序，因此可能出现显示顺序根据数据顺序不一致的情况）
      current.show = true
      current.showMore = false
      current.type = props.modelValue.cols[colRow.originCol].formatType
      current.val = props.modelValue.rows[colRow.row].cols[colRow.originCol]
      current.col = colRow.col
      current.row = colRow.row
      current.originCol = colRow.originCol
    }

    const onInputKeydown = (evt:KeyboardEvent)=>{
      if(current.show){
        if(evt.ctrlKey || evt.metaKey){
          if(evt.key.toLowerCase() === "f"){
            return;
          }
        }
        if(evt.key === "Escape"){
          //按esc键隐藏输入框，并将焦点还给表格
          current.show = false
          return;
        }
        const el = <HTMLInputElement>evt.target
        const parentTd = <HTMLElement>el.parentNode.parentNode.parentNode
        //如果当前输入的元素非选择状态则不拦截相关事件，并不可输入
        if(!parentTd.classList.contains("selected")){
          evt.preventDefault()
          return;
        }else if(evt.key === "Tab"){
          return;
        }else if(evt.key === "Enter"){
          //按回车时显示完整输入框
          current.showMore = true
          onInputChange(evt,current.col,current.row)
        }else{
          const selection = el.selectionStart
          if(selection === 0 && (evt.key === "ArrowLeft" || evt.key === "ArrowUp" )){
            //如果输入光标移动到开头按下左键或上键，则不拦截事件，将事件抛给上级
            return;
          }else if(selection === (el.value.length??0) && (evt.key === "ArrowRight" || evt.key === "ArrowDown" )){
            //如果输入光标移动到末尾按下右键或下键，则不拦截事件，将事件抛给上级
            return
          }
        }
      }
      evt.stopPropagation()
    }

    const onKeydown = (evt:KeyboardEvent)=>{
      if(evt.shiftKey || evt.metaKey || evt.ctrlKey || evt.altKey){
        //如果按住特殊按键不显示输入框
        return
      }
      if(!current.show){
        switch (evt.key){
          case "Tab":
            break
          case "ArrowLeft":
            break
          case "ArrowRight":
            break
          case "ArrowUp":
            break
          case "ArrowDown":
             //如果捕获到按下键事件(只有表格选中光标移动到最后一行之后才能够捕获表格按 下键事件)，此时将触发insert事件
              ctx.emit("insert")
              evt.stopPropagation()
              evt.preventDefault()
            break
          default:
            //选择某项，除方向键和tab外按任意键自动显示输入框
            const currentColRow = table.value.currentColRow
            if(currentColRow.col !== -1){
              onClickItem({
                col: currentColRow.col,
                row: currentColRow.row,
                originCol: table.value.cols[currentColRow.col].originIdx,
              })
            }
            break

        }
      }
    }

    const updateValue = (v:string,dataColIdx:number,dataRowIdx:number)=>{
      const rowData = props.modelValue.rows[dataRowIdx]
      if(!rowData.oldCol){
        rowData.oldCol = [...rowData.cols]
      }
      rowData.cols[dataColIdx] = v
      current.val = v
      //当前编辑值发生变化,更新当前列变化信息
      if(v!=rowData.oldCol[dataColIdx]){
        if(!rowData.changeCols){
          rowData.changeCols = new Set<string>()
        }
        if(!rowData.changeCols.has(dataColIdx)){
          rowData.changeCols.add(dataColIdx)
          updateView()
        }
      }else{
        if(rowData.changeCols?.delete(dataColIdx)){
          updateView()
        }
      }
    }

    const resize = ()=>{
      table.value.resize()
    }

    const showSearch = ()=>{
      table.value.showSearch()
    }

    const selectAll = (type=<"all"|"col"|"row">"all")=>{
      table.value.selectAll(type)
    }

    const resetSelectedData = (mode=<"clear"|"reposition">"clear")=>{
      table.value.resetSelectedData(mode)
    }

    const jumpColRow = (col?:number,row?:number,select?:boolean)=>{
      table.value.jumpColRow(col,row,select)
    }

    const init = ()=>{
      table.value.init()
    }

    const updateView = ()=>{
      table.value.updateView()
    }

    return {
      rowConstants: RowConstants,
      FormatType,
      current,
      table,
      theme,
      init,
      updateView,
      showSearch,
      resize,
      onInputChange,
      onInputKeydown,
      onKeydown,
      onClickItem,
      updateValue,
      focus,
      jumpColRow,
      resetSelectedData,
      selectAll
    }
  },
}
</script>

<style lang="scss" scoped>
.simple-data-table{
  .v-popper__inner{
    .popper-container{
      overflow: hidden;
      display: flex;
      border: 0.5px solid #cdcdcd;
      border-radius: 4px;
      background-color: #ffffff;
      box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.2);
      textarea{
        padding: 0 2px;
        height: 100px;
        width: 350px;
        resize: both;
        &:focus{
          outline: none;
        }
      }
      input{
        padding: 0 2px;
        height: 50px;
        width: 200px;
        &:focus{
          outline: none;
        }
      }
    }
  }
  .selected {
    .data-table-input-container{
      .text {
        &.null {
          color: #ddd;
        }
      }
    }
  }
  .data-table-input-container{
    height: 30px;
    width: 100%;
    position: relative;
    .text{
      height: 100%;
      width: 100%;
      &.null{
        color: #9e9e9e;
        font-weight: bold;
      }
    }
    .input-wrapper{
      height: 100%;
      width: 100%;
      position: relative;
      .icon-btn{
        position: absolute;
        right: 2px;
        top: 0;
        .v-icon{
          border-radius: 4px;
          background: rgba(170, 170, 170);
        }
      }
      > input{
        resize: none;
        padding: 0 2px;
        height: 100%;
        max-height: 100%;
        width: 100%;
        text-align: center;
        border-bottom: #1D5BC9 2px solid;
        background: #bbb;
        &:focus{
          outline: none;
        }
      }
    }
  }
}
</style>