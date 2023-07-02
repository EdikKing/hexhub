<template>
  <div>
    <div class="first-selection">
      <div class="main-bar">
        <img class="bar-logo" src="/img/hexhub-icon.png" alt="hexhub logo"/>
        <div class="bar-menu-group">
          <v-btn color="info" variant="text" disabled>Database</v-btn>
          <v-btn color="info" variant="text" href="/ssh">SSH</v-btn>
          <v-btn color="info" variant="text" @click="showEmail=true">联系方式</v-btn>
          <v-btn color="info" href="https://github.com/xiwh/hexhub" variant="text">Github</v-btn>
<!--          <v-btn color="info" variant="text">隐私协议</v-btn>-->
        </div>
        <div class="bar-btn-group">
          <v-btn color="primary" variant="outlined" rounded @click="showDownload=true">DOWNLOAD</v-btn>
        </div>
      </div>

      <canvas id="scene"></canvas>

      <div class="bottom-texts">
        <a target="_blank" href="http://www.beian.gov.cn/portal/registerSystemInfo?recordcode=51019002005429">川公网安备 51019002005429号</a>
        <a target="_blank" href="https://beian.miit.gov.cn/#/Integrated/index">蜀ICP备2023003234号-1</a>
      </div>
    </div>
    <client-download-dialog class="download-dialog" v-model="showDownload"></client-download-dialog>
    <v-snackbar
        v-model="showEmail"
        :timeout="-1"
    >
      邮箱:xiweihai123@gmail.com
      <template v-slot:actions>
        <v-btn
            color="primary"
            variant="info"
            @click="showEmail = false"
        >
          已知悉
        </v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script lang="ts">
import {ref,onMounted} from "vue"
import lodash from "lodash";
export default {
  name: "index.vue",
  setup(){
    const showEmail = ref(false)
    const showDownload = ref(false)

    const text = "Hexhub"

    onMounted(()=>{
      let canvas = <HTMLCanvasElement>document.querySelector("#scene"),
          ctx = canvas.getContext("2d"),
          particles = [],
          amount = 0,
          mouse = {x: 0, y: 0},
          radius = 1;

      let colors = ["#000","#101", "#111","#202", "#222"];

      let ww = canvas.width = window.innerWidth;
      let wh = canvas.height = window.innerHeight;

      function Particle(x,y){
        this.x =  Math.random()*ww;
        this.y =  Math.random()*wh;
        this.dest = {
          x : x,
          y: y
        };
        this.r =  Math.random()*5 + 2;
        this.vx = (Math.random()-0.5)*20;
        this.vy = (Math.random()-0.5)*20;
        this.accX = 0;
        this.accY = 0;
        this.friction = Math.random()*0.05 + 0.94;

        this.color = colors[Math.floor(Math.random()*6)];
      }

      Particle.prototype.render = function() {
        this.accX = (this.dest.x - this.x)/1000;
        this.accY = (this.dest.y - this.y)/1000;
        this.vx += this.accX;
        this.vy += this.accY;
        this.vx *= this.friction;
        this.vy *= this.friction;

        this.x += this.vx;
        this.y +=  this.vy;

        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, Math.PI * 2,0, false);
        ctx.fill();

        let a = this.x - mouse.x;
        let b = this.y - mouse.y;

        let distance = Math.sqrt( a*a + b*b );
        if(distance<(radius*70)){
          this.accX = (this.x - mouse.x)/100;
          this.accY = (this.y - mouse.y)/100;
          this.vx += this.accX;
          this.vy += this.accY;
        }

      }

      function onMouseMove(e){
        mouse.x = e.clientX;
        mouse.y = e.clientY;
      }

      function onTouchMove(e){
        if(e.touches.length > 0 ){
          mouse.x = e.touches[0].clientX;
          mouse.y = e.touches[0].clientY;
        }
      }

      function onTouchEnd(e){
        mouse.x = -9999;
        mouse.y = -9999;
      }

      function initScene(){
        ww = canvas.width = window.innerWidth;
        wh = canvas.height = window.innerHeight;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.font = "bold "+(ww/8)+"px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(text, ww/2, wh/2);

        let data  = ctx.getImageData(0, 0, ww, wh).data;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = "screen";

        particles = [];
        for(let i=0;i<ww;i+=Math.round(ww/150)){
          for(let j=0;j<wh;j+=Math.round(ww/150)){
            if(data[ ((i + j*ww)*4) + 3] > 150){
              particles.push(new Particle(i,j));
            }
          }
        }
        amount = particles.length;

      }

      function onMouseClick(){
        radius++;
        if(radius ===5){
          radius = 0;
        }
      }

      function render(a) {
        requestAnimationFrame(render);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < amount; i++) {
          particles[i].render();
        }
      }

      window.addEventListener("resize", lodash.throttle(initScene,250));
      window.addEventListener("mousemove", onMouseMove,{passive:true});
      window.addEventListener("touchmove", onTouchMove,{passive:true});
      window.addEventListener("click", onMouseClick);
      window.addEventListener("touchend", onTouchEnd);
      initScene();
      requestAnimationFrame(render);

    })

    return {showEmail,showDownload}
  }
}
</script>
<style lang="scss">
.download-dialog{
  opacity: .95;
}
#scene{
  position: absolute;
  top: 0;
  height: 100%;
  width: 100%;
  pointer-events: none;
}
@keyframes gradient {
  0% {
    background-position: 0 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0 50%;
  }
}
.first-selection{
  background: linear-gradient(-45deg, #ffffff, #fff2e4, #b4e5ff, #c1ffed);
  background-size: 400% 400%;
  animation: gradient 15s ease infinite;
  height: 100vh;
  width: 100vw;
  position: relative;
  .bottom-texts{
    bottom: 10px;
    width: 100%;
    position: absolute;
    display: flex;
    justify-content: center;
    a{
      text-decoration: none;
      color: #666666;
      &:first-child{
        margin-right: 30px;
      }
    }
  }
  .desc-text{
    width: 700px;
    margin: 10vw auto 0 auto;
    padding: 35px 20px;
    ul{
      font-size: 14px;
    }
    p{
      font-size: 14px;
    }
  }
  .bar-menu-group{
    flex: 1 1 100%;
    display: flex;
    justify-content: flex-end;
  }
  .main-bar{
    height: 85px;
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: space-between;
    .bar-logo{
      height: 40px;
      margin-left: 30px;
      pointer-events: none;
      user-select: none;
    }
    .bar-btn-group{
      margin-right: 40px;
      .v-btn{
        margin-left: 15px;
      }
    }
  }
}
@media screen and (max-width: 750px){
  .bar-btn-group{
    display: none;
  }
  .first-selection{
    .main-bar {
      .bar-logo {
        height: 20px;
        margin-left: 15px;
      }
    }
    .desc-text{
      width: 90vw;
    }
    .bottom-texts{
      display: block;
      a{
        display: block;
        text-align: center;
      }
    }
  }
}
</style>