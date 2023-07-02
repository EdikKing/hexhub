<template>
  <client-only>
    <div style="height: 100vh;">
      <mysql-view></mysql-view>
    </div>
  </client-only>
</template>

<script>
import MysqlView from "../components/db/mysql/MysqlView";
export default {
  name: "db",
  components: {MysqlView},
  setup(props,ctx) {

  }
}
</script>

<style scoped>

</style>