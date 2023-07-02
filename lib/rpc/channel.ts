import Index from "./index";
import Packet from "./packet";

export default class Channel {
  public static readonly ChannelMethodOpen = "ChannelOpen"
  public static readonly ChannelMethodSend = "ChannelSend"
  public static readonly ChannelMethodClose = "ChannelClose"

  public static readonly CloseUnknown = -1
  public static readonly CloseNormal = 0
  public static readonly CloseFailure = 1
  public static readonly CloseInterrupt = 2

  private readonly method: string
  private readonly mId: number
  private readonly rpc: Index
  private errReason:string = ""
  private errCode:number = -1
  private mIsOpen: boolean = false
  private mIsClose: boolean = false
  public onmessage: ((v:Packet,chan:Channel) => void) | null = null;
  public onclose: ((code:number,reason:string,chan:Channel) => void) | null = null;

  constructor(rpc:Index, id:number, method:string) {
    this.rpc = rpc
    this.mId = id
    this.method = method
  }


  public idString():string{
    return Number(this.mId).toString(32)
  }

  public id():number{
    return this.mId
  }

  public isOpen():boolean{
    return this.mIsOpen
  }

  public isClosed():boolean{
    return this.mIsClose || this.rpc.isClosed()
  }

  public onOpen():void{
    this.mIsOpen = true
  }

  public getErrReason():string{
    return this.errReason
  }

  public getErrCode():number{
    return this.errCode
  }

  public close(code:number, reason:string){
    if(this.isClosed()){
      return
    }
    if(this.onclose!=null){
      this.onclose(code,reason,this)
    }
    this.errCode = code
    this.errReason = reason
    this.mIsClose = true
    this.rpc.sendSpecifyId(Channel.ChannelMethodClose,this.mId,{"mode":code,"reason":reason})
  }

  public receive(data:Packet) {
    if(this.onmessage!=null){
      this.onmessage(data,this)
    }
  }

  public send(data:any){
    this.rpc.sendSpecifyId(Channel.ChannelMethodSend,this.mId,data)
  }

}
