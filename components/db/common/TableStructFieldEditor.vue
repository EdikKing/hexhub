<template>
  <movable-dividers vertical real-time-drag :divider-size="1" :init-data="{slot:'last',size:'max(250px,30%)'}" @end="onMoveEnd">
    <template #first>
      <advanced-table ref="tableRef" border :row-height="28" :before-th-width="beforeThWidth" draggable sortable after-th :headers="metadata" :items="rows" @selectItem="onSelectItem">
        <template #td="{item,key,colIdx,idx,header}">
          <td v-on:keydown="onKeydown($event,header,colIdx,idx)" v-on:dblclick.stop>
            <table-struct-input
                :table="table"
                :schema="schema"
                :anti-highlight="item._selected"
                :show="header._rowState[idx].show && item._selected"
                @update:show="onUpdateShow($event,header,colIdx,idx)"
                v-model="item[key]"
                @update:modelValue="updateMulKeySequence"
                :title="header.title"
                :type="header.type"
                :mul-key-sequence="mulKeySequence"
                :options="header.options"
                :format-func="header.formatFunc"
                :language="language"
                :idx="idx"
                :item="item"
                :disabled="disableFn?disableFn(header,item):false"
            >
              <template #custom>
                <slot name="custom" :item="item" :key="key" :colIdx="colIdx" :idx="idx" :header="header"></slot>
              </template>
              <template #customPopup>
                <slot name="customPopup" :item="item" :key="key" :colIdx="colIdx" :idx="idx" :header="header"></slot>
              </template>
            </table-struct-input>
          </td>
        </template>
      </advanced-table>
    </template>
    <template #last>
      <slot name="bottom" :row="selectRow" :field="modelValue[selectRow]"></slot>
    </template>
  </movable-dividers>
</template>

<script lang="ts">
import AdvancedTable, {TableHeader} from "~/components/common/AdvancedTable.vue";
import {nextTick, reactive, ref, triggerRef, watch} from "vue";
import TableStructInput, {InputType} from "~/components/db/common/TableStructInput.vue";
import {PropType} from "#app/compat/capi";
import MovableDividers from "~/components/common/MovableDividers.vue";

interface RowState{
  show: boolean
}

export interface StructColumnMetadata extends TableHeader{
  type: InputType,
  options?: Function|string[],
  _rowState?: RowState[]
}

export default {
  name: "TableStructFieldEditor",
  components: {MovableDividers, TableStructInput, AdvancedTable},
  emit: ["update:selectRow"],
  props: {
    schema: String,
    table: String,
    language: {
      type: String,
      default: "mysql"
    },
    metadata: {
      type: Array as PropType<Array<StructColumnMetadata>>,
      default: []
    },
    disableFn: {
      type: Function as PropType<(col:StructColumnMetadata,row:any)=>boolean>,
    },
    modelValue: {
      type: Array,
      default: []
    }
  },
  setup(props,ctx){
    const tableRef = ref()
    const metadata = ref(props.metadata)
    const rows = ref(props.modelValue)
    let tabXIndex = 0
    const mulKeySequence = ref(0)
    const beforeThWidth = ref('0')
    const selectRow = ref(0)
    const currEditingPos = {colIdx:0,idx:0}

    const onKeydown = (evt:KeyboardEvent,column:StructColumnMetadata,colIdx:number,row:number)=>{
      if(evt.metaKey || evt.ctrlKey || evt.altKey){
        evt.stopPropagation()
      }
      if(evt.key === "Tab"){
        const metadataVal = metadata.value
        tabXIndex = colIdx
        //Tab + Shift往左-1，Tab往右+1
        tabXIndex = evt.shiftKey ? tabXIndex - 1 : tabXIndex + 1
        if(tabXIndex < 0){
          //上一行
          tabXIndex = 0
          return
        }else if(tabXIndex >= metadataVal.length){
          //下一行
          tabXIndex = 0
          return;
        }
        column._rowState[row].show = false

        const nextColumn = metadataVal[tabXIndex]
        //判断格子是否禁用，如果已禁用则跳过
        const disabled = props.disableFn ? props.disableFn(nextColumn,rows.value[row]) : false
        if(disabled){
          onKeydown(evt,nextColumn,tabXIndex,row)
        }else{
          nextColumn._rowState[row].show = true
          evt.stopPropagation()
          evt.preventDefault()
        }
      }
    }

    const onUpdateShow = (show:boolean,header:StructColumnMetadata,colIdx:number,idx:number)=>{
      header._rowState[idx].show=show
      if(currEditingPos.colIdx != colIdx || idx != currEditingPos.idx){
        //将上一个焦点组件取消焦点
        metadata.value[currEditingPos.colIdx]._rowState[currEditingPos.idx].show = false
        currEditingPos.colIdx = colIdx
        currEditingPos.idx = idx
      }
    }

    const onSelectItem = (item,idx)=>{
      if(idx >= 0){
        selectRow.value = idx
        ctx.emit("update:selectRow",idx)
      }
    }

    const updateMulKeySequence = ()=>{
      const mulKeyMetadata = props.metadata.find((m)=>{
        return m.type === InputType.MulKey
      })
      if(mulKeyMetadata){
        const keys = props.modelValue.filter((row)=>{
          return row[mulKeyMetadata.key]
        }).sort((a,b)=>a.key-b.key)
        //重置key顺序
        keys.forEach((row,idx)=>{
          row[mulKeyMetadata.key] = idx+1
        })
        mulKeySequence.value = keys.length
      }
    }

    const onMoveEnd = ()=>{
      tableRef.value.resize()
    }

    watch(()=>props.metadata,(m)=>{
      const fullWidth = props.metadata.filter((item)=>item.width && item.width > 0).reduce((a,b)=>{
        return a.width + b.width
      },0)
      //自适应第一个th宽度，实现内容居中
      beforeThWidth.value = fullWidth <= 0 ? '0px' : `calc(50% - ${fullWidth/2}px)`
    },{immediate: true})

    watch(()=>props.modelValue,(modelValue)=>{
      const rowsLen = modelValue.length
      props.metadata.forEach((item)=>{
        //生成行元信息
        const arr = new Array<any>(rowsLen)
        for (let i = 0; i < rowsLen; i++) {
          arr[i] = <RowState>{show:false}
        }
        item._rowState = arr
      })
      rows.value = modelValue
      updateMulKeySequence()
    },{immediate:true})

    return {
      currEditingPos,
      tableRef,beforeThWidth,metadata,rows,mulKeySequence,selectRow,
      onKeydown,onSelectItem,onMoveEnd,updateMulKeySequence,onUpdateShow
    }
  }
}
</script>

<style lang="scss" scoped>

</style>