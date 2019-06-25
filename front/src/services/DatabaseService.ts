import {FileService} from "./FileService";
import {Electron} from "../util/Electron";
import {EventBus} from "../event/EventBus";

const sqlite3 = Electron.require('sqlite3').verbose();

export class DatabaseService {

    private fileService: FileService;

    constructor(fileService: FileService) {
        this.fileService = fileService;
    }

    private db: any;

    private async setup() {
        if (!this.db) {
            const path = await this.fileService.getDatabasePath();
            console.log('db path', path);
            this.db = new sqlite3.Database(path);
            const migrate = this.migrations.map(m => this.run(m));
            await Promise.all(migrate);
        }
    }

    public async all(command: string, params: any = {}) {
        return await this.execute(this.db.all, command, params);
    }

    private async run(command: string, params: any = {}) {
        return await this.execute(this.db.run, command, params);
    }

    public async first(command: string, params: any = {}) {
        const results = await this.all(command, params);
        if (Array.isArray(results)) {
            return results.length > 0 ? results[0] : null;
        }
        return null;
    }

    public async getConfig(key: string) {
        await this.setup();
        const query = 'SELECT value from config where key = ? limit 1';
        const result = await this.first(query, [key]);
        return result ? result.value : '';
    }

    public async setConfig(key: string, value: any) {
        const query = 'INSERT OR REPLACE INTO config values (?, ?)';
        return await this.run(query, [key, value]);
    }

    public async writeLog(category: string, type: string, message: string) {
        if(message == null) {
            return;
        }
        if(typeof message === 'object') {
            message = JSON.stringify(message);
        }
        const query = 'INSERT INTO logs(category, type, message) values (?, ?, ?)';
        return await this.run(query, [category, type, message]);
    }

    public async removeLogs(category: string) {
       const query = 'DELETE FROM logs where category = ?';
       return await this.run(query, [category]);
    }

    public async getLogs(category: string, take = 100, skip = 0) : Promise<any> {
        const query = `SELECT (SELECT count(*) from logs where category = ?) as count, * from logs where category = ? order by timestamp desc LIMIT ? OFFSET ?`;
        const results = await this.all(query, [category, category, take, skip]);
        if(results == null || !Array.isArray(results)) {
            return {count : 0, values : null}
        }
        if(results.length === 0) {
            return {count : 0, values : []}
        }
        const count = results[0].count;
        return {count, values: results}
    }

    public async close() {
        if (this.db) {
            await this.db.close();
        }
    }

    private migrations = [
            `create table if not exists config
             (
                 key   text not null,
                 value text
             );
        create unique index if not exists config_key_uindex on config (key);`,
            `create table if not exists logs
             (
                 category  text not null,
                 type      text not null,
                 message   int  not null,
                 timestamp TIMESTAMP default CURRENT_TIMESTAMP not null
             );`
    ];

    private async execute(func: any, command: string, params: any = {}) {
        const promise = new Promise((resolve, reject) => {
            this.db.serialize(() => {
                func(command, params, (err: any, result: any) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve(result);
                });
            });
        });
        try {
            return await promise;
        } catch (e) {
            console.error(e);
            EventBus.getInstance().dispatch('on_error', 'Database error: ' + e.toString());
        }
    }

}