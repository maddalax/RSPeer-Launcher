export interface IAuthorizationService {
    login(email : string, password : string) : Promise<void>;
    getUser() : Promise<any>;
    getSession() : Promise<string | null>;
}