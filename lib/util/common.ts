import lodash from "lodash";
import moment from "moment/moment";

export const isTabChar = (str:string):boolean=>{
  return /[\n\r\t"]/.test(str)
}

/**
 * 制表符转义，防止内容出现换行和制表符等粘贴到表格排列混乱
 * @param str
 */
export const escapeTabChar = (str:string):string=>{
  //如果内容中有换行符或制表符需要使用引号包裹防止排列错乱
  if(/[\n\r\t"]/.test(str)){
    //如果内容中有双引号，则替换成两个双引号（代表转义）
    str = str.replaceAll("\"","\"\"")
    return `"${str}"`
  }else{
    return str;
  }
}

/**
 * 将二维数组转换为可直接粘贴到表格的制表符文字
 * @param data
 */
export const encodeTableStr = (data:string[][]):string=>{
  return data.map((arr)=>{
    return arr.map((str)=>{
      return escapeTabChar(str)
    }).join("\t")
  }).join("\n")
}

/**
 * 解析表格复制下来的文本
 * @param str
 */
export const parserTableStr = (str:string):string[][]=>{
  const arr = []
  if(isBlank(str)){
    return arr
  }
  //将所有换行符都统一转换为\n
  str = str.replaceAll("\r\n","\n").replaceAll("\r","\n")
  const quote = "\""
  let currentLine = []
  let currentStr = ""
  //进入引号标志：
  // 0表示未进入引号
  // 1表示进入引号但未确认(因为连续两个引号将进行转义视为单个引号字符串)
  // 2表示已正常进入引号
  // 3表示进入结束引号阶段但未确认(因为如果后面还跟有一个引号则是连续两个引号将进行转义视为单个引号字符串)
  let inQuoteFlag = <0|1|2|3>0
  const len = str.length
  for (let i = 0; i < len; i++) {
    const char = str.charAt(i)
    if(char === quote){
      switch (inQuoteFlag){
        case 0:
          //引号开始
          inQuoteFlag = 1
          break
        case 1:
          //连续两个引号转换一个引号字符串
          inQuoteFlag = 0
          currentStr += quote
          break
        case 2:
          //引号进入可能结束阶段
          inQuoteFlag = 3
          break
        case 3:
          //引号进入结束阶段又遇上个引号，说明是引号转义字符则重新进入引号内
          inQuoteFlag = 2
          currentStr += quote
          break
      }
    }else{
      if(inQuoteFlag === 1){
        //进入引号后遇到非引号字符，说明进入引号内处理流程
        inQuoteFlag = 2
      }else if(inQuoteFlag === 3){
        //进入引号结束阶段后遇到非引号字符，说明完成结束
        inQuoteFlag = 0
      }
      //引号内不对换行符或制表符进行处理
      if(inQuoteFlag === 2){
        currentStr += char
      }else{
        //非引号内正常处理流程,遇到\n换行遇到\t换列
        if(char === '\t'){
          currentLine.push(currentStr)
          currentStr = ""
        }else if(char === '\n'){
          currentLine.push(currentStr)
          arr.push(currentLine)
          currentLine = []
          currentStr = ""
        }else{
          currentStr += char
        }
      }
    }
  }
  //末尾收尾
  currentLine.push(currentStr)
  arr.push(currentLine)
  return arr
}

const isBlank = (str:string):boolean=>{
  return str.trim().length === 0
}

export const dateFormat = (date: number | string | Date, format: string):string => {
  return moment(date).format(format)
}

export const parserDateFormat = (date: string, format: string):Date => {
  return moment(date,format).toDate()
}

export const fileSizeConvert = (size: number,trimByteUnit=false):string => {
  if(size == 0){
    return "0B"
  }
  if (size < 1024) {
    return size+"B"
  } else if (size < 1048576) {
    size = size / 1024
    let sizeStr= size.toFixed(1).replace(/(\.\d*?)0+$/, '')
    return sizeStr+(trimByteUnit?"K":"M")
  } else if (size < 1073741824) {
    size = size / 1048576
    let sizeStr= size.toFixed(1).replace(/(\.\d*?)0+$/, '')
    return sizeStr+(trimByteUnit?"M":"MB")
  }  else if (size < 1099511627776) {
    size = size / 1073741824
    let sizeStr= size.toFixed(1).replace(/(\.\d*?)0+$/, '')
    return sizeStr+(trimByteUnit?"G":"GB")
  } else {
    size = size / 1099511627776
    let sizeStr= size.toFixed(1).replace(/(\.\d*?)0+$/, '')
    return sizeStr+(trimByteUnit?"T":"TB")
  }
}

export const getFileExt = (name: string):string =>{
  const idx = name.lastIndexOf(".")
  if(idx >= 0){
    return name.substring(idx+1)
  }
  return ""
}

export const pathEqual = (path1:string,path2:string):boolean =>{
  return path1.replace(/[/\\]/g,"") == path2.replace(/[/\\]/g,"")
}

export const genNotExistPath = async (filename: string, isExistFunc: (name: string) => Promise<void>): Promise<string> => {
  const suffixIdx = filename.lastIndexOf(".")
  let suffix = ""
  let prefix = filename
  if (suffixIdx >= 0) {
    prefix = filename.substring(0, suffixIdx)
    suffix = filename.substring(suffixIdx, filename.length)
  }

  let dividerIdx = prefix.lastIndexOf("-")
  let i = 0
  if (dividerIdx > 0) {
    const temp = prefix.substring(dividerIdx + 1, prefix.length)
    const max = Number.parseInt(temp, 10)
    if (!isNaN(max)) {
      prefix = prefix.substring(0, dividerIdx)
      i = max
    }
  }

  let pathStr = ""

  const end = i + 16
  const begin = i
  for (; i < end; i++) {
    //最多尝试16次
    if (i == begin) {
      pathStr = prefix + suffix
    } else {
      if (prefix === "") {
        pathStr = prefix + i + suffix;
      } else {
        pathStr = prefix + "-" + i + suffix;
      }
    }
    try {
      await isExistFunc(pathStr)
      return pathStr
    }catch (e){

    }
  }

  if (prefix === "") {
    return new Date().getDate() + suffix;
  } else {
    return prefix + "-" + new Date().getDate() + suffix;
  }

}

export const pathJoin = (separator: string,paths: string[]):string =>{
  let path = ""
  paths.forEach((p)=>{
    if(path === ""){
      path = p
    }else if(path.endsWith(separator)){
      path = path+p
    }else{
      path = path+separator+p
    }
  })
  return path
}

export const pathParent = (path: string):string =>{
  path = lodash.trimEnd(path,"\\")
  path = lodash.trimEnd(path,"/")
  let idx = path.lastIndexOf("/")
  if(idx === -1){
    idx = path.lastIndexOf("\\")
  }
  if(idx === -1){
    return path
  }
  if(idx === 0){
    return path.substring(0,idx+1)
  }else{
    return path.substring(0,idx)
  }
}

export const pathName = (path: string):string =>{
  path = lodash.trimEnd(path,"\\")
  path = lodash.trimEnd(path,"/")
  let idx = path.lastIndexOf("/")
  if(idx === -1){
    idx = path.lastIndexOf("\\")
  }
  if(idx === -1){
    return path
  }
  return path.substring(idx+1,path.length)
}

export const isRootPath = (separator: string,path: string):boolean =>{
  path = lodash.trim(path," ")
  if(path.length === 0){
    return true
  }
  return path.split(separator).filter(str=>str!="").length <= 1 && path.endsWith(separator)
}

export const sleep = (msTime:number):Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, msTime))
}

export default {
  isTabChar,
  escapeTabChar,
  encodeTableStr,
  parserTableStr,
  dateFormat,
  fileSizeConvert,
  getFileExt,
  pathJoin,
  pathParent,
  isRootPath,
  sleep,
}
