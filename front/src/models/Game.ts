export enum Game {
    Osrs,
    Rs3,
    Both
}

export const GameFormatted = (game : Game) => {
    switch (game) {
        case Game.Osrs:
            return "Runescape 2007";
        case Game.Rs3:
            return "Runescape 3";
        case Game.Both:
            return "All"
    }
};