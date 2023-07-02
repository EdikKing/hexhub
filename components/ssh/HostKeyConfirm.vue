<template>
  <v-dialog
    v-model="show"
    max-width="470"
    :open-on-focus="false"
    persistent
  >
    <v-card v-drag="'.v-overlay__content'">
      <v-card-title class="text-sm-subtitle-1">
        {{$t("ssh.host-key-confirm-title")}}
      </v-card-title>

      <div>
        <div class="pl-6 pr-6" style="overflow-wrap: normal;word-break: break-all;font-size: 12px;line-height: 25px;letter-spacing: 1px" v-if="info">
          <div><b>HOST: </b>{{info.hostname}}({{info.remote}})</div>
          <div><b>TYPE: </b>{{info.keyType}}</div>
          <div><b>SHA256: </b> {{info.sha256}}</div>
          <div><b>SHA1: </b> {{info.sha1}}</div>
          <div><b>MD5: </b> {{info.md5}}</div>
        </div>
      </div>

      <v-card-actions>
        <v-spacer></v-spacer>

        <v-btn
          color="error"
          @click="reject"
        >
          {{$t("common.reject")}}
        </v-btn>

        <v-btn
          color="primary"
          @click="allow"
        >
          {{$t("common.allow")}}
        </v-btn>

        <v-btn
          color="success"
          @click="allowPersist"
        >
          {{$t("common.allow-and-persist")}}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
export default {
  name: "HostKeyConfirm",
  data: ()=>{
    return{
      promise: null,
      show: false,
      info: null
    }
  },
  promise: null,
  methods: {
    allow: function (){
      if(this.promise!=null) {
        this.promise.resolve(false)
      }
      this.show = false
      this.info = null
    },
    allowPersist: function (){
      if(this.promise!=null) {
        this.promise.resolve(true)
      }
      this.show = false
      this.info = null
    },
    reject: function (){
      if(this.promise!=null) {
        this.promise.reject("reject")
      }
      this.show = false
      this.info = null
    },
    open: function (info){
      this.show = true
      if(this.promise!=null){
        this.promise.reject("cancel")
        this.promise = null
      }
      this.info = info
      return new Promise((resolve,reject)=>{
        this.promise = {resolve,reject}
      })
    }
  }
}
</script>

<style scoped>

</style>
