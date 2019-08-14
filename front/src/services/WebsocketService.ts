import { Electron } from "../util/Electron";
import { User } from "../models/User";
import { ApiService } from "./ApiService";
import { guid } from "../util/Util";
import { GetLogsRequest } from "../models/WebsocketMessage";
import {isApiError} from "../util/ErrorUtil";
import {ApiError} from "../models/ApiError";

const axios = Electron.require('axios');
const os = Electron.require('os');

export interface WebsocketOptions {
    onConnect?: () => any
    onDisconnect?: (err : any) => any
    onMessage?: (message: any) => any
    onError?: (err: any) => any,
    onReconnect?: (attempt: number) => any
}

export class WebsocketService {

    private apiService: ApiService;
    private readonly identifier: string;
    private static consumed = new Set<number>();
    private errors : ApiError[] = [];
    private disconnected : boolean;
    private connecting : boolean;

    constructor(apiService: ApiService) {
        this.apiService = apiService;
        this.identifier = guid();
        this.connecting = true;
        this.disconnected = false;
    }
    
    public getIdentifier() {
        return this.identifier;
    }
    
    public async disconnect() {
        await this.apiService.post("botLauncher/unregister", {
            tag: this.identifier
        });
    }
    
    private checkConnection() {
      if(this.errors.length < 3) {
          return;
      }
      this.disconnected = true;
    }

    public async connect(user: User, options: WebsocketOptions) {
        let ip = '';
        try {
            const { data } = await axios.get('https://checkip.amazonaws.com');
            ip = data != null ? data.toString().trim() : '';
        } catch (e) {
            console.error(e);
        }
        const tag = this.identifier;
        await this.register(options, ip, user, tag);
        await this.poll(options, tag);
        this.disconnected = false;
        setInterval(() => {
           this.checkConnection();
        }, 5000);
        setInterval(() => {
            this.poll(options, tag);
        }, 5000);
        setInterval(() => {
            this.register(options, ip, user, tag)
        }, 30000)
    }

    private async register(options : WebsocketOptions, ip: string, user: User, tag: string) {
        try {
            await this.apiService.post("botLauncher/register", {
                userId: user.id,
                tag,
                ip,
                machineUsername: os.userInfo().username,
                platform: os.type(),
                host: os.hostname(),
            });
            if(this.disconnected || this.connecting) {
                options.onConnect && options.onConnect();
            }
        } catch(ex) {
           this.onError(ex, options);
        }
    }

    private async consume(id: number) {
        try {
            await this.apiService.post("message/consume?message=" + id, {});
            WebsocketService.consumed.delete(id);
        } catch (e) {
            console.error("Failed to consume message", id);
        }
    }

    private async poll(options: WebsocketOptions, tag: string) {
        try {
            const messages = await this.apiService.get("message/get?consumer=" + tag);
            if (!Array.isArray(messages)) {
                options.onError && options.onError(new ApiError("Messages was not an array.", new Error()));
                return;
            }
            if(this.disconnected) {
                options.onConnect && options.onConnect();
            }
            this.connecting = false;
            this.disconnected = false;
            this.errors = [];
            messages.filter(w => !WebsocketService.consumed.has(w.id)).forEach(m => {
                WebsocketService.consumed.add(m.id);
                this.consume(m.id);
                const payload = m.message;
                options.onMessage && options.onMessage(JSON.parse(payload));
            })
        } catch (ex) {
           this.onError(ex, options);
        }
    }
    
    private onError(ex : any, options : WebsocketOptions) {
        if(this.disconnected) {
            options.onDisconnect && options.onDisconnect(ex);
        }
        if(isApiError(ex)) {
            if(this.errors.length < 3) {
                this.errors.push(ex);
            }
            return;
        }
        options.onError && options.onError(ex);
    }
}