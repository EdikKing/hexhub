import MovableDividers from "~/components/common/MovableDividers.vue";
import {ref,defineComponent} from "vue";
import {PropType} from "#app/compat/capi";

export class ParallelViewItem{
  mode: "single"|"vertical"|"horizontal"
  first: ParallelViewItem | any
  last: ParallelViewItem | any

  constructor(mode: "single"|"vertical"|"horizontal",first: ParallelViewItem | any,last: ParallelViewItem | any){
    this.mode = mode
    this.first = first
    this.last = last
  }
}

const modeBinds = Object.freeze({
  "single": {
    dividerSize: 1,
    realTimeDrag: false,
    vertical: false,
    showSingle: "first",
  },
  "vertical": {
    dividerSize: 1,
    realTimeDrag: false,
    vertical: true,
    showSingle: null,
  },
  "horizontal": {
    dividerSize: 1,
    realTimeDrag: false,
    vertical: false,
    showSingle: null,
  }
})

import './ParallelView.module.scss'

export default defineComponent({

  render: function (){
    const virtualViewData = ref({
      show: false,
      mode: "left"
  })
    const root = ref<HTMLElement>()
    let rootRect:DOMRect;

    const onDragenter = (evt:DragEvent)=>{
      const relatedTarget = evt.relatedTarget
        if(relatedTarget?.parentElement=== null || (evt.currentTarget).contains(relatedTarget) || virtualViewData.value.show){
          return
        }

          rootRect = root.value.getBoundingClientRect()
          virtualViewData.value.show = true
          }

    return <div class="parallel-view" >
      <div class="virtual-view {virtualViewData.mode}">aa</div>
    </div>
  }
})