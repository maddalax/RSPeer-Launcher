import {ClientLaunchConfig, ClientLaunchService} from "./ClientLaunchService";
import {Client, QuickLaunch, RemoteQuickStartLaunch, RemoteSimpleLaunch} from "../models/QuickLaunch";
import {AuthorizationService} from "./AuthorizationService";
import {Electron} from "../util/Electron";
import {shutdownApp} from "../index";
import {GetLogsRequest} from "../models/WebsocketMessage";
const process = Electron.require('process');

export class WebsocketMessageParser {
    
    private readonly launchService : ClientLaunchService;
    private readonly authService : AuthorizationService;
    
    constructor(launchService: ClientLaunchService, authService : AuthorizationService) {
        this.launchService = launchService;
        this.authService = authService;
    }

    public async onMessage(message : any, onMessage : (message : any) => any, onError : (error : any) => any) {
        if(!message) {
            return;
        }
        if(!message.type) {
            
            return;
        }
        if(message.type === 'launcher:kill') {
            onError('Received kill command from Bot Management Panel, stopping launcher.');
            setTimeout(() => {
                shutdownApp();
                process.exit(1);
            }, 2000);
        }
        if(message.type === 'launcher:getLogs') {
            
        }
        if(message.type === 'start:client') {
            return await this.startClient(message, onMessage, onError);
        }
    }
    
    private async startClient(message : RemoteSimpleLaunch & RemoteQuickStartLaunch, onMessage : (message : any) => any, onError : (error : any) => any) {
        let converted = message.qs == null ? this.convertToQuickLaunchMessage(message) : message;
        await this.startClientQuickStart(converted, onMessage, onError);
    };
    
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
        };
        await this.launchService.launch(config);
    }
    
    private async getLogs(message : GetLogsRequest) : Promise<any[]> {
        
        return []
    };
    
}