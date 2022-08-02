const { SlashCommandBuilder } = require('discord.js');
const { DiscordCommand } = require('./discord-command-templates.js');
const { Card, CardSuitEnum, CardValueEnum, CardDeck, card_back } = require("./card_games.js");
const PokerHand = require("poker-hand-evaluator");

var currentGame = new Map();

class TexasHoldEmBoard {
    constructor(bb, lb, dealer) {
        this.river = new CardDeck(false, false);
        this.deck = new CardDeck(false, true);
        this.pot = 0;
        this.bigBlind = bb;
        this.littleBlind = lb;
        this.dealer = dealer;
        this.players = [];
        this.playerMap = new Map();
        this.buy_ins = [];
        this.playerIndex = 0;
        this.roundState = 0;
        this.currentBet = 0;
    }

    display() {
        let river = [];
        let card_width = -1;
        let card_height = -1;
        let first = true;

        this.river.cards.forEach(c => {
            lines = c.display().split('\n');
            if (first) {
                first = false;
                card_width = lines[0].length;
                card_height = lines.length;
            }
            river.push(lines);
        });
        if (!first) {
            card_width = 7;
            card_height = 7;
        }

        let topBottomBorder = "";
        for (let i = 0; i < (card_width * 5); i++) {
            topBottomBorder += "\u2500";
        }

        let result = "```\nRiver:\n";
        let cardBack = card_back();
        result += "\u250C" + topBottomBorder + "\u2510";
        for (let r = 0; r < card_height; r++) {
            result += "\u2502";

            river.forEach(c => {
                result += c[r];
            });

            if (river.length < 5) {
                let diff = 5 - river.length;
                for (let b = 0; b++ < diff;) {
                    result += cardBack[r];
                }
            }

            result += "\u2502\n";
        }
        result += "\u2514" + topBottomBorder + "\u2518\n";
        result += `Current Pot: ${this.pot}\nDealer: ${this.dealer}\nLittle Blind: ${this.littleBlind}(50)\nBig Blind: ${this.bigBlind}(100)`;
        return result;
    }

    buyIn(player, amt=5000) {
        if (!this.players.includes(player)) {
            if (!this.playerMap.has(player)) {
                this.playerMap.set(player) = {
                    'balance': amt,
                    'hand': new CardDeck(false, false),
                    'needsBet': true,
                    'currentBet': 0
                };
            }
    
            if (!this.buy_ins.includes(player))
                this.buy_ins.push(player);
        }
    }

    resetPlayer(player, amt=5000) {
        this.playerMap.set(player) = {
            'balance': amt,
            'hand': playerMap.get(player).hand,
            'needsBet': true,
            'currentBet': 0
        };
    }

    nextPlayer() { 
        this.playerIndex = (this.playerIndex + 1) % this.players.length;
    }

    isValidBet(player, amt) {
        if (amt <= 0) return true; // all-in/check
        if (this.playerMap.has(player) && this.playerMap.get(player).balance <= amt) {
            if (this.playerMap.get(player).currentBet + amt >= this.currentBet) {
                if (player === this.bigBlind) return amt >= 100; // blinds
                if (player === this.littleBlind) return amt >= 50;
                return true;
            }
        }
        return false;
    }

    dealCards() {
        this.playerMap.forEach(v, k, m => {
            v.hand.reset();
            v.hand.addCard(this.deck.draw());
            v.hand.addCard(this.deck.draw());
        })
    }

    call(player, amt) {
        if (this.isValidBet(player, amt)) {
            this.pot += amt;

            this.playerMap.get(player).currentBet += amt;
            this.playerMap.get(player).needsBet = false;
        }
    }

    raise(player, amt) {
        if (this.isValidBet(player, amt) && amt > this.currentBet) {
            this.pot += amt;
            this.currentBet = amt;

            this.playerMap.forEach(v, k, m => {
                v.needsBet = true;
            })

            this.playerMap.get(player).needsBet = false;
            this.playerMap.get(player).currentBet = this.currentBet;
        }
    }

    fold(player) {
        this.players = this.players.filter(p => p !== player);
        this.buy_ins.push(player)
    }

    nextPhase() {
        switch (this.roundState) {
            case 0:
                // Dealing phase

                // Reset the decks
                this.deck.reset();
                this.deck.populate();
                this.river.reset();
                this.deck.shuffle();

                // Deal the cards
                this.dealCards();

                // Setup for ante
                this.playerMap.forEach(v, k, m => {
                    v.needsBet = true;
                })
                this.currentBet = 10;

                // Determine the dealer and the blinds
                let dealerIndex = Math.random() % this.players.length;
                this.dealer = this.players[dealerIndex];
                if (dealerIndex < this.players.length - 2) {
                    this.littleBlind = this.players[dealerIndex + 1];
                    this.bigBlind = this.players[dealerIndex + 2];
                }
                else {
                    this.littleBlind = this.players[(dealerIndex < this.players.length - 1) ? dealerIndex + 1 : 0];
                    this.bigBlind = this.players[(dealerIndex < this.players.length - 1) ? 0 : 1];
                }

                this.roundState += 1;
                break;

            case 1:
                // Betting Phase
                this.nextPlayer();
                if (this.playerIndex == 0) {
                    let moreBetting = false;
                    this.playerMap.forEach(v, k, m => {
                        if (v.needsBet) moreBetting = true;
                    })
                    if (!moreBetting) {
                        if (this.river.cards.length == 0) this.roundState = 2;
                        else if (this.river.cards.length < 5) this.roundState = 3;
                        else this.roundState = 4;
                    }
                }
                break;

            case 2:
                // River Phase
                this.river.addCard(this.deck.draw());
                this.river.addCard(this.deck.draw());

            case 3:
                // additional river phase
                this.river.addCard(this.deck.draw());
                this.roundState = 1;
                break;

            case 4:
                this.roundState = 0;
                // // Distribution phase
                // let scoreMap = new Map();

                // // Calculate the scores of each hand
                // this.players.forEach(p => {
                //     scoreMap.set(p) = (new PokerHand(this.playerMap.get(p).hand.toString())).getScore();
                // })

                // // Determine the winners of the round
                // let min = 500000;
                // let winningPlayers = [];
                // this.scoreMap.forEach(v, k, m => {
                //     if (v < min) {
                //         min = v;
                //         winningPlayers = [k];
                //     }
                //     else if (v == min) {
                //         winningPlayers.push(k);
                //     }
                // });
                break;

        }
    }
}

const funcNames = [
    new SlashCommandBuilder().setName('poker_new').setDescription('Starts a new Texas Hold\'em game'),
	new SlashCommandBuilder().setName('poker_join').setDescription('Joins the current poker game starting with the next hand'),
    new SlashCommandBuilder().setName('poker_call').setDescription('Bets on the current round in the current poker game'),
    new SlashCommandBuilder().setName('poker_raise').setDescription('Raises the bet on the current round in the current poker game')
        .addIntegerOption(option => {
            option.setName('amount').setDescription('Amount to raise').setRequired(true);
        }),
    new SlashCommandBuilder().setName('poker_fold').setDescription('Folds out of the current poker round'),
    new SlashCommandBuilder().setName('poker_set_balance').setDescription('Sets your current balance for poker currency')
        .addIntegerOption(option => {
            option.setName('balance').setDescription('New balance').setRequired(true);
        }),
    new SlashCommandBuilder().setName('poker_leave').setDescription('Leaves the current poker game')
]

const funcDefs = [
    new DiscordCommand('poker_new', ctx => { 
        currentGame.set(ctx.guildId, new TexasHoldEmBoard('', '', ''));
        ctx.reply("Created a new Texas Hold'em Game!\n"+currentGame.get(ctx.guildId).display());
    })
]

module.exports = {
    funcDefs, funcNames
}