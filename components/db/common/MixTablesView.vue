<template>
  <div class="mix-tables-container">
    <div class="toolbar-container">
      <div class="left">
        <div class="name-header" v-if="showTableType === 0" v-on:click="swiftSortName">
          <span class="name">{{$t('common.name')}}</span>
          <v-icon
              size="x-small"
              variant="text"
              :class="sort?'asc':'desc'"
              :icon="sort===null?'mdi-unfold-more-horizontal':'mdi-chevron-down'"
          >
          </v-icon>
        </div>
        <div class="line" v-if="showTableType === 0"></div>
        <v-btn variant="text" color="primary" size="small" prepend-icon="mdi-table-plus"  v-on:click="$emit('createTable')">新建</v-btn>
        <v-btn variant="text" color="info" size="small" prepend-icon="mdi-table-sync" :loading="loading" v-on:click="$emit('refresh')">刷新</v-btn>
      </div>
      <div class="center">
        <span class="text">
          已选择 {{showTableType === 0 ? table1?.selectCount : table2?.selectCount}} 张表,共 {{value.length}} 张表
        </span>
      </div>
      <div class="right">
        <v-btn-toggle color="primary" mandatory rounded="0" v-model="showTableType">
          <v-btn variant="text" size="small" icon="mdi-format-list-bulleted-square" density="comfortable" v-on:click="$emit('refresh')"></v-btn>
          <v-btn variant="text" size="small" icon="mdi-table" density="comfortable" v-on:click="$emit('createTable')"></v-btn>
        </v-btn-toggle>

        <div class="line"></div>
        <div style="width: 180px"></div>
        <v-text-field
            class="search-input"
            label="Search"
            hide-details
            persistent-placeholder
            density="compact"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            v-model="searchValue"
        ></v-text-field>
      </div>
    </div>
    <div class="table-view-container">
      <v-progress-linear style="position: absolute;z-index: 2" height="2" :active="loading" indeterminate></v-progress-linear>
      <tables-view
          ref="table1"
          :tooltip="tooltip"
          :model-value="value"
          v-if="showTableType===0"
          @copy="$emit('copy',$event)"
          @cut="$emit('cut',$event)"
          @paste="$emit('paste',$event)"
          @delete="$emit('delete',$event)"
          @contextMenuItem="(evt,items)=>$emit('contextMenuItem',evt,items)"
          @clickItem="$emit('clickItem',$event)"
      ></tables-view>
      <advanced-table
          ref="table2"
          sort-key="name"
          @sort="doSort"
          :search-provider="(idx,item)=>item.name"
          :headers="headers"
          :items="value"
          @copy="$emit('copy',$event)"
          @cut="$emit('cut',$event)"
          @paste="$emit('paste',$event)"
          @delete="$emit('delete',$event)"
          @contextMenuItem="(evt,items)=>$emit('contextMenuItem',evt,items)"
          @clickItem="$emit('clickItem',$event)"
          v-else
      >
        <template #td="{item,key,colIdx,idx,header}">
          <td :class="header.tdClass" v-if="colIdx === 0" style="cursor: move" draggable="true" v-on:mousedown.stop>
            {{item[key]}}
          </td>
          <td v-else>
            {{item[key]}}
          </td>
        </template>
      </advanced-table>
    </div>
  </div>
</template>

<script lang="ts">
import TablesView,{Table} from "~/components/db/common/TablesView.vue";
import {PropType} from "#app/compat/capi";
import {ref, nextTick,shallowRef, watch, getCurrentInstance} from "vue";
import AdvancedTable, { TableHeader } from "~/components/common/AdvancedTable.vue";
import lodash from "lodash";

export default {
  name: "MixTablesView",
  components: {AdvancedTable, TablesView},
  props: {
    modelValue: {
      type: Array as PropType<Table[]>,
      default: []
    },
    headers: {
      type: Array as PropType<TableHeader[]>,
      default: []
    },
    loading: {
      type: Boolean,
      default: false
    },
    tooltip: {
      type: Function as PropType<(table:Table)=>string|null>
    },
  },
  emits: ["contextMenuItem", "clickItem", "copy", "cut", "paste", "delete","refresh","createTable"],
  setup(props, ctx) {
    const table1 = ref()
    const table2 = ref()
    const value = shallowRef(props.modelValue)
    const showTableType = ref(1)
    const sort = ref(<null|boolean>null)
    const searchValue = ref("")

    const doFilter = lodash.debounce((str:string)=>{
      if(!str){
        value.value = props.modelValue
        return
      }
      value.value = props.modelValue.filter((item)=>{
          return item.name.includes(str)
      })
    },350)

    const swiftSortName = ()=>{
      const s = sort.value
      if(s === null){
        sort.value = true
      }else if(s){
        sort.value = false
      }else{
        sort.value = null
        value.value = props.modelValue
      }
      doSortName()
    }

    const doSortName = ()=>{
      const s = sort.value
      if(s === null){
        value.value = props.modelValue
      }else if(s){
        value.value = [...props.modelValue.sort((a,b)=>{
          return a.name.localeCompare(b.name)
        })]
      }else{
        value.value = [...props.modelValue.sort((b,a)=>{
          return a.name.localeCompare(b.name)
        })]
      }
    }

    const doSort = (key:string,isAsc:boolean)=>{
      value.value = props.modelValue.sort((a,b)=>{
        a = a[key]
        b = b[key]
        if(a===b){
          return 0
        }else if(a===null || a===undefined){
          return isAsc?-1:1
        }else if(b === null || b===undefined){
          return isAsc?1:-1
        }else if(typeof a === "number" && typeof b === "number"){
          return isAsc?(<number>a - <number>b):(<number>b - <number>a)
        }else{
          const aVal = String(a)
          const bVal = String(b)
          if(isAsc){
            return aVal.localeCompare(bVal)
          }else{
            return bVal.localeCompare(aVal)
          }
        }
      })
    }

    watch(()=>props.modelValue,(n,o)=>{
      //首次加载如果表数量大于等于100则使用列表模式，否则使用表格模式
      if(o.length === 0){
        showTableType.value = props.modelValue.length >= 100 ? 0 : 1
      }
      doSortName()
    })

    watch(()=>searchValue.value,doFilter)

    return {
      table1,table2,searchValue,sort,showTableType,value,
      doSort,swiftSortName
    }
  }
}
</script>

<style lang="scss" scoped>

.mix-tables-container{
  height: 100%;
  width: 100%;
  .toolbar-container{
    width: 100%;
    height: 35px;
    position: absolute;
    display: flex;
    justify-content: space-between;
    border-bottom: #e0e0e0 solid 0.5px;
    padding: 0 10px;
    .left,.right,.center{
      height: 100%;
      display: flex;
      align-items: center;
    }
    .line{
      height: 18px;
      width: 1px;
      background: #e0e0e0;
      margin: 0 10px;
    }
    .text{
      line-height: 30px;
      font-size: 12px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .name-header{
      cursor: pointer;
      width: 100px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      .name{
        user-select: none;
        line-height: 30px;
        font-size: 12px;
      }
      .v-icon{
        transition: transform .2s;
        &.asc{
          transform: rotateX(180deg);
        }
      }
    }
    .v-btn-group{
      height: 25px;
    }
    .search-input{
      position: absolute;
      width: 280px;
      transform: scale(.6) translateX(40px);
    }
  }
  .table-view-container{
    position: absolute;
    margin-top: 35px;
    width: 100%;
    height: calc(100% - 35px);
  }

}

</style>