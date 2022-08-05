const { concatMultilineStrings } = require('./utils.js');

class Card {
    constructor(value, suit) {
        this.value = value;
        this.suit = suit;
    }

    toString() {
        return CardValueEnum.convertToLib(this.value) + this.suit;
    }

    display() {
        let symbol = "";
        if (this.suit == CardSuitEnum.Clubs) symbol = "\u2663";
        else if (this.suit == CardSuitEnum.Spades) symbol = "\u2660";
        else if (this.suit == CardSuitEnum.Hearts) symbol = "\u2665";
        else if (this.suit == CardSuitEnum.Diamonds) symbol = "\u2666";
        else symbol = "J";

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
    "Ace": 'Ace',
    "2": '2',
    "3": '3',
    "4": '4',
    "5": '5',
    "6": '6',
    "7": '7',
    "8": '8',
    "9": '9',
    "10": '10',
    "Jack": 'Jack',
    "Queen": 'Queen',
    "King": 'King',
    "Joker": 'Joker',
    convertToLib: c => {
        if (c === CardValueEnum.Ace) return 'A';
        else if (c === CardValueEnum[10]) return 'T';
        else if (c === CardValueEnum.Jack) return 'J';
        else if (c === CardValueEnum.Queen) return 'Q';
        else if (c === CardValueEnum.King) return 'K';
        else if (c === CardValueEnum.Joker) return 'JO';
        else return c;
    }
}

const CardSuitEnum = {
    "Spades": 'S',
    "Clubs": 'C',
    "Diamonds": 'D',
    "Hearts": 'H',
    "None": "N"
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
            if (suit !== CardSuitEnum.None) {
                for([vname, value] of Object.entries(CardValueEnum)) {
                    if (value !== CardValueEnum.Joker && value !== CardValueEnum.convertToLib) 
                        this.addCard(new Card(value, suit));
                }
            }
        }

        if (this.jokers) {
            this.addCard(new Card(CardValueEnum.Joker, CardSuitEnum.None));
            this.addCard(new Card(CardValueEnum.Joker, CardSuitEnum.None));
        }

        console.log(`Created a deck with ${this.cards.length} cards in it`);
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
        return (this.cards.length == 0) ? card_back() : concatMultilineStrings(this.cards.map(c => c.display()));
    }

    displayTopN(n) {
        let cards = this.cards.map(c => c.display());
        if (cards.length >= n) return concatMultilineStrings(cards.slice(0, n));
        while (cards.length < n) cards.push(card_back());
        return concatMultilineStrings(cards);
    }

    toString() {
        return this.cards.map(c => { return c.toString(); }).join(' ');
    }
}

const card_back = () => {
    const filler = "\u2591\u2591\u2591\u2591\u2591";
    return `\u250c\u2500\u2500\u2500\u2500\u2500\u2510\n\u2502${filler}\u2502\n\u2502${filler}\u2502\n\u2502${filler}\u2502\n\u2502${filler}\u2502\n\u2502${filler}\u2502\n\u2514\u2500\u2500\u2500\u2500\u2500\u2518`;
}

module.exports = {
    Card,
    CardSuitEnum,
    CardValueEnum,
    CardDeck,
    card_back
}