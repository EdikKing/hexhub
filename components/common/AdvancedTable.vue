<template>
  <search
      :disabled="!searchProvider"
      @findPrevious="doSearch(false)"
      @findNext="doSearch(true)"
      @search="doSearch(true)"
      v-model="searchAttrs.searchStr"
      v-model:show="searchAttrs.show"
      v-model:case-sensitive="searchAttrs.caseSensitive"
      v-model:regex="searchAttrs.regex"
      v-model:whole-word="searchAttrs.wholeWord"
  >
    <div :id="id" ref="container" class="advanced-table-container" v-on:scroll.passive="onScroll(false)" v-on:keydown="onKeydown" tabindex="0">
      <div :style="`height:${totalHeight+thead?.clientHeight}px`">
        <div ref="tableWrapper" class="table-wrapper">
          <div
              :style="`overflow-y: hidden;height: ${container?.clientHeight}px`"
              v-on:contextmenu="contextMenuItem($event,null)"
              v-on:dragenter.prevent
              v-on:dragover.prevent
              v-on:dragleave.prevent
              v-on:drop.prevent="onDrop($event,null)"
          >
            <table ref="table" :class="getTableClass()">
              <thead ref="thead">
                <draggable
                    v-model="headers"
                    tag="tr"
                    :animation="200"
                    :component-data="{
                      tag: 'tr',
                      type: 'transition-group',
                      name: 'fade'
                    }"
                    item-key="key"
                    @end="initHeaderSize">
                  <template #item="{ element: header }">
                    <template v-if="header.sortable">
                      <th
                          scope="col"
                          :class="`col ${header.thClass??''} ${sortKey === header.key?(sortAsc?'sort asc':'sort desc'):'sort'}`"
                          v-on:click="clickSort(header)"
                      >
                        <slot name="th" :header="header">
                          {{ header.title }}
                        </slot>
                        <v-btn
                            density="compact"
                            size="small"
                            variant="text"
                            :icon="sortKey === header.key?'mdi-chevron-down':'mdi-unfold-more-horizontal'"
                        >
                        </v-btn>
                        <div class="line" v-on:click.stop v-on:mousedown="onColMouseDown($event,header)" v-on:mouseup="onColMouseUp">
                          <div></div>
                        </div>
                      </th>
                    </template>
                    <template v-else>
                      <th scope="col" class="col">
                        <slot name="th" :header="header">
                          {{ header.title }}
                        </slot>
                        <div class="line" v-on:mousedown="onColMouseDown($event,header)" v-on:mouseup="onColMouseUp">
                          <div></div>
                        </div>
                      </th>
                    </template>
                  </template>
                  <template #header v-if="beforeThWidth">
                    <th :style="`max-width:${beforeThWidth};width:${beforeThWidth}`">
                      <div class="line" style="cursor: default">
                        <div></div>
                      </div>
                    </th>
                  </template>
                  <template #footer v-if="afterTh">
                    <th></th>
                  </template>
                </draggable>
              </thead>
              <tbody
                  ref="tbody"
                  :class="`${dragging?'dragging':''} ${inViewItems.length === 0?'empty':''}`"
                  :style="`transform:translateY(${offsetY}px)`"
                  v-on:mousedown="onTBodyMousedown"
              >

                <template v-for="(line,idx) in inViewItems" :key="line._idx">
                  <tr
                      :class="getItemClass(line)"
                      :style="`height:${rowHeight}px;`"
                      :idx="line._idx"
                      v-on:contextmenu.capture.stop="contextMenuItem($event,line)"
                      v-on:click="clickItem($event,line)"
                      v-on:dblclick="dbClickItem($event,line)"
                      :draggable="draggable && !line._static"
                      v-on:dragstart="onTrDragstart($event,line)"
                      v-on:dragend="onTrDragend"
                      v-on:dragover.prevent
                      v-on:dragenter.prevent="sortable || line._dropable?onDragenter($event,line):null"
                      v-on:dragleave.prevent="line._dropable?onDragleave($event,line):null"
                      v-on:drop.stop.prevent="onDrop($event,line)">
                    <td v-if="beforeThWidth" v-on:mousedown="(evt:MouseEvent)=>{if(!evt.shiftKey && !evt.metaKey && !evt.ctrlKey){evt.preventDefault()}}"></td>
                    <slot name="td" :item="line" :key="header.key" :colIdx="colIdx" :idx="line._idx" :displayIdx="idx" :dragging="dragging" :header="header" v-for="(header,colIdx) in headers">
                      <td :class="header.tdClass">
                        {{header.formatFunc?header.formatFunc(line,idx):line[header.key]}}
                      </td>
                    </slot>
                    <td v-if="afterTh" v-on:mousedown="(evt:MouseEvent)=>{if(!evt.shiftKey && !evt.metaKey && !evt.ctrlKey){evt.preventDefault()}}"></td>
                  </tr>
                </template>

                <div v-if="inViewItems.length === 0" style="position: relative;display: flex;justify-content: center;align-items: center" :style="{height:(container?.clientHeight-thead?.clientHeight)+'px',width:(table?.offsetWidth-5)+'px'}">
                  <slot name="empty">
                    <dark-cloud-ani style="transform: scale(0.8)" model-value="暂无数据"></dark-cloud-ani>
                  </slot>
                </div>
                <tr v-else>
                  <td v-if="beforeThWidth" v-on:mousedown="(evt:MouseEvent)=>{if(!evt.shiftKey && !evt.metaKey && !evt.ctrlKey){evt.preventDefault()}}"></td>
                  <td :key="header.key" v-for="(header) in headers"></td>
                  <td v-if="afterTh" v-on:mousedown="(evt:MouseEvent)=>{if(!evt.shiftKey && !evt.metaKey && !evt.ctrlKey){evt.preventDefault()}}"></td>
                </tr>

              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </search>
</template>

<script lang="ts">
import {PropType} from "nuxt/dist/app/compat/capi";
import draggable from "vuedraggable";
import {nextTick, onMounted, onUnmounted, reactive, ref, toRefs, watch} from "vue";
import lodash from "lodash";
import Search, {matchFunc} from "~/components/common/Search.vue";
import Toast from "~/lib/layer/toast";
import DarkCloudAni from "~/components/animation/DarkCloudAni.vue";
import {getFirstLetter} from "~/lib/util/pinyin";


interface TableHeader {
  title: string
  key: string
  minWidth: number
  sortable: boolean
  width?: number
  thClass?: string
  tdClass?: string
  formatFunc?: (item:any,idx:number)=>string
}

export {TableHeader}


export default {
  name: "AdvancedTable",
  props: {
    beforeThWidth: {
      type: [String,Boolean],
      default: false
    },
    afterTh: {
      type: Boolean,
      default: false
    },
    border: {
      type: Boolean,
      default: false,
    },
    searchProvider: {
      type: Function as PropType<(idx:number,item:any)=>string|null>
    },
    group: {
      type: String,
      default: "default"
    },
    id: {
      type: String,
      default: "default"
    },
    itemClass: {
      type: Function as PropType<(idx:number,item:any)=>string[]|string>,
      default: null
    },
    draggable: {
      type: Boolean,
      default: false,
    },
    sortable: {
      type: Boolean,
      default: false
    },
    searchable: {
      type: Boolean,
      default: false
    },
    headers: {
      type: Array as PropType<TableHeader[]>,
      default: [
        // {title:"aa",key:"aa",sortable: true},
        // {title:"bb",key:"bb",minWidth:100,sortable: true},
        // {title:"cc",key:"cc",sortable: true},
        // {title:"dd",key:"dd"},
        // {title:"ee",key:"ee"},
        // {title:"ff",key:"ff"},
        // {title:"gg",key:"gg"},
      ],
    },
    rowHeight: {
      type: Number,
      default: 25
    },
    sortKey: {
      type: String,
      default: null
    },
    sortAsc: {
      type: Boolean,
      default: true
    },
    items: {
      type: Array,
      default: [
        // {aa:"a0",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        // {aa:"a1",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        // {aa:"a2",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        // {aa:"a3",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        // {aa:"a4",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        // {aa:"a5",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        // {aa:"a6",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        // {aa:"a7",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        // {aa:"a8",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        // {aa:"a9",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        // {aa:"a10",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        // {aa:"a11",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        // {aa:"a12",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        // {aa:"a13",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        // {aa:"a14",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        // {aa:"a15",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        // {aa:"a16",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        // {aa:"a17",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        // {aa:"a18",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        // {aa:"a19",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        // {aa:"a20",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        // {aa:"a21",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        // {aa:"a22",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        // {aa:"a23",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        // {aa:"a24",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
      ],
    }
  },
  emits: ["receiveData","receiveFile","dragSortEnd","sort","update:sortKey","update:sortAsc","update:headers","copy","cut","paste","search","delete","selectItem","clickItem","contextMenuItem"],
  components:{DarkCloudAni, Search, draggable},
  setup(props, ctx) {

    const items = ref(props.items)
    const rowHeight = ref(props.rowHeight)
    const sortKey = ref(props.sortKey)
    const sortAsc = ref(props.sortAsc)
    const headers = ref(props.headers)

    const thead = ref<HTMLElement>()
    const table = ref<HTMLTableElement>()
    const tbody = ref<HTMLElement>()
    const container = ref<HTMLElement>()
    const tableWrapper = ref<HTMLElement>()

    const scrolling = ref(false)
    const dragging = ref(false)
    const offsetY = ref(0)
    const startIdx = ref(-1)
    const totalHeight = ref(0)
    const inViewItems = ref([])
    const currentContextMenuItem = ref({})
    const selectRect = reactive({
      show: false,
      downX: 0,
      downY: 0,
      downClientX: 0,
      downClientY: 0,
    })
    const selectCount = ref(0)

    //搜索属性
    const searchAttrs = reactive({
      searchStr: "",
      show: false,
      caseSensitive: false,
      wholeWord: false,
      regex: false,
      idx: -1,
    })

    let selectableTotal = 0
    let containerRect:DOMRect = null
    let visualSize = 0
    let resizingHeader:TableHeader = null
    let resizingHeaderEl:HTMLElement = null
    let resizing = false
    let resizingDownX = 0
    let resizingDownWidth = 0
    let inDropItem = null
    let dragStartItem = null
    let currentRow = 0


    //test data
    // const items = ref([])
    // for (let i = 0; i < 1000; i++) {
    //   items.value.push({aa:"a"+i,bb:"b"+i,cc:"c"+i,dd:"d"+i,ee:"e"+i,ff:"f"+i,gg:"g"+i},)
    // }


    const updateSelectCount = lodash.debounce(()=>{
      let count = 0
      for (const item of props.items) {
        if(item._selected){
          count ++
        }
      }
      selectCount.value = count
    }, 200)

    const resize = ()=>{
      //可视区域item数量
      const visualHeight = container.value.clientHeight - thead.value.clientHeight
      visualSize = Math.ceil( visualHeight/props.rowHeight) + 1
      totalHeight.value = props.rowHeight * items.value.length
      containerRect  = container.value.getBoundingClientRect()
      onScroll(true)
    }

    const handDragSort = lodash.throttle((srcItem,targetItem)=>{
      if(srcItem === targetItem){
        return
      }
      const srcIdx = srcItem._idx
      const targetIdx = targetItem._idx

      if(srcIdx > targetIdx){
        //往上拖拽，拖拽目标item下方挨个往下挪动
        srcItem._idx = targetIdx
        for (let i = targetIdx; i < srcIdx; i++) {
          const item = props.items[i]
          item._idx ++
        }
      }else{
        //往下拖拽，拖拽目标item上方挨个往上挪动
        srcItem._idx = targetIdx
        for (let i = srcIdx+1; i <= targetIdx; i++) {
          const item = props.items[i]
          item._idx --
        }
      }
      props.items.sort((a,b)=>a._idx - b._idx)
      ctx.emit("dragSortEnd")
    },100)

    const onDrop = (evt:DragEvent,item?:any)=>{
      const lastInDropItem = inDropItem
      if(inDropItem!=null){
        inDropItem._indrop = false;
        inDropItem = null
      }
      evt.stopPropagation()
      evt.preventDefault()
      const dataTransfer = evt.dataTransfer
      if(dataTransfer.types.includes("Files") && dataTransfer.files.length > 0){
        ctx.emit("receiveFile",{items:dataTransfer.items,files:dataTransfer.files,targetItem:item,targetId:props.id})
        return;
      }
      const transferId = dataTransfer.getData("hexhub/table-id")
      const transferGroup = dataTransfer.getData("hexhub/table-group")

      //如果拖拽源和拖拽目标是同一个表格内的元素，并且拖入目标元素已选中或者无拖入目标，则不触发事件（避免自己拖拽到自己内和原地拖拽）
      if((props.id == transferId && (item?._selected || lastInDropItem==null)) || transferGroup!=props.group){
        return
      }
      const transferData = JSON.parse(dataTransfer.getData("hexhub/table-items"))
      ctx.emit("receiveData",{items:transferData,targetItem:lastInDropItem,srcId:transferId,targetId:props.id})
    }

    const onDragenter = (evt,item)=>{
      if(evt?.relatedTarget?.parentElement=== null || evt.currentTarget.contains(evt.relatedTarget)){
        return
      }
      if(item._dropable){
        if(inDropItem!==null && inDropItem !== item){
          inDropItem._indrop = false
        }
        //因为dragenter子元素也会触发事件，所以判断事件元素为顶级元素时才触发
        item._indrop = true
        inDropItem = item
      }else{
        if(item!=dragStartItem){
          handDragSort(dragStartItem,item)
        }
      }

    }

    const onDragleave = (evt,item)=>{
      if(evt?.relatedTarget?.parentElement=== null || evt.currentTarget.contains(evt.relatedTarget)){
        return
      }
      item._indrop = false
      nextTick(()=>{
        if(inDropItem === item){
          inDropItem._indrop = false
          inDropItem = null
        }
      })
    }

    const onTrDragstart = (evt: DragEvent,item) => {
      const dataTransfer = evt.dataTransfer
      const idx = item._idx
      //如果拖动的item为未选中，则更新拖动的item选中状态, 并将其他选择的取消掉
      const dragItem = items.value[idx]
      if (!props.sortable && !dragItem._selected) {
        // dragItem._selected = true
        items.value.forEach((item)=>{
          item._selected = dragItem === item
        })
        selectCount.value = 1
      }else{
        updateSelectCount()
      }
      dragStartItem = item
      dragging.value = true
      dataTransfer.setData("hexhub/table-group", props.group)
      dataTransfer.setData("hexhub/table-id", props.id)
      dataTransfer.setData("hexhub/table-items", JSON.stringify(getSelectedItems()))
    }

    const onTrDragend = (evt:DragEvent)=>{
      dragging.value = false
      updateSelectCount()
    }

    const onColMouseDown = (evt:MouseEvent,header:TableHeader)=>{
      evt.stopPropagation()
      evt.preventDefault()
      resizingHeader = header
      resizingHeaderEl = <HTMLElement>evt.target
      resizingDownX = evt.clientX
      resizingDownWidth = resizingHeaderEl.parentElement.clientWidth
      resizing = true
      document.addEventListener("mousemove", onColMouseMove)
    }

    const onColMouseUp = (evt?:MouseEvent)=>{
      if(evt!=null){
        evt.stopPropagation()
        evt.preventDefault()
      }
      resizingHeader = null
      resizingHeaderEl = null
      resizing = false
      document.removeEventListener("mousemove", onColMouseMove)
    }

    const onColMouseMove = (evt:MouseEvent)=>{
      if(resizingHeaderEl === null){
        return;
      }
      evt.stopPropagation()
      evt.preventDefault()
      if(!evt.which){
        onColMouseUp()
        return
      }
      const width = resizingDownWidth+(evt.clientX -  resizingDownX)
      if(resizingHeader.minWidth){
        resizingHeaderEl.parentElement.style.width = `${Math.max(resizingHeader.minWidth,width)}px`
      }else{
        resizingHeaderEl.parentElement.style.width = `${width}px`
      }
    }

    const onTBodyMousedown = (evt?:MouseEvent)=>{
      //清除右键选中效果
      currentContextMenuItem.value = null
      //排除右键点击
      if(evt.button!==0){
        return
      }
      focus()

      //计算点击的item下标
      const downY = evt.clientY - containerRect.y + container.value.scrollTop - thead.value.clientHeight
      const downIdx = Math.floor(downY / props.rowHeight)
      currentRow = downIdx

      //非可拖拽模式按下 或 (按住alt 或 metaKey(win:ctrl mac:command)) 则进入拖动多选模式
      //按住shift则进入范围多选模式，如果有选中的，使用选中的item作为起始点，如果无选中则使用第一个可选item作为起始点，起始点与结束点中间所有可选item标记选中。

      if(evt.metaKey || evt.ctrlKey || !props.draggable){
        //反选逻辑
        scrolling.value = true
        evt.stopPropagation()
        evt.preventDefault()
        document.addEventListener("mousemove", onTBodyMousemove)
        document.addEventListener("mouseup", onTBodyMouseup)

        selectRect.downClientX = evt.clientX
        selectRect.downClientY = evt.clientY
        //换算位于虚拟table中的坐标（点击的屏幕坐标 - 表格位于屏幕的起始坐标 + 滚动条位置）
        selectRect.downX = evt.clientX - containerRect.x + container.value.scrollLeft
        selectRect.downY = downY
      }else if(evt.shiftKey){
        //按住shift为鼠标连选逻辑
        evt.stopPropagation()
        evt.preventDefault()

        //获取选中的一个和最后一个元素，和可选择的第一个元素
        let beginIdx = -1
        let endIdx = -1
        let firstSelectableIdx = -1
        for (let i = 0; i < items.value.length; i++) {
          const item = items.value[i]
          if(item._selected){
            if(beginIdx === -1){
              beginIdx = i
            }
            endIdx = i
          }else if(!item._static && firstSelectableIdx === -1){
            firstSelectableIdx = i
          }
        }
        //如果没有选择任何item，那么第一个可选择的item作为第一个和最后一个选择的item
        beginIdx = Math.max(beginIdx,firstSelectableIdx)
        endIdx = Math.max(endIdx,firstSelectableIdx)

        //如果存在可选择的项
        if(firstSelectableIdx !== -1){
          scrolling.value = true
          document.addEventListener("mousemove", onTBodyMousemove)
          document.addEventListener("mouseup", onTBodyMouseup)

          selectRect.downClientX = 0
          selectRect.downClientY = 0
          //根据起始item的下标计算对应Y轴坐标
          selectRect.downX = 0
          //如果点击的item下标大于等于第一个已选择item，则全选第一个已选择item至点击item内所有item
          //否则全选点击item至最后一个已选择item范围内的所有item
          selectRect.downY = (downIdx>=beginIdx?beginIdx:endIdx) * rowHeight.value
          //点击时直接触发一次移动，以便按下时马上更新选中item
          onTBodyMousemove(evt)
        }
      }
    }
    const onTBodyMouseup = (evt:MouseEvent)=>{
      document.removeEventListener("mousemove", onTBodyMousemove)
      document.removeEventListener("mouseup", onTBodyMouseup)
      evt.stopPropagation()
      evt.preventDefault()
      selectRect.show = false
      scrolling.value = false
      const itemsVal = items.value
      //鼠标移动低于等于3px抬起，视为点击
      if(Math.abs(evt.clientY-selectRect.downClientY)<=3){
        //根据点击屏幕坐标，计算点击的是哪个item
        const clickItemIdx = Math.floor(selectRect.downY / props.rowHeight)
        if(clickItemIdx>=itemsVal.length){
          return
        }
        const clickItem = itemsVal[clickItemIdx]
        //非静态item，切换选中状态
        if(!clickItem._static){
          clickItem._selected = !clickItem._selected
          updateSelectCount()
        }
      }
    }
    const onTBodyMousemove = (evt:MouseEvent)=>{
      evt.stopPropagation()
      evt.preventDefault()
      //鼠标移动超过3px，才视为进入拖动状态
      if(Math.abs(evt.clientY-selectRect.downClientY)>3){
        if(!selectRect.show){
          for (let i = 0; i < items.value.length; i++) {
            const item = items.value[i]
            if(!item._static) {
              item._selected = false
            }
          }
          updateSelectCount()
          selectRect.show = true
        }
        updateSelectRangeStatus(evt)
      }
    }

    const selectingAutoScroll = (evt:MouseEvent|DragEvent)=>{
      //表格tbody视界范围
      const verticalBegin = containerRect.top + thead.value.clientHeight
      const verticalEnd = containerRect.top + containerRect.height
      //如果移动超过视界范围则移动垂直滚动条
      if(evt.clientY < verticalBegin){
        //鼠标移动出上方，滚动条往上移动
        container.value.scrollTo({
          behavior: 'smooth',
          top: container.value.scrollTop - (verticalBegin - evt.clientY) * 2
        })
      }else if(evt.clientY > verticalEnd){
        //鼠标移动出下方，滚动条往下移动
        container.value.scrollTo({
          behavior: 'smooth',
          top: container.value.scrollTop + (evt.clientY - verticalEnd) * 2
        })
      }
    }

    const updateSelectRangeStatus = lodash.throttle((evt:MouseEvent)=>{
      const selectRange = getSelectRectRange(evt)
      let count = 0
      items.value.forEach((item,idx)=>{
        if(!item._static) {
          item._selected = idx >= selectRange.begin && idx <= selectRange.end
          if(item._selected){
            count++
          }
        }
      })
      selectCount.value = count
      selectingAutoScroll(evt)
    },100)

    const getSelectRectRange = (evt:MouseEvent):{begin:number,end:number}=>{
      const rectClientY = selectRect.downY
      const rectClientYEnd = evt.clientY - containerRect.y + container.value.scrollTop - thead.value.clientHeight

      //计算选择范围的开始下标和结束下标，并判断下标不能小于0或者大于items数组
      const max = items.value.length - 1
      const begin = Math.min(Math.max(0,Math.floor(rectClientY / props.rowHeight)),max)
      const end = Math.min(Math.max(0,Math.floor(rectClientYEnd / props.rowHeight)),max)
      return {begin:Math.min(begin,end),end:Math.max(begin,end)}
    }

    const initHeaderSize = ()=>{
      nextTick(()=>{
        const theadChildren = thead.value.querySelectorAll("tr > th.col")
        const headers = props.headers
        //为每列留下足够的冗余大小，防止宽度够的情况也容易出现横向滚动条
        const redundancySize = theadChildren.length * 8
        for (let i = 0; i < theadChildren.length; i++) {
          const th = <HTMLElement>theadChildren.item(i)
          const header = headers[i]
          let width = header.width
          if(!width){
            width = th.clientWidth
          }
          if(header.minWidth){
            th.style.width = `${Math.max(header.minWidth,width-redundancySize)}px`
          }else{
            th.style.width = `${width-redundancySize}px`
          }
        }
      })
    }

    const updateInViewItems = ()=>{
      // console.log("aaaa",visualSize,mScrollTop,startIdx)
      //数组复用
      if(inViewItems.value.length === visualSize && startIdx.value+visualSize < items.value.length){
        for (let i = 0; i < inViewItems.value.length; i++) {
          inViewItems.value[i] = items.value[startIdx.value+i]
        }
      }else{
        inViewItems.value = items.value.slice(
            startIdx.value,
            Math.min(items.value.length,startIdx.value+visualSize)
        )
      }
    }

    const onScrollEnd = lodash.debounce(()=>{
      scrolling.value = false
    },350)

    const onScroll = (force=false)=>{
      //虚拟表格，需要根据滚动位置动态计算当前显示的表格
      const mScrollTop = container.value.scrollTop
      offsetY.value = -(mScrollTop%props.rowHeight)
      if(!scrolling.value){
        scrolling.value = true
      }
      onScrollEnd()
      const mStartIdx = Math.floor(mScrollTop/props.rowHeight)
      if(!force && mStartIdx === startIdx.value){
        return
      }

      startIdx.value = mStartIdx
      updateInViewItems()
    }

    const onKeydown = (evt:KeyboardEvent)=>{
      if(evt.key === "Backspace" || evt.key === "Delete"){
        //删除
        ctx.emit("delete",getSelectedItems())
      } else if(evt.ctrlKey || evt.metaKey){
        switch (evt.key.toLowerCase()){
          case "a":
            //全选与取消权限,全部选中则反选，否则全选
            const selected = getSelectedItems()
            if(selected.length !== selectableTotal){
              items.value.forEach(item=>{
                if(!item._static){
                  item._selected = true
                }
              })
            }else{
              selected.forEach((item)=>{
                item._selected = false
              })
            }
            updateSelectCount()
            break
          case "c":
            //复制
            ctx.emit("copy",getSelectedItems())
            break
          case "x":
            //剪切
            ctx.emit("cut",getSelectedItems())
            break
          case "v":
            //粘贴
            ctx.emit("paste",getSelectedItems())
            break
          case "f":
            //搜索
            if(!props.searchable){
              evt.stopPropagation()
            }
            ctx.emit("search",getSelectedItems())
            break
          default:
            return;
        }
        // evt.stopPropagation()
        evt.preventDefault()
      } else if(evt.key === "ArrowUp" || evt.key === "ArrowDown" || evt.key === "Tab"){
        //箭头按键上下滚动
        //如果为初始值-1，则改为0
        let row = currentRow
        //按住上键或者tab和shift键往上移动，按住下或者tab键王下移动
        row = evt.key === "ArrowUp" || evt.shiftKey ? row - 1 : row + 1
        //移动出开头和末尾则将按键事件抛出
        if(row < 0){
          return;
        }else if(row >= items.value.length){
          return;
        }
        jumpRow(row,true)
        evt.stopPropagation()
        evt.preventDefault()
        return;
      }else if(evt.key === "Enter"){
        //按下回车并且如果当前移动位置的item已选中则触发点击事件
        if(currentRow >= 0 && currentRow < items.value.length){
          const item = items.value[currentRow]
          if(item._selected){
            evt.stopPropagation()
            evt.preventDefault()
            ctx.emit("clickItem",item,currentRow)
          }
        }
      }
      if (!evt.shiftKey && !evt.ctrlKey && !evt.metaKey && evt.target instanceof HTMLElement && props.items.length > 0){
        const tagName = evt.target.tagName
        //如果焦点在本table内元素，并且焦点不在input或button时以及按下的按键是数字或字母符号时，触发搜索
        if (props.searchProvider && tagName != "input" && tagName !== "button" && /^[0-9a-zA-Z.-_]+$/.test(evt.key)){
          searchAttrs.searchStr = evt.key
          searchAttrs.regex = false
          searchAttrs.wholeWord = false
          searchAttrs.caseSensitive = false
          doSearch(true,true)
        }
      }

    }

    const getSelectedItems = ():Array<any>=>{
      return items.value.filter((item)=>!item._static && item._selected)
    }

    const getItemClass = (item:any):Array<String>=>{
      const arr = []
      if((item._idx + 1) % 2 === 0){
        arr.push("even")
      }
      if(item._selected){
        arr.push("selected")
      }
      if(item._indrop){
        arr.push("indrop")
      }
      if(item === currentContextMenuItem.value){
        arr.push("right-selected")
      }
      if(props.itemClass){
        const customClass = props.itemClass(item._idx,item)
        if(customClass){
          if(lodash.isArray(customClass)){
            arr.push(...customClass)
          }else{
            arr.push(customClass)
          }
        }
      }
      return arr
    }

    const contextMenuItem = (evt:MouseEvent,item?:any)=>{
      //设置当前右键对应的item
      if(item !== null && !item._static){
        //右键增加右键选中效果
        currentContextMenuItem.value = item
        window.addEventListener("mouseup",()=>currentContextMenuItem.value=null)
        //如果右键点击的item是选中的，那么则传递所有选中的item，否则只传递点击的item
        if(item._selected){
          ctx.emit("contextMenuItem",evt,getSelectedItems())
        }else{
          //清空选中的items
          items.value.forEach(item=>{
            item._selected = false
          })
          selectCount.value = 0

          ctx.emit("contextMenuItem",evt,[item])
        }
      }else{
        //右键空白处或不可右键的item
        ctx.emit("contextMenuItem",evt,[])
      }
    }

    const doSearch = (isNext:boolean,isKeySearch=false,isContinue=true)=>{
      if(props.searchProvider===null){
        return
      }
      let resultIdx = -1
      let idx = searchAttrs.idx
      const items = props.items
      const size = items.length
      if(isNext){
        //从上至下搜索
        for (let i = idx+1; i < size; i++) {
          //获取搜索将匹配的文本，
          let text =  props.searchProvider(i,items[i]);
          if(text && isKeySearch){
            const first = text.charAt(0)
            //按键搜索,将中文转换为英文首字母只搜索首字母,如果首字母是符号，则取前两个字符搜索
            if(text.length >=2 && /[.`|{}\[\]"\-~'!@#$%^&*()-+_=:]/.test(first)){
              text = getFirstLetter(text.substring(0,2))
            }else{
              text = getFirstLetter(text.charAt(0))
            }
          }
          if(matchFunc(text,searchAttrs)){
            resultIdx = i
            break
          }
        }
      }else{
        //从下至上搜索
        if(idx === -1){
          idx = size
        }
        for (let i = idx-1; i >= 0; i--) {
          const itemText = props.searchProvider(i,items[i])
          if(matchFunc(itemText,searchAttrs)){
            resultIdx = i
            break
          }
        }
      }
      searchAttrs.idx = resultIdx
      if(resultIdx === -1){
        if(isKeySearch){
          if(isContinue){
            doSearch(true,true,false)
          }
        }else{
          Toast.warn('无更多关于该关键字的内容！')
        }
      }else{
        jumpRow(resultIdx,true)
      }
    }

    const jumpRow = (row:number,select:boolean)=>{
      const scrollY = row === null ? undefined : row * props.rowHeight - tbody.value.clientHeight / 2

      container.value.style.scrollBehavior = "auto"
      container.value.scrollTo({
        behavior: 'auto',
        top: scrollY
      })
      container.value.style.scrollBehavior = "smooth"
      if(select){
        items.value.forEach((item,idx)=>{
          item._selected = idx === row
        })
        currentRow = row
        selectCount.value = 0
        focus()
      }
    }

    const clickSort = (header:TableHeader)=>{
      if(resizing){
        return
      }
      if(sortKey.value === header.key){
        sortAsc.value = !sortAsc.value
        ctx.emit("update:sortAsc",!props.sortAsc)
      }else{
        sortKey.value = header.key
        sortAsc.value = true
        ctx.emit("update:sortAsc",true)
        ctx.emit("update:sortKey",header.key)
      }
      ctx.emit("sort",sortKey.value,sortAsc.value)
    }

    const clickItem = (evt:MouseEvent,item:any)=>{
      if(evt.shiftKey || evt.metaKey || evt.altKey  || evt.ctrlKey){
        return
      }
      //如果是静态item，则不需要双击，单机直接触发
      if(item._static){
        ctx.emit('clickItem',item, item._idx)
        return;
      }
      currentRow = item._idx
      ctx.emit("selectItem",item,currentRow)
      item._selected = true
      const func = (v)=>{
        if(v != item && v._selected){
          v._selected = false
        }
      }
      //为了避免大列表更新卡顿，将显示区域的item和所有item分开更新
      inViewItems.value.forEach(func)
      nextTick(()=>{
        items.value.forEach(func)
        updateSelectCount()
      })
    }

    const dbClickItem = (evt:MouseEvent,item:any)=>{
      if(evt.shiftKey || evt.metaKey || evt.altKey){
        return
      }
      ctx.emit('clickItem',item, item._idx)
    }

    const getTableClass = ()=>{
      const classes = []
      if(scrolling.value){
        classes.push("scrolling")
      }
      if(props.border){
        classes.push("border")
      }
      return classes;
    }

    const init = ()=>{
      const oldItems = items.value
      // if(props.items != oldItems) {
        props.items.forEach((item, idx) => {
          item._idx = idx
        })
      // }
      items.value = props.items
      rowHeight.value = props.rowHeight
      nextTick(()=>{
        resize()
        if(props.items != oldItems){
          //计算所有可选中的item数量
          selectableTotal = props.items.reduce((val,item)=>{
            if(!item._static){
              return val+1
            }
            return val
          },0)
          updateSelectCount()
          if(sortKey.value!="" && props.items.length > 0){
            ctx.emit("sort",sortKey.value,sortAsc.value)
          }
        }
      })
    }

    watch(()=>props.headers,()=>{
      initHeaderSize()
    })

    watch(()=>[props.headers,props.rowHeight,props.items],(a,b,c)=>{
      init()
    },{deep:true,immediate:true})

    watch(()=>props.items,(v)=>{
      currentRow = 0
      //如果只有一个item自动选中第一个
      if(v.length === 1){
        v[0]._selected = true
      }
    })

    watch(()=>headers.value,(headers)=>{
      ctx.emit("update:headers",headers)
    })

    const focus = ()=>{
      container.value.focus()
    }


    onMounted(()=>{
      initHeaderSize()
      resize()
      updateSelectCount()
    })

    onUnmounted(()=>{
    })

    return {
      //props
      rowHeight,items,headers,
      //el or component
      table,thead,tbody,tableWrapper,container,
      //function
      doSearch,jumpRow,focus,resize,onScroll,initHeaderSize,onDrop,onTrDragstart,onTrDragend,onKeydown,onColMouseDown,onColMouseUp,onTBodyMousedown
      ,getItemClass,contextMenuItem,clickSort,clickItem,dbClickItem,onDragenter,onDragleave,getTableClass,
      //var
      selectCount,searchAttrs,inViewItems,currentContextMenuItem,startIdx,dragging,scrolling,offsetY,totalHeight,sortKey,sortAsc,selectRect
    }
  },
}
</script>

<style lang="scss">
.v-theme--dark{
  .advanced-table-container{
    background: #141414;
    border-left: rgba(255,255,255,0.1) solid 0.5px;
    border-right: rgba(255,255,255,0.1) solid 0.5px;
    .table-wrapper{
      table{
        &.border{
          td{
            border-right: .5px solid rgba(200, 200, 200, .95)
          }
        }
        thead{
          tr{
            background: #141414;
            color: rgba(255,255,255,0.75);
            th{
              border-bottom: rgba(255,255,255,0.1) solid 0.5px;
              &.sort{
                color: rgba(255,255,255,0.65);
              }
              &.asc,&.desc{
                color: rgba(255,255,255,0.8);
              }
            }
          }
        }
        tbody{
          tr{
            &.selected.right-selected{
              td{
                border-top-color: rgba(200, 200, 200, .95);
                border-bottom-color: rgba(200, 200, 200, .95);
                &:first-child{
                  border-left-color: rgba(200, 200, 200, .95);
                }
                &:last-child{
                  border-right-color: rgba(200, 200, 200, .95);
                }
              }
            }
            td{
              background: inherit;
            }
            color: rgba(255,255,255,0.8);
            &.even{
              td{
                background: #28292b;
              }
            }
            &.selected{
              td{
                background: rgba(29, 91, 201, 0.85);
              }
            }
          }
        }
      }
    }
  }
}
.advanced-table-container{
  border-left: #e0e0e0 solid 0.5px;
  border-right: #e0e0e0 solid 0.5px;
  &:focus{
    outline: none;
  }
  overflow-y: auto;
  scroll-behavior: smooth;
  width: 100%;
  height: 100%;
  position: relative;
  .table-wrapper{
    position: sticky;
    top:0;
    table{
      cursor: default;
      user-select: none;
      table-layout: fixed;
      overflow-y: hidden;
      height: 100%;
      min-width: 100%;
      width: 100%;
      border-spacing: 0;
      border-collapse: separate;
      &.border{
        td{
          border-right: .5px solid #e0e0e0
        }
      }
      &.scrolling{
        //pointer-events: none;
        tbody{
          tr{
            transition: none!important;
          }
        }
      }
      thead{
        z-index: 2;
        position: sticky;
        top: 0;
        tr{
          user-select: none;
          background: #ffffff;
          height: 25px;
          th{
            border-bottom: #e0e0e0 solid 0.5px;
            cursor: default;
            padding: 2px 4px;
            position: relative!important;
            font-size: 12px;
            font-weight: normal;
            white-space: nowrap;
            overflow: visible;
            text-overflow: ellipsis;
            text-align: left;
            &:first-child{
              padding-left: 5px;
            }
            &.asc,&.desc{
              font-weight: bold;
              color: #000000;
            }
            &.sort{
              color: rgba(66, 66, 66, 0.9);
              .v-btn{
                //padding: 9px;
                position: absolute;
                right: 8px;
                transition: transform .2s;
                i{
                  font-size: 14px;
                }
              }
              &.asc{
                .v-btn{
                  transform: rotateX(180deg);
                }
              }
              &.desc{
                .v-btn{
                }
              }
            }
            &:last-child{
              & .line{
                right: 0;
              }
            }
            & .line{
              z-index: 2;
              height: 100%;
              width: 11px;
              top: 0;
              left: unset;
              right: -5px;
              position: absolute;
              opacity: 0.3;
              cursor: ew-resize;
              div{
                pointer-events: none;
                background: #949494;
                width: 1px;
                height: 65%;
                margin: 35% auto;
              }
            }
          }
        }
      }
      tbody{
        transition: none!important;
        &.empty{
          display: block;
        }
        &.dragging{
          tr{
            &.selected{
              opacity: 0.5;
            }
          }
        }
        tr{
          transition: .2s background-color,.2s color,.2s transform;
          text-align: center;
          padding: 5px 10px;
          font-size: 12px;
          color: #000000;
          &.even{
            td{
              background: #eff0f0;
            }
          }
          &.selected{
            td{
              background: rgba(35, 102, 217, 0.85);
            }
            color: #ffffff;
          }
          &.indrop{
            opacity: 0.1;
          }
          &.selected.right-selected{
            td{
              border-top: #ffffff double 3px;
              border-bottom: #ffffff double 3px;
              &:first-child{
                border-left: #ffffff double 3px;
              }
              &:last-child{
                border-right: #ffffff double 3px;
              }
            }
          }
          &.right-selected{
            td{
              border-top: #1D5BC9 solid 2px;
              border-bottom: #1D5BC9 solid 2px;
              &:first-child{
                border-radius: 8px 0 0 8px;
                border-left: #1D5BC9 solid 2px;
              }
              &:last-child{
                border-radius: 0 8px 8px 0;
                border-right: #1D5BC9 solid 2px;
              }
            }
          }
          td{
            height: inherit;
            transition: 0.2s linear border-radius,0.2s linear border;
            border-radius: 0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            box-sizing: border-box;
          }
        }

      }
    }
  }
}
</style>