import {Electron} from "../util/Electron";
import {FileService} from "./FileService";
import {QuickLaunch, QuickLaunchParseResult} from "../models/QuickLaunch";
const fs = Electron.require('fs-extra');
import axios from 'axios';
import {camelizeKeys} from "../util/Util";
import {getService} from "../Bottle";
import {AuthorizationService} from "./AuthorizationService";

const process = Electron.require('process');

export class QuickLaunchArgService {

    private fileService: FileService;

    constructor(file: FileService) {
        this.fileService = file;
    }

    public async build() : Promise<QuickLaunchParseResult> {
        const config = this.getQuickLaunchConfig();
        const parseResult : QuickLaunchParseResult = {
            errors : [],
            logs : [],
            config : null,
            noArgs : config.length === 0
        };
        if (parseResult.noArgs) {
            return parseResult;
        }
        const arg = config[0];
        parseResult.logs.push(`Attempting to parse quick launch configuration from specified argument "${arg}"`);
        const methods = [this.checkFile, this.checkBase64, this.checkHttp];
        for (let method of methods) {
            let result = await method(this, arg, parseResult);
            if(result != null) {
                parseResult.config = camelizeKeys(result);
                parseResult.logs.push(`Successfully parsed quick launch configuration.\n${JSON.stringify(parseResult.config, null, 2)}`);
                return parseResult;
            }
        }
        parseResult.errors.push(`Unable to parse specified quick launch argument: "${arg}". Attempted 3 methods and all methods failed.`);
        return parseResult;
    }
    
    public async shouldLogin(result : QuickLaunchParseResult) {
        if(result.config == null || !result.config.rspeerEmail || !result.config.rspeerPassword) {
            return;
        }
        const auth = getService<AuthorizationService>('AuthorizationService');
        const user = await auth.getUser();
        return user == null || user.email !== result.config.rspeerEmail;
    }
    
    public async login(result : QuickLaunchParseResult) {
        if(result.config == null || !result.config.rspeerEmail || !result.config.rspeerPassword) {
            return;
        }
        const auth = getService<AuthorizationService>('AuthorizationService');
        await auth.login(result.config.rspeerEmail, result.config.rspeerPassword);
    }

    public hasQuickLaunchArgs() {
        return this.getQuickLaunchConfig().length !== 0;
    }
    
    private getQuickLaunchConfig(): string[] {
        let args: string[] = process.argv;
        args = args.filter(s => !s.includes('electron') && s !== '.' && !s.startsWith("-"));
        return args;
    }
    
    private async checkFile(context : any, arg: string, result : QuickLaunchParseResult): Promise<QuickLaunch | null> {
        result.logs.push(`Checking if argument is a file. ${arg}`);
        if(!await context.fileService.exists(arg)) {
            result.errors.push('File was not found: ' + arg);
            return null;
        }
        result.logs.push(`Argument was indeed a file, attempting to read JSON from the file: ${arg}.`);
        try {
            return await fs.readJson(arg);
        } catch (e) {
            result.errors.push(e);
            return null;
        }
    }

    private async checkHttp(context : any, arg: string, result : QuickLaunchParseResult): Promise<QuickLaunch | null> {
        try {
            result.logs.push(`Checking a valid url by sending an HTTP GET. ${arg}`);
            const {data} = await axios.get(arg);
            return typeof data === 'string' ? JSON.parse(data) : data;
        } catch (e) {
            result.errors.push(e);
            return null;
        }
    }

    private async checkBase64(context : any, arg: string, result : QuickLaunchParseResult): Promise<QuickLaunch | null> {
        result.logs.push(`Checking if the argument is a base64 encoded string. ${arg}`);
        let json = Buffer.from(arg, 'base64').toString('ascii');
        try {
            return JSON.parse(json);
        } catch (e) {
            result.errors.push(e);
            return null;
        }
    }
}