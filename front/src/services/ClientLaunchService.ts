import {sleep} from "../util/Util";
import {Client, QuickLaunch} from "../models/QuickLaunch";
import {ClientDependencyService} from "./ClientDependencyService";
import {ExecService} from "./ExecService";
import {Game} from "../models/Game";

export interface ClientLaunchConfig {
    onLog(message: string): any;
    onError(error: string): any,
    onFinish?(index : number): any,
    jvmArgs? : string[],
    appArgs? : string[],
    count?: number,
    sleep? : number,
    game? : Game,
    quickLaunch: QuickLaunch
}

interface ClientLaunchState {
    index : number;
    client? : Client,
    isQuickLaunch : boolean
}

export class ClientLaunchService {

    public static readonly DEFAULT_JVM_ARGS = ['-Xmx768m', '-Djava.net.preferIPv4Stack=true', '-Djava.net.preferIPv4Addresses=true', '-Xss2m'];
    public static readonly INUVATION_JVM_ARGS = ['-noverify', '-Xmx1g'];

    private static readonly SLEEP = 10;


    private clientService: ClientDependencyService;
    private execService : ExecService;

    constructor(clientService: ClientDependencyService, execService: ExecService) {
        this.clientService = clientService;
        this.execService = execService;
    }

    public async launch(config: ClientLaunchConfig) {
        const isQuickLaunch = config.quickLaunch && config.quickLaunch.clients && config.quickLaunch.clients.length > 0;
        config.count = config.count || 1;
        config.count = isQuickLaunch ? config.quickLaunch.clients.length : config.count;
        const length = this.getSleep(config);
        config.onLog(`Starting ${config.count} clients. Waiting ${length / 1000} seconds between each launch.`);
        if(isQuickLaunch) {
            return await this.launchWithQuickLaunch(config);
        }
        for (let i = 0; i < config.count; i++) {
            const state : ClientLaunchState = {index : i, isQuickLaunch : false};
            // do not await this as the await never finishes due to the process being upon until client closes.
            this.doLaunch(config, state, config.game);
            await this.doSleep(config);
        }
    }

    private async launchWithQuickLaunch(config : ClientLaunchConfig) {
        let index = 0;
        for (let client of config.quickLaunch.clients) {
            const state : ClientLaunchState = {
                index : index,
                client,
                isQuickLaunch : true
            };
            index++;
            config.appArgs = this.getAppArgs(state);
            // do not await this as the await never finishes due to the process being upon until client closes.
            this.doLaunch(config, state, client.game);
            await this.doSleep(config);
        }
    }

    private async doLaunch(config: ClientLaunchConfig, state : ClientLaunchState, game : Game = Game.Osrs) {
        let didError : boolean = false;
        config.jvmArgs = Array.isArray(config.jvmArgs) ? config.jvmArgs : [];
        config.jvmArgs = config.jvmArgs || ClientLaunchService.DEFAULT_JVM_ARGS;
        if(game == Game.Rs3) {
            config.jvmArgs = config.jvmArgs.concat(ClientLaunchService.INUVATION_JVM_ARGS);
        }
        try {
            const jar = await this.clientService.getOrSaveLatestJar(game, (data) => {
                config.onLog(`Downloading client. ${data.current}/${data.size}`);
            });
            await sleep(200);
            try {
                await this.clientService.saveApiJar(game);
            } catch (e) {
                console.error(e);
            }
            setTimeout(() => {
                if (!didError) {
                    const decodedAppArgs = config.appArgs && config.appArgs.length > 1 ? atob(config.appArgs[1]) : '';
                    config.onLog(`Successfully sent command to start client ${state.index + 1}. It should be opening shortly. Arguments used: ${config.jvmArgs!.join(' ')} ${decodedAppArgs}`)
                    config.onLog(`If client does not start, please click "Client Not Starting / Help" button to troubleshoot.`)
                }
                config.onFinish && config.onFinish(state.index);
            }, 2000);
            await this.execService.runJar(jar, config.jvmArgs, config.appArgs);
        } catch (e) {
            didError = true;
            const error = e.message || JSON.stringify(e);
            config.onError(error.toString());
            return;
        }
    }

    private getAppArgs(state : ClientLaunchState) : string[] {
        if(!state.isQuickLaunch || !state.client) {
            return [];
        }
        const c = state.client;
        const payload = {
            RsUsername: c.rsUsername,
            RsPassword: c.rsPassword,
            World: c.world || -1,
            ScriptName: (c.script && c.script.name) || c.scriptName || null,
            IsRepoScript: c.script && c.script.isRepoScript || c.isRepoScript || false,
            ScriptArgs: c.script && c.script.scriptArgs || c.scriptArgs || '',
            UseProxy: c.proxy && c.proxy.ip != null || c.proxyIp != null,
            ProxyPort: c.proxy && c.proxy.port || c.proxyPort,
            ProxyIp: c.proxy && c.proxy.ip || c.proxyIp,
            ProxyUser: c.proxy && c.proxy.username || c.proxyUser,
            ProxyPass: c.proxy && c.proxy.password || c.proxyPass,
            Config: {
                LowCpuMode: c.config && c.config.lowCpuMode,
                SuperLowCpuMode: c.config && c.config.superLowCpuMode,
                EngineTickDelay: c.config && c.config.engineTickDelay,
                DisableModelRendering: c.config && c.config.disableModelRendering,
                DisableSceneRendering: c.config && c.config.disableSceneRendering
            }
        };
        let base64 = btoa(JSON.stringify(payload));
        return ['-qs', base64]
    }

    private getSleep = (config : ClientLaunchConfig) : number => {
        const multiplier = 1000;
        if(config.sleep) {
            return config.sleep > multiplier ? config.sleep : config.sleep * multiplier;
        }
        return ClientLaunchService.SLEEP * multiplier;
    };

    private doSleep = async (config : ClientLaunchConfig) => {
        config.count = config.count || 1;
        if(config.count > 1) {
            const length = await this.getSleep(config);
            await sleep(length);
        }
    }

}