import CryptoJS from "crypto-js"

const defaultAesKey = CryptoJS.enc.Utf8.parse("CsN#&Uc!aOUQbh&B")
const defaultAesIv = CryptoJS.enc.Utf8.parse("w6KQ^MPlEx*mfHcb")


export const encryptAesStr=(body:string,key=defaultAesKey):string=>{
    return CryptoJS.AES.encrypt(body,defaultAesKey,{
        iv: defaultAesIv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    }).ciphertext.toString(CryptoJS.enc.Base64)
}

export const decryptAesStr=(base64:string,key=defaultAesKey):string=>{
    return CryptoJS.AES.decrypt(base64,defaultAesKey,{
        iv: defaultAesIv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    }).toString(CryptoJS.enc.Utf8)
}

export const encryptAesObj=(body:any,key=defaultAesKey):string=>{
    const str = JSON.stringify(body)
    return encryptAesStr(str,key)
}

export const decryptAesObj=(base64:string,key=defaultAesKey):string=>{
    return JSON.parse(decryptAesStr(base64,key))
}