import Packet from "./packet";
import _ from 'lodash';
import Channel from "./channel";
import FastPriorityQueue from "fastpriorityqueue"
import {getPageId} from "~/lib/client/plugin";

class ReplyCallback{
  constructor(
    public id:number,
    public expire:number,
    public resolve: (value: Packet | PromiseLike<Packet>) => void,
    public reject: (reason?: any) => void
  ) {
  }
}

export default class Index {
  public onAcceptChannel?:(channel:Channel)=>void
  private ws:WebSocket;
  private readonly address:string;
  private closed:boolean = false;
  private opened:boolean = false;
  private id:number;
  private readonly timeout:number;
  private handlers:Map<string,Set<((this: Index, packet: Packet) => void|Packet|Promise<void|Packet>)>> = new Map();
  private timeoutQueue:FastPriorityQueue<ReplyCallback> = new FastPriorityQueue<ReplyCallback>((a,b)=>a.expire<b.expire)
  private replyCallbacks:Map<number,ReplyCallback> = new Map();
  private channels:Map<number,Channel> = new Map();
  public onclose: ((this: WebSocket, ev: CloseEvent) => any) | null = null;
  public onerror: ((this: WebSocket, ev: Event) => any) | null = null;
  public onopen: ((this: WebSocket, ev: Event) => any) | null = null;

  /**
   * @param address ws地址
   * @param timeout 超时时间，小于等于0则无超时时间
   */
  constructor(address:string,timeout:number) {
    this.address = address
    this.timeout = timeout
  }

  public open(){
    if(this.opened){
      throw new Error("rpc is already opened")
    }
    this.opened = true
    this.id = 0
    let address = this.address
    //携带当前页id
    if(address.lastIndexOf("?") !== -1){
      address = `${address}&hexhubPageId=${getPageId()}`
    }else{
      address = `${address}?hexhubPageId=${getPageId()}`
    }
    const websocket = new WebSocket(address)
    websocket.binaryType = "arraybuffer";
    this.ws = websocket
    websocket.onclose = (ev)=>{
      this.closed = true;
      this.opened = false
      this.channels.forEach(ch=>{
        ch.close(Channel.CloseFailure,"rpc is closed")
      })
      this.channels.clear()
      this.replyCallbacks.forEach(rc=>{
        rc.reject(new Error("rpc is closed"))
      })
      this.replyCallbacks.clear()
      if(this.onclose!=null){
        this.onclose.call(websocket,ev)
      }
    }
    websocket.onerror = (ev)=>{
      if(this.onerror!=null){
        this.onerror.call(websocket,ev)
      }
    }
    websocket.onopen = (ev)=>{
      this.closed = false;
      if(this.onopen!=null){
        this.onopen.call(websocket,ev)
      }
    }
    websocket.onmessage = (msg)=>{
      const packet = Packet.Decode(msg.data,true)
      // console.log(packet)
      const id = Number(packet.id())
      if(packet.method() == Channel.ChannelMethodSend){
        const channel = this.channels.get(id)
        if(channel!=null){
          channel.receive(packet)
        }else{
          console.error("channel is not exist",id,packet)
        }
      }else if(packet.method() == Channel.ChannelMethodOpen){
        const subPacket = packet.subPacket()
        let channel = this.channels.get(id)
        if(channel!=null){
          if(!channel.isOpen()){
            channel.onOpen()
          }
        }else{
          channel = new Channel(this,packet.id(),packet.method())
          this.channels.set(id,channel)
          this.sendSpecifyId(subPacket.method(),subPacket.id(),subPacket.toBytes(true))
          if(this.onAcceptChannel!=null){
            this.onAcceptChannel(channel)
          }
        }
      }else if(packet.method() == Channel.ChannelMethodClose){
        const channel = this.channels.get(id)
        if(channel!=null){
          const result:any = packet.json()
          channel.close(result.code,result.reason)
          this.channels.delete(id)
        }else{
          console.error("channel is not exist",id,packet)
        }
      }else {
        const replyCallback = this.replyCallbacks.get(id)
        // console.log("replyCallback",replyCallback)
        if (replyCallback != null) {
          if(packet.method() === "error"){
            replyCallback.reject(new Error(packet.string()))
          }else{
            replyCallback.resolve(packet)
          }
          this.delCallback(replyCallback)
        } else {
          const funcSet = this.handlers.get(packet.method())
          if (funcSet != null) {
            for (const func of funcSet) {
              func.call(this, packet)
            }
          }
        }
      }
    }
  }

  public isOpened(){
    return this.opened
  }

  public isClosed(){
    return this.closed
  }

  public getSendBufferedAmount(){
    return this.ws.bufferedAmount
  }

  private delCallback(callback:ReplyCallback){
    this.replyCallbacks.delete(callback.id)
    this.timeoutQueue.remove(callback)
  }

  private handleSendTimeout(timeout:number){
    _.delay( ()=>{
      const time = new Date().getTime()
      let task = this.timeoutQueue.peek()
      //如果队列中有数据，并且已超时则移除并触发超时异常
      while (task && time >= task.expire){
        this.timeoutQueue.poll()
        this.replyCallbacks.delete(task.id)
        task.reject(new Error("timeout"))
        task = this.timeoutQueue.peek()
      }
    },timeout);
  }

  public openChannel(method:string, data:any):Channel{
    const subPacket = Packet.create(method,0,data)
    const id = this.send(Channel.ChannelMethodOpen,subPacket)
    const channel = new Channel(this,id,method)
    this.channels.set(channel.id(),channel)
    return channel
  }

  public on(method:string, f:((this: Index, packet: Packet) => void|Packet|Promise<void|Packet>)):void {
    let funcSet = this.handlers.get(method)
    if(!funcSet){
      funcSet = new Set()
      this.handlers.set(method,funcSet)
    }
    funcSet.add(f)
  }

  public clearOn(method:string,f?:((this: Index, packet: Packet) => void|Packet|Promise<void|Packet>)):void {
    if(f){
      let funcSet = this.handlers.get(method)
      if(funcSet){
        funcSet.delete(f)
        if(funcSet.size === 0){
          this.handlers.delete(method)
        }
      }
    }else{
      this.handlers.delete(method)
    }
  }

  public close(code:number, reason:string):void{
    if(this.closed){
      return
    }
    this.ws.close(code,reason)
  }

  public send(method:string, v:any):number {
    const id = this.id
    this.doSend(method,id,v)
    this.id ++;
    return id
  }

  public sendSpecifyId(method:string, id:number, v:any):void {
    this.doSend(method,id,v)
  }

  public sendWaitReply(method:string, v:any={},timeout:number=null, replyPacket:Packet=null):Promise<Packet> {
    if(timeout === null){
      timeout = this.timeout
    }
    const promise = new Promise<Packet>((resolve,reject)=>{
      if(this.closed){
        reject(new Error("rpc closed"))
      }else{
        try {
          let id = this.id
          if(replyPacket){
            id = replyPacket.id()
          }else{
            this.id++;
          }
          const callback = new ReplyCallback(
              id,
              new Date().getTime() + timeout,
              resolve,
              reject
          )
          this.replyCallbacks.set(id, callback)
          if(timeout > 0){
            //如果有设置超时时间，则添加到超时控制队列
            this.timeoutQueue.add(callback)
          }
          this.doSend(method, id, v)
        }catch (e){
          reject(e)
        }
      }
    });
    this.handleSendTimeout(timeout);
    return promise
  }

  public reply(method:string, v:any, replyPacket:Packet):void {
    this.sendSpecifyId(method,replyPacket.id(),v)
  }

  private sendRawBytes(bytes:ArrayBuffer):void {
    // if(this.closed){
    //   throw new Error("rpc is closed")
    // }
    this.ws.send(bytes)
  }

  private doSend(method:string,id:number,v:any):void {
    // if(this.closed){
    //   throw new Error("rpc is closed")
    // }
    const packet = Packet.create(method,id,v)
    this.sendRawBytes(packet.toBytes(true))
  }

}
