<template>
  <div v-if="show" class="chip-wrapper" :style="{transform:'translate('+this.x+'px, '+this.y+'px)'}">
    <div class="progress" :style="{width:`${progress}%`}" v-if="progress"></div>
    <v-chip
        class="chip"
        @mouseup="end"
        @touchend="end"
        @mousedown="down"
        @touchstart="down"
        :id="uid"
        color="primary"
        label>
      <span class="pl-2 pr-2">{{title}}</span>
      <div v-tooltip="$t('common.expand')">
        <v-icon @click="close">
          mdi-window-maximize
        </v-icon>
      </div>
    </v-chip>
  </div>
</template>

<script lang="ts">
import lodash from "lodash";
import nanoid from "~/lib/util/nanoid";
const margin = 15;
export default {
  name: "FileUploadChip",
  props: {
    progress: {
      type: [Number,Boolean],
      default: false
    }
  },
  data: ()=>{
    return {
      "uid": null,
      "title": "",
      "show": false,
      "x": 0,
      "y": 0,
      "downX": 0,
      "downY": 0,
      "width": 0,
      "height": 0,
      "drag": false,
    }
  },
  created() {
    this.uid = "c"+nanoid(8)
  },
  destroyed() {
    if(this.drag){
      this.end()
    }
    if(this.show){
      window.removeEventListener("resize",this.onResize)
    }
  },
  mounted() {
    this.y = window.innerHeight - 100
    this.x = 25
  },
  methods:{
    open: function (title){
      if(!this.show){
        window.addEventListener("resize", this.onResize);
      }
      this.show = true
      this.title = title
      lodash.delay(()=>{
        this.init()
      },50)
    },
    close: function (){
      this.show = false
      window.removeEventListener("resize", this.onResize);
      this.$emit("expand")
    },
    init: function (){
      const rect = document.getElementById(this.uid).getBoundingClientRect();
      this.width =  rect.width
      this.height = rect.height
    },
    down: function (event){
      window.addEventListener("mousemove",this.move)
      window.addEventListener("touchmove",this.move)
      this.drag = true;
      this.downX = event.pageX - this.x
      this.downY = event.pageY - this.y
    },
    end: function (event=null){
      if(this.drag){
        window.removeEventListener("mousemove",this.move)
        window.removeEventListener("touchmove",this.move)
      }
      this.drag =false;
    },
    move: function (event) {
      if(this.drag) {
        if (event instanceof MouseEvent) {
          if (!event.which) {
            this.end()
            return
          }
        } else if (event instanceof TouchEvent) {
          event = event.touches[0]
        }
        this.x = event.pageX - this.downX
        this.y = event.pageY - this.downY

        if(this.x <= margin){
          this.x = margin
        }else if(this.x + this.width + margin > document.body.clientWidth){
          this.x = document.body.clientWidth - margin - this.width
        }
        if(this.y <= margin){
          this.y = margin
        }else if(this.y + this.height + margin > document.body.clientHeight){
          this.y = document.body.clientHeight - margin - this.height
        }
      }
    },
    onResize: lodash.throttle(function () {
      if(this.x + this.width + margin > document.body.clientWidth){
        this.x = document.body.clientWidth - margin - this.width
      }
      if(this.y + this.height + margin > document.body.clientHeight){
        this.y = document.body.clientHeight - margin - this.height
      }
    }, 250,{trailing:true,leading:false})
  }
}
</script>

<style lang="scss" scoped>
.chip-wrapper{
  z-index: 100;
  position: fixed;
  left: 0;
  top: 0;
  cursor: pointer;
  user-select: none;
  .progress{
    position: absolute;
    background: rgba(var(--v-theme-primary),var(--v-border-opacity));
    height: 100%;
  }

}

</style>
