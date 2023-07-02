import Dexie, {DexieOptions} from "dexie";
import lodash from "lodash";
import {decryptAesStr, encryptAesObj, encryptAesStr} from "~/lib/util/crypto";
import {MD5} from "crypto-js";
import {AssetConfData, AssetConfModel} from "~/db/model/asset-conf-model";

export abstract class DexieService extends Dexie{
    protected constructor(databaseName: string, options?: DexieOptions) {
        super(databaseName,options);
    }

    public abstract getVersion():number

    /**
     * 克隆并裁剪_开头的私有属性
     * @param model
     */
    public cloneAndTidyModel<T>(model:T):T{
        return this.tidyModel(lodash.cloneDeep(model))
    }

    public sign(data:any):string{
        return MD5(this.serialize(data)).toString()
    }

    /**
     * 裁剪_开头的私有属性
     * @param model
     */
    public tidyModel<T>(model:T):T{
        const filter = (value:any, key:string, collection)=>{
            if(key.startsWith("_")){
                delete collection[key]
            }else if(lodash.isArray(value)){
                for (const arrVal of value) {
                    if(lodash.isPlainObject(arrVal)){
                        lodash.forOwn(arrVal,filter)
                    }
                }
            } else if(lodash.isPlainObject(value)){
                lodash.forOwn(value,filter)
            }
        }
        lodash.forOwn(model,filter)
        return model
    }

    /**
     * 根据path加密字段
     * @param paths 需要加密的字段路径格式: user.password
     * @param model
     */
    public encryptFields(paths:string[],model:any):any{
        if(!model){
            return model
        }
        for (const path of paths) {
            let current = model
            const keys = path.split(".")
            const end = keys.length - 1
            for (let i = 0; i < keys.length; i++) {
                const key = keys[i]
                const val = current[key]
                if(val){
                    if(i===end){
                        if(lodash.isString(val)){
                            current[key] = encryptAesStr(val)
                        }else{
                            current[key] = encryptAesObj(val)
                        }
                    }else{
                        current = val
                    }
                }else{
                    break
                }
            }
        }
        return model
    }

    /**
     * 根据path解密字段
     * @param paths 需要解密的字段路径格式: user.password
     * @param model
     */
    public decryptFields(paths:string[],model:any):any{
        if(!model){
            return model
        }
        for (const path of paths) {
            let current = model
            const keys = path.split(".")
            const end = keys.length - 1
            for (let i = 0; i < keys.length; i++) {
                const key = keys[i]
                const val = current[key]
                if(val){
                    if(i===end){
                        const rawStrVal = decryptAesStr(val)
                        try{
                            current[key] = JSON.parse(rawStrVal)
                        }catch (e){
                            current[key] = rawStrVal
                        }
                    }else{
                        current = val
                    }
                }else{
                    break
                }
            }
        }
        return model
    }

    protected serialize(obj){
        obj = this.tidyModel(obj)
        return JSON.stringify(obj, function (k,v) {
            const rawValue = this[k]
            if(rawValue instanceof Date){
                return `Date(${rawValue.getTime()})`
            }else if(v instanceof String){
                return v.replaceAll("Date(","Date\\(");
            }
            return v
        })
    }

    protected deserialize<T>(json:string){
        return <T>JSON.parse(json, function (k,v){
            if(lodash.isString(v)){
                const str = <string>v
                if (/^Date\([0-9]{0,16}\)$/.test(str)){
                    return new Date(Number(str.substring(5,str.length-1)))
                }
                return v.replaceAll("Date\\(","Date(")
            }
            return v;
        })
    }
}