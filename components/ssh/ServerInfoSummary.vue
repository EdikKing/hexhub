<template>
    <div class="net-speed-container">
      <div class="net-speed">
        <span class="tx">↑ {{$fileSizeConvert(info.netTxSpeed)}}</span>
        <span class="rx">↓ {{$fileSizeConvert(info.netRxSpeed)}}</span>
      </div>
    </div>
    <span class="cpu" :style="getCpuUsedRateStyle()">{{info.cpuUsedRate.toFixed(1)}}%</span>
    <span class="memory" :style="getMemUsedRateStyle()">
      {{$fileSizeConvert(info.physMem*1048576,true)}}/{{$fileSizeConvert(info.usedPhysMem*1048576,true)}}
    </span>
</template>

<script lang="ts">
import {PropType, ref} from "#app/compat/capi";
import Rpc from "~/lib/rpc";
import {onMounted, onUnmounted, watch} from "vue";

const TypeServerInfoSummary = "serverInfoSummary"

interface ServerInfoSummary{
  cpuUsedRate: number,
  physMem: number,
  usedPhysMem: number,
  netRxSpeed: number,
  netTxSpeed: number
}

export default {
  name: "ServerInfoWidget",
  props: {
    ready: {
      type: Boolean
    },
    rpc: {
      type: Object as PropType<Rpc>,
    },
  },
  emits: ['update:modelValue'],
  setup(props, ctx) {
    const info = ref<ServerInfoSummary>({
      cpuUsedRate: 0,
      usedPhysMem: 0,
      physMem: 0,
      netRxSpeed: 0,
      netTxSpeed: 0
    });

    let intervalId;

    const getCpuUsedRateStyle = ()=>{
      const value = info.value.cpuUsedRate
      //防止颜色过绿或过红
      const green = Math.max((100 - value - 15)*2.55, 0);
      const red = Math.min((value - 15)*2.55, 255);
      return `background:rgba(${red.toFixed(0)},${green.toFixed(0)},0,0.75)`
    }

    const getMemUsedRateStyle = ()=>{
      const percentage = (info.value.usedPhysMem / info.value.physMem * 100)
      if(isNaN(percentage)){
        return "background: rgba(var(--v-theme-primary),.5);"
      }
      return `background: linear-gradient(90deg, rgb(var(--v-theme-primary)), rgb(var(--v-theme-primary)) ${percentage.toFixed(1)}%, rgba(var(--v-theme-primary),.5) 0);`
    }

    const getInfo = ()=>{
      if(props.ready){
        props.rpc.sendWaitReply(TypeServerInfoSummary).then((res)=>{
          info.value = res.json()
        })
      }
    }

    watch(()=>props.ready,()=>{
      getInfo()
    })

    onMounted(()=>{
      if(!intervalId){
        intervalId = setInterval(getInfo,2000)
      }
    })

    onUnmounted(()=>{
      if(intervalId){
        clearInterval(intervalId);
        intervalId = null
      }
    })

    return {info,getCpuUsedRateStyle,getMemUsedRateStyle}
  }
}
</script>

<style scoped lang="scss">
  .net-speed-container {
    width: 55px;
    display: inline-block;
    .net-speed {
      width: 55px;
      display: flex;
      flex-direction: column;
      transform: scale(0.75) translateY(-2px);
      position: absolute;
      & > span{
        font-weight: bold;
        text-align: center;
        font-size: 12px;
        line-height:14px;
        white-space: nowrap;
      }
      .tx{
        color: rgb(var(--v-theme-success));
      }
      .rx{
        color: rgb(var(--v-theme-warning))
      }
    }
  }
  .cpu {
    opacity: .8;
    transition: background-color ease 1s;
    border-radius: 4px 0 0 4px;
    margin: 4px 0;
    line-height: 16px;
    width: 40px;
    color: rgb(var(--v-theme-on-info));
    text-align: center;
    font-size: 12px;
  }
  .memory {
    opacity: .8;
    transition: background-color ease 1s;
    border-radius: 0 4px 4px 0;
    margin: 4px 0;
    line-height: 16px;
    width: 100px;
    text-align: center;
    color: rgb(var(--v-theme-on-primary));
    font-size: 12px;
  }
</style>