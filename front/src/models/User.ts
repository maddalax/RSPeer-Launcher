export interface User {
    id:              number;
    username:        string;
    email:           string;
    balance:         number;
    isEmailVerified: boolean;
    instances:       number;
    linkKey:         string;
    legacyId:        string;
    disabled:        boolean;
    isOwner:         boolean;
    groups:          Group[];
    groupNames:      string[];
}

export interface Group {
    id:          number;
    name:        string;
    description: string;
}
