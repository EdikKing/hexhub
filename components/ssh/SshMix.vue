<template>
  <movable-dividers
      v-show="modelValue"
      ref="dividers"
      style="flex-grow: 1;height: auto"
      :show-single="showSftp?null:'first'"
      :realTimeDrag="true"
      :vertical="true"
      :min-size="25"
      :divider-size="10"
      :init-data="{slot:'last',size: 'max(400px,55%)'}"
      @end="onMoveEnd">
    <template v-slot:first>
      <ssh-terminal
          ref="term"
          :bell="bell"
          @update:rpc="$emit('update:sshRpc',$event)"
          @onChangePath="onChangePath"
          @onConnected="onSshConnected"
          @onDisconnect="onSshDisconnect"
          @onNewTerminal="newTerminalWindow"
          @onZModemReceive="$event.setSaveDir(ftp?.local?.path)"
          @closeWindow="$emit('closeWindow')"
          :listenPath="showSftp && syncTermPath">
      </ssh-terminal>
    </template>
    <template v-slot:last>
      <ftp
          ref="ftp"
          @update:rpc="$emit('update:sftpRpc',$event)"
          :show-single="ftpOnlyShowRemote?'last':undefined"
          @onConnectPreCheck="onSftpConnectPreCheck"
          dense>
      </ftp>
    </template>
  </movable-dividers>
</template>

<script lang="ts">
import Ftp from "~/components/ftp/Ftp.vue";
import SshTerminal from "~/components/ssh/SshTerminal.vue";
import MovableDividers from "~/components/common/MovableDividers.vue";
import {nextTick, onMounted, onUnmounted, reactive, watch,ref} from "vue";
import lodash from "lodash";

export default {
  name: 'SshMix',
  components: {MovableDividers, SshTerminal,Ftp},
  props: {
    modelValue: {
      type: Boolean,
      default: false
    },
    confId: {
      type: String,
      required: true
    },
    showSftp: {
      type: Boolean,
      default: true
    },
    ftpOnlyShowRemote: {
      type: Boolean,
      default: false
    },
    syncTermPath: {
      type: Boolean,
      default: false
    },
    bell:{
      type: Boolean,
      default: false
    }
  },
  emits: ["update:modelValue","update:sshRpc","update:sftpRpc","onSshConnected","onSshDisconnect","onNewTerminal","closeWindow"],
  setup(props,ctx){
    const isLoadFtp = ref(false)

    const ftp = ref()
    const term = ref()
    const dividers = ref()
    let connected = false

    const onSshConnected = (evt)=>{
      loadFtp(evt,true);
      ctx.emit('onSshConnected')
      connected = true
    }

    const onSshDisconnect = ()=>{
      ctx.emit('onSshDisconnect')
      connected = false
    }

    const onMoveEnd = ()=>{
      nextTick(()=>{
        term.value.onResize()
        ftp.value.onResize()
      })
    };

    const newTerminalWindow = (item)=>{
      ctx.emit("onNewTerminal",item)
    };

    const onChangePath = (path)=>{
      if(props.showSftp){
        ftp.value.cdRemote(path)
      }
    };

    const resize = ()=>{
      dividers.value.onResize()
    };

    const onResize = ()=>{
      if(props.modelValue){
        resize()
      }
    }

    const loadFtp = (sshConnId:string,force=false)=>{
      if(!isLoadFtp.value || force) {
        if (props.showSftp) {
          nextTick(() => ftp.value.openBySsh(sshConnId))
          isLoadFtp.value = true
        }
      }
    };

    const onSftpConnectPreCheck = (cancelFunc:()=>void)=>{
      if(!connected){
        //如果父级ssh连接是关闭了，子sftp连接肯定用不了，直接重连ssh连接即可
        cancelFunc()
        term.value?.reconnection()
      }
    }

    watch(()=>props.confId,(id)=>{
      if(id){
        lodash.delay(()=>{
          term.value.openByConfId(id)
        },100)
      }
    },{immediate: true})

    watch(()=>props.modelValue,(v)=>{
      if(v){
        nextTick(resize)
      }
    })

    onMounted(()=>{
      window.addEventListener("resize",onResize)
    })

    onUnmounted(()=>{
      window.removeEventListener("resize",onResize)
    })


    return {
      ftp,term,dividers,isLoadFtp,
      newTerminalWindow,onChangePath,resize,onMoveEnd,loadFtp,onSftpConnectPreCheck,onSshConnected,onSshDisconnect
    }
  },
}
</script>

<style lang="scss">
</style>