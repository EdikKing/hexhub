import DeepPool from "./deepool";
import ByteBuffer from "bytebuffer";

export default class ByteBufPool extends ByteBuffer{
  private isFree:boolean = false
  private static pool = DeepPool.create(function (){
    return new ByteBufPool()
  })

  public static malloc():ByteBufPool{
    const result = this.pool.use()
    console.log("byteBuf pool size:"+this.pool.size())
    result.clear()
    result.limit = 0
    result.isFree = false
    return result
  }

  public free(){
    if(!this.isFree) {
      this.isFree = true
      ByteBufPool.pool.recycle(this)
    }
  }

  private constructor(capacity?: number, littleEndian?: boolean, noAssert?: boolean){
    super(capacity,littleEndian,noAssert);
  }

}
