import axios, {AxiosError, AxiosResponse} from "axios";
import lodash from "lodash";
import {getPageId} from "~/lib/client/plugin";


export const ClientEndpoint = "localhost:35580"

export const api = axios.create({
    headers: {'Hexhub-Page-Id': getPageId()},
    baseURL: `http://${ClientEndpoint}`,
})
api.interceptors.response.use((res:AxiosResponse<ClientResult<any>>) => {
    return res
}, err => {
    if(err instanceof AxiosError){
        if(!err.response){
            return Promise.reject(err)
        }
        const res = <AxiosResponse<ClientResult<any>>>err.response
        if(res.config.responseType === "json") {
            try {
                return Promise.reject(new ClientResultError(res.data.message, res.data.code))
            } catch (err) {
                return Promise.reject(err)
            }
        }else {
            return Promise.reject(err)
        }
    }else{
        return Promise.reject(err)
    }
})

export type ResultCode = 0|1|2|3
export const ResultCodes = Object.freeze({
    Success:<ResultCode>0,
    PluginNotInstall:<ResultCode>1,
    Failed:<ResultCode>2,
    Error:<ResultCode>3,
})
export class ClientResult<T> {
    code:ResultCode
    message?:string
    body:T
}
export class ClientResultError extends Error{
    public code:number
    constructor(message:string,code:number) {
        super(message);
        this.code = code
    }
}

export type Plugins = null|""|"remote-control"|"database"

export const genApiUrl = (schema:"http"|"ws"|"https"|"wss",pluginName:Plugins|string,uri:string):string=>{
    uri = lodash.trim(uri,"/")
    if(pluginName){
        return `${schema}://${ClientEndpoint}/${pluginName}/${uri}`
    }else{
        return `${schema}://${ClientEndpoint}/${uri}`
    }
}

export const genApiUri = (pluginName:Plugins|string,uri:string):string=>{
    uri = lodash.trim(uri,"/")
    if(pluginName){
        return `${pluginName}/${uri}`
    }else{
        return uri
    }
}