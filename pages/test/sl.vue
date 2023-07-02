<template>
  <div style="width: 450px;margin: 100px auto">
    <client-only>
      <ssh-list></ssh-list>
    </client-only>
  </div>
</template>

<script>
import SshList from "../../components/ssh/SshList";
import SshTunnelEditor from "../../components/ssh/SshTunnelEditor";
export default {
  name: "sl",
  components: {SshTunnelEditor, SshList}
}
</script>

<style scoped>

</style>