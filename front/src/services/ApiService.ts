import axios from 'axios';
import {getService} from "../Bottle";
import {AuthorizationService} from "./AuthorizationService";
import {Http} from "../util/Http";
import {ApiError} from "../models/ApiError";

declare global {
    interface Window { rspeer: {apiUrl : string, env : {isDev : boolean, isStaging : boolean, isProd : boolean} } }
}

export interface ApiConfig {
    supressAlert? : boolean
    throwError? : boolean
}

export class ApiService {

    private apiConfig : ApiConfig;
    private session : string;

    constructor(config : ApiConfig = {supressAlert : false, throwError : false}) {
        this.apiConfig = config;
        this.session = "";
    }

    private buildConfig = async () => {
        if(!this.session) {
            const auth = getService<AuthorizationService>('AuthorizationService');
            this.session = await auth.getSession() || "";
        }
        const headers : any = {};
        if(this.session) {
            headers.Authorization = "Bearer " + this.session;
        }
        return {
            headers
        };
    };

    private buildPath = (path : string) => {
        return `${window.rspeer.apiUrl}${path}`
    };

    public async post(path : string, body : any, headers? : any) : Promise<any> {
        return this.execute(async () => {
            let config = await this.buildConfig();
            config.headers = Object.assign(config.headers, headers);
            const {data} = await axios.post(this.buildPath(path), body, config);
            return data;
        });
    }

    public async postFormData(path : string, body : any) : Promise<any> {
        const formData = new FormData();
        Object.keys(body).forEach(key => {
            formData.append(key, body[key])
        });
        return this.execute(async () => {
            let config = await this.buildConfig();
            config.headers['content-type'] = 'multipart/form-data';
            const {data} = await axios.post(this.buildPath(path), formData, config);
            return data;
        });
    }

    public async get(path : string) : Promise<any> {
        return await this.execute(async () => {
            const {data} = await axios.get(this.buildPath(path), await this.buildConfig());
            return data;
        })
    }

    public async download(path : string, dest : string, addAuth : boolean, onData? : (data : any) => any) : Promise<void> {
        let url = window.rspeer.apiUrl.toString();
        url = url.replace("https://", "").replace("http://", "");
        url = url.replace("/api/", "");
        return await this.execute(() => Http.download(url, `/api/${path}`, dest, addAuth, onData));
    }
    
    private async execute(func : () => Promise<any>) {
        try {
            return await func();
        } catch (e) {
            throw this.parseError(e);
        }
    }

    private parseError = (ex : any) => {
        if(ex.toString().includes('failed with status code 429')) {
            return new ApiError('You have been rate-limited. Please try again in a few minutes.', ex);
        }
        if(typeof ex === 'string') {
            return new ApiError(ex.toString(), ex);
        }
        if(!ex.response) {
            const str = ex.toString();
            if(str.startsWith("Error: Network Error")) {
                return new ApiError('Failed to connect to RSPeer Servers.', ex)
            }
            return new ApiError(JSON.stringify(ex), ex);
        }
        const error = ex.response.data;
        return new ApiError(error.error || 'Something went wrong.', ex);
    };
}