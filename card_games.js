class Card {
    constructor(value, suit) {
        this.value = value;
        this.suit = suit;
    }

    display() {
        let symbol = "";
        if (this.suit == CardSuitEnum.Clubs) symbol = "\u2667";
        else if (this.suit == CardSuitEnum.Spades) symbol = "\u2664";
        else if (this.suit == CardSuitEnum.Hearts) symbol = "\u2665";
        else if (this.suit == CardSuitEnum.Diamonds) symbol = "\u2666";

        let valueLength = 1;
        if (this.value == CardValueEnum.Ace) valueLength = 3;
        else if (this.value == CardValueEnum[10]) valueLength = 2;
        else if (this.value == CardValueEnum.Jack) valueLength = 4;
        else if (this.value == CardValueEnum.Joker) valueLength = 5;
        else if (this.value == CardValueEnum.King) valueLength = 4;
        else if (this.value == CardValueEnum.Queen) valueLength = 5;

        let value = "";
        switch (valueLength) {
            case 1:
                value = `  ${this.value}  `;
                break;
            case 2:
                value = `  ${this.value} `;
                break;
            case 3:
                value = ` ${this.value} `;
                break;
            case 4:
                value = ` ${this.value}`;
                break;
            case 5:
                value = `${this.value}`;
                break;
        }

        return `\u250c\u2500\u2500\u2500\u2500\u2500\u2510\n\u2502${symbol}   ${symbol}\u2502\n\u2502     \u2502\n\u2502${value}\u2502\n\u2502     \u2502\n\u2502${symbol}   ${symbol}\u2502\n\u2514\u2500\u2500\u2500\u2500\u2500\u2518`;
    }
}

const CardValueEnum = {
    "Ace": 0,
    "2": 1,
    "3": 2,
    "4": 3,
    "5": 4,
    "6": 5,
    "7": 6,
    "8": 7,
    "9": 8,
    "10": 9,
    "Jack": 10,
    "Queen": 11,
    "King": 12,
    "Joker": 13
}

const CardSuitEnum = {
    "Spades": 0,
    "Clubs": 1,
    "Diamonds": 2,
    "Hearts": 3
}

class CardDeck {
    constructor(jokers=true, populate=true) {
        this.jokers = jokers;
        this.cards = [];
        if (populate) this.populate();
    }

    populate() {
        this.reset();
        for([sname, suit] of Object.entries(CardSuitEnum)) {
            for([vname, value] of Object.entries(CardValueEnum)) {
                this.addCard(new Card(value, suit));
            }
        }
    }

    reset() {
        this.cards = [];
    }

    addCard(c) {
        this.cards.push(c);
    }

    draw() {
        return this.cards.pop();
    }

    shuffle() {
        this.cards.sort(() => { return 0.5 - Math.random(); });
    }

    display() {
        const filler = "\u259A\u259A\u259A\u259A\u259A";
        return `\u250c\u2500\u2500\u2500\u2500\u2500\u2510\n\u2502${filler}\u2502\n\u2502${filler}\u2502\n\u2502${filler}\u2502\n\u2502${filler}\u2502\n\u2502${filler}\u2502\n\u2514\u2500\u2500\u2500\u2500\u2500\u2518`;
    }
}

module.exports = {
    Card,
    CardSuitEnum,
    CardValueEnum,
    CardDeck
}