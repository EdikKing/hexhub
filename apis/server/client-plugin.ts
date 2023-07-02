import {api, ServerResult} from "~/apis/server/base";

export interface PluginManifestResult{
    pluginId: string,
    name: string,
    description: string,
    execEnter: string,
    version: number,
    versionName: string,
    autoExit: boolean,
}

export interface PluginVersionResult{
    manifest?: PluginManifestResult,
    pluginId: string,
    version: number,
    versionName: string,
    updateDescription: string,
    downloadUrl: string,
    fileName: string,
    totalSize: number,
    os: string,
    arch: string,
    created: string,
    updated: string
}


export const getMasterLatestVersionList = async (): Promise<Record<string,PluginVersionResult>> => {
    return (await api.get<ServerResult<Record<string,PluginVersionResult>>>("client/plugin/master-latest-version-list", {
        responseType: "json",
    })).data.data
}


export const getPluginLatestVersion = async (pluginId:String,os:String,arch:String,): Promise<PluginVersionResult> => {
    return (await api.get<ServerResult<PluginVersionResult>>("client/plugin/latest-version", {
        responseType: "json",
        params: {pluginId,os,arch},
    })).data.data
}