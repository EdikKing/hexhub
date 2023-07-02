<template>
<!-- <mysql-real-editor :rpc="rpc"></mysql-real-editor>-->
<!--  <mysql-tables-view :rpc="rpc"></mysql-tables-view>-->
<!--  <mysql-data-table :rpc="rpc"></mysql-data-table>-->
  <mysql-table-struct-editor :rpc="rpc"></mysql-table-struct-editor>
</template>

<script lang="ts">
import {ConnConf,MySQL} from "~/components/db/"
import {PropType} from "#app/compat/capi";
import Rpc from "~/lib/rpc";
import Toast from "~/lib/layer/toast";
import MysqlRealEditor from "~/components/db/mysql/MysqlRealEditor.vue";
import MysqlTablesView from "~/components/db/mysql/MysqlTablesView.vue";

import {ref,shallowRef} from "vue";
import MysqlDataTable from "~/components/db/mysql/MysqlDataTable.vue";
import MysqlTableStructEditor from "~/components/db/mysql/MysqlTableStructEditor.vue";
import { genApiUrl } from "~~/apis/client/base";

const TypeInit = "init"
const TypeError = "error"

export default {
  name: "MysqlView",
  components: {MysqlTableStructEditor, MysqlDataTable, MysqlRealEditor,MysqlTablesView},
  props: {
    conf: {
      type: Object as PropType<ConnConf[]>,
      default: <ConnConf>{
        type:MySQL,
        name: "TEST-MYSQL",
        host: "127.0.0.1",
        user: "root",
        port: 3306,
        password: "12345678"
      },
    }
  },
  setup(props,ctx) {
    const rpc = shallowRef(null)
    let mRpc = new Rpc(genApiUrl("ws","database","mysql"),0)
    mRpc.onopen = ()=>{
      mRpc.sendWaitReply(TypeInit,props.conf).then((res)=>{
        const v = res.json<any>()
        // console.log("res",v)
        rpc.value = mRpc
      }).catch(err=>{
        Toast.error(err.message)
      })
    }
    mRpc.open()
    return {rpc}
  }
}
</script>

<style scoped>

</style>