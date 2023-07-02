<template>
  <v-dialog
    v-model="show"
    max-width="300">
    <v-card v-drag="'.v-overlay__content'">
      <v-card-title class="headline">{{$t('ftp.chmod')}}</v-card-title>
      <v-card-text class="pt-0 pb-0">
        <div class="sub-title">{{$t('common.user')}}</div>
        <v-divider></v-divider>
        <div class="chmod-row">
          <v-checkbox
            @change="update"
            :label="$t('ftp.read')"
            v-model="perms[0].r"
            color="info"
            hide-details
          ></v-checkbox>
          <v-checkbox
            @change="update"
            :label="$t('ftp.write')"
            v-model="perms[0].w"
            color="warning"
            hide-details
          ></v-checkbox>
          <v-checkbox
            @change="update"
            :label="$t('ftp.execute')"
            v-model="perms[0].x"
            color="error"
            hide-details
          ></v-checkbox>
        </div>

        <div class="sub-title">{{$t('common.group')}}</div>
        <v-divider></v-divider>
        <div class="chmod-row">
          <v-checkbox
            @change="update"
            :label="$t('ftp.read')"
            v-model="perms[1].r"
            color="info"
            hide-details
          ></v-checkbox>
          <v-checkbox
            @change="update"
            :label="$t('ftp.write')"
            v-model="perms[1].w"
            color="warning"
            hide-details
          ></v-checkbox>
          <v-checkbox
            @change="update"
            :label="$t('ftp.execute')"
            v-model="perms[1].x"
            color="error"
            hide-details
          ></v-checkbox>
        </div>

        <div class="sub-title">{{$t('common.anyone')}}</div>
        <v-divider></v-divider>
        <div class="chmod-row">
          <v-checkbox
            @change="update"
            :label="$t('ftp.read')"
            v-model="perms[2].r"
            color="info"
            hide-details
          ></v-checkbox>
          <v-checkbox
            @change="update"
            :label="$t('ftp.write')"
            v-model="perms[2].w"
            color="warning"
            hide-details
          ></v-checkbox>
          <v-checkbox
            @change="update"
            :label="$t('ftp.execute')"
            v-model="perms[2].x"
            color="error"
            hide-details
          ></v-checkbox>
        </div>

        <div class="sub-title">{{$t('common.operate')}}</div>
        <v-divider></v-divider>
        <div style="font-size: 10px;padding-top: 5px;text-align: left">{{
            $t('ftp.perm-full-text', {
              'mode': mode,
              'text': text
            })
          }}</div>
        <div class="switch-wrapper">
          <v-switch
              v-model="quick"
              :disabled="disabledQuick"
              density="compact"
              :label="$t('file.quick')"
              color="primary"
              hide-spin-buttons
              hide-details
          ></v-switch>
          <v-switch
              v-model="recursive"
              :disabled="!isDir"
              density="compact"
              color="primary"
              :label="recursive?$t('ftp.chmod-type-1'):$t('ftp.chmod-type-0')"
              hide-spin-buttons
              hide-details
          ></v-switch>
        </div>

      </v-card-text>

      <v-card-actions class="pt-0">
        <v-spacer></v-spacer>
        <v-btn
          color="error"
          text
          @click="show = false"
        >
          {{$t('common.close')}}
        </v-btn>

        <v-btn
          color="info"
          text
          @click="sure"
        >
          {{$t('common.sure')}}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
interface ChmodResult {
  mode:number,
  isRecursive:boolean,
  isQuick:boolean
}

export {ChmodResult}

export default {
  name: "FileChmod",
  promiseExecutor: null,
  data: ()=>{
    return {
      "promiseExecutor": null,
      "recursive": false,
      "disabledQuick": false,
      "quick": false,
      "show": false,
      "mode": "",
      "text": "",
      "isDir": false,
      "firstChar":"",
      "perms":[
        {
          "w":false,
          "r":false,
          "x":false,
        },
        {
          "w":false,
          "r":false,
          "x":false,
        },
        {
          "w":false,
          "r":false,
          "x":false,
        },
      ],
    }
  },
  watch: {
    show: function (show){
      if(!show && this.promiseExecutor != null){
        this.promiseExecutor.reject("cancel")
        this.promiseExecutor = null
      }
    }
  },
  methods:{
    open: function (str:string,isDir:boolean,disabledQuick=false):Promise<ChmodResult>{
      if(this.promiseExecutor != null){
        this.promiseExecutor.reject("cancel")
        this.promiseExecutor = null
      }
      this.show = true
      this.isDir = isDir
      this.disabledQuick = disabledQuick
      this.quick = !disabledQuick
      let mode = 0
      this.text = str
      //文件mode字符串解析，固定为10位第一位为文件类型剩余9位分别为:用户(读R,写W,执行X),组(读R,写W,执行X),其他(读R,写W,执行X)
      //其中每个分类占3个bit，每个分类下读写执行分别占一个bit，3*3一共9个bit，bit标志位顺序为(用户读，用户写，用户执行，组读，组写，组执行，其他读，其他写，其他执行)
      this.firstChar = str.charAt(0)
      if(str.length >= 10){
        for (let i = 1; i < 10; i++) {
          const temp = i-1
          const type = Math.floor( temp/3)
          if (temp % 3 == 0){
            this.perms[type] = {r:false,w:false,x:false}
          }
          let typeMode = 0
          let char = str.charAt(i)
          switch (char) {
            case "r":
              this.perms[type].r = true
              typeMode = typeMode | 0b100
              break
            case "w":
              this.perms[type].w = true
              typeMode = typeMode | 0b010
              break
            case "x":
              this.perms[type].x = true
              typeMode = typeMode | 0b001
              break
          }
          const digit = (2-type) * 3
          mode = mode | (typeMode << digit)
        }
      }
      let modeStr = mode.toString(8)
      if(modeStr.length < 3){
        modeStr = "0".repeat(3-modeStr.length) + modeStr
      }
      this.mode = modeStr
      return new Promise<ChmodResult>((resolve, reject)=>{
        this.promiseExecutor = {
          resolve,reject
        }
      })
    },
    sure: function (){
      const result = {mode:this.mode,isRecursive:this.recursive,isQuick:this.quick}
      this.$emit("onChange",result)
      if(this.promiseExecutor!=null){
        this.promiseExecutor.resolve(result)
        this.promiseExecutor = null
      }
      this.show = false
    },
    update: function (){
      this.$nextTick(()=>{
        let str = this.firstChar
        let mode = 0
        this.perms.forEach((perm,idx)=>{
          let typeMode = 0
          if(perm.r){
            str = str + "r"
            typeMode = typeMode | 0b100
          }else{
            str = str + "-"
          }
          if(perm.w){
            str = str + "w"
            typeMode = typeMode | 0b010
          }else{
            str = str + "-"
          }
          if(perm.x){
            str = str + "x"
            typeMode = typeMode | 0b001
          }else{
            str = str + "-"
          }
          const digit = (2-idx) * 3
          mode = mode | (typeMode << digit)
        })
        let modeStr = mode.toString(8)
        if(modeStr.length < 3){
          modeStr = "0".repeat(3-modeStr.length) + modeStr
        }
        this.mode = modeStr
        this.text = str
      })
    }
  }
}
</script>

<style lang="scss">
  .switch-wrapper{
    position: relative;
    height: 40px;
    width: 100%;
    .v-switch{
      position: absolute;
      .v-input__control{
        display: block;
      }
      &:first-child{
        transform: scale(0.8) translateX(-10%);
        left: 0;
      }
      &:last-child{
        transform: scale(0.8) translateX(10%);
        right: 0;
        .v-selection-control{
          flex-direction: row-reverse;
          .v-selection-control__wrapper{
            transform: rotatey(180deg);
          }
          .v-label{
            padding-inline-start: 0;
            padding-inline-end: 10px;
          }
        }
      }
    }
  }
  .v-dialog{
    .v-card__text{
      padding-bottom: 0!important;
    }
  }
  .chmod-row{
    transform: translateX(10px);
    display: flex;
    justify-content: space-between;
    align-content: center;
  }
  .sub-title{
    font-size: 12px;
    line-height: 30px;
  }
</style>
