import {api, genApiUri} from "~/apis/client/base";
import {ClientResult} from "~/apis/client/base";

export const ssh = Object.freeze({
    checkPrivateKey:async (privateKey: string, password?: string): Promise<{ type: string }> => {
        return (await api.get<ClientResult<{ length: number, type: string }>>(genApiUri("remote-control", "ssh/check-private-key"), {
            params: {privateKey, password},
            responseType: "json",
        })).data.body
    },
    getLocalPrivateKey:async (): Promise<{privateKey:string,filename:string}> => {
        return (await api.get<ClientResult<{privateKey:string,filename:string}>>(genApiUri("remote-control", "ssh/get-local-private-key"), {
            responseType: "json",
        })).data.body
    }
})


export const ping = async (): Promise<void> => {
    await api.get<ClientResult<string>>(genApiUri("remote-control", "ping"), {
        responseType: "json",
    })
}