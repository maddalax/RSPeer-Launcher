import {IAuthorizationService} from "./base/IAuthorizationService";
import {FileService} from "./FileService";
import {Electron} from "../util/Electron";
import {Encryptor} from "../util/Encryptor";
import {ApiService} from "./ApiService";
import {User} from "../models/User";
const path = Electron.require('path');
const fs = Electron.require('fs-extra');
const os = Electron.require('os');


export class AuthorizationService implements IAuthorizationService {
    
    private readonly fileService : FileService;
    private readonly api : ApiService;
    private user : any;
    
    constructor(fileService: FileService, api : ApiService) {
        this.fileService = fileService;
        this.api = api;
    }

    async getUser(): Promise<User | null> {
        if(this.user) {
            return this.user;
        }
        const session = await this.getSession();
        if(!session) {
            return null;
        }
        this.user = await this.api.post('user/me?full=true', {});
        return this.user;
    }

    async login(email: string, password: string): Promise<void> {
        const result = await this.api.post('user/login', {email, password});
        if(!result.token) {
            return;
        }
        await this.writeSession(result.token);
    }
    
    public async getSession() : Promise<string | null> {
        const file = path.join(await this.fileService.getRsPeerFolder(), 'misc_new');
        if(!await fs.pathExists(file)) {
            return this.getOldSession();
        }
        const results = await fs.readFile(file);
        if(!results || results.length === 0) {
            return null;
        }
        const decoded = Encryptor.decode(this.getKey(), results);
        return String(decoded);
    }
    
    private async getOldSession() : Promise<string | null> {
        const file = path.join(await this.fileService.getRsPeerFolder(), 'rspeer_me');
        if(!await fs.pathExists(file)) {
            return null;
        }
        return await fs.readFile(file, 'utf-8');
    }
    
    public async writeSessionIfNotExist(token : string) {
        const session = await this.getSession();
        if(!session) {
            await this.writeSession(token);
        }
    };
    
    private async writeSession(token : string) : Promise<void> {
        const file = path.join(await this.fileService.getRsPeerFolder(), 'rspeer_me');
        await fs.ensureFile(file);
        await fs.writeFile(file, token);
    }
    
    private getKey() : string {
        return `${os.userInfo().username}${os.homedir()}`
    }
    
}