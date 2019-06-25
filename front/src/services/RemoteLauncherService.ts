import {ApiService} from "./ApiService";
import {QuickLaunch} from "../models/QuickLaunch";

export interface Launcher {
    [key : string] : {
        host : string,
        platform : string,
        type : string,
        ip : string,
        identifier : string,
        isMe : boolean
    }
}

export class RemoteLauncherService {
    
    private readonly api : ApiService;
    
    constructor(api: ApiService) {
        this.api = api;
    }
    
    public async getLaunchers() : Promise<Launcher> {
        return await this.api.get('botLauncher/connected');
    }
    
    public async startClient(launcher : string, quickLaunch : QuickLaunch) {
        
    }
    
    public async send(launcher : string, payload : any) {
        console.log(launcher);
        await this.api.post("botLauncher/send", {
            payload,
            socket : launcher
        })
    }
    
}