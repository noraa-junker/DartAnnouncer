export class Player {
    name: string;
    score: number = 501;
    id: number;
    legsWon: number = 0;

    constructor(name: string, id: number) {
        this.name = name;
        this.id = id;
    }
}