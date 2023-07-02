<template>
  <div class="fill-height">
    <ftp ref="ftp"></ftp>
  </div>

</template>

<script lang="ts">
import lodash from "lodash";

const AuthTypePassword = 0
const AuthTypePrivateKey = 1

const ConfigTypeSftp = 0
const ConfigTypeFtp = 1
import Ftp from "@/components/ftp/Ftp.vue";
import MovableDividers from "@/components/common/MovableDividers.vue";
export default {
  name: 'FtpPage',
  components: {MovableDividers, Ftp},
  methods: {
    onResize: lodash.debounce(function () {
      this.$refs.ftp.onResize()
    }, 500,{trailing:true,leading:false}),
  },
  mounted() {
    const sshConfig = {
      host:"127.0.0.1",
      port:22,
      user:"root",
      charset: "UTF-8",
      type: ConfigTypeSftp,
      auths: [
        {
          type: AuthTypePassword,
          password: "123456"
        }
      ]
    }
    this.$refs.ftp.open(sshConfig)
  },
  created() {
    if(process.client) {
      window.addEventListener("resize", this.onResize);
    }
  },
  destroyed() {
    if(process.client) {
      window.removeEventListener("resize", this.onResize);
    }
  },
}
</script>

<style></style>