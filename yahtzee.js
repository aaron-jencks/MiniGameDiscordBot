const { SlashCommandBuilder } = require('discord.js');
const { DiscordCommand } = require('./discord-command-templates.js');
const { boxString, concatMultilineStrings } = require('./utils.js');

var currentGame = new Map();

class YahtzeeEntry {
    constructor(name) {
        this.entryScore = 0;
        this.used = false;
        this.entryDice = null;
        this.name = name;
    }

    matches(dice) {
        return true;
    }

    score(dice) {
        return 0;
    }

    display() {
        return this.name + ': ' + (this.entryDice ? this.entryDice.map(c => { 
            switch (c) {
                case 1:
                    return '\u2680';
                case 2:
                    return "\u2681";
                case 3:
                    return "\u2682";
                case 4:
                    return "\u2683";
                case 5:
                    return "\u2684";
                case 6:
                    return "\u2685";
            }
         }).join(' ') : 'Not used yet');
    }
}

class SummedYahtzeeEntry extends YahtzeeEntry {
    score(dice) {
        let sum = 0;
        dice.forEach(d => sum += d);
        return sum;
    }
}

class UpperYahtzeeEntry extends SummedYahtzeeEntry {
    constructor(name, v) {
        super(name);
        this.value = v;
    }

    matches(dice) {
        dice.forEach(d => {
            if (d != v) return false;
        });
        return true;
    }
}

class NOfAKindYahtzeeEntry extends SummedYahtzeeEntry {
    constructor(name, n) {
        super(name);
        this.number = n;
    }

    matches(dice) {
        for (let v = 1; v < 7; v++) {
            let count = 0;
            dice.forEach(d => {
                if (d == v && ++count >= n) return true;
            })
        }
        return false;
    }
}

class StaticScoredYahtzeeEntry extends YahtzeeEntry {
    constructor(name, score) {
        super(name);
        this.resultScore = score;
    }

    score(dice) {
        return this.resultScore;
    }
}

class FullHouseYahtzeeEntry extends StaticScoredYahtzeeEntry {
    constructor() {
        super('Full House', 25);
    }

    matches(dice) {
        let counts = new Array(6).fill(0);
        dice.forEach(d => counts[d - 1]++);
        let foundTwo = false, foundThree = false;
        counts.forEach(c => {
            if (c == 2) foundTwo = true;
            if (c == 3) foundThree = true;
        });
        return foundTwo && foundThree;
    }
}

class StraightYahtzeeEntry extends StaticScoredYahtzeeEntry {
    constructor(name, n, s) {
        super(name, s);
        this.sequenceLength = n;
    }

    matches(dice) {
        let counts = new Array(6).fill(0);
        dice.forEach(d => counts[d - 1]++);

        let maxLength = 0, currentLength = 0;
        for(let di = 0; di < dice.length; di++) {
            if (counts[di] > 0) currentLength++;
            else {
                if (currentLength > maxLength) maxLength = currentLength;
                currentLength = 0;
            }
        }
        if (currentLength > maxLength) maxLength = currentLength;

        return maxLength >= this.sequenceLength;
    }
}

class YahtzeeYahtzeeEntry extends StaticScoredYahtzeeEntry {
    constructor() {
        super('Yahtzee', 50);
    }

    matches(dice) {
        let t = dice[0];
        dice.forEach(d => {
            if (d != t) return false;
        })
        return true;
    }

    score(dice) {
        return (this.entryScore == 50) ? 100 : (this.used ? 0 : 50);
    }
}

class RolledDice {
    constructor() {
        this.value = 0;
        this.hold = false;
    }

    roll() {
        if (!this.hold) {
            this.value = Math.floor(Math.random() * 6) + 1;
        }
    }

    display() {
        console.log(this.value);
        let lines = [];
        let bolden = this.hold ? '**' : '';
        let symbol = bolden;
        switch (this.value) {
            case 0:
                symbol += '';
                break;
            case 1:
                symbol += '\u2680';
                break;
            case 2:
                symbol += "\u2681";
                break;
            case 3:
                symbol += "\u2682";
                break;
            case 4:
                symbol += "\u2683";
                break;
            case 5:
                symbol += "\u2684";
                break;
            case 6:
                symbol += "\u2685";
                break;
        }
        symbol += bolden;
        lines.push(symbol);
        lines.push(bolden + this.value.toString() + bolden);
        lines.push(this.hold ? '\u25CF' : '\u25CB');
        return lines.join('\n');
    }
}

class YahtzeeBoard {
    constructor() {
        this.state = {
            Aces: new UpperYahtzeeEntry('Aces', 1),
            Twos: new UpperYahtzeeEntry('Twos', 2),
            Threes: new UpperYahtzeeEntry('Threes', 3),
            Fours: new UpperYahtzeeEntry('Fours', 4),
            Fives: new UpperYahtzeeEntry('Fives', 5),
            Sixes: new UpperYahtzeeEntry('Sixes', 6),
            ThreeOfAKind: new NOfAKindYahtzeeEntry('Three of a kind', 3),
            FourOfAKind: new NOfAKindYahtzeeEntry('Four of a kind', 4),
            FullHouse: new FullHouseYahtzeeEntry(),
            SmallStraight: new StraightYahtzeeEntry('Small straight', 4),
            LargeStraight: new StraightYahtzeeEntry('Large straight', 5),
            Yahtzee: new YahtzeeYahtzeeEntry(),
            Chance: new SummedYahtzeeEntry('Chance'),
        };
        this.rollState = {
            rollCount: 0,
            outcome: [ 
                new RolledDice(), 
                new RolledDice(),
                new RolledDice(), 
                new RolledDice(),
                new RolledDice(),
            ]
        }
    }

    calculateUpper() {
        let sum = 0;
        sum += this.state.Aces.entryScore + this.state.Twos.entryScore + this.state.Threes.entryScore + 
            this.state.Fours.entryScore + this.state.Fives.entryScore + this.state.Sixes.entryScore;
        return sum + ((sum >= 63) ? 35 : 0);
    }

    displayRoll() {
        let diceDisplays = this.rollState.outcome.map(d => d.display());
        diceDisplays.unshift('Current Roll:\nNumer:\nHolds:');
        return concatMultilineStrings(diceDisplays, ' ') + `\nYou have ${3 - this.rollState.rollCount} rolls left`;
    }

    display() {
        let entries = ["Entries:"];

        if (this.rollState.rollCount > 0) entries.unshift(this.displayRoll() + '\n');
        else entries.unshift('You can roll with yaht_roll');

        for (const [ename, evalue] of Object.entries(this.state)) {
            entries.push(evalue.display());
        }

        let score = this.calculateUpper();
        score += this.state.ThreeOfAKind.entryScore + this.state.FourOfAKind.entryScore + this.state.FullHouse.entryScore + 
            this.state.SmallStraight.entryScore  + this.state.LargeStraight.entryScore + this.state.Yahtzee.entryScore + 
            this.state.Chance.entryScore;
        entries.push(`Current Score: ${score}`);
        return "```\n" + boxString(entries.join('\n')) + "\n```"; 
    }

    isOver() {
        let hasEmpty = false;
        for (const [ename, evalue] of Object.entries(this.state)) {
            if (!evalue.used) {
                hasEmpty = true;
                break;
            }
        }
        return !hasEmpty;
    }

    roll() {
        if (this.rollState.rollCount++ < 3) this.rollState.outcome.forEach(d => d.roll());
    }

    hold(d) {
        if (this.rollState.rollCount > 0) this.rollState.outcome[d].hold = true;
    }

    release(d) {
        if (this.rollState.rollCount > 0) this.rollState.outcome[d].hold = false;
    }
}

function requireGame(ctx) {
    if (!currentGame.has(ctx.user.id)) {
        ctx.reply("You need to start a new game with 'yaht_new' first!");
        return false;
    }
    return true;
}

function requireRoll(ctx) {
    if (!requireGame(ctx)) return;
    let myCurrentGame = currentGame.get(ctx.user.id);
    if (myCurrentGame.roll.rollCount == 0) {
        ctx.reply('You need to roll before you can hold or release dice');
        return false;
    }
    return true;
}

const funcNames = [
    new SlashCommandBuilder().setName('yaht_new').setDescription('Starts a new Yahtzee game for the current user'),
	new SlashCommandBuilder().setName('yaht_roll').setDescription('Rolls the dice for the current Yahtzee game'),
    new SlashCommandBuilder().setName('yaht_score').setDescription('Decides how to score the current Yahtzee roll')
        .addIntegerOption(option => option.setName('entry').setDescription('The entry to score the roll for')),
    new SlashCommandBuilder().setName('yaht_hold').setDescription('Holds the selected dice for rerolling')
        .addIntegerOption(option => option.setName('die').setDescription('Dice to hold (0-4)')),
    new SlashCommandBuilder().setName('yaht_release').setDescription('Releases the selected dice for rerolling')
        .addIntegerOption(option => option.setName('die').setDescription('Dice to hold (0-4)')),
    new SlashCommandBuilder().setName('yaht_board').setDescription('Displays the Yahtzee board'),
    new SlashCommandBuilder().setName('yaht_scoreboard').setDescription('Displays the high scores for yahtzee for the current user')
]

const funcDefs = [
    new DiscordCommand('yaht_new', ctx => { 
        currentGame.set(ctx.user.id, new YahtzeeBoard());
        ctx.reply("Created a new Yahtzee Game!\n"+currentGame.get(ctx.user.id).display());
    }),

    new DiscordCommand('yaht_roll', ctx => {
        if (!requireGame(ctx)) return;

        let myCurrentGame = currentGame.get(ctx.user.id);
        if (myCurrentGame.roll.rollCount >= 3) {
            ctx.reply('Sorry, but you already used all of you\'re rolls!');
            return;
        }
        myCurrentGame.roll();
        ctx.reply(myCurrentGame.display());
    }),

    new DiscordCommand('yaht_hold', ctx => {
        if (!requireRoll(ctx)) return;
        let myCurrentGame = currentGame.get(ctx.user.id);
        let die = ctx.options.getInteger('die');
        myCurrentGame.hold(die);
        ctx.reply(myCurrentGame.display());
    }),

    new DiscordCommand('yaht_release', ctx => {
        if (!requireRoll(ctx)) return;
        let myCurrentGame = currentGame.get(ctx.user.id);
        let die = ctx.options.getInteger('die');
        myCurrentGame.release(die);
        ctx.reply(myCurrentGame.display());
    }),

    new DiscordCommand('yaht_score', ctx => {
        if (!requireRoll(ctx)) return;
        let myCurrentGame = currentGame.get(ctx.user.id);
        let entry = ctx.options.getInteger('entry');
        // myCurrentGame.release(die);
        ctx.reply(myCurrentGame.display());
    }),

    new DiscordCommand('yaht_board', ctx => {
        if (!requireGame(ctx)) return;
        ctx.reply(currentGame.get(ctx.user.id).display());
    })
]

module.exports = {
    funcDefs, funcNames
}