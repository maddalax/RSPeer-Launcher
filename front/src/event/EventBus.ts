export class EventBus {
    
    private static _instance : EventBus;
    
    public static getInstance() : EventBus {
        if(!EventBus._instance) {
            EventBus._instance = new EventBus();
        }
        return EventBus._instance;
    }
    
    private listeners : {[event : string] : [(data : any) => void | any]} = {};
    
    public register(event: string, callback: (data : any) => void | any) {
        if(!this.listeners[event]) {
            this.listeners[event] = [() => {}];
        }
        if(!callback) {
            return;
        }
        this.listeners[event].push(callback);
    }
    
    public unregister(event : string, callback : (data : any) => void | any) {
        if(!this.listeners[event]) {
           return;
        }
        const index = this.listeners[event].indexOf(callback);
        this.listeners[event].splice(index, 1);
    }
    
    public dispatch(event : string, payload : any) {
        const listeners = this.listeners[event];
        if(!listeners) {
            return;
        }
        listeners.forEach(l => l(payload));
    }
    
}