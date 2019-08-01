import { Electron } from "../util/Electron";
import { User } from "../models/User";
import { ApiService } from "./ApiService";
import { guid } from "../util/Util";
import { GetLogsRequest } from "../models/WebsocketMessage";

const axios = Electron.require('axios');
const os = Electron.require('os');

export interface WebsocketOptions {
    onConnect?: () => any
    onDisconnect?: () => any
    onMessage?: (message: any) => any
    onError?: (err: any) => any,
    onReconnect?: (attempt: number) => any
}

export class WebsocketService {

    private apiService: ApiService;
    private readonly identifier: string;
    private static consumed = new Set<number>();

    constructor(apiService: ApiService) {
        this.apiService = apiService;
        this.identifier = guid();
    }
    
    public getIdentifier() {
        return this.identifier;
    }
    
    public async disconnect() {
        await this.apiService.post("botLauncher/unregister", {
            tag: this.identifier
        });
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
        options.onConnect && options.onConnect();
        setInterval(() => {
            this.poll(options, tag);
        }, 5000)
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
            })
        } catch(ex) {
            options.onError && options.onError(ex.toString());
        }
    }

    private async consume(id: number) {
        await this.apiService.post("message/consume?message=" + id, {});
        WebsocketService.consumed.delete(id);
    }

    private async poll(options: WebsocketOptions, tag: string) {
        try {
            const messages = await this.apiService.get("message/get?consumer=" + tag);
            if (Array.isArray(messages)) {
                messages.filter(w => !WebsocketService.consumed.has(w.id)).forEach(m => {
                    WebsocketService.consumed.add(m.id);
                    this.consume(m.id);
                    const payload = m.message;
                    options.onMessage && options.onMessage(JSON.parse(payload));
                })
            }
        } catch (ex) {
            options.onError && options.onError(ex.toString());
        }
    }
}