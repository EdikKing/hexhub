<template>
  <search
      @findPrevious="doSearch(false)"
      @findNext="doSearch(true)"
      @search="doSearch(true)"
      v-model="searchAttrs.searchStr"
      v-model:show="searchAttrs.show"
      v-model:case-sensitive="searchAttrs.caseSensitive"
      v-model:regex="searchAttrs.regex"
      v-model:whole-word="searchAttrs.wholeWord"
  >
    <div
        :class="getContainerClass()"
        ref="container"
        v-on:mousedown="onMousedown($event,null)"
        v-on:contextmenu.stop="onContextMenuItem($event,null)"
        v-on:keydown="onKeydown"
        v-on:dragenter.stop.prevent
        v-on:dragover.stop.prevent
        v-on:dragleave.stop.prevent
        v-on:drop.stop.prevent
        tabindex="0"
        autofocus
    >
      <div class="layer" :style="{width: containerWidth,height:containerHeight}">
        <div class="rect" v-show="selectRect.show" :style="{left:`${selectRect.x}px`,top:`${selectRect.y}px`,width:`${selectRect.width}px`,height:`${selectRect.height}px`}"></div>
      </div>
      <div v-for="(col,x) in cols" :key="x" class="col">
        <div
            v-for="(row,y) in col"
            :key="y"
            :class="getItemClass(row,x,y)"
            v-on:dblclick="onDBClick($event,row)"
            v-on:contextmenu="onContextMenuItem($event,row)"
            v-on:keydown.enter="$emit('clickItem',row)">
          <div
              v-tooltip="selectRect.downing ? null : { html:true,content: tooltip?.call(null,row), delay:{show: 1500,hide: 500} }"
              draggable="true"
              v-on:dragstart="onDragstart"
              v-on:dragend="onDragend"
              v-on:mousedown="onMousedown($event,row,x,y)"
          >
            <v-icon icon="mdi-table"></v-icon>
            <span>{{row.name}}</span>
          </div>
          <span></span>
        </div>
      </div>
    </div>
  </search>
</template>

<script lang="ts">
import lodash from 'lodash';
import {onMounted, ref, shallowRef, getCurrentInstance, watch, reactive, nextTick} from 'vue'
import {PropType} from "#app/compat/capi";
import Search, {matchFunc} from "~/components/common/Search.vue";
import Toast from "~/lib/layer/toast";
const rowHeight = 25;

interface Table {
  name: string,
  _selected?: boolean
}

export {Table}

export default {
  name: "TablesView",
  components: {Search},
  props: {
    tooltip: {
      type: Function as PropType<(table:Table)=>string|null>
    },
    modelValue: {
      type: Array as PropType<Table[]>,
    },
    singleCol:{
      type: Boolean,
      default: false,
    }
  },
  emits: ["contextMenuItem","clickItem","copy","cut","paste","search","delete",],
  setup(props,ctx) {
    const ins = getCurrentInstance()
    const container = ref<HTMLElement>()
    const cols = shallowRef<any[][]>([])
    let containerRect = <DOMRect>null
    const selectRect = reactive({
      show: false,
      downing: false,
      isClick: false,
      isCtrl: false,
      downX: 0,
      downY: 0,
      width: 0,
      height: 0,
      downPos: {col:0,row:0},
      x:0,
      y:0,
    })
    const selectCount = ref(0)
    const containerWidth = ref("100%")
    const containerHeight = ref("100%")
    const dragging = ref(false)
    const currentContextMenuItem = ref({})
    let colWidths = <number[]>null
    let firstSelectedIdx = 0
    let lastSelectedIdx = 0
    let maxRows = 0
    //搜索属性
    const searchAttrs = reactive({
      show: false,
      searchStr: "",
      caseSensitive: false,
      wholeWord: false,
      regex: false,
      idx: -1,
    })

    onMounted(()=>{
      updateView()
      updateSelectCount()
    })
    watch(()=>props.modelValue,()=>{
      updateView()
      updateSelectCount()
    })

    const clearContextMenuItem = ()=>{
      currentContextMenuItem.value = null
    }

    const updateSelectCount = lodash.debounce(()=>{
      let count = 0
      for (const table of props.modelValue) {
        if(table._selected){
          count ++
        }
      }
      selectCount.value = count
    }, 200)

    const updateView = ()=>{
      const arr = props.modelValue
      if(props.singleCol){
        cols.value = [arr]
      }else{
        maxRows = Math.floor(container.value.clientHeight / rowHeight)
        let end = 0
        const newCols= []
        for (let begin = 0; begin < arr.length; begin = end) {
          end = end + maxRows
          newCols.push(arr.slice(begin,end))
        }
        cols.value = newCols
      }
      //计算每一列的宽度,延迟1s等待所有图标的文字加载完毕
      lodash.delay(()=>{
        if(!container.value){
          return
        }
        const cols = container.value.querySelectorAll(".col")
        colWidths = new Array(cols.length)
        for (let i = 0; i < cols.length; i++) {
          colWidths[i] = cols.item(i).clientWidth
        }
        containerWidth.value = container.value.scrollWidth+"px"
        containerHeight.value = container.value.scrollHeight+"px"

      },1000)
    }

    const doSearch = (isNext:boolean)=>{
      let resultIdx = -1
      let idx = searchAttrs.idx
      const modelValue = props.modelValue
      const size = modelValue.length
      if(isNext){
        //从上至下搜索
        for (let i = idx+1; i < size; i++) {
          if(matchFunc(modelValue[i].name,searchAttrs)){
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
          if(matchFunc(modelValue[i].name,searchAttrs)){
            resultIdx = i
            break
          }
        }
      }
      searchAttrs.idx = resultIdx
      if(resultIdx === -1){
        Toast.warn('无更多关于该关键字的内容！')
      }else{
        singleChoice(Math.floor(resultIdx/maxRows),resultIdx%maxRows,false,true)
      }
    }

    const getItemClass = (item:any,col:number,row:number)=>{
      const classes = ["row",`item-${col*maxRows+row}`]
      if(item._selected){
        classes.push("selected")
      }
      if(item === currentContextMenuItem.value){
        classes.push("right-selected")
      }
      return classes;
    }

    const onDBClick = (evt:MouseEvent,item:any)=>{
      ctx.emit("clickItem",item)
    }

    const onMousedown = (evt:MouseEvent,item?:any,col?:number,row?:number)=>{
      focus()
      //非左键点击排除
      if(evt.button !== 0){
        return;
      }
      evt.stopPropagation()
      // evt.preventDefault()
      if(selectRect.show || colWidths == null){
        return
      }
      selectRect.downing = true
      clearContextMenuItem()
      if(item === null || evt.ctrlKey || evt.metaKey){
        //如果点击空白处或者点击时按下了ctrl和mac的option键则触发范围多选
        containerRect = container.value.getBoundingClientRect()
        selectRect.downX = evt.clientX - containerRect.x + container.value.scrollLeft
        selectRect.downY = evt.clientY - containerRect.y + container.value.scrollTop
        //防止拖动边缘滚动条时触发事件
        if(container.value.scrollWidth - selectRect.downX <= 10 || container.value.scrollHeight - selectRect.downY <= 10){
          return;
        }
        selectRect.isCtrl = evt.ctrlKey || evt.metaKey
        selectRect.show = true
        selectRect.isClick = true
        selectRect.x = selectRect.downX
        selectRect.y = selectRect.downY
        selectRect.width = 0
        selectRect.height = 0
        selectRect.downPos = getItemByPos(selectRect.x,selectRect.y,true)
        document.addEventListener("mousemove",onAreaSelectMousemove)
        document.addEventListener("mouseup",onAreaSelectMouseup)
      }else if(evt.shiftKey){
        //shift连续多选
        //计算选择的一个元素和最后一个元素
        containerRect = container.value.getBoundingClientRect()
        firstSelectedIdx = -1
        lastSelectedIdx = 0
        props.modelValue.forEach((item,idx)=>{
          if(item._selected){
            if(firstSelectedIdx === -1) {
              firstSelectedIdx = idx
            }
            lastSelectedIdx = idx
          }
        })
        updateSelectCount()
        //如果没有选择的元素，则将第一个元素默认为选择起始下标
        firstSelectedIdx = Math.max(0,firstSelectedIdx)
        document.addEventListener("mousemove",onContinueSelectMousemove)
        document.addEventListener("mouseup",onContinueSelectMouseup)
        //点击时直接触发一次移动，以便点击时马上更新选中item
        onContinueSelectMousemove(evt)
      }else if(item!=null){
        //单选
        //如果item已选择则忽略，未选中则单选此item
        if(!item._selected){
          for (const v of props.modelValue) {
            v._selected = v == item
          }
          selectRect.downPos = {col,row}
          selectCount.value = 1
          selectRect.downing = false
        }
      }
    }

    const onContinueSelectMousemove = lodash.throttle((evt:MouseEvent)=>{
      evt.stopPropagation()
      evt.preventDefault()
      const moveX = evt.clientX - containerRect.x + container.value.scrollLeft
      const moveY = evt.clientY - containerRect.y + container.value.scrollTop
      const movePos = getItemByPos(moveX,moveY,true)
      const moveIdx = getItemByIdx(movePos)
      if(moveIdx <= lastSelectedIdx){
        //如果点击的item下标小于等于最后一个已选择item，则全选点击item至最后一个已选择item范围内的所有
        props.modelValue.forEach((item,idx)=>{
          item._selected = idx >= moveIdx && idx <= lastSelectedIdx
        })
      }else{
        //否则全选第一个已选择item至点击下标范围的所有item
        props.modelValue.forEach((item,idx)=>{
          item._selected = idx >= firstSelectedIdx && idx <= moveIdx
        })
      }
      updateSelectCount()
      selectingAutoScroll(evt)
    },100)

    const onContinueSelectMouseup= (evt:MouseEvent)=>{
      selectRect.downing = false
      document.removeEventListener("mousemove",onContinueSelectMousemove)
      document.removeEventListener("mouseup",onContinueSelectMouseup)
    }

    const onAreaSelectMousemove = lodash.throttle((evt:MouseEvent)=>{
      const moveX = evt.clientX - containerRect.x + container.value.scrollLeft
      const moveY = evt.clientY - containerRect.y + container.value.scrollTop

      const dx = Math.abs(selectRect.downX - moveX);
      const dy = Math.abs(selectRect.downY - moveY);
      const dis = Math.sqrt(Math.pow(dx,2)+Math.pow(dy,2));
      //如果移动距离过小则不触发，避免点击时误触
      if(dis <= 5){
        return
      }else if(selectRect.isClick){
        //拖动距离大于5，则为非点击模式（范围选择模式）
        selectRect.isClick = false
      }
      selectRect.x = Math.min(moveX,selectRect.downX)
      selectRect.y = Math.min(moveY,selectRect.downY)
      selectRect.width = Math.abs(moveX-selectRect.downX)
      selectRect.height = Math.abs(moveY-selectRect.downY)
      const downPos = selectRect.downPos
      const movePos = getItemByPos(moveX,moveY,false)
      const beginX = Math.min(downPos.col,movePos.col)
      const endX = Math.max(downPos.col,movePos.col)
      const beginY = Math.min(downPos.row,movePos.row)
      const endY = Math.max(downPos.row,movePos.row)
      cols.value.forEach((col,x)=>{
        col.forEach((row,y)=>{
          row._selected = x>=beginX && x <= endX && y>=beginY && y <= endY
        })
      })
      updateSelectCount()
      selectingAutoScroll(evt)
    },100)

    const onAreaSelectMouseup= (evt:MouseEvent)=>{
      selectRect.downing = false
      if(selectRect.show){
        document.removeEventListener("mousemove",onAreaSelectMousemove)
        document.removeEventListener("mouseup",onAreaSelectMouseup)
        selectRect.show = false
        //点击模式
        if(selectRect.isClick){
          const x = evt.clientX - containerRect.x + container.value.scrollLeft
          const y = evt.clientY - containerRect.y + container.value.scrollTop
          const clickPos = getItemByPos(x,y,true)
          if(selectRect.isCtrl){
            //反选
            const item = cols.value[clickPos.col][clickPos.row]
            item._selected = !item._selected
            updateSelectCount()
          }else{
            //单选
            singleChoice(clickPos.col,clickPos.row)
          }

        }
      }else{
        //
      }
    }

    const onContextMenuItem = (evt:MouseEvent,item?:any)=>{
      //设置当前右键对应的item
      if(item !== null){
        //右键增加右键选中效果
        currentContextMenuItem.value = item
        //如果右键的是非选中的item，那么清空其他选择项，只选择当前项
        if(!item._selected){
          props.modelValue.forEach(v=>{
            v._selected = v == item
          })
          selectCount.value = 1
        }
      }
      ctx.emit("contextMenuItem",evt,getSelectedItems())
    }

    const onKeydown = (evt:KeyboardEvent)=>{
      if(evt.ctrlKey || evt.metaKey){
        switch (evt.key.toLowerCase()){
          case "a":
            //全选与取消权限,全部选中则反选，否则全选
            const selected = getSelectedItems()
            if(selected.length !== props.modelValue.length){
              props.modelValue.forEach(item=>{
                item._selected = true
              })
              selectCount.value = props.modelValue.length
            }else{
              selected.forEach((item)=>{
                item._selected = false
              })
              selectCount.value = 0
            }
            evt.stopPropagation()
            evt.preventDefault()
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
            ctx.emit("search",getSelectedItems())
            break
          case "backspace":
            //删除
            ctx.emit("delete",getSelectedItems())
            break
          case "delete":
            //删除
            ctx.emit("delete",getSelectedItems())
            break
          default:
            return;
        }
      }else{
        //箭头按键上下滚动
        if(evt.key === "ArrowUp" || evt.key === "ArrowDown" || evt.key === "Tab"){
          //计算上次点击的元素下标
          let idx = selectRect.downPos.col * maxRows + selectRect.downPos.row
          //Up往上-1，Down往下+1
          idx = evt.key === "ArrowUp" || evt.shiftKey ? idx - 1 : idx + 1
          //越界退出，并且不拦截事件
          if(idx < 0 || idx >= props.modelValue.length){
            return;
          }
          singleChoice(Math.floor(idx/maxRows),idx % maxRows,false,true)
          evt.stopPropagation()
          evt.preventDefault()
        }else if(evt.key === "ArrowLeft" || evt.key === "ArrowRight"){
          //获取上次点击的列坐标
          let col = selectRect.downPos.col
          //Left往左-1，Right往右+1
          col = evt.key === "ArrowLeft" ? col - 1 : col + 1
          //防止越界
          col = Math.max(0,col)
          col = Math.min(col, cols.value.length-1)
          //判断是否超出该列的最大行数，如果超出则重置为该列最后一行
          const row = Math.min(cols.value[col].length-1,selectRect.downPos.row)
          singleChoice(col,row,false,true)
          evt.stopPropagation()
          evt.preventDefault()
        }
      }
    }

    const focus = ()=>{
      container.value.focus()
    }

    const singleChoice = (col:number,row:number,focus=true,scroll=true)=>{
      selectRect.downPos.row = row
      selectRect.downPos.col = col
      const el = <HTMLElement>ins.proxy.$el
      //计算该行该列的对应元素下标
      const idx = col * maxRows + row
      if(focus || scroll){
        const itemEl = <HTMLElement>el.querySelector(`.col .item-${idx}`)
        if(itemEl){
          if(focus){
            itemEl.focus({preventScroll:true})
          }
          if(scroll){
            itemEl.scrollIntoView()
          }
        }
      }
      props.modelValue.forEach((item,i)=>{
        if(idx === i){
          item._selected = true
        }else if(item._selected){
          item._selected = false
        }
      })
      selectCount.value = 1
    }

    const onDragstart = (evt: DragEvent) => {
      const dataTransfer = evt.dataTransfer
      dragging.value = true
      // dataTransfer.setData("hexhub/table-group", props.group)
      // dataTransfer.setData("hexhub/table-id", props.id)
      // dataTransfer.setData("hexhub/table-items", JSON.stringify(getSelectedItems()))
    }

    const onDragend = (evt:DragEvent)=>{
      dragging.value = false
    }

    const getContainerClass = ()=>{
      const classes = ["table-view-container"]
      if(props.singleCol){
        classes.push("single-col")
      }
      if(dragging.value){
        classes.push("dragging")
      }
      return classes
    }

    const selectingAutoScroll = (evt:MouseEvent)=>{
      //container视界范围
      //垂直
      const verticalBegin = containerRect.top
      const verticalEnd = containerRect.top + containerRect.height
      //水平
      const horizonBegin = containerRect.left
      const horizonEnd = containerRect.left + containerRect.width

      let scrollTopOffset = 0
      let scrollLeftOffset = 0

      //如果移动超过视界范围则移动垂直滚动条
      if(evt.clientY < verticalBegin){
        //鼠标移动出上方，滚动条往上移动
        scrollTopOffset = - (verticalBegin - evt.clientY)
      }else if(evt.clientY > verticalEnd){
        //鼠标移动出下方，滚动条往下移动
        scrollTopOffset = (evt.clientY - verticalEnd)
      }

      //如果移动超过视界范围则移动水平滚动条
      if(evt.clientX < horizonBegin){
        //鼠标移动出上方，滚动条往上移动
        scrollLeftOffset = - (horizonBegin - evt.clientX)
      }else if(evt.clientX > horizonEnd){
        //鼠标移动出下方，滚动条往下移动
        scrollLeftOffset = (evt.clientX - horizonEnd)
      }
      if(scrollLeftOffset!=0||scrollTopOffset!=0){
        container.value.scrollTo({
          behavior: 'smooth',
          top: props.singleCol ? (container.value.scrollTop + scrollTopOffset) : 0,
          left: container.value.scrollLeft +scrollLeftOffset
        })
      }
    }

    const getItemByPos = (x:number,y:number,strict:boolean):{col:number,row:number}=>{
      const colRow = {col:0,row:0}
      if(x>0 && colWidths.length > 1){
        let currentWidth = 0
        let nextWidth = 0
        colRow.col = colWidths.length - 1
        for (let i = 0; i < colWidths.length-1; i++) {
          nextWidth = currentWidth+colWidths[i]
          if(x>=currentWidth && x < nextWidth){
            colRow.col = i
            break
          }
          currentWidth = nextWidth
        }
      }
      const colItems = cols.value[colRow.col]
      if(y>0 && colItems.length > 1){
        //只在严格模式，自动限制行边界
        if(strict){
          colRow.row = Math.min(colItems.length-1,Math.floor(y/rowHeight))
        }else{
          colRow.row = Math.floor(y/rowHeight)
        }
      }
      return colRow
    }

    const getItemByIdx = (colRow:{col:number,row:number}):number=>{
      let idx = 0
      for (let x = 0; x <= colRow.col; x++) {
        if(x === colRow.col){
          idx += colRow.row
        }else{
          idx += cols.value[x].length
        }
      }
      return idx
    }

    const getSelectedItems = ():any[]=>{
      return props.modelValue.filter(item=>item._selected)
    }

    return {container,cols,selectCount,selectRect,containerWidth,containerHeight,dragging,searchAttrs,doSearch,singleChoice,updateView,getContainerClass,getItemClass,onDragend,onDragstart,onMousedown,onContextMenuItem,onDBClick,onKeydown,clearContextMenuItem}
  }
}
</script>

<style lang="scss" scoped>
.v-theme--dark{
  .table-view-container {
    .layer {
      .rect {
        border-color: rgb(255, 142, 142);
      }
    }
    .col{
      .row{
        &.selected{
          background: rgba(29, 91, 201, 0.85);
          color: rgba(255, 255, 255, 0.9);
        }
        &.selected.right-selected{
          border-color: rgba(255, 255, 255, 0.9)
        }
        &.right-selected{
          border-color: rgba(29, 91, 201, 0.85);
        }
      }
    }
  }
}
.dragging{
  .selected{
    opacity: 0.5;
  }
}
.table-view-container{
  user-select: none;
  font-size: 12px;
  height: 100%;
  width: 100%;
  display: flex;
  position: relative;
  overflow-x: auto;
  overflow-y: hidden;
  &:focus{
    outline: none;
  }
  &.single-col{
    overflow-x: hidden;
    overflow-y: auto;
  }
  .layer{
    pointer-events: none;
    position: absolute;
    width: 100%;
    height: 100%;
    overflow: hidden;
    .rect{
      position: absolute;
      border: dashed 1px rgb(196, 77, 77);
    }
  }
  .col{
    .row{
      transition: unset!important;
      height: 25px;
      display: flex;
      &:focus{
        outline: none;
      }
      & > div{
        display: flex;
        align-items: center;
        height: 100%;
        padding: 1px 5px 1px 1px;
        flex: 0;
      }
      & > span{
        flex: 1;
      }
      &.selected{
        & > div{
          background: rgba(35, 102, 217, 0.85);
          color: #ffffff;
        }
      }
      &.selected.right-selected{
        & > div{
          border: #ffffff dotted 1px;
        }
      }
      &.right-selected{
        & > div{
          border: #1D5BC9 solid 1px;
          padding: 0 4px 0 0;
        }
      }
    }
  }
}

</style>