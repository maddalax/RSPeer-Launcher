import {Electron} from "./Electron";

const crypto = Electron.require('crypto');
const fs = Electron.require('fs-extra');

export class Encryptor {

    public static encode(key: string, data: any) {
        return new Buffer(this.xor(key, data), 'utf8').toString('base64');
    }

    public static decode(key: string, data: any) {
        return this.xor(key, data);
    }

    private static xor(key : any, data : any[]) {
        let result = [];
        let keyByte = Buffer.from( key, 'utf8' );
        for (let x = 0, y = 0; x < data.length; x++, y++) {
            if (y == keyByte.length) {
                y = 0;
            }
            result[x] = (data[x] ^ keyByte[y]);
        }
        return new Buffer(result).toString('ascii');
    }

    public static sha512HashFromFile(path : string) {
        return new Promise(resolve => {
            const hash = crypto.createHash('sha512');
            fs.createReadStream(path).on('data', (data : any) => hash.update(data)).on('end', () => resolve(hash.digest('hex')));
        });
    }
}