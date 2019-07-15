import { camelCase } from 'lodash';


export const sleep = (timeout : number) => {
    return new Promise(res => setTimeout(res, timeout))
};

export const camelizeKeys = (obj : any) : any => {
    if (Array.isArray(obj)) {
        return obj.map(v => camelizeKeys(v));
    } else if (obj !== null && obj.constructor === Object) {
        return Object.keys(obj).reduce(
            (result, key) => ({
                ...result,
                [camelCase(key)]: camelizeKeys(obj[key]),
            }),
            {},
        );
    }
    return obj;
};

export const guid = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

export const formatDate = (value : string, includeTime : boolean = true) => {
    const date = new Date(value);
    return includeTime ? date.toLocaleString() : date.toDateString();
};

export const jsonClone = (obj : any) => {
    return JSON.parse(JSON.stringify(obj));
};
    