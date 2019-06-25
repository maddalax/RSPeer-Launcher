let router : any = null;

export class RouterAccessor {
    
    get() : any {
        if(!router) {
            throw new Error('Router has not been set.');
        }
        return router;
    }
    
    set(value : any) {
        router = value;
    }
}