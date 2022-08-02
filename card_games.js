class Card {
    constructor(value, suit) {
        this.value = value;
        this.suit = suit;
    }

    toString() {
        return this.value + this.suit;
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
    "Ace": 'A',
    "2": '2',
    "3": '3',
    "4": '4',
    "5": '5',
    "6": '6',
    "7": '7',
    "8": '8',
    "9": '9',
    "10": 'T',
    "Jack": 'J',
    "Queen": 'Q',
    "King": 'K',
    "Joker": 'JO'
}

const CardSuitEnum = {
    "Spades": 'S',
    "Clubs": 'C',
    "Diamonds": 'D',
    "Hearts": 'H'
}

class CardDeck {
    constructor(jokers=true, populate=true) {
        this.jokers = jokers;
        this.cards = [];
        if (populate) this.populate();
    }

    populate() {
        this.reset();
        
        let sname = '';
        let suit = '';
        let vname = '';
        let value = '';

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
        return card_back();
    }

    toString() {
        return this.cards.map(c => { return c.toString(); }).join(' ');
    }
}

const card_back = () => {
    const filler = "\u259A\u259A\u259A\u259A\u259A";
    return `\u250c\u2500\u2500\u2500\u2500\u2500\u2510\n\u2502${filler}\u2502\n\u2502${filler}\u2502\n\u2502${filler}\u2502\n\u2502${filler}\u2502\n\u2502${filler}\u2502\n\u2514\u2500\u2500\u2500\u2500\u2500\u2518`;
}

module.exports = {
    Card,
    CardSuitEnum,
    CardValueEnum,
    CardDeck,
    card_back
}