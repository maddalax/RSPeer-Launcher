export interface QuickLaunch {
    rspeerEmail?:      string;
    rspeerPassword?:   string;
    autoUpdateClient?: boolean;
    clients:          Client[];
}

export interface RemoteQuickStartLaunch {
    jvmArgs? : string,
    qs : {clients : Client[]},
    session : string,
    sleep? : number,
    type : string
}

export interface RemoteSimpleLaunch {
    count : number,
    identifier? : string,
    jvmArgs : string,
    proxy : Proxy,
    session : string,
    sleep : number,
    type : string
}

export interface Client {
    rsUsername?:   string;
    rsPassword?:   string;
    world?:        number;
    scriptName?:   string;
    isRepoScript?: boolean;
    scriptArgs?:   string;
    useProxy?:     boolean;
    proxyPort?:    number;
    proxyIp?:      string;
    proxyUser?:    string;
    proxyPass?:    string;
    config?:       Config;
    proxy? : Proxy | null,
    script? : Script | null
}

export interface Script {
    isRepoScript : boolean,
    name : string,
    scriptArgs : string,
    scriptId : string
}

export interface Proxy {
    ip : string,
    port : number,
    username : string,
    password : string
}

export interface Config {
    lowCpuMode:            boolean;
    superLowCpuMode:       boolean;
    engineTickDelay:       number;
    disableModelRendering: boolean;
    disableSceneRendering: boolean;
}

export interface QuickLaunchParseResult {
    config : QuickLaunch | null;
    logs : string[]
    errors : string[]
    noArgs : boolean
}

export interface QuickLaunchCheckResult {
    shouldLogin : boolean
    failedLogin : boolean
}