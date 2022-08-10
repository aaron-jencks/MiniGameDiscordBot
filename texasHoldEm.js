const { SlashCommandBuilder, userMention } = require('discord.js');
const { DiscordCommand } = require('./discord-command-templates.js');
const { CardDeck } = require("./card_games.js");
const PokerHand = require("poker-hand-evaluator");
const { combinations, boxString, stringAlignmentEnum, concatMultilineStrings } = require("./utils.js");

var currentGame = new Map();

class TexasHoldEmBoard {
    constructor(host, bb, lb, dealer) {
        this.river = new CardDeck(false, false);
        this.deck = new CardDeck(false, true);
        this.pot = 0;
        this.bigBlind = bb;
        this.littleBlind = lb;
        this.dealer = dealer;
        this.dealerSet = false;
        this.host = host.id;
        this.hostName = host.username;
        this.bettingStart = {
            bigBlind : 0,
            littleBlind : 0
        };
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
        let result = "```\nHost: " + this.hostName + "\nRiver:\n";
        result += boxString(this.river.displayTopN(5));
        result += `\nCurrent Pot: ${this.pot}\nCurrent Bet to match: ${this.currentBet}\n\nDealer: ${this.getDisplayName(this.dealer)}\n`;
        // result += `\nLittle Blind: ${this.getDisplayName(this.littleBlind)}(50)\nBig Blind: ${this.getDisplayName(this.bigBlind)}(100)\n`;

        result += '\nCurrent Players:\n';
        this.players.forEach(p => {
            let tplayer = this.playerMap.get(p);
            result += `${this.players[this.playerIndex] == p ? '\u21d2 ' : '' }${p == this.dealer ? 'D ' : ''}${this.getDisplayName(p)} ${tplayer.folded ? 'FOLD' : `${tplayer.currentBet} of ${tplayer.balance}`}\n`;
        })

        result += '```';
        return result;
    }

    buyIn(player, nickname, userObj, amt=5000) {
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
                    'discordObj': userObj,
                    'roundBet': 0
                });
            }
    
            if (this.roundState != 0) {
                if (!this.buy_ins.includes(player))
                    this.buy_ins.push(player);
            }
            else {
                if (!this.players.includes(player))
                    this.players.push(player);
            }
        }
    }

    resetPlayer(player, amt=5000) {
        this.playerMap.set(player, {
            'balance': amt,
            'hand': playerMap.get(player).hand,
            'needsBet': true,
            'currentBet': 0,
            'nickname': playerMap.get(player).nickname,
            'folded': this.playerMap.get(player).folded,
            'discordObj': this.playerMap.get(player).discordObj,
            'roundBet': this.playerMap.get(player).roundBet
        });
    }

    nextPlayer() { 
        this.playerIndex = (this.playerIndex + 1) % this.players.length;
        while (this.playerMap.get(this.players[this.playerIndex]).folded) {
            this.playerIndex = (this.playerIndex + 1) % this.players.length;
        }
    }

    getCallAmount(player) {
        // if (player === this.bigBlind && this.currentBet < 100) return 100 - this.playerMap.get(player).currentBet;
        // if (player === this.littleBlind && this.currentBet < 50) return 50 - this.playerMap.get(player).currentBet;
        return this.currentBet - this.playerMap.get(player).currentBet;
    }

    isValidBet(player, amt) {
        console.log(`The current bet is ${this.currentBet}`);
        if (amt <= 0) return true; // all-in/check
        if (this.playerMap.has(player) && this.playerMap.get(player).balance >= amt) {
            console.log(`${this.playerMap.get(player).nickname} has contributed ${this.playerMap.get(player).currentBet + amt} to the pot`);
            if (this.playerMap.get(player).currentBet + amt >= this.currentBet) {
                // if (player === this.bigBlind) return amt >= 100; // blinds
                // if (player === this.littleBlind) return amt >= 50;
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

                    if (!this.dealerSet) {
                        // Determine the dealer and the blinds
                        let dealerIndex = Math.floor(Math.random() * this.players.length);
                        this.setDealerFromIndex(dealerIndex);
                    }
                    else console.log('Dealer was preset');

                    this.playerIndex = this.bettingStart.littleBlind;   // Would have to be changed if the blinds were reimplemented.
                }

                this.roundState += 1;
                break;

            case 1:
                // Betting Phase
                this.nextPlayer();
                console.log(`Moved player to ${this.playerIndex}`);

                let moreBetting = false;
                this.playerMap.forEach(v => {
                    if (v.needsBet && !v.folded) {
                        console.log(`${v.nickname} still needs to bet`);
                        moreBetting = true;
                    }
                })
                if (!moreBetting) {
                    console.log("Updating roundstate after betting");
                    if (this.river.cards.length == 0) this.roundState = 2;
                    else if (this.river.cards.length < 5) this.roundState = 3;
                    else this.roundState = 4;
                }

                break;

            case 2:
                // River Phase
                console.log("Performing the flop");
                this.river.addCard(this.deck.draw());
                this.river.addCard(this.deck.draw());

            case 3:
                // additional river phase
                console.log("Performing additional flops");
                this.river.addCard(this.deck.draw());
                // Reset the better
                this.playerIndex = this.bettingStart.littleBlind;

                // Reset the board state
                this.playerMap.forEach(v => {
                    v.needsBet = true;
                    v.currentBet = 0;
                })
                this.currentBet = 0;

                // Go back to betting
                this.roundState = 1;
                break;

            case 4:
                this.roundState = 0;

                // Distribution phase
                let scoreMap = new Map();

                // Calculate the scores of each hand
                this.players.forEach(p => {
                    if (!this.playerMap.get(p).folded) {
                        console.log(`${this.playerMap.get(p).nickname}'s hand contents:\n${this.playerMap.get(p).hand.toString()}\nRiver contents:\n${this.river.toString()}`);
                        let combinedHand = this.playerMap.get(p).hand.cards.concat(this.river.cards);
                        let handCombinations = combinations(combinedHand, 5);

                        let tempHand = new CardDeck(false, false);
                        let minScore = 500000;
                        let handType = 'None';
                        handCombinations.forEach(c => {
                            tempHand.cards = c;
                            let ph = new PokerHand(tempHand.toString());
                            // console.log(ph.describe());
                            if (ph.getScore() < minScore) {
                                minScore = ph.getScore();
                                handType = ph.getRank().replace('_', ' ');
                            }
                        })

                        console.log(`${this.playerMap.get(p).nickname} has a ${handType} with a score of ${minScore}`);

                        scoreMap.set(p, {
                            'score': minScore,
                            'rank': handType
                        });
                    }
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

                this.dealerSet = false;

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

    setDealerFromIndex(dealerIndex) {
        this.dealer = this.players[dealerIndex];
        console.log(`Selected ${this.getDisplayName(this.dealer)}(${dealerIndex}, ${this.dealer}) as the dealer`);

        let smallBlindIndex = (dealerIndex < this.players.length - 1) ? dealerIndex + 1 : 0;

        this.bettingStart.littleBlind = smallBlindIndex;

        this.dealerSet = true;
    }

    setDealer(player) {
        if (!this.isPlayer(player.id)) {
            this.buyIn(player.id, player.username);
        }

        let dealerIndex = this.players.indexOf(player.id);

        this.setDealerFromIndex(dealerIndex);
    }

    playerInCount() {
        let result = 0;
        this.players.forEach(p => {
            let tplayer = this.playerMap.get(p);
            if (!tplayer.folded) result++;
        })
        return result;
    }

    getPlayersIn() {
        let result = [];
        this.players.forEach(p => {
            let tplayer = this.playerMap.get(p);
            if (!tplayer.folded) result.push(tplayer);
        })
        return result;
    }

    dropPlayer(player) {
        if (this.players.includes(player)) this.players = this.players.filter(p => p !== player);
        if (this.buy_ins.includes(player)) this.buy_ins = this.buy_ins.filter(p => p !== player);
        if (this.playerMap.has(player)) this.playerMap.delete(player);
    }
}

function requireGame(ctx) {
    if (!currentGame.has(ctx.guildId)) {
        ctx.reply("You need to create a new game first");
        return false;
    }
    return true;
}

function requireRoundNotStarted(ctx) {
    if (!requireGame(ctx)) return false;
    else if (currentGame.get(ctx.guildId).roundState > 0) {
        ctx.reply('You can\'t do that once the round has started!');
        return false;
    }
    return true;
}

function requireRoundStarted(ctx) {
    if (!requireGame(ctx)) return false;
    else if (currentGame.get(ctx.guildId).roundState == 0) {
        ctx.reply('You can\'t do that before the round has started!');
        return false;
    }
    return true;
}

function requirePlayer(ctx) {
    if(!requireGame(ctx)) return false;

    let myCurrentGame = currentGame.get(ctx.guildId);

    if (!myCurrentGame.isPlayer(ctx.user.id)) {
        ctx.reply("Sorry, but you're not a player in this round, you need to join in with `/poker_join`");
        return false;
    }

    return true;
}

function requireCurrentBetter(ctx) {
    if (!requirePlayer(ctx)) return false;
    let myCurrentGame = currentGame.get(ctx.guildId);

    if (myCurrentGame.getCurrentBetter() !== ctx.user.id) {
        ctx.reply("You're not up to bet! Wait your turn!");
        return false;
    }

    return true;
}

function requireHost(ctx) {
    if (!requireGame(ctx)) return false;
    let myCurrentGame = currentGame.get(ctx.guildId);
    if (myCurrentGame.host !== ctx.user.id) {
        ctx.reply('Only the host of the game has permission to perform that action!');
        return false;
    }
    return true;
}

function handleBetting(ctx, prefix) {
    let result = prefix;
    let myCurrentGame = currentGame.get(ctx.guildId);

    myCurrentGame.nextPhase();

    if (myCurrentGame.playerInCount() == 1) {
        let remPlayers = myCurrentGame.getPlayersIn();
        result += `\n${myCurrentGame.display()}\n${remPlayers[0].nickname} is the only player remaining!\nThey won ${myCurrentGame.pot}\nThe round is over, you can use \`/poker_start\` to start the next round.`;
        myCurrentGame.roundState = 4;
        myCurrentGame.nextPhase();
        ctx.reply(result);
        return;
    }

    console.log(`New game phase is ${myCurrentGame.roundState}`);

    if (myCurrentGame.roundState < 4 && myCurrentGame.roundState > 1) {
        myCurrentGame.nextPhase();
    }
    else if (myCurrentGame.roundState == 4) {
        result += `\n${myCurrentGame.display()}\n\`\`\`\nPlayer Hands:\n`;

        myCurrentGame.players.forEach(p => {
            let tplayer = myCurrentGame.playerMap.get(p);
            let hand = tplayer.hand.display();
            result += boxString(concatMultilineStrings([tplayer.nickname, hand], stringAlignmentEnum.LEFT, stringAlignmentEnum.CENTER)) + '\n';
        })

        myCurrentGame.nextPhase();

        myCurrentGame.lastRound.winners.forEach(w => {
            result += `${userMention(w.player)} wins with a ${w.hand} for ${myCurrentGame.lastRound.amount}!\n\`\`\`\n`;
        })

        result += 'The round is over! use \`/poker_start\` to start the next round!';

        ctx.reply(result);
        return;
    }

    result += ((myCurrentGame.roundState == 1) ? `\n${myCurrentGame.display()}\n${userMention(myCurrentGame.getCurrentBetter())} , you are up to bet!` : '');

    ctx.reply(result);
    return;
}

const funcNames = [
    new SlashCommandBuilder().setName('poker_new').setDescription('Creates a new Texas Hold\'em game'),
    new SlashCommandBuilder().setName('poker_start').setDescription('Starts a new Texas Hold\'em game'),
	new SlashCommandBuilder().setName('poker_join').setDescription('Joins the current poker game starting with the next hand'),
    new SlashCommandBuilder().setName('poker_call').setDescription('Bets on the current round in the current poker game'),
    new SlashCommandBuilder().setName('poker_check').setDescription('Checks on the current round in the current poker game'),
    new SlashCommandBuilder().setName('poker_raise').setDescription('Raises the bet on the current round in the current poker game')
        .addIntegerOption(option => option.setName('amount').setDescription('Amount to raise').setRequired(true)),
    new SlashCommandBuilder().setName('poker_set_dealer').setDescription('Sets the dealer of the current round of poker')
        .addUserOption(option => option.setName('dealer').setDescription('The person to set as the dealer').setRequired(true)),
    new SlashCommandBuilder().setName('poker_fold').setDescription('Folds out of the current poker round'),
    new SlashCommandBuilder().setName('poker_set_balance').setDescription('Sets your current balance for poker currency')
        .addUserOption(option => option.setName('user').setDescription('User to set the balance of').setRequired(true))
        .addIntegerOption(option => option.setName('balance').setDescription('New balance').setRequired(true)),
    new SlashCommandBuilder().setName('poker_leave').setDescription('Leaves the current poker game'),
    new SlashCommandBuilder().setName('poker_pot').setDescription('Returns the pot amount for the current poker game'),
    new SlashCommandBuilder().setName('poker_balance').setDescription('Returns your player balance for the current poker game'),
    new SlashCommandBuilder().setName('poker_call_amount').setDescription('Returns the amount that you need to bet to call for the current poker game')
]

const funcDefs = [
    new DiscordCommand('poker_new', ctx => { 
        currentGame.set(ctx.guildId, new TexasHoldEmBoard(ctx.user, '', '', ''));
        ctx.reply("Created a new Texas Hold'em Game!\n"+currentGame.get(ctx.guildId).display());
    }),

    new DiscordCommand('poker_start', ctx => { 
        if (!requireHost(ctx)) return;

        let myCurrentGame = currentGame.get(ctx.guildId);

        myCurrentGame.startRound();

        myCurrentGame.players.forEach(p => {
            let tplayer = myCurrentGame.playerMap.get(p)

            let hand = boxString(tplayer.hand.display());

            let result = "```\nYour Hand:\n";
            result += hand;
            result += '\n```';

            tplayer.discordObj.send(result);
        });

        ctx.reply(`Starting round with ${myCurrentGame.players.length} player(s)\n${myCurrentGame.display()}\n${userMention(myCurrentGame.getCurrentBetter())} , you are up to bet!`);
    }),

    new DiscordCommand('poker_join', ctx => { 
        if (!requireGame(ctx)) return;

        let myCurrentGame = currentGame.get(ctx.guildId);

        myCurrentGame.buyIn(ctx.user.id, ctx.user.username, ctx.user);
        ctx.reply(`You've joined the current game`);
    }),

    new DiscordCommand('poker_set_dealer', ctx => { 
        if (!requireHost(ctx)) return;
        if (!requireRoundNotStarted(ctx)) return;

        let myCurrentGame = currentGame.get(ctx.guildId);

        const newDealer = ctx.options.getUser("dealer");

        myCurrentGame.setDealer(newDealer);
        ctx.reply(`${userMention(newDealer.id)} has been set as the dealer`);
    }),

    new DiscordCommand('poker_call', ctx => { 
        if (!requireRoundStarted(ctx)) return;

        let myCurrentGame = currentGame.get(ctx.guildId);

        if (!requireCurrentBetter(ctx)) return;

        amt = myCurrentGame.call(ctx.user.id);
        if (amt == null) {
            ctx.reply("Sorry, but you can't call right now");
            return;
        }
        else {
            handleBetting(ctx, (amt < 0) ? "You're All-in" : `You bet ${amt}`);
            return;
        }
    }),

    new DiscordCommand('poker_check', ctx => { 
        if (!requireRoundStarted(ctx)) return;

        let myCurrentGame = currentGame.get(ctx.guildId);

        if (!requireCurrentBetter(ctx)) return;

        amt = myCurrentGame.getCallAmount(ctx.user.id);
        if (amt != 0) {
            ctx.reply(`Sorry, you can't check, you need to bet at least ${amt}`);
            return;
        }

        amt = myCurrentGame.call(ctx.user.id);

        handleBetting(ctx, 'You checked!');
        return;
    }),

    new DiscordCommand('poker_raise', ctx => { 
        if (!requireRoundStarted(ctx)) return;

        let myCurrentGame = currentGame.get(ctx.guildId);

        if (!requireCurrentBetter(ctx)) return;

        // console.log(ctx);
        const raiseAmount = ctx.options.getInteger("amount");

        amt = myCurrentGame.raise(ctx.user.id, raiseAmount);
        if (amt == null) {
            ctx.reply((amt < myCurrentGame.currentBet) ? `You need to raise to at least ${myCurrentGame.currentBet}` : "Sorry, but you can't raise right now");
            return;
        }
        else {
            handleBetting(ctx, (amt < 0) ? "You're All-in" : `You bet ${amt}`);
            return;
        }
    }),

    new DiscordCommand('poker_call_amount', ctx => { 
        if (!requireGame(ctx)) return;

        let myCurrentGame = currentGame.get(ctx.guildId);

        if (!requirePlayer(ctx)) return;

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
        if (!requireGame(ctx)) return;

        let myCurrentGame = currentGame.get(ctx.guildId);

        if (!requirePlayer(ctx)) return;

        amt = myCurrentGame.playerMap.get(ctx.user.id).balance;
        ctx.reply(`You're balance is ${amt}`);
    }),

    new DiscordCommand('poker_set_balance', ctx => { 
        if (!requireHost(ctx)) return;

        let myCurrentGame = currentGame.get(ctx.guildId);

        let user = ctx.options.getUser('user');
        let amount = ctx.options.getInteger('balance');

        if (!myCurrentGame.isPlayer(user.id)) {
            ctx.reply(`Sorry, but ${userMention(user.id)} is not a player in this round, they need to join in with \`/poker_join\``);
            return;
        }

        if (amount >= 0) myCurrentGame.playerMap.get(ctx.user.id).balance = amount;
        else {
            ctx.reply('That amount is not valid it must be >= 0');
            return;
        }

        ctx.reply(`${userMention(user.id)}, you're balance is now ${amount}`);
    }),

    new DiscordCommand('poker_fold', ctx => { 
        if (!requireRoundStarted(ctx)) return;

        let myCurrentGame = currentGame.get(ctx.guildId);

        if(!requireCurrentBetter(ctx)) return;

        myCurrentGame.fold(ctx.user.id);

        handleBetting(ctx, "You've folded!");
    }),

    new DiscordCommand('poker_leave', ctx => { 
        if (!requireGame(ctx)) return;

        let myCurrentGame = currentGame.get(ctx.guildId);

        if (!requirePlayer(ctx)) return;

        myCurrentGame.dropPlayer(ctx.user.id);

        handleBetting(ctx, "You've left the current game!");
    }),
]

module.exports = {
    funcDefs, funcNames
}