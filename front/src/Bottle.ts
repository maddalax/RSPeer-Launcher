import Bottle from 'bottlejs';
import {ApiService} from "./services/ApiService";
import {FileService} from "./services/FileService";
import {AuthorizationService} from "./services/AuthorizationService";
import {RouterAccessor} from "./accessors/RouterAccessor";
import {DatabaseService} from "./services/DatabaseService";
import {ClientDependencyService} from "./services/ClientDependencyService";
import {ExecService} from "./services/ExecService";
import {QuickLaunchArgService} from "./services/QuickLaunchArgService";
import {ClientLaunchService} from "./services/ClientLaunchService";
import {WebsocketService} from "./services/WebsocketService";
import {WebsocketMessageParser} from "./services/WebsocketMessageParser";
import {RemoteLauncherService} from "./services/RemoteLauncherService";

const bottle = new Bottle();
bottle.service('ApiService', ApiService);
bottle.service('FileService', FileService);
bottle.service('AuthorizationService', AuthorizationService, 'FileService', 'ApiService');
bottle.service('Router', RouterAccessor);
bottle.service('Database', DatabaseService, 'FileService');
bottle.service('ClientDependencyService', ClientDependencyService, 'FileService', 'ApiService');
bottle.service('ExecService', ExecService, 'FileService', 'Database');
bottle.service('QuickLaunchArgService', QuickLaunchArgService, 'FileService');
bottle.service('ClientLaunchService', ClientLaunchService, 'ClientDependencyService', 'ExecService');
bottle.service('WebsocketService', WebsocketService, 'ApiService');
bottle.service('WebsocketMessageParser', WebsocketMessageParser, 'ClientLaunchService', 'AuthorizationService');
bottle.service('RemoteLauncherService', RemoteLauncherService, 'ApiService');

export function getService<T>(name : string): T {
    return bottle.container[name] as T;
}