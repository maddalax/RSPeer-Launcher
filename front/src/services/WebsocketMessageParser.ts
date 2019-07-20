import {ClientLaunchConfig, ClientLaunchService} from "./ClientLaunchService";
import {Client, QuickLaunch, RemoteQuickStartLaunch, RemoteSimpleLaunch} from "../models/QuickLaunch";
import {AuthorizationService} from "./AuthorizationService";
import {Electron} from "../util/Electron";
import {shutdownApp} from "../index";
import {GetLogsRequest} from "../models/WebsocketMessage";
import {NsqService} from "./WebsocketService";
import {EventBus} from "../event/EventBus";
import {LauncherInfoService} from "./LauncherInfoService";
const process = Electron.require('process');

export class WebsocketMessageParser {
    
    private readonly launchService : ClientLaunchService;
    private readonly authService : AuthorizationService;
    private readonly launcherInfoService : LauncherInfoService;
    private readonly nsq: NsqService;
    
    constructor(launchService: ClientLaunchService, authService : AuthorizationService, nsq : NsqService, info : LauncherInfoService) {
        this.launchService = launchService;
        this.authService = authService;
        this.nsq = nsq;
        this.launcherInfoService = info;
    }

    public async onMessage(message : any, onMessage : (message : any) => any, onError : (error : any, sentry? : boolean) => any) {
        console.log(message);
        if(!message) {
            return;
        }
        if(!message.type) {
            return;
        }
        if(message.type === 'launcher:kill') {
            onError('Received kill command from Bot Management Panel, stopping launcher.', false);
            setTimeout(() => {
                shutdownApp();
                process.exit(1);
            }, 2000);
        }
        if(message.type === 'launcher:discover') {
            return this.onLauncherDiscover();
        }
        if(message.type === 'launcher:discovery:result') {
            return this.onLauncherDiscoverResult(message);
        }
        if(message.type === 'launcher:getLogs') {
            
        }
        if(message.type === 'start:client') {
            return await this.startClient(message, onMessage, onError);
        }
    }
    
    private async startClient(message : RemoteSimpleLaunch & RemoteQuickStartLaunch, onMessage : (message : any) => any, onError : (error : any) => any) {
        const identifier = message.identifier;
        const info = await this.launcherInfoService.get();
        if(!identifier || identifier !== info.identifier) {
            return;
        }
        let converted = message.qs == null ? this.convertToQuickLaunchMessage(message) : message;
        await this.startClientQuickStart(converted, onMessage, onError);
    };
    
    private async onLauncherDiscover() {
        const info = await this.launcherInfoService.get();
        await this.nsq.dispatch({type : 'launcher:discovery:result', payload : info})   
    }

    private onLauncherDiscoverResult(message : any) {
       EventBus.getInstance().dispatch('launcher_discovered', message.payload);
    }
    
    private convertToQuickLaunchMessage(message : RemoteSimpleLaunch) : RemoteQuickStartLaunch {
        const result : RemoteQuickStartLaunch = {
            jvmArgs : message.jvmArgs,
            session : message.session,
            sleep : message.sleep,
            type : message.type,
            qs : {clients : []}
        };
        for(let i = 0; i < message.count; i++) {
          const client : Client = {
              proxy : message.proxy
          };
          result.qs.clients.push(client);  
        }
        return result;
    }
    
    private async startClientQuickStart(message : RemoteQuickStartLaunch,  onMessage : (message : any) => any, onError : (error : any) => any) {
        if(message.session) {
            await this.authService.writeSessionIfNotExist(message.session);
        }
        const quickLaunch : QuickLaunch = {
            clients : message.qs ? message.qs.clients : [],
        };
        const config : ClientLaunchConfig = {
            quickLaunch,
            count : quickLaunch.clients.length,
            onLog : onMessage,
            onError : onError,
            sleep : message.sleep,
            jvmArgs : message.jvmArgs != null ? message.jvmArgs.split(" ") : []
        };
        await this.launchService.launch(config);
    }
    
    private async getLogs(message : GetLogsRequest) : Promise<any[]> {
        
        return []
    };
    
}