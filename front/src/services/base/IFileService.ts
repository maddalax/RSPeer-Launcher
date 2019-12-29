import {Game} from "../../models/Game";

export interface IFileService {
    getRsPeerFolder(game : Game) : Promise<string>;
    getJavaPath() : Promise<string | null>;
    getJavaFolderName() : Promise<string>;
    getBotDataFolder(game : Game) : Promise<string>;
    getHomeDirectory() : string;
    getSystemUsername() : string;
    exists(path : string) : Promise<boolean>;
    unzip(path : string, dest : string, onData : (data : any) => any) : Promise<string>;
}