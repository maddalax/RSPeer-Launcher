class ExtendedError extends Error {
    
    public type : string;
    
    constructor(message : string){
        super(message);
        this.name = this.constructor.name;
        this.message = message;
        this.type = "extended_error";
        if (typeof Error.captureStackTrace === 'function'){
            Error.captureStackTrace(this, this.constructor)
        } else {
            this.stack = (new Error(message)).stack
        }
    }
}

export class ApiError extends ExtendedError {
   
    private readonly original : string;
    private readonly newStack : any;
   
    constructor(message : string, error : any) {
        super(message);
        if (!error) throw new Error('RethrownError requires a message and error');
        this.original = error;
        this.newStack = this.stack;
        this.type = "rspeer_api_error";
        let message_lines =  (this.message.match(/\n/g)||[]).length + 1;
        if(this.stack) {
            this.stack = this.stack.split('\n').slice(0, message_lines + 1).join('\n') + '\n' +
                error.stack
        }
    }

    toString(): string {
        return this.message.toString();
    }
}
