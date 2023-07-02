import {api, ClientResult, genApiUri, Plugins} from "~/apis/client/base";

export const enum PluginStatus {
    NotStarted = 0,
    Starting = 1,
    Running = 2,
    Downloading = 3,
    DownloadFailed = 4,
    InstallationFailed = 5,
}

export interface MasterInfo{
    namespace:string,
    version:number,
    versionName:string
}

export interface PluginManifest{
    pluginId: string,
    name: string,
    description: string,
    execEnter: string,
    version: number,
    versionName: string,
    autoExit: boolean,
}

export interface VersionInfo {
    manifest:PluginManifest
    pluginId:          string
    version:           number
    versionName:       string
    updateDescription: string
    totalSize:         number
    downloadUrl:string
}

export interface PluginInfo{
    id:             string
    name:           string
    description:    string
    version:        number
    versionName:    string
    execEnter:      string
    status:         PluginStatus
    totalSize:      number
    downloadedSize: number
    errorMsg:       string
    endpoint:       string
    pluginDir:      string
    autoExit:       boolean
}

export interface PluginCheckUpdateResult{
    pluginInfo:		PluginInfo
    installed: 		boolean
    firstInstalled: boolean
}

export const getInfo = async (): Promise<MasterInfo> => {
    return (await api.get<ClientResult<MasterInfo>>(genApiUri("", "info"), {
        responseType: "json",
    })).data.body
}

export const checkUpdate = async (): Promise<VersionInfo> => {
    return (await api.get<ClientResult<VersionInfo>>(genApiUri("", "check-update"), {
        responseType: "json",
    })).data.body
}

export const ping = async (): Promise<void> => {
    await api.get<ClientResult<string>>(genApiUri("", "ping"), {
        responseType: "json",
    })
}


export const pluginManager = {
    ping: async (pluginId:string|Plugins): Promise<void> => {
        await api.get<ClientResult<void>>(genApiUri(pluginId, "ping"), {
            responseType: "json",
            timeout: 250
        })
    },
    list: async (): Promise<PluginInfo[]> => {
        return (await api.get<ClientResult<PluginInfo[]>>(genApiUri("", "plugin/list"), {
            responseType: "json",
        })).data.body
    },
    info: async (pluginId:string): Promise<PluginInfo> => {
        return (await api.get<ClientResult<PluginInfo>>(genApiUri("", "plugin/info"), {
            responseType: "json",
            params: {pluginId}
        })).data.body
    },
    start: async (pluginId:string): Promise<void> => {
        await api.get<ClientResult<void>>(genApiUri("", "plugin/start"), {
            responseType: "json",
            params: {pluginId}
        })
    },
    restart: async (pluginId:string): Promise<void> => {
        await api.get<ClientResult<void>>(genApiUri("", "plugin/restart"), {
            responseType: "json",
            params: {pluginId}
        })
    },
    stop: async (pluginId:string): Promise<void> => {
        await api.get<ClientResult<MasterInfo>>(genApiUri("", "plugin/stop"), {
            responseType: "json",
            params: {pluginId}
        })
    },
    uninstall: async (pluginId:string): Promise<void> => {
        await api.get<ClientResult<MasterInfo>>(genApiUri("", "plugin/uninstall"), {
            responseType: "json",
            params: {pluginId}
        })
    },
    checkUpdate: async (pluginId:string): Promise<PluginCheckUpdateResult> => {
       return (await api.get<ClientResult<PluginCheckUpdateResult>>(genApiUri("", "plugin/check-update"), {
            responseType: "json",
            params: {pluginId}
        })).data.body
    }
}