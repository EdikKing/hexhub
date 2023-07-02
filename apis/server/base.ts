import axios, {AxiosError, AxiosResponse} from "axios";

export const MasterEndpoint = process.dev ? 'http://localhost:8080': 'https://api.hexhub.cn'

export const api = axios.create({
        baseURL: MasterEndpoint,
})
api.interceptors.response.use((res:AxiosResponse<ServerResult<any>>) => {
    return res
}, err => {
    if(err instanceof AxiosError){
        if(!err.response){
            return Promise.reject(err)
        }
        const res = <AxiosResponse<ServerResult<any>>>err.response
        if(res.config.responseType === "json") {
            try {
                return Promise.reject(new ServerResultError(res.data.msg, res.data.code))
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

export type ResultCode = 0|1|2
export const ResultCodes = Object.freeze({
    Success:<ResultCode>0,
    UnknownError:<ResultCode>1,
    Failed:<ResultCode>2,
})
export class ServerResult<T> {
    code:ResultCode
    msg?:string
    data:T
}
export class ServerResultError extends Error{
    public code:number
    constructor(message:string,code:number) {
        super(message);
        this.code = code
    }
}