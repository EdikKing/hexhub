<template>
  <search
      @findPrevious="doSearch(false)"
      @findNext="doSearch(true)"
      @search="doSearch(true)"
      @close="onCloseSearch"
      v-model="searchAttrs.searchStr"
      v-model:show="searchAttrs.show"
      v-model:case-sensitive="searchAttrs.caseSensitive"
      v-model:regex="searchAttrs.regex"
      v-model:whole-word="searchAttrs.wholeWord"
      ref="search"
  >
    <div
        ref="root"
        class="simple-data-table"
        tabindex="0"
        v-on:keydown="onKeydown"
        v-on:mousedown.left="resetSelectedData();focus()"
        v-on:contextmenu="onContextMenuItem($event)"
        autofocus>
      <v-progress-linear indeterminate :height="2" :active="loading" style="position: absolute;z-index: 3"></v-progress-linear>
      <div class="row-select-table-container">
        <table class="row-select-table">
          <thead>
          <tr v-on:click="swiftSelectAll" v-on:mousedown.stop>
            <th :style="`height:${headerHeight}px`"></th>
          </tr>
          </thead>
          <tbody :style="`transform:translateY(${offsetY}px)`" v-on:mousedown="onRowSelectMousedown">
            <tr v-for="(row,y) in inViewRows" :key="row" :style="lineStyle">
              <td v-tooltip.right="`${row.idx+1}`">
                <v-icon
                    v-bind="getRowTdAttr(row)"
                    size="x-small"
                ></v-icon>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div ref="container" class="table-container" v-on:scroll.passive="onScroll(false)">
        <div :style="`height:${totalHeight+headerHeight}px;`">
          <div ref="tableWrapper" class="table-wrapper">
            <div
                :style="`height: ${container?.clientHeight}px;width: ${container?.clientWidth}px`"
                class="table-scroll-view"
            >
              <table ref="table" class="data-table">
                <thead>
                <draggable
                    v-model="cols"
                    tag="tr"
                    :animation="200"
                    :component-data="{
                      tag: 'tr',
                      type: 'transition-group',
                      name: 'fade'
                    }"
                    item-key="originIdx"
                    @end="resetSelectedData();calcColPos();">
                  <template #item="{ element: col,index }">
                    <th
                        scope="col"
                        :class="getColumnClass(index,col)"
                        :style="`left:${col.col.sticky?col.stickyLeft+'px':''};width:${col.width}px;height:${headerHeight}px;`"
                        v-on:click="onClickTr($event,index,col)"
                        v-on:mousedown.stop
                    >
                      <span v-tooltip="{content: () => colTooltip(index,col.col),html:true}">
                        {{ col.col.name }}
                      </span>
                      <v-icon
                          v-ripple
                          v-if="sortable"
                          v-on:click.stop="onClickSort(col.col.name)"
                          variant="text"
                          :class="sorts.get(col.col.name)?'sort asc':'sort desc'"
                          :icon="sorts.has(col.col.name)?'mdi-chevron-down':'mdi-unfold-more-horizontal'"
                      >
                      </v-icon>
                      <div class="line" v-on:click.stop v-on:mousedown="onColMouseDown($event,col,index)" v-on:mouseup="onColMouseUp">
                      </div>
                    </th>
                  </template>
                  <template #footer>
                    <th :style="`height:${headerHeight}px;`"></th>
                  </template>
                </draggable>
                </thead>
                <div
                    v-if="showSlot!==null && !loading"
                    :style="`height: ${container?.clientHeight - headerHeight}px;width: ${container?.clientWidth}px`"
                >
                  <slot name="body" :slot="showSlot"></slot>
                </div>
                <tbody
                    v-else
                    ref="tbody"
                    :style="`transform:translateY(${offsetY}px)`"
                    v-on:mousedown="onMousedown"
                >
                  <tr :style="lineStyle" v-for="(row,y) in inViewRows">
                    <td
                        v-for="(col,x) in cols" :key="col.col.name"
                        :class="getItemClass(x,row.idx,row)"
                        :style="`left:${col.col.sticky?col.stickyLeft+'px':''};`"
                    >
                      <template v-if="col.show">
                        <slot name="default" :row="row" :col="col" :originCol="col.originIdx" :x="x" :y="row.idx">
                          <span :class="row.cols[col.originIdx]===null?'null':null">
                            {{ row.cols[col.originIdx]??(row.type === constants.RowTypePlaceholder?"NaN":"NULL") }}
                          </span>
                        </slot>
                      </template>
                    </td>
                    <td :class="getItemClass(cols.length,row.idx,null)"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </search>
</template>

<script lang="ts">
import {PropType} from "nuxt/dist/app/compat/capi";
import draggable from "vuedraggable";
import {nextTick, onMounted, onUnmounted, reactive, ref,triggerRef , shallowRef, watch} from "vue";
import lodash from "lodash";
import Search, {matchFunc} from "~/components/common/Search.vue";
import Toast from "~/lib/layer/toast";
import {ResultCol, ResultRow, ResultSet} from "~/components/db/common/DataTable.vue";
import {encodeTableStr} from "~/lib/util/common";

type RowType = undefined | 0 | 1;
const RowTypeNormal = <RowType>undefined
const RowTypeNewAdd = <RowType>0
const RowTypePlaceholder = <RowType>1

const Constants = Object.freeze({
  RowTypeNormal,
  RowTypePlaceholder,
  RowTypeNewAdd,
})

const getItemsByArea = (data:ResultSet,selection?:SelectionData):{colInfo:ResultCol[],cols:string[],rows:string[][]}=>{
  if(selection === null){
    return {
      colInfo: data.cols,
      cols: data.cols.map(col=>col.name),
      rows: []
    }
  }
  const cols = selection.area.cols
  const rows = selection.area.rows
  const result = {
    colInfo: new Array<ResultCol>(cols.length),
    cols: new Array<string>(cols.length),
    rows: new Array<string[]>(rows.length),
  }
  for (let i = 0; i < cols.length; i++) {
    const col = cols[i]
    const column = data.cols[col]
    result.cols[i] = column.name
    result.colInfo[i] = column
  }
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowData = data.rows[row].cols
    const rowArr = new Array(result.cols.length)
    result.rows[i] = rowArr
    for (let j = 0; j < cols.length; j++) {
      const col = cols[j]
      rowArr[j] = rowData[col]
    }
  }
  return result
}

const genTableText = (data:ResultSet,selection:SelectionData,type:"data"|"column"|"column-data"):string=>{
  const result = getItemsByArea(data,selection)
  let dataSource = <string[][]>null
  switch (type) {
    case "column":
      dataSource = [result.cols]
      break
    case "column-data":
      dataSource = [
        result.cols,
        ...result.rows
      ]
      break
    case "data":
      dataSource = result.rows
      break
  }
  return encodeTableStr(dataSource)
}

interface SimpleResultCol {
  name:string,
  sticky?:boolean,
  showIdx?:number,
  width?:number
}

interface SimpleResultRow {
  type?: RowType,
  idx?: Number,
  loading?: boolean,
  changeCols?: Set<number>,
  oldCol?: string[],
  cols: string[]
}

interface SimpleResultSet {
  cols:SimpleResultCol[],
  rows: SimpleResultRow[]
}

interface ColWrapper {
  width:number,
  stickyLeft:number,
  xBegin:number,
  xEnd:number,
  show:boolean,
  originIdx:number,
  newIdx: number,
  col:SimpleResultCol,
}

interface ClickPos {
  col:number,
  row:number,
  originCol:number
}

interface SelectionData {
  colRow:{
    col:number,
    dataCol: number,
    row:number
  },
  area:{
    cols:number[],
    rows:number[]
  }
}

const emptySet = Object.freeze({
  cols: [],
  rows: [],
})

export {genTableText,getItemsByArea,SimpleResultCol,SimpleResultRow,SimpleResultSet,ClickPos,SelectionData,RowType,RowTypeNormal,RowTypePlaceholder,RowTypeNewAdd,emptySet,Constants}

export default {
  name: "SimpleDataTable",
  props: {
    itemClass: {
      type: Function as PropType<(idx:number,item:any)=>string[]|string>,
      default: null
    },
    modelValue: {
      type: Object as PropType<SimpleResultSet>,
      default: emptySet
    },
    rowHeight: {
      type: Number,
      default: 30
    },
    headerHeight: {
      type: Number,
      default: 30
    },
    sortable: {
      type: Boolean,
      default: false,
    },
    sorts: {
      type: Object as PropType<Map<string,boolean>>,
    },
    colTooltip: {
      type: Function as PropType<(idx:number,col:SimpleResultCol)=>void>,
    },
    loading: {
      type: Boolean,
      default: false
    },
    showSlot: {
      type: String,
      default: null
    },
  },
  emits: ["saveRow","save","copy","cut","paste","delete","clickItem","contextMenuItem","sort","changeSelected"],
  components:{Search, draggable},
  setup(props, ctx) {
    const lineStyle = `height:${props.rowHeight}px;line-height:${props.rowHeight}px;`
    const showSlot = ref(props.showSlot)
    const sorts = ref(props.sorts??new Map())
    let rows = <SimpleResultRow[]>props.modelValue.rows

    const search = ref()
    const root = ref<HTMLElement>()
    const table = ref<HTMLTableElement>()
    const tbody = ref<HTMLElement>()
    const container = ref<HTMLElement>()
    const tableWrapper = ref<HTMLElement>()

    //搜索属性
    const searchAttrs = reactive({
      show: false,
      searchStr: "",
      caseSensitive: false,
      wholeWord: false,
      regex: false,
      col: -1,
      row: -1
    })

    //虚拟滚动表格属性
    const offsetY = ref(0)
    const startRow = ref(-1)
    const totalHeight = ref(0)
    const inViewRows = shallowRef<SimpleResultRow[]>([])

    //上次滚动坐标，用以判断当前滚动是横向滚动还是纵向滚动
    let lastScrollTop = 0
    let lastScrollLeft = 0

    let visualHeight = 0

    //已选择数据，支持列选，行选，区域选择，全选等
    const selectedData = reactive({
      mode: <"col"|"row"|"area"|"all"|"">"",
      cols: new Set<number>(),
      rows: new Set<number>(),
      area: {beginCol:-1,beginRow:-1,endCol:-1,endRow:-1}
    })
    let cols = ref(<ColWrapper[]>null)
    const colCache = new Map<string,ColWrapper>()
    //鼠标点击|滑动点选数据
    let mouseDownIsClick = false
    let downColRow = <{col:number,row:number}>null
    let downPos = {x:0,y:0}
    let currentColRow = ref({col:-1,row:-1})

    let containerRect:DOMRect = null
    let visualSize = 0
    let resizingCol = 0
    let resizingColEl:HTMLElement = null
    let resizing = false
    let resizingDownX = 0
    let resizingDownWidth = 0

    let rowSelectDownIdx = - 1
    let rowSelectIsSaveDown = null

    const initCols = ()=>{
      let newCols = new Array<ColWrapper>(props.modelValue.cols.length)
      if(colCache.size === 0){
        props.modelValue.cols.forEach((col,idx)=>{
          newCols[idx] = <ColWrapper>{
            width: col.width,
            show: false,
            stickyLeft: 0,
            xBegin: 0,
            xEnd: 0,
            originIdx: idx,
            newIdx: idx,
            col
          }
        })
      }else{
        //缓存列信息，实现刷新数据列相关信息(宽度顺序等)依然能够保留
        props.modelValue.cols.forEach((col,idx)=>{
          const cache = colCache.get(col.name)
          if(cache === undefined){
            newCols[idx] = <ColWrapper>{
              width: col.width,
              show: false,
              stickyLeft: 0,
              xBegin: 0,
              xEnd: 0,
              originIdx: idx,
              newIdx: idx,
              col
            }
          }else{
            col.sticky = cache.col.sticky
            newCols[idx] = <ColWrapper>{
              width: cache.width,
              show: cache.show,
              stickyLeft: 0,
              xBegin: 0,
              xEnd: 0,
              originIdx: idx,
              newIdx: cache.newIdx,
              col
            }
          }
          //根据原有顺序进行排序
          newCols = newCols.sort((a,b)=>a.newIdx-b.newIdx)
        })
      }
      cols.value = newCols
      //建立缓存
      colCache.clear()
      newCols.forEach(col=>colCache.set(col.col.name,col))

      //列最大宽度
      const maxWidth = Math.max(275,container.value.clientWidth/2)
      const minWidth = 35
      const sideWidth = props.sortable?30:10

      const canvas = <HTMLCanvasElement>document.createElement("canvas")
      const context = canvas.getContext("2d")
      context.font = "normal 12px JetBrainsMono"

      let mTotalWidth = 0
      let lastStr = null
      let lastWidth = 0
      const calcWidthLimit = Math.max(10,visualSize)
      //计算视界内所有每列每行最大宽度
      for (let i = 0; i < newCols.length; i++) {
        const col = newCols[i]
        if(col.width === null || col.width === undefined){
          let {width} = context.measureText(col.col.name)
          width = Math.max(width+sideWidth, minWidth)
          for (let j = 0; j < calcWidthLimit && j < rows.length; j++) {
            const str = rows[j].cols[i]
            if(str){
              //如果字符串串和上次一致，那么直接使用上次计算的宽度
              if(str !== lastStr){
                let {width:strWidth} = context.measureText(str)
                lastStr = str
                lastWidth = strWidth + 8
              }
              width = Math.max(width, lastWidth)
            }
          }
          width = Math.min(maxWidth,width)
          col.width = width
        }
        mTotalWidth += col.width
      }
      canvas.remove()
      calcColPos()
    }

    const calcColPos = ()=>{
      let stickyLeft = 0
      let x = 0
      cols.value.forEach((col,idx)=>{
        col.col.showIdx = idx
        if(col.col.sticky){
          col.stickyLeft = stickyLeft
          stickyLeft += col.width
        }
        col.xBegin = x
        x += col.width
        col.xEnd = x
        col.newIdx = idx
      })
    }

    const updateColShowStatus = ()=>{
      //计算水平视图显示范围
      const horizontalViewBegin = lastScrollLeft
      const horizontalViewEnd = lastScrollLeft + container.value.clientWidth
      let xBegin = 0
      let xEnd = 0
      for (const col of cols.value) {
        xEnd = xEnd + col.width
        if(col.col.sticky){
          col.show = true
        }else{
          //判断该列是否在显示范围内
          col.show = (xBegin >= horizontalViewBegin && xBegin < horizontalViewEnd) || (xEnd >= horizontalViewBegin && xEnd < horizontalViewEnd)
        }
        xBegin = xEnd
      }
    }

    const resize = ()=>{
      //可视区域item数量
      visualHeight = container.value.clientHeight - props.headerHeight
      visualSize = Math.ceil( visualHeight/props.rowHeight) + 1
      totalHeight.value = props.rowHeight * rows.length
      containerRect = container.value.getBoundingClientRect()
      onScroll(true)
    }

    const selectAll = (type=<"all"|"col"|"row">"all")=>{
      //mode: <"col"|"row"|"area"|"all"|"">"",
      switch (type) {
        case "all":
          selectedData.mode = "all"
          selectedData.cols.clear()
          selectedData.rows.clear()
          selectedData.area.beginRow = -1
          selectedData.area.endRow = -1
          selectedData.area.beginCol = -1
          selectedData.area.endCol = -1
          break
        case "col":
          if(selectedData.mode === "col"){
            for (let i = 0; i < cols.value.length; i++) {
              selectedData.cols.add(i)
            }
          }else if(selectedData.mode === "area"){
            selectedData.area.beginCol = 0
            selectedData.area.endCol = cols.value.length - 1
          }
          break
        case "row":
          if(selectedData.mode === "row"){
            selectedData.mode = "all"
          }else if(selectedData.mode === "area"){
            selectedData.area.beginRow = 0
            selectedData.area.endRow = rows.length - 1
          }
          break
      }
    }

    const resetSelectedData = (mode=<"clear"|"reposition">"clear")=>{
      switch (mode) {
        case "clear":
          selectedData.mode = ""
          selectedData.cols.clear()
          selectedData.rows.clear()
          selectedData.area.beginRow = -1
          selectedData.area.endRow = -1
          selectedData.area.beginCol = -1
          selectedData.area.endCol = -1
          break
        case "reposition":
          const maxCol = cols.value.length-1
          const maxRow = rows.length-1
          switch (selectedData.mode) {
            case "area":
              const area = selectedData.area
              //如果只选择了一个并且超出边界将选择位置改为最后一个
              if(area.beginRow === area.endRow && area.beginRow > maxRow){
                area.beginRow = maxRow
                area.endRow = maxRow
              }else{
                area.beginRow = Math.min(area.beginRow,maxRow)
                area.endRow = Math.min(area.endRow,maxRow)
              }
              if(area.beginCol === area.endCol && area.beginCol > maxCol){
                area.beginCol = maxCol
                area.endCol = maxCol
              }else{
                area.beginCol = Math.min(area.beginCol,maxCol)
                area.endCol = Math.min(area.endCol,maxCol)
              }
              break
            case "col":
              const cols = selectedData.cols
              if(cols.size === 1){
                //如果只选择了一个并且超出边界将选择位置改为最后一个
                const firstCol = cols.values().next().value
                if(firstCol > maxCol){
                  cols.delete(firstCol)
                  cols.add(maxCol)
                }
              }else if(cols.size > 1){
                //删除超出边界的值
                Array.from(cols.values()).forEach((col)=>{
                  if(col > maxCol){
                    cols.delete(col)
                  }
                })
              }
              break
            case "row":
              const rows = selectedData.rows
              if(rows.size === 1){
                //如果只选择了一个并且超出边界将选择位置改为最后一个
                const firstRow = rows.values().next().value
                if(firstRow > maxRow){
                  rows.delete(firstRow)
                  rows.add(maxRow)
                }
              }else if(rows.size > 1){
                //删除超出边界的值
                Array.from(rows.values()).forEach((row)=>{
                  if(row > maxRow){
                    rows.delete(row)
                  }
                })
              }
              break
          }
          break
      }

    }

    const doSearch = (isNext:boolean)=>{
      const mCols = cols.value
      const colsSize = mCols.length
      const rowsSize = rows.length
      let hasResult = false

      let lastStr = null

      while (true){
        if(isNext) {
          //从上至下搜索
          if(searchAttrs.row === -1){
            searchAttrs.row = 0
          }
          searchAttrs.col += 1
          if (searchAttrs.col >= colsSize) {
            searchAttrs.col = 0
            searchAttrs.row += 1
          }
          if (searchAttrs.row >= rowsSize) {
            //遍历完了
            searchAttrs.col = -1
            searchAttrs.row = -1
            break
          }
          lastStr = rows[searchAttrs.row].cols[searchAttrs.col]
          if(lastStr && matchFunc(lastStr,searchAttrs)){
            hasResult = true
            break
          }
        }else{
          //从下至上搜索
          if(searchAttrs.row === -1){
            searchAttrs.row = rowsSize - 1
            searchAttrs.col = colsSize - 1
          }
          searchAttrs.col -= 1
          if (searchAttrs.col < 0) {
            searchAttrs.col = colsSize - 1
            searchAttrs.row -= 1
          }
          if (searchAttrs.row < 0) {
            //遍历完了
            searchAttrs.col = -1
            searchAttrs.row = -1
            break
          }
          lastStr = rows[searchAttrs.row].cols[searchAttrs.col]
          if(lastStr && matchFunc(lastStr,searchAttrs)){
            hasResult = true
            break
          }
        }
      }
      if(!hasResult){
        Toast.warn('无更多关于该关键字的内容！')
      }else{
        jumpColRow(searchAttrs.col,searchAttrs.row,true)
      }
    }

    const jumpColRow = (col?:number,row?:number,select?:boolean)=>{
      let scrollX = col === null ? undefined : cols.value[col].xBegin - containerRect.width / 2
      let scrollY = row === null ? undefined : row * props.rowHeight - visualHeight / 2
      container.value.style.scrollBehavior = "auto"
      container.value.scrollTo({
        left: scrollX,
        top: scrollY,
      })
      container.value.style.scrollBehavior = "smooth"
      focus()
      if(select){
        resetSelectedData()
        if(col === null || row === null){
          if(col!==null){
            currentColRow.value.col = col
            selectedData.mode = "col"
            selectedData.cols.add(col)
          }else if(row!==null){
            currentColRow.value.row = row
            selectedData.mode = "row"
            selectedData.rows.add(row)
          }
        }else{
          currentColRow.value.row = row
          currentColRow.value.col = col
          selectedData.mode = "area"
          const area = selectedData.area
          area.beginRow = row
          area.endRow = row
          area.beginCol = col
          area.endCol = col
        }
      }
    }

    const onColMouseDown = (evt:MouseEvent,col:SimpleResultCol,colIdx:number)=>{
      evt.stopPropagation()
      evt.preventDefault()
      resizingCol = colIdx
      resizingColEl = <HTMLElement>evt.target
      resizingDownX = evt.clientX
      resizingDownWidth = resizingColEl.parentElement.clientWidth
      resizing = true
      document.addEventListener("mousemove", onColMouseMove)
    }

    const onColMouseUp = (evt?:MouseEvent)=>{
      if(evt!=null){
        evt.stopPropagation()
        evt.preventDefault()
      }
      resizingColEl = null
      resizing = false
      document.removeEventListener("mousemove", onColMouseMove)
    }

    const onColMouseMove = (evt:MouseEvent)=>{
      if(resizingColEl === null){
        return;
      }
      evt.stopPropagation()
      evt.preventDefault()
      if(!evt.which){
        onColMouseUp()
        return
      }
      const width = Math.max(resizingDownWidth + (evt.clientX -  resizingDownX),25)
      cols.value[resizingCol].width = width
      resizingColEl.parentElement.style.width = `${width}px`
      calcColPos()
    }

    const updateInViewItems = ()=>{
      const mInViewRows = inViewRows.value
      const mStartRow = startRow.value
      //数组&dom复用
      if(mInViewRows.length === visualSize && mStartRow+visualSize < rows.length){
        for (let i = 0; i < mInViewRows.length; i++) {
          mInViewRows[i] = rows[mStartRow+i]
        }
      }else{
        inViewRows.value = rows.slice(
            mStartRow,
            Math.min(rows.length,mStartRow+visualSize)
        )
      }
    }

    const updateView = ()=>{
      triggerRef(inViewRows)
      // inViewRows.value = [...inViewRows.value]
    }

    const onScroll = (force=false)=>{
      console.log("onScroll")
      let top = container.value.scrollTop
      let left = container.value.scrollLeft
      const hasVertical = lastScrollTop != top
      const hasHorizontal = lastScrollLeft != left
      lastScrollTop = top
      lastScrollLeft = left
      //垂直滚动
      if(hasVertical || force) {
        //虚拟表格，需要根据滚动位置动态计算当前显示的表格
        offsetY.value = -(lastScrollTop % props.rowHeight)
        const mStartIdx = Math.floor(lastScrollTop / props.rowHeight)
        if (!force && mStartIdx === startRow.value) {
          return
        }
        startRow.value = mStartIdx
        updateInViewItems()
      }

      //水平滚动
      if(hasHorizontal || force){
        updateColShowStatus()
      }

    }

    const swiftSelectAll = ()=>{
      //全选与取消权限,全部选中则反选，否则全选
      if(selectedData.mode === "all"){
        resetSelectedData()
      }else{
        selectedData.mode = "all"
      }
    }

    const onKeydown = (evt:KeyboardEvent)=>{
      //按回车键时，触发最后一次选择的选择点击事件，如果没有选择的则默认触发第一行第一列
      if(evt.key === "Enter"){
        const colRow = <ClickPos>{col:Math.max(currentColRow.value.col,0),row:Math.max(0,currentColRow.value.row),originCol:0}
        colRow.originCol = cols.value[colRow.col].originIdx
        ctx.emit("clickItem",colRow)
        evt.stopPropagation();
        evt.preventDefault()
        return;
      }else if(evt.ctrlKey || evt.metaKey){
        evt.stopPropagation()
        evt.preventDefault()
        switch (evt.key.toLowerCase()){
          case "a":
            swiftSelectAll()
            return
          case "c":
            //复制
            if(rows.length > 0)
              ctx.emit("copy",getSelectedData())
            return
          case "x":
            //剪切
            if(rows.length > 0)
              ctx.emit("cut",getSelectedData())
            return
          case "v":
            //粘贴
            ctx.emit("paste",getSelectedData())
            return
          case "s":
            ctx.emit("save",getSelectedData())
            break
        }
      }else{
        switch (evt.key) {
          case "Backspace":
            evt.stopPropagation()
            evt.preventDefault()
            //删除
            if(rows.length > 0){
              ctx.emit("delete",getSelectedData())
            }
            return
          case "Delete":
            evt.stopPropagation()
            evt.preventDefault()
            //删除
            if(rows.length > 0){
              ctx.emit("delete",getSelectedData())
            }
            return
        }

        //箭头按键上下滚动
        if(evt.key === "ArrowUp" || evt.key === "ArrowDown"){
          //如果为初始值-1，则改为0
          let row = currentColRow.value.row
          //Up往上-1，Down往下+1
          row = evt.key === "ArrowUp" ? row - 1 : row + 1
          //移动出界只不处理事件
          if(row < 0 || row >= rows.length){
            return;
          }
          if(selectedData.mode === "row" || selectedData.mode === ""){
            //如果之前为行选择或未选择，则保持为行选择模式
            if(selectedData.mode !== "row"){
              resetSelectedData()
              selectedData.mode = "row"
            }
            selectedData.rows.clear()
            selectedData.rows.add(row)
          }else{
            //否则视为单列单行模式
            if(selectedData.mode !== "area"){
              resetSelectedData()
              selectedData.mode = "area"
            }
            const col = Math.max(currentColRow.value.col,0)
            const area = selectedData.area
            area.beginRow = row
            area.endRow = row
            area.beginCol = col
            area.endCol = col
          }
          currentColRow.value.row = row

          const rowY = row * props.rowHeight
          const scrollBegin = container.value.scrollTop
          //取整去掉余边
          const temp = visualHeight % props.rowHeight
          const scrollEnd = scrollBegin + visualHeight - temp
          container.value.style.scrollBehavior = "auto"
          //如果移动到屏幕外，自动滚动到该位置
          if(rowY <= scrollBegin){
            //移动到上方外面，将滚动位置将该行设为显示第一行
            container.value.scrollTo({
              top: rowY
            })
            //调用scrollTo后scrollTop值更新有延迟需要延时手动更新一下视图
            lodash.delay(()=>updateView(),25)
          }else if(rowY >= scrollEnd){
            //移动到下方外面，将滚动位置将该行设为显示最后一行
            container.value.scrollTo({
              //6为滚动条高度
              top: rowY - (visualHeight - props.rowHeight) + 6,
            })
            //调用scrollTo后scrollTop值更新有延迟需要延时手动更新一下视图
            lodash.delay(()=>updateView(),25)
          }
          container.value.style.scrollBehavior = "smooth"
          evt.stopPropagation()
          evt.preventDefault()
          return;
        }else if(evt.key === "ArrowLeft" || evt.key === "ArrowRight" || evt.key === "Tab"){
          //左 按住<-键或者tab和shift键，右按住->或者tab键
          //如果为初始值-1，则改为0
          let col = currentColRow.value.col
          //Left往左-1，Right往右+1
          col = evt.key === "ArrowLeft" || evt.shiftKey ? col - 1 : col + 1

          if(selectedData.mode === "col"){
            //移动出界只不处理事件
            if(col < 0 || col >= cols.value.length){
              return;
            }
            //如果之前为列选择或未选择，则保持为列选择模式
            if(selectedData.mode !== "col"){
              resetSelectedData()
              selectedData.mode = "col"
            }
            selectedData.cols.clear()
            selectedData.cols.add(col)
            currentColRow.value.col = col
          }else{
            //否则视为单列单行模式
            if(selectedData.mode !== "area"){
              resetSelectedData()
              selectedData.mode = "area"
            }
            let row = Math.max(0,currentColRow.value.row)
            //左右移动到每行最后一列或第一列，则自动切换上一行或下一行
            if(col < 0){
              //如果移动出第一行第一列则不处理事件
              if(row <= 0 && col < 0){
                return;
              }else{
                row = Math.max(0,row-1)
                col = cols.value.length - 1
              }
            }else if(col >= cols.value.length){
              //如果移动出末尾则不处理事件
              if(row >= rows.length-1 && col >= cols.value.length){
                return;
              }else{
                row += 1
                col = 0
              }
            }
            const area = selectedData.area
            area.beginRow = row
            area.endRow = row
            area.beginCol = col
            area.endCol = col
            currentColRow.value.col = col
            currentColRow.value.row = row
          }

          const colObj = cols.value[col]
          const  colX = colObj.xBegin
          //计算表格宽度，15为固定显示的侧边行选择表的宽度，不应纳入滚动范围计算
          const tableWidth = containerRect.width - 15
          const scrollBegin = lastScrollLeft
          const scrollEnd = lastScrollLeft + tableWidth
          container.value.style.scrollBehavior = "auto"
          //如果移动到屏幕外，自动滚动到该位置
          if(colX <= scrollBegin){
            //移动到左边外面，将滚动位置将该列设为显示最后一列
            container.value.scrollTo({
              left: colX - (tableWidth - colObj.width),
            })
          }else if(colX >= scrollEnd){
            //移动到右边外面，将滚动位置将该列设为显示最后列
            container.value.scrollTo({
              left: colX - (tableWidth - colObj.width),
            })
          }
          container.value.style.scrollBehavior = "smooth"
          evt.stopPropagation()
          evt.preventDefault()
          return;
        }
      }
    }

    const onClickSort = (name:string)=>{
      //状态切换顺序分别是 未勾选、升序、降序... 进行循环切换
      const sort = sorts.value.get(name)
      if(sort === null || sort === undefined){
        sorts.value.set(name,true)
      }else if(sort){
        sorts.value.set(name,false)
      }else{
        sorts.value.delete(name)
      }
      ctx.emit("sort",sorts.value)
    }

    const onClickTr = (evt:MouseEvent, col:number, item:{width:number,col:SimpleResultCol,idx:number})=>{
      if(selectedData.mode !== "col"){
        resetSelectedData()
      }
      selectedData.mode = "col"
      currentColRow.value.col = col
      currentColRow.value.row = 0
      //连选
      if(evt.shiftKey){
        const cols = Array.from(selectedData.cols).sort((a,b)=>a-b)
        let minCol = 0
        let maxCol = 0
        if(cols.length > 0){
          minCol = cols[0]
          maxCol = cols[cols.length-1]
        }
        selectedData.cols.clear()
        if(col >= maxCol){
          for (let i = minCol; i <= col; i++) {
            selectedData.cols.add(i)
          }
        }else{
          for (let i = col; i <= maxCol; i++) {
            selectedData.cols.add(i)
          }
        }
      }else if(evt.ctrlKey || evt.metaKey){
        //按住ctrl点选(多选)
        if(selectedData.cols.has(col)){
          selectedData.cols.delete(col)
        }else{
          selectedData.cols.add(col)
        }
      }else{
        //否则单选，清理掉之前的选择
        if(selectedData.cols.has(col)){
          selectedData.cols.clear()
        }else{
          selectedData.cols.clear()
          selectedData.cols.add(col)
        }
      }
    }

    const onMousedown = (evt:MouseEvent)=>{
      //仅鼠标左键触发
      if(evt.button !== 0){
        return;
      }
      focus()
      //防止拖动边缘滚动条时触发事件
      if(container.value.scrollWidth - (evt.clientX - containerRect.x) <= 15 || container.value.scrollHeight - (evt.clientY - containerRect.y) <= 15){
        return;
      }
      //按住shift一定不触发点击
      mouseDownIsClick = !evt.shiftKey
      downColRow = getColRowByPos(evt.clientX,evt.clientY)
      downPos.x = evt.clientX
      downPos.y = evt.clientY
      currentColRow.value = downColRow
      //按住shift时立即触发移动时间，用于按下立即更新选择区域
      evt.stopPropagation()
      evt.preventDefault()
      if(evt.shiftKey){
        onMousemove(evt)
      }
      document.addEventListener("mousemove",onMousemove)
      document.addEventListener("mouseup",onMouseup)
    }

    const onMousemove = lodash.throttle((evt:MouseEvent)=>{
      const moveColRow = getColRowByPos(evt.clientX,evt.clientY)
      currentColRow.value = moveColRow
      //移动距离超过5px,则视为移动否则为点击
      if(mouseDownIsClick){
        const dx = Math.abs(downPos.x - evt.clientX);
        const dy = Math.abs(downPos.y - evt.clientY);
        const dis = Math.sqrt(Math.pow(dx,2)+Math.pow(dy,2));
        mouseDownIsClick = dis < 5
      }
      if(!mouseDownIsClick){
        if(selectedData.mode != "area"){
          resetSelectedData()
        }
        selectedData.mode = "area"
        if(evt.shiftKey){
          //shift连续范围选择
          //如果没有选择的元素那么第一行第一列作为起始元素
          const area = getSelectArea()??{beginCol:0,endCol:0,beginRow:0,endRow:0}
          if(moveColRow.col < area.endCol){
            //如果点击的列小于选择区域的结束列，那么选择点击列至结束列范围内的元素
            selectedData.area.beginCol = moveColRow.col
            selectedData.area.endCol = area.endCol
          }else{
            //否则选择点击列至开始列范围内的元素
            selectedData.area.beginCol = area.beginCol
            selectedData.area.endCol = moveColRow.col
          }
          if(moveColRow.row < area.endRow){
            //如果点击的行小于选择区域的结束行，那么选择点击行至结束行范围内的元素
            selectedData.area.beginRow = moveColRow.row
            selectedData.area.endRow = area.endRow
          }else{
            //否则选择点击行至开始行范围内的元素
            selectedData.area.beginRow = area.beginRow
            selectedData.area.endRow = moveColRow.row
          }
        }else {
          //范围选择逻辑
          selectedData.area.beginRow = Math.min(downColRow.row, moveColRow.row)
          selectedData.area.endRow = Math.max(downColRow.row, moveColRow.row)
          selectedData.area.beginCol = Math.min(downColRow.col, moveColRow.col)
          selectedData.area.endCol = Math.max(downColRow.col, moveColRow.col)
        }
        selectingAutoScroll(evt.pageX,evt.pageY)
      }
      evt.stopPropagation()
      evt.preventDefault()
    },100)

    const onMouseup = (evt:MouseEvent)=>{
      document.removeEventListener("mousemove",onMousemove)
      document.removeEventListener("mouseup",onMouseup)
      //点击逻辑
      if(mouseDownIsClick){
        if(evt.ctrlKey || evt.metaKey){
          if(selectedData.mode != "row"){
            resetSelectedData()
          }
          selectedData.mode = "row"
          //多选
          if(selectedData.rows.has(downColRow.row)){
            selectedData.rows.delete(downColRow.row)
          }else{
            selectedData.rows.add(downColRow.row)
          }
        }else{
          //单选
          if(selectedData.mode != "area"){
            resetSelectedData()
          }
          selectedData.mode = "area"
          selectedData.area.beginRow = downColRow.row
          selectedData.area.endRow = downColRow.row
          selectedData.area.beginCol = downColRow.col
          selectedData.area.endCol = downColRow.col
          const colRow = {col:Math.max(downColRow.col,0),row:Math.max(0,downColRow.row),originCol:0}
          colRow.originCol = cols.value[colRow.col].originIdx
          ctx.emit("clickItem",colRow)
        }
      }
      evt.stopPropagation()
      evt.preventDefault()
    }

    const onRowSelectMousedown = (evt:MouseEvent)=>{
      document.addEventListener("mousemove",onRowSelectMousemove)
      document.addEventListener("mouseup",onRowSelectMouseup)
      focus()
      rowSelectDownIdx = -1
      rowSelectIsSaveDown = null
      onRowSelectMousemove(evt)
    }

    const onRowSelectMousemove = lodash.throttle((evt:MouseEvent)=>{
      evt.stopPropagation()
      evt.preventDefault()
      //计算点击行
      let row = Math.floor((Math.max(evt.y - containerRect.y - props.headerHeight,0) + container.value.scrollTop) / props.rowHeight)
      //防止行坐标越界
      row = Math.max(0,Math.min(props.modelValue.rows.length-1,row))

      //如果首次按下的行是待保存的行，那么改成鼠标事件模式为只能触发保存事件，其他选择行的事件不允许触发
      if(rowSelectIsSaveDown !== false){
        //如果点击行是未保存的行那么直接触发保存
        const rowData = rows[row]
        if((rowData.changeCols && rowData.changeCols.size > 0) || rowData.type === RowTypeNewAdd){
          rowSelectIsSaveDown = true
          if(!rowData.loading){
            ctx.emit("saveRow",rowData)
          }
        }
        if(rowSelectIsSaveDown === null){
          rowSelectIsSaveDown = false
        }
      }
      if(rowSelectIsSaveDown){
        return
      }

      currentColRow.value.row = row
      if(selectedData.mode != "row"){
        resetSelectedData()
      }
      selectedData.mode = "row"

      if(evt.ctrlKey || evt.metaKey){
        //点选或反选
        if(selectedData.rows.has(row)){
          selectedData.rows.delete(row)
        }else{
          selectedData.rows.add(row)
        }
        //点选或反选模式，只处理第一次点击
        onRowSelectMouseup(evt)
      }else if(evt.shiftKey){
        //范围选
        let min = -1,max = 0
        selectedData.rows.forEach((v)=>{
          if(min === -1 || v<min){
            min = v
          }
          if(v>max){
            max = v
          }
        })
        min = Math.max(0,min)
        selectedData.rows.clear()
        if(row < max){
          for (let i = row; i <= max; i++) {
            selectedData.rows.add(i)
          }
        }else{
          for (let i = min; i <= row; i++) {
            selectedData.rows.add(i)
          }
        }
      }else{
        //连选
        if(rowSelectDownIdx === -1){
          rowSelectDownIdx = row
        }
        const begin = Math.min(rowSelectDownIdx,row)
        const end = Math.max(rowSelectDownIdx,row)
        selectedData.rows.clear()
        for (let i = begin; i <= end; i++) {
          selectedData.rows.add(i)
        }
      }
      selectingAutoScroll(evt.pageX,evt.pageY,false,true)
    },35)

    const onRowSelectMouseup = (evt:MouseEvent)=>{
      document.removeEventListener("mousemove",onRowSelectMousemove)
      document.removeEventListener("mouseup",onRowSelectMouseup)
      evt.stopPropagation()
      evt.preventDefault()
    }

    const selectingAutoScroll = (x:number,y:number,scrollX=true,scrollY=true)=>{
      let scrollTopOffset = 0
      let scrollLeftOffset = 0
      //表格tbody视界范围
      //垂直
      if(scrollY) {
        const verticalBegin = containerRect.top + props.headerHeight
        const verticalEnd = containerRect.top + containerRect.height
        //如果移动超过视界范围则移动垂直滚动条
        if (y < verticalBegin) {
          //鼠标移动出上方，滚动条往上移动
          scrollTopOffset = -(verticalBegin - y) * 2
        } else if (y > verticalEnd) {
          //鼠标移动出下方，滚动条往下移动
          scrollTopOffset = (y - verticalEnd) * 2
        }
      }

      //水平
      if(scrollX) {
        const horizonBegin = containerRect.left
        const horizonEnd = containerRect.left + containerRect.width
        //如果移动超过视界范围则移动水平滚动条
        if (x < horizonBegin) {
          //鼠标移动出上方，滚动条往上移动
          scrollLeftOffset = -(horizonBegin - x) * 2
        } else if (x > horizonEnd) {
          //鼠标移动出下方，滚动条往下移动
          scrollLeftOffset = (x - horizonEnd) * 2
        }
      }

      if(scrollLeftOffset!=0||scrollTopOffset!=0){
        container.value.style.scrollBehavior = "auto"
        container.value.scrollTo({
          behavior: 'auto',
          top: container.value.scrollTop +scrollTopOffset,
          left: container.value.scrollLeft +scrollLeftOffset
        })
        container.value.style.scrollBehavior = "smooth"
      }
    }

    const getSelectArea = ():{beginCol:number,beginRow:number,endCol:number,endRow:number}=>{
      switch (selectedData.mode){
        case "all":
          return {beginCol:0,beginRow:0,endCol:cols.value.length-1,endRow:rows.length-1}
        case "area":
          return selectedData.area
        case "col":
          const selectedCols = Array.from(selectedData.cols).sort((a,b)=>a-b)
          if(selectedCols.length > 0){
            return {beginCol:selectedCols[0],beginRow:0,endCol:selectedCols[selectedCols.length-1],endRow:rows.length-1}
          }
          break
        case "row":
          const selectedRows = Array.from(selectedData.rows).sort((a,b)=>a-b)
          if(selectedRows.length > 0){
            return {beginCol:0,beginRow:selectedRows[0],endCol:cols.value.length-1,endRow:selectedRows[selectedRows.length-1]}
          }
          break
      }
      return null
    }

    //根据点击屏幕坐标换算点击行列
    const getColRowByPos = (x:number,y:number):{col:number,row:number}=>{
      const result = {col:0,row:0}
      //计算点击列(列宽度非定长，需要循环计算位于某一列)
      //计算相对容器内的x坐标
      const scrollX = container.value.scrollLeft
      const relativeX = Math.max(x - containerRect.x,0)
      x = relativeX + scrollX
      result.col = cols.value.length - 1
      for (let i = 0; i < cols.value.length-1; i++) {
        const col = cols.value[i]
        //优先判断sticky点击
        if(col.col.sticky && relativeX >= col.stickyLeft && relativeX < (col.stickyLeft+col.width)){
          result.col = i
          break
        }
        if(x>=col.xBegin && x < col.xEnd){
          result.col = i
          break
        }
      }
      //防止列坐标越界
      result.col = Math.max(0,Math.min(props.modelValue.cols.length-1,result.col))
      //计算点击行
      result.row = Math.floor((Math.max(y - containerRect.y - props.headerHeight,0) + container.value.scrollTop) / props.rowHeight)
      //防止行坐标越界
      result.row = Math.max(0,Math.min(props.modelValue.rows.length-1,result.row))
      return result
    }

    const getSelectedData = ():SelectionData =>{
      const colRow = {
        ...currentColRow.value,
        dataCol:  0,
      }
      //返回位于数据中列下标
      if(colRow.col !== -1){
        colRow.dataCol = cols.value[colRow.col].originIdx
      }
      return {
        colRow: colRow,
        area: getSelectedItems()
      }
    }

    const getSelectedItems = ():{cols:number[],rows:number[]}=>{
      const result = {cols:[],rows:[]}
      switch (selectedData.mode){
        case "all":
          //因为数据列可以拖动调整顺序，所以需要按选择的顺序还原成原下标
          result.cols = cols.value.map((item)=>item.originIdx)
          result.rows = rows.map((item,idx)=>idx)
          break
        case "area":
          //因为数据列可以拖动调整顺序，所以需要按选择的顺序还原成原下标
          const colArr = []
          for (let i = selectedData.area.beginCol; i <= selectedData.area.endCol; i++) {
            colArr.push(i)
          }
          const rowArr = []
          for (let i = selectedData.area.beginRow; i <= selectedData.area.endRow; i++) {
            rowArr.push(i)
          }
          result.cols = colArr.map((idx)=>cols.value[idx].originIdx)
          result.rows = rowArr.map((idx)=>idx)
          break
        case "col":
          //因为数据列可以拖动调整顺序，所以需要按选择的顺序还原成原下标
          result.cols = Array.from(selectedData.cols).sort((a,b)=>a-b).map((idx)=>cols.value[idx].originIdx)
          result.rows = rows.map((item,idx)=>idx)
          break
        case "row":
          //因为数据列可以拖动调整顺序，所以需要按选择的顺序还原成原下标
          result.cols = cols.value.map((item)=>item.originIdx)
          result.rows = Array.from(selectedData.rows).sort((a,b)=>a-b)
          break
      }
      return result
    }

    const getColumnClass = (idx:number,col:ColWrapper):Array<String>=>{
      const arr = []
      switch (selectedData.mode){
        case "all":
          //全选
          arr.push("active")
          break
        case "area":
          const area = selectedData.area
          if(idx >= area.beginCol && idx <= area.endCol){
            arr.push("active")
          }
          break
        case "col":
          //列选择
          if(selectedData.cols.has(idx)){
            arr.push("active")
          }
          break
        case "row":
          //行选择
          if(selectedData.rows.size > 0){
            arr.push("active")
          }
          break
      }
      if(col.col.sticky){
        arr.push("sticky")
      }
      return arr
    }

    const getItemClass = (col:number,row:number,item?:SimpleResultRow):Array<String>=>{
      const arr = []
      const idx = row + 1
      if(idx % 6 === 0){
        arr.push("six")
      }else if(idx % 3 === 0){
        arr.push("three")
      }
      if(item && (item.type === RowTypeNewAdd || (item.changeCols && item.changeCols.size !== 0))){
        arr.push("editing")
      }
      if(props.itemClass){
        const customClass = props.itemClass(row,item)
        if(customClass){
          if(lodash.isArray(customClass)){
            arr.push(...customClass)
          }else{
            arr.push(customClass)
          }
        }
      }

      if(isSelected(col,row)){
        arr.push("selected")
      }

      if(item===null){
        return arr;
      }

      if(cols.value[col].col.sticky){
        arr.push("sticky")
      }

      return arr
    }

    const getRowTdAttr = (row:SimpleResultRow)=>{
      let icon = null
      let clazz = []
      let style = <any>{}
      const current = currentColRow.value?.row === row.idx
      const selected = isSelectedRow(<number>row.idx)
      if(row.loading){
        icon = 'mdi-cached'
        clazz.push("loading")
      }else if(row.changeCols && row.changeCols.size > 0){
        icon = 'mdi-check'
      }else{
        switch (row.type) {
          case RowTypePlaceholder:
          case RowTypeNormal:
            if(current){
              icon = 'mdi-arrow-right-bold'
            }else if(selected){
              icon = 'mdi-circle-medium'
            }
            break
          case RowTypeNewAdd:
            icon = 'mdi-check'
            break
        }
      }

      if(icon===null) {
        icon = "mdi"
        style.display = "none"
      }
      if(current){
        clazz.push("current")
      }else if(selected){
        clazz.push("active")
      }
      return {class:clazz,style,icon}
    }

    const isSelected = (col:number,row:number)=>{
      switch (selectedData.mode){
        case "all":
          return true
        case "area":
          const area = selectedData.area
          return col >= area.beginCol && col <= area.endCol && row >= area.beginRow && row <= area.endRow
        case "col":
          //列选择
          return selectedData.cols.has(col)
        case "row":
          //行选择
          return selectedData.rows.has(row)
      }
      return false
    }

    const isSelectedRow = (row:number)=>{
      switch (selectedData.mode){
        case "all":
          return true
        case "area":
          const area = selectedData.area
          return row >= area.beginRow && row <= area.endRow
        case "col":
          //列选择
          return selectedData.cols.size != 0
        case "row":
          //行选择
          return selectedData.rows.has(row)
      }
      return false
    }

    const focus = ()=>{
      root.value.focus()
    }

    const showSearch = ()=>{
      search.value.switchShow()
    }

    const onCloseSearch = ()=>{
      focus()
    }

    const init = ()=>{
      rows = props.modelValue.rows
      //如果没数据添加一个占位空数据
      if(props.modelValue.cols.length === 0){
        props.modelValue.cols.push({
          name: "NaN"
        })
      }if(rows.length === 0){
        rows.push(<ResultRow>{
          type: RowTypePlaceholder,
          cols: lodash.fill(new Array(props.modelValue.cols.length),null)
        })
      }
      rows.forEach((row,idx)=>{
        row.idx = idx
      })
      nextTick(()=>{
        initCols()
        resize()
      })
    }

    const onContextMenuItem = (evt:MouseEvent)=>{
      if(rows.length === 0){
        ctx.emit("contextMenuItem",evt,null)
        return
      }
      const colRow = getColRowByPos(evt.x,evt.y)
      currentColRow.value = colRow
      if(!isSelected(colRow.col,colRow.row)){
        //如果右键不位于选择区域，则只选择右键的元素
        resetSelectedData()
        selectedData.mode = "area"
        selectedData.area.beginRow = colRow.row
        selectedData.area.endRow = colRow.row
        selectedData.area.beginCol = colRow.col
        selectedData.area.endCol = colRow.col
      }
      ctx.emit("contextMenuItem",evt,getSelectedData())
    }

    watch(()=>[props.rowHeight,props.modelValue],()=>{
      init()
    },{deep:false,immediate:true})

    watch(()=>props.showSlot,(s)=>{
      showSlot.value = s
    })

    watch(()=>selectedData,()=>{
      ctx.emit("changeSelected")
    },{deep:true})

    return {
      constants:Constants,
      //props
      rows,cols,sorts,showSlot,
      //el or component
      search,table,tbody,tableWrapper,container,root,
      //function
      init,updateView,showSearch,onCloseSearch,doSearch,focus,resize,isSelectedRow,onScroll,onClickSort,onClickTr,onRowSelectMousedown,onMousedown,initCols,onKeydown,onColMouseDown,onColMouseUp,getColumnClass,getRowTdAttr,getItemClass,onContextMenuItem,selectAll,resetSelectedData,swiftSelectAll,calcColPos,jumpColRow,
      //var
      inViewRows,startRow,offsetY,totalHeight,currentColRow,searchAttrs,selectedData,lineStyle
    }
  },
}
</script>

<style lang="scss">
//关闭默认背景动画，避免影响滚动性能
body div,button,table{
  transition: none;
}
.v-theme--dark{
  .simple-data-table{
    height: 100%;
    background: #1d1e21;
    border-color: rgba(255,255,255,0.2);
  }
  .row-select-table-container{
    border-right-color: rgba(255,255,255,0.1);
    .row-select-table{
      thead{
        tr{
          th{
            background: #1e1f21;
            border-bottom-color: rgba(255,255,255,0.1)
          }
        }
      }
      tbody{
        tr{
          background: #1e1f21;
          td{
            border-bottom-color: rgba(255,255,255,0.1);
            &:has(.active) {
              background: #3b4144;
            }
            &:has(.current) {
              background: #454b4f;
            }
          }
        }
      }
    }
  }
  .data-table{
    border-bottom-color: rgba(255,255,255,0.1);
    thead{
      tr{
        background: #1e1f21;
        color: rgba(255,255,255,0.75);
        th{
          border-bottom-color: rgba(255,255,255,0.1);
          border-right-color: rgba(255,255,255,0.1);
          &.active{
            background: #3b4144;
          }
        }
      }
    }
    tbody{
      tr{
        color: rgba(255,255,255,0.85);
        background: #1d1e21;
        td{
          background: inherit;
          border-right-color: rgba(255,255,255,0.1);
          &.three{
            background: #28292b;
          }
          &.six{
            background: #ecf4ff;
          }
          &.editing{
            background: rgb(100,100,100);
          }
          &.selected {
            background: rgba(29, 91, 201, 0.85);
            border-right-color: rgba(255,255,255,0.2);
          }
        }
      }
    }
  }
}

.simple-data-table{
  user-select: none;
  display: flex;
  overflow: hidden;
  height: 100%;
  position: relative;
  border: #e0e0e0 solid 0.5px;
  &:focus{
    outline: none;
  }
}

.row-select-table-container{
  width: 15px;
  height: 100%;
  overflow: hidden;
  border-right: #e0e0e0 solid 0.5px;
  position: absolute;
  .row-select-table{
    table-layout: fixed;
    height: auto;
    border-spacing: 0;
    border-collapse: separate;
    thead{
      position: sticky;
      z-index: 1;
      tr{
        overflow: hidden;
        contain: strict;
        th{
          contain: layout;
          background: #ffffff;
          width: 15px;
          border-bottom: #e0e0e0 solid 0.5px;
        }
      }
    }
    tbody{
      //transition:.2s ease-in transform;
      transition: none;
      tr{
        td{
          height: inherit;
          width: 15px;
          border-bottom: #e0e0e0 solid 0.5px;
          .v-icon{
            transform: translateX(-1px) scale(0.8);
            display: flex;
            justify-content: center;
            align-items: center;
          }
          .loading{
            animation-name: loading;
            animation-duration: 850ms;
            animation-timing-function: ease;
            animation-iteration-count: infinite;
          }
          &:has(.active){
            background: rgb(205,205,205);
          }
          &:has(.current){
            background: rgb(175, 175, 175);
          }
        }
      }
    }
  }
}

.table-container{
  position: absolute;
  left: 15px;
  border-bottom: none;
  overflow-y: auto;
  scroll-behavior: smooth;
  width: calc(100% - 15px);
  height: 100%;
  .table-wrapper{
    position: sticky;
    top:0;
  }
}
.data-table{
  cursor: default;
  table-layout: fixed;
  overflow-y: hidden;
  min-width: 100%;
  width: 100%;
  height: auto;
  border-spacing: 0;
  border-collapse: separate;
  border-bottom: #e0e0e0 solid 0.5px;
  thead{
    z-index: 2;
    position: sticky;
    top: 0;
    tr{
      background: rgba(245, 245, 245);
      th{
        background: inherit;
        border-bottom: #e0e0e0 solid 0.5px;
        border-right: #e0e0e0 solid 0.5px;
        cursor: default;
        padding: 2px 2px 2px 5px;
        position: relative;
        font-size: 12px;
        font-weight: normal;
        white-space: nowrap;
        overflow: hidden;
        text-align: left;
        text-overflow: ellipsis;
        .sort{
          position: absolute;
          right: 5px;
          transition: transform .2s;
          &.asc{
            transform: rotateX(180deg);
          }
          &.desc{
          }
        }
        &:first-child{
          padding-left: 5px;
        }
        &.active{
          background: rgb(225,225,225);
        }
        &.sticky{
          position: sticky;
          z-index: 2;
        }
        &:last-child{
          border-right: none;
          & .line{
            div{
              display: none;
            }
          }
        }
        & .line{
          height: 100%;
          width: 13px;
          top: 0;
          left: unset;
          right: -6px;
          position: absolute;
          opacity: 0.3;
          cursor: ew-resize;
        }
      }
    }
  }
  tbody{
    position: relative;
    contain: strict;
    tr{
      contain: strict;
      transition: .2s background-color,.2s color;
      text-align: center;
      padding: 5px 10px;
      font-size: 12px;
      color: #000000;
      background: #ffffff;
      td{
        contain: layout;
        height: inherit;
        background: inherit;
        border-right: #e0e0e0 solid 0.5px;
        transition: 0.2s linear border-radius,0.2s linear border;
        border-radius: 0;
        white-space: nowrap;
        overflow: hidden;
        box-sizing: content-box;
        & > span{
          padding: 2px;
          &.null{
            color: #9e9e9e;
            font-weight: bold;
          }
        }
        &:last-child{
          border-right: none;
        }
        &.three{
          background: #efefef;
        }
        &.six{
          background: #eff5ff;
        }
        &.editing{
          background: rgb(217,217,217);
        }
        &.selected {
          border-right-color: rgba(255, 255, 255, 0.35);
          background: #8face6;
          color: #ffffff;
          & > span{
            &.null{
              color: #ddd;
            }
          }
        }
        &.sticky{
          position: sticky;
          z-index: 2;
        }
      }
    }
  }
}

@keyframes loading {
  from {
    transform: rotate(0) scale(.7);
  }
  to {
    transform: rotate(360deg) scale(.7);
  }
}
</style>