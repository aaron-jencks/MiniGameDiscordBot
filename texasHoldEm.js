const { SlashCommandBuilder, userMention } = require('discord.js');
const { DiscordCommand } = require('./discord-command-templates.js');
const { CardDeck, card_back } = require("./card_games.js");
const PokerHand = require("poker-hand-evaluator");
const { combinations } = require("./utils.js");

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
        this.lastRound = {
            winners: [],
            amount: 0
        };
    }

    display() {
        let river = [];
        let card_width = -1;
        let card_height = -1;
        let first = true;

        this.river.cards.forEach(c => {
            let lines = c.display().split('\n');
            if (first) {
                first = false;
                card_width = lines[0].length;
                card_height = lines.length;
            }
            river.push(lines);
        });
        if (first) {
            card_width = 7;
            card_height = 7;
        }

        let topBottomBorder = "";
        for (let i = 0; i < (card_width * 5); i++) {
            topBottomBorder += "\u2500";
        }

        let result = "```\nRiver:\n";
        let cardBack = card_back().split('\n');
        result += "\u250C" + topBottomBorder + "\u2510\n";
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
        result += `Current Pot: ${this.pot}\n\nDealer: ${this.getDisplayName(this.dealer)}`;
        result += `\nLittle Blind: ${this.getDisplayName(this.littleBlind)}(50)\nBig Blind: ${this.getDisplayName(this.bigBlind)}(100)\n`;

        result += '\nCurrent Players:\n';
        this.players.forEach(p => {
            result += `${this.players[this.playerIndex] == p ? '\u21d2 ' : '' }${p == this.dealer ? 'D ' : ''}${this.getDisplayName(p)} ${this.playerMap.get(p).folded ? 'FOLD' : ''}\n`;
        })

        result += '```';
        return result;
    }

    buyIn(player, nickname, amt=5000) {
        if (!this.players.includes(player)) {
            if (!this.playerMap.has(player)) {

                console.log(`${nickname} joined the game!`);

                this.playerMap.set(player, {
                    'balance': amt,
                    'hand': new CardDeck(false, false),
                    'needsBet': true,
                    'currentBet': 0,
                    'nickname': nickname,
                    'folded': false,
                });
            }
    
            if (!this.buy_ins.includes(player))
                this.buy_ins.push(player);
        }
    }

    resetPlayer(player, amt=5000) {
        this.playerMap.set(player, {
            'balance': amt,
            'hand': playerMap.get(player).hand,
            'needsBet': true,
            'currentBet': 0,
            'nickname': playerMap.get(player).nickname,
            'folded': this.playerMap.get(player).folded
        });
    }

    nextPlayer() { 
        this.playerIndex = (this.playerIndex + 1) % this.players.length;
        while (this.playerMap.get(this.players[this.playerIndex]).folded) {
            this.playerIndex = (this.playerIndex + 1) % this.players.length;
        }
    }

    getCallAmount(player) {
        return (this.currentBet + ((player === this.bigBlind) ? 100 : 0) + ((player === this.littleBlind) ? 50 : 0)) - this.playerMap.get(player).currentBet;
    }

    isValidBet(player, amt) {
        if (amt <= 0) return true; // all-in/check
        if (this.playerMap.has(player) && this.playerMap.get(player).balance >= amt) {
            if (this.playerMap.get(player).currentBet + amt >= this.currentBet) {
                if (player === this.bigBlind) return amt >= 100; // blinds
                if (player === this.littleBlind) return amt >= 50;
                return true;
            }
        }
        return false;
    }

    dealCards() {
        console.log("Dealing the cards to players");
        this.playerMap.forEach(v => {
            v.hand.reset();
            v.hand.addCard(this.deck.draw());
            v.hand.addCard(this.deck.draw());
            v.folded = false;
            console.log(v.hand.toString());
        });
    }

    bet(player, amount) {
        const tplayer = this.playerMap.get(player);

        if (amount < 0) {
            amount = tplayer.balance;
            this.pot += amount;
            tplayer.balance = 0;
        }
        else {
            this.pot += amount;
            tplayer.balance -= amount;
        }

        if (amount > this.currentBet) this.currentBet = amount;

        tplayer.currentBet += amount;
        tplayer.needsBet = false;
    }

    call(player) {
        let amt = this.getCallAmount(player);

        console.log(`Player needs to bet ${amt}`);

        if (this.isValidBet(player, amt)) {
            this.bet(player, amt);
            return amt;
        }

        return null;
    }

    raise(player, amt) {
        if (this.isValidBet(player, amt) && (amt > this.currentBet || amt < 0)) {
            this.bet(player, amt);

            this.playerMap.forEach(v => {
                if (!v.folded && v.balance > 0) v.needsBet = true;
            })

            this.playerMap.get(player).needsBet = false;
            this.playerMap.get(player).currentBet = this.currentBet;

            return amt;
        }

        return null;
    }

    fold(player) {
        this.playerMap.get(player).folded = true;
    }

    startRound() {
        this.players = this.players.concat(this.buy_ins);
        this.buy_ins = [];
        this.roundState = 0;
        this.nextPhase();
    }

    nextPhase() {
        switch (this.roundState) {
            case 0:
                // Dealing phase

                // Reset the pot
                this.pot = 0;

                // Reset the decks
                this.deck.reset();
                this.deck.populate();
                this.river.reset();
                this.deck.shuffle();

                if (this.players.length > 0)
                {
                    // Deal the cards
                    this.dealCards();

                    // Setup for ante
                    this.playerMap.forEach(v => {
                        v.folded = false;
                        v.needsBet = true;
                        v.currentBet = 0;
                    })
                    this.currentBet = 10;

                    // Determine the dealer and the blinds
                    let dealerIndex = Math.floor(Math.random() * this.players.length);

                    this.dealer = this.players[dealerIndex];
                    console.log(`Selected ${this.getDisplayName(this.dealer)}(${dealerIndex}, ${this.dealer}) as the dealer`);

                    if (dealerIndex < this.players.length - 2) {
                        this.littleBlind = this.players[dealerIndex + 1];
                        this.bigBlind = this.players[dealerIndex + 2];
                    }
                    else {
                        this.littleBlind = this.players[(dealerIndex < this.players.length - 1) ? dealerIndex + 1 : 0];
                        this.bigBlind = this.players[(dealerIndex < this.players.length - 1) ? 0 : 1];
                    }
                }

                this.roundState += 1;
                break;

            case 1:
                // Betting Phase
                let prevPlayer = this.playerIndex;
                this.nextPlayer();
                if (this.playerIndex <= prevPlayer) {
                    let moreBetting = false;
                    this.playerMap.forEach(v => {
                        if (v.needsBet && !v.folded) moreBetting = true;
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

                // Distribution phase
                let scoreMap = new Map();

                // Calculate the scores of each hand
                this.players.forEach(p => {
                    console.log(`${this.playerMap.get(p).nickname}'s hand contents:\n${this.playerMap.get(p).hand.toString()}\nRiver contents:\n${this.river.toString()}`);
                    let combinedHand = this.playerMap.get(p).hand.cards.concat(this.river.cards);
                    let handCombinations = combinations(combinedHand, 5);

                    let tempHand = new CardDeck(false, false);
                    let minScore = 500000;
                    let handType = 'None';
                    handCombinations.forEach(c => {
                        tempHand.cards = c;
                        let ph = new PokerHand(tempHand.toString());
                        console.log(ph.describe());
                        if (ph.getScore() < minScore) {
                            minScore = ph.getScore();
                            handType = ph.getRank().replace('_', ' ');
                        }
                    })

                    scoreMap.set(p, {
                        'score': minScore,
                        'rank': handType
                    });
                })

                // Determine the winners of the round
                let min = 500000;
                let winningPlayers = [];
                scoreMap.forEach((v, k) => {
                    if (v.score < min) {
                        min = v.score;
                        winningPlayers = [{ 'player': k, 'hand': v.rank }];
                    }
                    else if (v.score == min) {
                        winningPlayers.push({ 'player': k, 'hand': v.rank });
                    }
                });

                let splitPot = Math.floor(this.pot / winningPlayers.length);
                this.lastRound.amount = splitPot;
                this.lastRound.winners = []
                winningPlayers.forEach(p => {
                    console.log(`${this.playerMap.get(p.player).nickname} won with a ${p.hand}, they get ${splitPot}`);
                    this.playerMap.get(p.player).balance += splitPot;
                    this.lastRound.winners.push(p);
                });

                break;

        }
    }

    getCurrentBetter() {
        return this.players[this.playerIndex];
    }

    getDisplayName(player) {
        if (this.playerMap.has(player)) return this.playerMap.get(player).nickname;
        else return 'NONE';
    }

    isPlayer(username) {
        return this.players.includes(username);
    }
}

const funcNames = [
    new SlashCommandBuilder().setName('poker_new').setDescription('Creates a new Texas Hold\'em game'),
    new SlashCommandBuilder().setName('poker_start').setDescription('Starts a new Texas Hold\'em game'),
	new SlashCommandBuilder().setName('poker_join').setDescription('Joins the current poker game starting with the next hand'),
    new SlashCommandBuilder().setName('poker_call').setDescription('Bets on the current round in the current poker game'),
    new SlashCommandBuilder().setName('poker_raise').setDescription('Raises the bet on the current round in the current poker game')
        .addIntegerOption(option => option.setName('amount').setDescription('Amount to raise').setRequired(true)),
    new SlashCommandBuilder().setName('poker_fold').setDescription('Folds out of the current poker round'),
    new SlashCommandBuilder().setName('poker_set_balance').setDescription('Sets your current balance for poker currency')
        .addIntegerOption(option => option.setName('balance').setDescription('New balance').setRequired(true)),
    new SlashCommandBuilder().setName('poker_leave').setDescription('Leaves the current poker game'),
    new SlashCommandBuilder().setName('poker_pot').setDescription('Returns the pot amount for the current poker game'),
    new SlashCommandBuilder().setName('poker_balance').setDescription('Returns your player balance for the current poker game'),
    new SlashCommandBuilder().setName('poker_call_amount').setDescription('Returns the amount that you need to bet to call for the current poker game')
]

const funcDefs = [
    new DiscordCommand('poker_new', ctx => { 
        currentGame.set(ctx.guildId, new TexasHoldEmBoard('', '', ''));
        ctx.reply("Created a new Texas Hold'em Game!\n"+currentGame.get(ctx.guildId).display());
    }),

    new DiscordCommand('poker_start', ctx => { 
        if (!currentGame.has(ctx.guildId)) {
            ctx.reply("You need to create a new game first");
            return;
        }
        let myCurrentGame = currentGame.get(ctx.guildId);

        myCurrentGame.startRound();
        ctx.reply(`Starting round with ${myCurrentGame.players.length} player(s)\n${myCurrentGame.display()}\n${userMention(myCurrentGame.getCurrentBetter())} , you are up to bet!`);
    }),

    new DiscordCommand('poker_join', ctx => { 
        if (!currentGame.has(ctx.guildId)) {
            ctx.reply("You need to create a new game first");
            return;
        }
        let myCurrentGame = currentGame.get(ctx.guildId);

        myCurrentGame.buyIn(ctx.user.id, ctx.user.username);
        ctx.reply(`You've joined the current game`);
    }),

    new DiscordCommand('poker_call', ctx => { 
        if (!currentGame.has(ctx.guildId)) {
            ctx.reply("You need to create a new game first");
            return;
        }

        let myCurrentGame = currentGame.get(ctx.guildId);

        if (!myCurrentGame.isPlayer(ctx.user.id)) {
            ctx.reply("Sorry, but you're not a player in this round, you need to join in with `/poker_join`");
            return;
        }
        else if (myCurrentGame.getCurrentBetter() !== ctx.user.id) {
            ctx.reply("You're not up to bet! Wait your turn!");
            return;
        }

        amt = myCurrentGame.call(ctx.user.id);
        if (amt == null) {
            ctx.reply("Sorry, but you can't call right now");
            return;
        }
        else {
            let result = (amt < 0) ? "You're All-in" : `You bet ${amt}`;
            myCurrentGame.nextPhase();

            if (myCurrentGame.roundState < 4) {
                myCurrentGame.nextPhase();
            }
            else if (myCurrentGame.roundState == 4) {
                result += `\n${myCurrentGame.display()}\n`;

                myCurrentGame.nextPhase();

                myCurrentGame.lastRound.winners.forEach(w => {
                    result += `${userMention(w.player)} wins with a ${w.hand} for ${myCurrentGame.lastRound.amount}!\n`;
                })

                result += 'The round is over! use \`/poker_start\` to start the next round!';

                ctx.reply(result);
                return;
            }

            result += ((myCurrentGame.roundState == 1) ? `\n${myCurrentGame.display()}\n${userMention(myCurrentGame.getCurrentBetter())} , you are up to bet!` : '');

            ctx.reply(result);
            return;
        }
    }),

    new DiscordCommand('poker_raise', ctx => { 
        if (!currentGame.has(ctx.guildId)) {
            ctx.reply("You need to create a new game first");
            return;
        }

        let myCurrentGame = currentGame.get(ctx.guildId);

        if (!myCurrentGame.isPlayer(ctx.user.id)) {
            ctx.reply("Sorry, but you're not a player in this round, you need to join in with `/poker_join`");
            return;
        }
        else if (myCurrentGame.getCurrentBetter() !== ctx.user.id) {
            ctx.reply("You're not up to bet! Wait your turn!");
            return;
        }

        const raiseAmount = ctx.options.getInteger("amount");

        amt = myCurrentGame.raise(ctx.user.id, raiseAmount);
        if (amt == null) {
            ctx.reply("Sorry, but you can't raise right now");
            return;
        }
        else {
            let result = (amt < 0) ? "You're All-in" : `You bet ${amt}`;
            myCurrentGame.nextPhase();

            if (myCurrentGame.roundState < 4) {
                myCurrentGame.nextPhase();
            }

            result += ((myCurrentGame.roundState == 1) ? `\n${myCurrentGame.display()}\n${userMention(myCurrentGame.getCurrentBetter())} , you are up to bet!` : '');

            ctx.reply(result);
            return;
        }
    }),

    new DiscordCommand('poker_call_amount', ctx => { 
        if (!currentGame.has(ctx.guildId)) {
            ctx.reply("You need to create a new game first");
            return;
        }

        let myCurrentGame = currentGame.get(ctx.guildId);

        if (!myCurrentGame.isPlayer(ctx.user.id)) {
            ctx.reply("Sorry, but you're not a player in this round, you need to join in with `/poker_join`");
            return;
        }

        amt = myCurrentGame.getCallAmount(ctx.user.id);
        if (amt < 0) {
            ctx.reply("You'd need to go All-in!");
            return;
        }
        else {
            ctx.reply(`You'd need to bet ${amt}!`);
            return;
        }
    }),

    new DiscordCommand('poker_balance', ctx => { 
        if (!currentGame.has(ctx.guildId)) {
            ctx.reply("You need to create a new game first");
            return;
        }

        let myCurrentGame = currentGame.get(ctx.guildId);

        if (!myCurrentGame.isPlayer(ctx.user.id)) {
            ctx.reply("Sorry, but you're not a player in this round, you need to join in with `/poker_join`");
            return;
        }

        amt = myCurrentGame.playerMap.get(ctx.user.id).balance;
        ctx.reply(`You're balance is ${amt}`);
    }),
]

module.exports = {
    funcDefs, funcNames
}