import ByteBuffer from 'bytebuffer';

export default class Packet {
  private mMethod:string = ""
  private mId:number = 0
  private dataLen: number = -1
  private data: any
  private buf?:ByteBuffer

  public static Decode(data:any,isXor=false):Packet {
    const byteBuf = ByteBuffer.wrap(data);
    if(isXor) {
      for (let i = 0; i < byteBuf.limit; i++) {
        let byte = byteBuf.readByte(i)
        byteBuf.writeByte(byte ^ (i & 0xff), i)
      }
    }
    const methodBytes = byteBuf.readUint16();
    const dataBytes = byteBuf.readUint32();
    const id = byteBuf.readUint32()
    const method = byteBuf.readUTF8String(methodBytes,ByteBuffer.METRICS_BYTES)
    const result = new this()
    result.mId = id
    result.mMethod = method;
    result.dataLen = dataBytes
    result.buf = byteBuf
    return result
  }

  public static create(method:string, id:number, data:any):Packet {
    const result = new this()
    result.mId = id
    result.mMethod = method;
    result.data = data;
    return result
  }

  public getDataOffset():number {
    const methodBytes = (new TextEncoder().encode(this.mMethod)).length
    const fixedOffset = 10
    return methodBytes+fixedOffset
  }

  public toBytes(isXor=false):ArrayBuffer {
    if (this.buf!=null){
      return this.buf.slice(this.buf.offset,this.buf.capacity()).toArrayBuffer()
    }
    const byteBuf = new ByteBuffer();
    byteBuf.writeUint16(0)
    byteBuf.writeUint32(0)
    byteBuf.writeUint32(this.mId)
    byteBuf.writeUTF8String(this.mMethod)
    //写入method长度
    byteBuf.writeUint16(byteBuf.offset - 10,0)
    const idOffset = byteBuf.offset;
    if(this.data instanceof Packet){
      byteBuf.append(this.data.toBytes())
    }else if(this.data instanceof ByteBuffer){
      byteBuf.append(this.data.flip())
    }else if(typeof this.data === 'string'){
      byteBuf.writeUTF8String(this.data)
    }else if(this.data instanceof ArrayBuffer){
      byteBuf.append(this.data)
    }else if(this.data instanceof Uint8Array){
      byteBuf.append(this.data)
    }else{
      byteBuf.writeUTF8String(JSON.stringify(this.data))
    }
    let endOffset = byteBuf.offset
    //写入数据长度
    byteBuf.writeUint32(endOffset - idOffset,2)

    if(isXor) {
      for (let i = 0; i < byteBuf.offset; i++) {
        let byte = byteBuf.readByte(i)
        byteBuf.writeByte(byte ^ (i & 0xff), i)
      }
    }
    return byteBuf.flip().toArrayBuffer()
  }

  public method():string {
    return this.mMethod
  }

  public id():number {
    return this.mId
  }

  public subPacket():Packet{
    return Packet.Decode(this.toBytes())
  }

  public string():string {
    if(this.data!=null){
      return this.data
    }
    if(this.buf == null){
      return ""
    }
    const offset = this.buf.offset
    try{
      return this.buf.readUTF8String(this.dataLen,ByteBuffer.METRICS_BYTES)
    }finally {
      //重置读取位置
      this.buf.mark(offset)
      this.buf.reset()
    }
  }

  public getDataArrayBuffer():ArrayBuffer {
    if(this.data!=null){
      if(this.data instanceof Packet){
        return this.data.toBytes()
      }else if(this.data instanceof ByteBuffer){
        return this.data.flip().toArrayBuffer()
      }else if(typeof this.data === 'string'){
        return new TextEncoder().encode(this.data).buffer
      }else if(this.data instanceof ArrayBuffer){
        return this.data
      }else if(this.data instanceof Uint8Array){
        return this.data
      }else{
        return new TextEncoder().encode(JSON.stringify(this.data)).buffer
      }
    }
    if(this.buf == null){
      return null
    }
    const offset = this.buf.offset
    try {
      return this.buf.readBytes(this.dataLen).flip().toArrayBuffer()
    }finally {
      //重置读取位置
      this.buf.mark(offset)
      this.buf.reset()
    }
  }

  public json<T>():T {
    if(this.data!=null){
      return this.data
    }
    let str = this.string()
    return JSON.parse(str)
  }

}
