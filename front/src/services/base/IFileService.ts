export interface IFileService {
    getRsPeerFolder() : Promise<string>;
    getJavaPath() : Promise<string>;
    getJavaFolderName() : string;
    getBotDataFolder() : Promise<string>;
    getHomeDirectory() : string;
    getSystemUsername() : string;
    exists(path : string) : Promise<boolean>;
    unzip(path : string, dest : string, onData : (data : any) => any) : Promise<string>;
}