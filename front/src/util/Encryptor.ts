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
}