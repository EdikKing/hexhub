<template>
  <div class="server-info">
    <v-navigation-drawer
      :width="450"
      :model-value="modelValue"
      @update:modelValue="$emit('update:modelValue',$event)"
      temporary
      hide-overlay
      disable-resize-watch
      stateless
      permanent
      location="right"
    >
      <div class="loading-container" v-show="loadings.loading&&!error">
        <v-progress-circular
          size="50"
          indeterminate
        ></v-progress-circular>
      </div>
      <div style="position: relative">
        <div class="close-btn">
          <v-btn variant="text" density="comfortable" size="small" icon="mdi-close" @click="$emit('update:modelValue',false)"></v-btn>
        </div>
      </div>
      <div class="fill-height overflow-hidden">
        <div style="height: 80px">
          <v-card-title>
            {{$t('ssh.widget.title')}}
          </v-card-title>
          <v-card-subtitle>
            {{$t('ssh.widget.subtitle')}}
          </v-card-subtitle>
        </div>
        <v-divider></v-divider>
        <div style="height: calc(100% - 80px);overflow-y: auto;overflow-x: hidden;">
          <div class="pa-10 alert-container" v-if="error!=null">
            <v-card class="mx-auto" width="350px" variant="tonal" :rounded="4">
              <v-list-item three-line height="120px">
                <template v-slot:default>
                  <v-list-item-title class="headline" style="color:rgb(var(--v-theme-error))">
                    ERROR
                  </v-list-item-title>
                  <div class="overline" >{{$t('ssh.widget.error')}}</div>
                  <h6>{{error}}</h6>
                </template>

                <template v-slot:prepend>
                  <v-avatar size="65" color="error">
                    <v-icon size="large">mdi-alert</v-icon>
                  </v-avatar>
                </template>
              </v-list-item>
              <v-divider class="ml-2 mr-2"></v-divider>
              <v-card-actions>
                <v-row class="pa-3" justify="end">
                  <v-btn variant="text" color="warning" @click="close">{{$t("common.close")}}</v-btn>
                  <v-btn variant="text" color="error" :loading="loadings.loading" @click="getServerInfo" >{{$t("common.retry")}}</v-btn>
                </v-row>
              </v-card-actions>
            </v-card>
          </div>

          <div class="pa-4 pt-0" v-else>
            <v-card
              variant="flat"
              elevation="4"
              class="info-card overflow-hidden"
            >
              <div class="text-overline pl-4 pt-1">
                {{$t('ssh.widget.top-title')}}
              </div>
              <v-divider></v-divider>
              <v-card-text>
                <v-row justify="space-evenly" class="ma-0">
                  <span>{{$t('ssh.widget.address')}}: {{info.address}}</span>
                  <span v-if="info.top">{{$t('ssh.widget.loads')}}: {{info.top.cpuOneMUsedRate.toFixed(2)}},{{info.top.cpuFiveMUsedRate.toFixed(2)}},{{info.top.cpuFifteenMUsedRate.toFixed(2)}}</span>
                  <span>User: {{info.user}}</span>
                </v-row>
                <v-divider class="mt-2 mb-2"></v-divider>
                <div v-if="info.top">
                  <v-row justify="space-evenly"  class="ma-0">
                    <span>{{$t('ssh.widget.runtime')}}: {{info.top.runTime}}</span>
                    <span>{{$t('ssh.widget.cpu-rate')}}: {{(info.top.cpuUsedRate).toFixed(1)}}%</span>
                    <span>{{$t('ssh.widget.users')}}: {{info.top.users}}</span>
                  </v-row>
                  <v-divider class="mt-2 mb-2"></v-divider>
                  <v-row justify="space-evenly" class="ma-0">
                    <span>{{$t('ssh.widget.total-task')}}: {{info.top.totalTasks}}</span>
                    <span>{{$t('ssh.widget.run-task')}}: {{info.top.runningTasks}}</span>
                    <span>{{$t('ssh.widget.sleep-task')}}: {{info.top.runningTasks}}</span>
                    <span>{{$t('ssh.widget.stop-task')}}: {{info.top.stoppedTask}}</span>
                    <span>{{$t('ssh.widget.zombie-task')}}: {{info.top.zombieTask}}</span>
                  </v-row>
                  <v-divider class="mt-2 mb-2"></v-divider>
                  <v-row justify="space-evenly" class="ma-0">
                    <div style="width: 48%" class="text-center pb-1">
                      {{$t('ssh.widget.phys-mem')}}:{{ $fileSizeConvert(info.top.physMem*1048576) }} / {{$t('common.used')}}:{{ $fileSizeConvert(info.top.usedPhysMem*1048576) }}
                    </div>
                    <div style="width: 48%" class="text-center pb-1">
                      {{$t('ssh.widget.swap-mem')}}:{{ $fileSizeConvert(info.top.swapMem*1048576) }} / {{$t('common.used')}}:{{ $fileSizeConvert(info.top.usedSwapMem*1048576) }}
                    </div>
                  </v-row>
                  <div style="position: relative">
                    <v-progress-linear
                      style="width: 48%;left: 0;transform: none"
                      absolute
                      :model-value="info.top.usedPhysMem/info.top.physMem*100"
                      color="blue"
                    ></v-progress-linear>

                    <v-progress-linear
                      style="width: 48%;left: unset;right: 0;transform: none"
                      absolute
                      :model-value="info.top.usedSwapMem/info.top.swapMem*100"
                      color="orange"
                    ></v-progress-linear>
                  </div>
                </div>
                <v-row justify="center" align-content="center" class="ma-0 pt-2" v-else>
                  {{$t('ssh.widget.unable-parse')}}
                </v-row>
              </v-card-text>
            </v-card>

            <v-card
              class="mb-5 overflow-hidden"
              variant="flat"
              elevation="4"
              v-if="info.top && info.top.processes">
              <div style="display: flex;justify-content: space-evenly;align-items: center;margin-left: 16px;padding-top: 8px;margin-right: 8px">
                <div class="text-overline">
                  {{$t('ssh.widget.process-title')}}
                </div>
                <v-spacer></v-spacer>
                <div style="width: 80px;transform: scale(0.75) translate(10px,-10px)">
                  <v-select hide-details hide-spin-buttons density="compact" variant="underlined" :items="[5,10,25,50,100]" @input="updateTopLimit" v-model="req.topLimit"></v-select>
                </div>
              </div>
              <v-divider></v-divider>
              <v-table>
                <template v-slot:default>
                  <thead @mouseenter="hovers.processTableHover=true" @mouseleave="hovers.processTableHover=false">
                  <tr>
                    <th @click="updateOrder('COMMAND')" :class="req.topOrder==='COMMAND'?'text-left text-no-wrap selectable selected':'text-left text-no-wrap selectable'">
                      Command
                    </th>
                    <th @click="updateOrder('PID')" :class="req.topOrder==='PID'?'text-left text-no-wrap selectable selected':'text-left text-no-wrap selectable'">
                      Pid
                    </th>
                    <th  @click="updateOrder('USER')" :class="req.topOrder==='USER'?'text-left text-no-wrap selectable selected':'text-left text-no-wrap selectable'">
                      User
                    </th>
                    <th @click="updateOrder('%CPU')" :class="req.topOrder==='%CPU'?'text-left text-no-wrap selectable selected':'text-left text-no-wrap selectable'">
                      %CPU
                    </th>
                    <th @click="updateOrder('%MEM')" :class="req.topOrder==='%MEM'?'text-left text-no-wrap selectable selected':'text-left text-no-wrap selectable'">
                      %{{$t('ssh.widget.mem')}}
                    </th>
                    <th @click="updateOrder('RES')" :class="req.topOrder==='RES'?'text-left text-no-wrap selectable selected':'text-left text-no-wrap selectable'">
                      {{$t('ssh.widget.phys-mem')}}
                    </th>
                    <th @click="updateOrder('VIRT')" :class="req.topOrder==='VIRT'?'text-left text-no-wrap selectable selected':'text-left text-no-wrap selectable'">
                      {{$t('ssh.widget.virt-mem')}}
                    </th>
                    <th @click="updateOrder('SHR')" :class="req.topOrder==='SHR'?'text-left text-no-wrap selectable selected':'text-left text-no-wrap selectable'">
                      {{$t('ssh.widget.shr-mem')}}
                    </th>
                    <th @click="updateOrder('TIME+')" :class="req.topOrder==='TIME+'?'text-left text-no-wrap selectable selected':'text-left text-no-wrap selectable'">
                      TIME+
                    </th>
                    <th @click="updateOrder('PR')" :class="req.topOrder==='PR'?'text-left text-no-wrap selectable selected':'text-left text-no-wrap selectable'">
                      {{$t('common.priority')}}
                    </th>
                    <th  @click="updateOrder('S')" :class="req.topOrder==='S'?'text-left text-no-wrap selectable selected':'text-left text-no-wrap selectable'">
                      {{$t('common.status')}}
                    </th>
                    <th>
                      {{$t('common.operate')}}
                    </th>
                  </tr>
                  </thead>
                  <tbody  @mouseenter="hovers.processTableHover=true" @mouseleave="hovers.processTableHover=false">
                  <tr v-for="item in info.top.processes" :key="item.pid">
                    <td>
                      <v-chip color="info" size="x-small">
                        {{ item.command }}
                      </v-chip>
                    </td>
                    <td>{{ item.pid }}</td>
                    <td>{{ item.user }}</td>
                    <td>{{ item.cpu.toFixed(2) }}%</td>
                    <td>{{ item.mem.toFixed(2) }}%</td>
                    <td>{{ $fileSizeConvert(item.res*1024) }}</td>
                    <td>{{ $fileSizeConvert(item.virt*1024) }}</td>
                    <td>{{ $fileSizeConvert(item.shr*1024) }}</td>
                    <td>{{ item.time }}</td>
                    <td>{{ item.pr }}</td>
                    <td>
                      <v-chip color="warning" class="mb-1" label variant="outlined" size="x-small" v-if="item.s === 's'">
                        {{$t("ssh.widget.top-status.s")}}
                      </v-chip>
                      <v-chip color="warning" class="mb-1" label variant="outlined" size="x-small" v-else-if="item.s === 'd'">
                        {{$t("ssh.widget.top-status.d")}}
                      </v-chip>
                      <v-chip color="success" class="mb-1" label variant="outlined" size="x-small" v-else-if="item.s === 'r'">
                        {{$t("ssh.widget.top-status.r")}}
                      </v-chip>
                      <v-chip color="success" class="mb-1" label variant="outlined" size="x-small" v-else-if="item.s === 'i'">
                        {{$t("ssh.widget.top-status.i")}}
                      </v-chip>
                      <v-chip color="error" class="mb-1" label variant="outlined" size="x-small" v-else-if="item.s === 't'">
                        {{$t("ssh.widget.top-status.t")}}
                      </v-chip>
                      <v-chip color="error" class="mb-1" label variant="outlined" size="x-small" v-else-if="item.s === 'p'">
                        {{$t("ssh.widget.top-status.p")}}
                      </v-chip>
                      <v-chip color="error" class="mb-1" label variant="outlined" size="x-small" v-else-if="item.s === 'z'">
                        {{$t("ssh.widget.top-status.z")}}
                      </v-chip>
                      <v-chip color="warning" class="mb-1" label variant="outlined" size="x-small" v-else>
                        {{$t("ssh.widget.top-status.u",{s:item.s})}}
                      </v-chip>
                    </td>
                    <td class="text-no-wrap">
                      <v-btn color="error" size="small" variant="text" :loading="loadings.killLoading" @click="killProcess(item.pid)" style="width: 55px">Kill</v-btn>
                    </td>
                  </tr>
                  </tbody>
                </template>
              </v-table>
            </v-card>

            <v-card
              variant="flat"
              elevation="4"
              class="mb-5 overflow-hidden"
              v-if="info.ifConfig"
            >
              <div class="text-overline pl-4 pt-1">
                {{$t("ssh.widget.if-config-title")}}
              </div>
              <v-divider></v-divider>
              <v-table>
                <template v-slot:default>
                  <thead>
                  <tr>
                    <th class="text-left">
                      {{$t("common.name")}}
                    </th>
                    <th class="text-left">
                      {{$t("common.speed")}}
                    </th>
                    <th class="text-left">
                      IP
                    </th>
                  </tr>
                  </thead>
                  <tbody>
                  <tr
                    v-for="item in info.ifConfig"
                    :key="item.name"
                  >
                    <td>
                      <v-chip color="info" size="x-small">
                        {{ item.name }}
                      </v-chip>
                    </td>
                    <td class="pa-1">
                      <div style="font-size: 10px;color: rgba(0,230,118,0.85);white-space: nowrap" v-if="item.tx !== undefined">
                        <v-icon color="success" small>mdi-arrow-up-thin</v-icon>
                        {{$fileSizeConvert(item.tx)}}/s
                      </div>
                      <div style="font-size: 10px;color: rgba(255,160,0,0.85);white-space: nowrap" v-if="item.rx !== undefined">
                        <v-icon color="warning" small>mdi-arrow-down-thin</v-icon>
                        {{$fileSizeConvert(item.rx)}}/s
                      </div>
                    </td>
                    <td>
                      <div v-if="item.ipV4">IP4: {{item.ipV4}}</div>
                      <div v-if="item.ipV6">
                        IP6: {{item.ipV6}}
                      </div>
                      <div v-if="item.mac">MAC: {{item.mac}}</div>
                    </td>
                  </tr>
                  </tbody>
                </template>
              </v-table>
            </v-card>

            <v-card
              variant="flat"
              elevation="4"
              class="mb-5 overflow-hidden"
              v-if="dockerInfo.hasDocker"
            >
              <div style="display: flex;justify-content: space-evenly;align-items: center;margin-left: 16px;padding-top: 4px;margin-right: 8px">
                <div class="text-overline">
                  {{$t("ssh.widget.docker-title")}}
                </div>
                <v-spacer></v-spacer>
                <div style="width: 120px; transform: scale(0.75) translate(25px,-10px); height: 40px;">
                  <v-switch
                    color="primary"
                    hide-details
                    @change="updateDockerAll"
                    v-model="dockerReq.queryAll"
                    :label="$t('common.show-all')"
                  ></v-switch>
                </div>
              </div>
              <v-divider></v-divider>
              <v-table>
                <template v-slot:default>
                  <thead>
                  <tr>
                    <th class="text-left text-no-wrap">
                      {{$t('common.name')}}
                    </th>
                    <th class="text-left">
                      ID
                    </th>
                    <th class="text-left">
                      CPU%
                    </th>
                    <th class="text-left text-no-wrap">
                      {{$t("ssh.widget.mem")}} ({{$t("common.used")}}/{{$t("common.limit")}})
                    </th>
                    <th class="text-left text-no-wrap">
                      {{$t("ssh.widget.mem")}}%
                    </th>
                    <th class="text-left">
                      {{$t("common.size")}}
                    </th>
                    <th class="text-left">
                      {{$t("common.status")}}
                    </th>
                    <th class="text-left">
                      Image
                    </th>
                    <th class="text-left">
                      Command
                    </th>
                    <th class="text-left text-no-wrap">
                      Net IO
                    </th>
                    <th class="text-left text-no-wrap">
                      Disk IO
                    </th>
                    <th class="text-left">
                      Ports
                    </th>
                    <th class="text-left">
                      Mounts
                    </th>
                    <th class="text-left">
                      Networks
                    </th>
                    <th class="text-left">
                      Pid
                    </th>
                    <th class="text-left">
                      RunningFor
                    </th>
                    <th class="text-left text-no-wrap">
                      {{$t("common.created")}}
                    </th>
                    <th class="text-no-wrap">
                      {{$t("common.operate")}}
                    </th>
                  </tr>
                  </thead>
                  <tbody  @mouseenter="hovers.dockerTableHover=true" @mouseleave="hovers.dockerTableHover=false">
                  <tr v-for="item in dockerInfo.dockerProcess" :key="item.id">
                    <td class="text-no-wrap">
                      <v-chip color="info" size="x-small">
                        {{ item.name }}
                      </v-chip>
                    </td>
                    <td class="text-no-wrap">{{ item.id }}</td>
                    <td>
                      {{ item.cpu }}
                    </td>
                    <td class="text-no-wrap">{{ item.mem }}</td>
                    <td class="text-no-wrap">{{ item.memRate }}</td>
                    <td class="text-no-wrap">{{ item.size }}</td>
                    <td class="text-no-wrap">{{ item.status }}</td>
                    <td>
                      <long-text-chip max-width="80px" :model-value="item.image" v-if="item.image"></long-text-chip>
                    </td>
                    <td>
                      <long-text-chip max-width="80px" :model-value="item.command" v-if="item.command"></long-text-chip>
                    </td>
                    <td class="text-no-wrap">{{ item.netIo }}</td>
                    <td class="text-no-wrap">{{ item.blockIo }}</td>
                    <td>
                      <template v-for="(port,key) in item.ports">
                        <div class="text-no-wrap" :key="key"  v-if="port">
                          {{port}}
                        </div>
                      </template>

                    </td>
                    <td>
                      <template v-for="(mount,key) in item.mounts">
                        <long-text-chip max-width="100px" :model-value="mount" :key="key" v-if="mount"></long-text-chip>
                      </template>
                    </td>
                    <td>
                      <template v-for="(network,key) in item.networks">
                        <div class="text-no-wrap" :key="key" v-if="network">
                          {{network}}
                        </div>
                      </template>
                    </td>
                    <td>{{ item.pid }}</td>
                    <td class="text-no-wrap">{{item.runningFor }}</td>
                    <td class="text-no-wrap">{{ $dateFormat(item.created,"yyyy-MM-DD HH:mm") }}</td>
                    <td class="text-no-wrap pa-1">
                      <div v-if="item.status.startsWith('Up')" >
                        <v-btn color="success" size="small" variant="text" icon="mdi-console" :loading="loadings.dockerOpLoading" @click="writeTerm(`sudo docker exec -it ${item.id} /bin/bash\n`)"></v-btn>
                        <v-btn color="error" size="small" variant="text" icon="mdi-stop-circle-outline" :loading="loadings.dockerOpLoading" @click="stopDockerProcess(item.id)"></v-btn>
                      </div>
                      <div v-else-if="item.status.startsWith('Exit')">
                        <v-btn color="success" size="small" variant="text" icon="mdi-arrow-right-drop-circle-outline" :loading="loadings.dockerOpLoading" @click="startDockerProcess(item.id)"></v-btn>
                        <v-btn color="warning" size="small" variant="text" icon="mdi-delete-outline" :loading="loadings.dockerOpLoading" @click="removeDockerProcess(item.id)"></v-btn>
                      </div>
                    </td>
                  </tr>
                  </tbody>
                </template>
              </v-table>
            </v-card>

            <v-card
              variant="flat"
              elevation="4"
              class="overflow-hidden"
              v-if="info.df"
            >
              <div class="text-overline pl-4 pt-1">
                {{$t('ssh.widget.df-title')}}
              </div>
              <v-divider></v-divider>
              <v-table>
                <template v-slot:default>
                  <thead>
                  <tr>
                    <th class="text-left">
                      FileSystem
                    </th>
                    <th class="text-left">
                      {{$t("common.used")}}
                    </th>
                    <th class="text-left">
                      {{$t("common.available")}}
                    </th>
                    <th class="text-left">
                      Path
                    </th>
                    <th>
                      {{$t('common.operate')}}
                    </th>
                  </tr>
                  </thead>
                  <tbody>
                  <tr
                    v-for="item in info.df"
                    :key="item.path"
                  >
                    <td>
                      <v-chip color="info" size="x-small">
                        {{ item.fileSystem }}
                      </v-chip>
                    </td>
                    <td>{{ $fileSizeConvert(item.used*1024) }}</td>
                    <td>{{ $fileSizeConvert(item.available*1024) }}</td>
                    <td>
                      <long-text-chip color="primary" max-width="200px" :model-value="item.path"></long-text-chip>
                    </td>
                    <td class="text-no-wrap pa-2">
                        <v-btn color="success" size="small" variant="text" icon="mdi-console" @click="writeTerm(`cd ${item.path} \n`)"></v-btn>
                    </td>
                  </tr>
                  </tbody>
                </template>
              </v-table>
            </v-card>
          </div>
        </div>
      </div>
    </v-navigation-drawer>
    <v-snackbar :model-value="hovers.dockerTableHover||hovers.processTableHover" :timeout="-1" color="warning">
      <span style="color: rgb(var(--v-theme-surface))">
        <v-icon icon="mdi-alert" size="x-small" class="mr-1"></v-icon>
        {{$t("ssh.widget.hover-tips")}}
      </span>
    </v-snackbar>
  </div>
</template>

<script lang="ts">
import lodash from "lodash";
import LongTextChip from "~/components/common/LongTextChip.vue";
import Rpc from "~/lib/rpc";
import {onUnmounted, reactive, ref, watch} from "vue";

import {PropType} from "#app/compat/capi";
import {Toast} from "~/lib/layer";
import {TypeCmd, TypeShell} from "~/components/ssh/SshTerminal.vue";

const TypeServerInfo = "serverInfo"
const TypeDockerInfo = "dockerInfo"


export default {
  name: "ServerInfoWidget",
  components: {LongTextChip},
  props:{
    modelValue: {
      type: Boolean
    },
    ready: {
      type: Boolean
    },
    rpc: {
      type: Object as PropType<Rpc>,
    },

  },
  emits: ['update:modelValue'],
  setup(props,ctx){
    let getServerInfoCount = 0;
    const req = reactive({topOrder: "%CPU", topLimit: 5, topSpecifyPid: null,dockerAll: false})
    const dockerReq = reactive({queryAll: false})
    const hovers = reactive({
      processTableHover: false,
      dockerTableHover: false
    })
    const loadings = reactive({
      loading: false,
      killLoading: false,
      dockerOpLoading: false
    })
    const info = ref({
      user: null,
      top: null,
      ifConfig: null,
      updated: null
    })
    const dockerInfo = ref({
      hasDocker: false,
      dockerProcess: [],
    })
    const error = ref(null)

    let lastTime = null;
    let ifConfigLastBytes = {};
    let timeoutFunc = null;

    const updateDockerAll = ()=>{
      loadings.loading = true
      props.rpc.sendWaitReply(TypeDockerInfo, dockerReq, 7000).then((res) => {
        dockerInfo.value = res.json()
        loadings.loading = false
      }).catch(()=>{
        loadings.loading = false
      })
    };
    const updateTopLimit = ()=>{
      getServerInfo(true)
      lodash.delay(()=>{
        hovers.processTableHover = true
      },25)
    };
    const updateOrder = (order)=>{
      req.topOrder = order
      getServerInfo(true)
      lodash.delay(()=>{
        hovers.processTableHover = true
      },25)
    };
    const killProcess = (pid)=>{
      loadings.killLoading = true
      cmd("kill "+pid).then(async res => {
        await getServerInfo(false)
        loadings.killLoading = false
      }).catch((err) => {
        loadings.killLoading = false
        Toast.error("Kill Failed:"+err.message,-1)
      })
    };
    const stopDockerProcess = (id)=>{
      loadings.dockerOpLoading = true
      const cmdStr = `source /etc/profile ; (type podman && podman stop ${id}) || (type docker && docker stop ${id})`;
      if(info.value.user == "root") {
        cmd(cmdStr).then(async res => {
          await getServerInfo(false)
          loadings.dockerOpLoading = false
        }).catch((err) => {
          loadings.dockerOpLoading = false
          Toast.error("Stop Failed:" + err.message, -1)
        })
      }else{
        writeTerm("sudo "+cmdStr)
      }
    };
    const removeDockerProcess = (id)=>{
      loadings.dockerOpLoading = true
      const cmdStr = `source /etc/profile ; (type podman && podman rm ${id}) || (type docker && docker rm ${id})`
      if(info.value.user == "root") {
        cmd(cmdStr).then(async res => {
          await getServerInfo(false)
          loadings.dockerOpLoading = false
        }).catch((err) => {
          loadings.dockerOpLoading = false
          Toast.error("Remove Failed:" + err.message, -1)
        })
      }else{
        writeTerm("sudo "+cmdStr)
      }
    };
    const startDockerProcess = (id)=>{
      loadings.dockerOpLoading = true
      const cmdStr = `source /etc/profile ; (type podman && podman restart ${id}) || (type docker && docker restart ${id})`
      if(info.value.user == "root") {
        cmd(cmdStr).then(async res => {
          await getServerInfo(false)
          loadings.dockerOpLoading = false
        }).catch((err) => {
          loadings.dockerOpLoading = false
          Toast.error("Start Failed:" + err.message, -1)
        })
      }else{
        writeTerm("sudo "+cmdStr)
      }
    };
    const cmd = (cmd)=>{
      return new Promise((resolve,reject)=>{
        props.rpc.sendWaitReply(TypeCmd,cmd).then((p)=>{
          resolve(p.string())
        }).catch((err)=>{
          console.log("err",err)
          reject(err)
        })
      });
    };
    const getServerInfo = async (loading=true)=>{
      if(loading){
        loadings.loading = true
      }
      if(!props.ready){
        return
      }
      try{
        //取上次传输数据量以便计算网速
        if(info.value.ifConfig != null){
          lastTime = info.value.updated
          if(info.value.ifConfig){
            info.value.ifConfig.forEach(item=>{
              if(item.txBytes || item.rxBytes){
                ifConfigLastBytes[item.name] = {
                  'txBytes': item.txBytes,
                  'rxBytes': item.rxBytes
                }
              }
            })
          }
        }
        let packet = await props.rpc.sendWaitReply(TypeServerInfo, req, 3000)
        const currentInfo = packet.json()
        // console.log("info",currentInfo)
        if(lastTime) {
          if (currentInfo.ifConfig) {
            const timeSecondDiff = (currentInfo.updated - lastTime) / 1000
            currentInfo.ifConfig.forEach(item => {
              if (item.txBytes || item.rxBytes) {
                const lastItem = ifConfigLastBytes[item.name]
                if(lastItem){
                  item.tx = Math.round((item.txBytes - lastItem.txBytes) / timeSecondDiff)
                  item.rx =  Math.round((item.rxBytes - lastItem.rxBytes) / timeSecondDiff)
                }
              }
            })
          }
        }
        info.value = Object.freeze(currentInfo)
        error.value = null
        if(getServerInfoCount % 10 === 0) {
          props.rpc.sendWaitReply(TypeDockerInfo, dockerReq, 7000).then((res) => {
            dockerInfo.value = res.json()
          })
        }
        getServerInfoCount ++
      }catch (e){
        console.log(e)
        error.value = e.message
      }finally {
        loadings.loading = false
      }
    }

    const writeTerm = (str:string)=>{
      props.rpc.send(TypeShell, str)
    }

    watch(()=>[props.modelValue,props.rpc],(data)=>{
      const show = data[0]
      if(show && data[1]){
        loadings.loading = true
        if (timeoutFunc == null) {
          let func = async () => {
            //鼠标悬停在进程列表或者docker进程列表时不更新列表
            try{
              if(!hovers.processTableHover&&!hovers.dockerTableHover){
                await getServerInfo(false)
              }
            }finally {
              if (timeoutFunc != null && func === timeoutFunc) {
                lodash.delay(timeoutFunc, 1000)
              }
            }
          }
          timeoutFunc = func
          timeoutFunc()
        }
      }else{
        info.value = {
          user: null,
          top: null,
          ifConfig: null,
          updated: null,
        }
        timeoutFunc = null
        hovers.dockerTableHover = false
        hovers.processTableHover = false
      }
    }, {immediate: true})

    onUnmounted(()=>{
      timeoutFunc = null
    })

    return {
      loadings,error,hovers,req,dockerReq,info,dockerInfo,
      getServerInfo,updateTopLimit,updateOrder,killProcess,updateDockerAll,removeDockerProcess,startDockerProcess,stopDockerProcess,writeTerm
    }
  },
}
</script>

<style lang="scss">
.server-info {
  .v-navigation-drawer {
    position: fixed !important;
    height: 100% !important;
    top: 0 !important;
    transition: none!important;
  }

  .info-card .v-card-text {
    font-size: 12px;
  }

  .v-table > .v-table__wrapper > table > tbody > tr > th, .v-table > .v-table__wrapper > table > thead > tr > th {
    font-size: 12px;
  }

  .v-theme--dark {
    .v-card {
      background: #1e1f21 !important;
    }

    .info-card .v-card__text {
      color: rgba(255, 255, 255, 0.85);
    }

    .v-data-table > .v-data-table__wrapper > table > thead > tr > th {
      color: rgba(255, 255, 255, 0.85);
    }

    .v-table {
      .v-table__wrapper {
        table {
          thead {
            tr {
              th {
                &:first-child {
                  background: rgb(var(--v-theme-surface)) !important;
                }
              }
            }
          }
        }
      }
    }
  }

  .v-theme--light {
    .info-card .v-card__text {
      color: rgba(0, 0, 0);
    }

    .v-data-table > .v-data-table__wrapper > table > thead > tr > th {
      color: rgba(0, 0, 0, 0.85);
    }
  }

  .info-card {
    margin-bottom: 20px;
    margin-top: 16px;
  }

  .loading-container {
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 3;
    background: rgba(158, 158, 158, 0.75);
    width: calc(100% + 10px);
    height: calc(100% + 10px);
    position: absolute
  }

  .close-btn {
    position: absolute;
    right: 0;
  }

  .v-table {
    .v-table__wrapper {
      table {
        table-layout: auto;

        thead {
          tr {
            th {
              position: relative !important;

              &:first-child {
                background: rgb(var(--v-theme-background)) !important;
                position: sticky !important;
                left: 0;
                z-index: 2;
              }
            }
          }
        }

        tbody {
          tr {
            td {
              position: relative;

              &:first-child {
                background: rgb(var(--v-theme-surface)) !important;
                position: sticky;
                left: 0;
                z-index: 1;
              }
            }
          }
        }

        .selectable {
          cursor: pointer;
        }

        .selected {
          color: red !important;
        }

        td {
          font-size: 8px !important;
        }
      }
    }
  }

  .alert-container {
    height: calc(100% - 120px);
    width: 100%;
    display: flex;
    justify-content: center;
    align-content: center;
    flex-direction: column
  }
}
</style>
