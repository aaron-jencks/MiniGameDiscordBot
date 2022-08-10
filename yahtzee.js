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
        return this.matches(dice) ? sum : 0;
    }
}

class UpperYahtzeeEntry extends SummedYahtzeeEntry {
    constructor(name, v) {
        super(name);
        this.value = v;
    }

    matches(dice) {
        for (const d of dice) {
            if (d != this.value) return false;
        }
        return true;
    }

    score(dice) {
        let sum = 0;
        for (const d of dice) if (d == this.value) sum += this.value;
        return sum;
    }
}

class NOfAKindYahtzeeEntry extends SummedYahtzeeEntry {
    constructor(name, n) {
        super(name);
        this.number = n;
    }

    matches(dice) {
        for (let v = 1; v < 7; v++) {
            console.log(`Checking die value: ${v}`);
            let count = 0;
            dice.forEach(d => {
                if (d == v && ++count >= this.number) return true;
            });
            console.log(`Final Count: ${count}`);
            if (count >= this.number) return true;
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
        return this.matches(dice) ? this.resultScore : 0;
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
        console.log(dice);
        for (const d of dice) {
            if (d != t) return false;
        }
        return true;
    }

    score(dice) {
        return (this.entryScore == 50) ? 100 : (this.used ? 0 : 50);
    }
}

class RolledDice {
    constructor(index) {
        this.value = 0;
        this.hold = false;
        this.index = index;
    }

    roll() {
        if (!this.hold) {
            this.value = Math.floor(Math.random() * 6) + 1;
        }
    }

    display() {
        console.log(this.value);
        let lines = [];
        let bolden = '';
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
        lines.push(this.index.toString());
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
                new RolledDice(0), 
                new RolledDice(1),
                new RolledDice(2), 
                new RolledDice(3),
                new RolledDice(4),
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
        diceDisplays.unshift('Current Roll:\nNumer:\nHolds:\nDie:');
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

function checkMultipleYahtzee(game, dice) {
    let nums = dice.map(d => d.value);
    if (game.state.Yahtzee.matches(nums)) {
        let amt = game.state.Yahtzee.score(nums)
        game.state.Yahtzee.entryScore += amt;
        return amt > 0;
    }
    return false;
}

function isJoker(game, dice) {
    let nums = dice.map(d => d.value);
    console.log(nums);
    if (game.state.Yahtzee.matches(nums)) {
        console.log('This is a yahtzee!');
        return true;
    }
    console.log('This is not a yahtzee...');
    return false;
}

function correspondingUpperUsed(game, dice) {
    if (isJoker(game, dice)) {
        let n = dice.map(d => d.value)[0];
        switch(n) {
            case 1:
                return game.state.Aces.used;
            case 2:
                return game.state.Twos.used;
            case 3:
                return game.state.Threes.used;
            case 4:
                return game.state.Fours.used;
            case 5:
                return game.state.Fives.used;
            case 6:
                return game.state.Sixes.used;
        }
    }
    return false;
}

function getYahtzeeValue(game, dice) {
    if (isJoker(game, dice)) {
        return dice.map(d => d.value)[0];
    }
    return 0;
}

function scoreRoll(entry, dice, game) {
    let nums = dice.map(d => d.value);
    entry.entryScore = entry.score(nums);
    entry.entryDice = nums;
    entry.used = true;
    game.rollState.rollCount = 0;
    game.rollState.outcome = [ 
        new RolledDice(0), 
        new RolledDice(1),
        new RolledDice(2), 
        new RolledDice(3),
        new RolledDice(4),
    ]
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
    if (myCurrentGame.rollState.rollCount == 0) {
        ctx.reply('You need to roll before you can hold, release, or score dice');
        return false;
    }
    return true;
}

const funcNames = [
    new SlashCommandBuilder().setName('yaht_new').setDescription('Starts a new Yahtzee game for the current user'),
	new SlashCommandBuilder().setName('yaht_roll').setDescription('Rolls the dice for the current Yahtzee game'),
    new SlashCommandBuilder().setName('yaht_hold').setDescription('Holds the selected dice for rerolling')
        .addIntegerOption(option => option.setName('die').setDescription('Dice to hold (0-4)')),
    new SlashCommandBuilder().setName('yaht_release').setDescription('Releases the selected dice for rerolling')
        .addIntegerOption(option => option.setName('die').setDescription('Dice to hold (0-4)')),
    new SlashCommandBuilder().setName('yaht_board').setDescription('Displays the Yahtzee board'),
    new SlashCommandBuilder().setName('yaht_aces').setDescription('Score the current roll as an aces entry'),
    new SlashCommandBuilder().setName('yaht_twos').setDescription('Score the current roll as a twos entry'),
    new SlashCommandBuilder().setName('yaht_threes').setDescription('Score the current roll as a threes entry'),
    new SlashCommandBuilder().setName('yaht_fours').setDescription('Score the current roll as a fours entry'),
    new SlashCommandBuilder().setName('yaht_fives').setDescription('Score the current roll as a fives entry'),
    new SlashCommandBuilder().setName('yaht_sixes').setDescription('Score the current roll as a sixes entry'),
    new SlashCommandBuilder().setName('yaht_three_of_a_kind').setDescription('Score the current roll as a three of a kind entry'),
    new SlashCommandBuilder().setName('yaht_four_of_a_kind').setDescription('Score the current roll as a four of a kind entry'),
    new SlashCommandBuilder().setName('yaht_full_house').setDescription('Score the current roll as a full house entry'),
    new SlashCommandBuilder().setName('yaht_small_straight').setDescription('Score the current roll as a small straight entry'),
    new SlashCommandBuilder().setName('yaht_large_straight').setDescription('Score the current roll as a large straight entry'),
    new SlashCommandBuilder().setName('yaht_yahtzee').setDescription('Score the current roll as a yahtzee entry'),
    new SlashCommandBuilder().setName('yaht_chance').setDescription('Score the current roll as a chance entry'),
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
        if (myCurrentGame.rollState.rollCount >= 3) {
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

    new DiscordCommand('yaht_aces', ctx => {
        if (!requireRoll(ctx)) return;
        let myCurrentGame = currentGame.get(ctx.user.id);
        if (isJoker(myCurrentGame, myCurrentGame.rollState.outcome)) {
            if (!correspondingUpperUsed(myCurrentGame, myCurrentGame.rollState.outcome)) {
                let n = getYahtzeeValue(myCurrentGame, myCurrentGame.rollState.outcome);
                if (n != 1) {
                    ctx.reply("You must assign a joker to it's corresponding upper value before using it elsewhere.");
                    return;
                }
            }
        }
        let bonus = checkMultipleYahtzee(myCurrentGame, myCurrentGame.rollState.outcome);
        scoreRoll(myCurrentGame.state.Aces, myCurrentGame.rollState.outcome, myCurrentGame);
        ctx.reply((bonus ? 'You got a bonus!\n' : '') + myCurrentGame.display());
    }),

    new DiscordCommand('yaht_twos', ctx => {
        if (!requireRoll(ctx)) return;
        let myCurrentGame = currentGame.get(ctx.user.id);
        if (isJoker(myCurrentGame, myCurrentGame.rollState.outcome)) {
            if (!correspondingUpperUsed(myCurrentGame, myCurrentGame.rollState.outcome)) {
                let n = getYahtzeeValue(myCurrentGame, myCurrentGame.rollState.outcome);
                if (n != 2) {
                    ctx.reply("You must assign a joker to it's corresponding upper value before using it elsewhere.");
                    return;
                }
            }
        }
        let bonus = checkMultipleYahtzee(myCurrentGame, myCurrentGame.rollState.outcome);
        scoreRoll(myCurrentGame.state.Twos, myCurrentGame.rollState.outcome, myCurrentGame);
        ctx.reply((bonus ? 'You got a bonus!\n' : '') + myCurrentGame.display());
    }),

    new DiscordCommand('yaht_threes', ctx => {
        if (!requireRoll(ctx)) return;
        let myCurrentGame = currentGame.get(ctx.user.id);
        if (isJoker(myCurrentGame, myCurrentGame.rollState.outcome)) {
            if (!correspondingUpperUsed(myCurrentGame, myCurrentGame.rollState.outcome)) {
                let n = getYahtzeeValue(myCurrentGame, myCurrentGame.rollState.outcome);
                if (n != 3) {
                    ctx.reply("You must assign a joker to it's corresponding upper value before using it elsewhere.");
                    return;
                }
            }
        }
        let bonus = checkMultipleYahtzee(myCurrentGame, myCurrentGame.rollState.outcome);
        scoreRoll(myCurrentGame.state.Threes, myCurrentGame.rollState.outcome, myCurrentGame);
        ctx.reply((bonus ? 'You got a bonus!\n' : '') + myCurrentGame.display());
    }),

    new DiscordCommand('yaht_fours', ctx => {
        if (!requireRoll(ctx)) return;
        let myCurrentGame = currentGame.get(ctx.user.id);
        if (isJoker(myCurrentGame, myCurrentGame.rollState.outcome)) {
            if (!correspondingUpperUsed(myCurrentGame, myCurrentGame.rollState.outcome)) {
                let n = getYahtzeeValue(myCurrentGame, myCurrentGame.rollState.outcome);
                if (n != 4) {
                    ctx.reply("You must assign a joker to it's corresponding upper value before using it elsewhere.");
                    return;
                }
            }
        }
        let bonus = checkMultipleYahtzee(myCurrentGame, myCurrentGame.rollState.outcome);
        scoreRoll(myCurrentGame.state.Fours, myCurrentGame.rollState.outcome, myCurrentGame);
        ctx.reply((bonus ? 'You got a bonus!\n' : '') + myCurrentGame.display());
    }),

    new DiscordCommand('yaht_fives', ctx => {
        if (!requireRoll(ctx)) return;
        let myCurrentGame = currentGame.get(ctx.user.id);
        if (isJoker(myCurrentGame, myCurrentGame.rollState.outcome)) {
            if (!correspondingUpperUsed(myCurrentGame, myCurrentGame.rollState.outcome)) {
                let n = getYahtzeeValue(myCurrentGame, myCurrentGame.rollState.outcome);
                if (n != 5) {
                    ctx.reply("You must assign a joker to it's corresponding upper value before using it elsewhere.");
                    return;
                }
            }
        }
        let bonus = checkMultipleYahtzee(myCurrentGame, myCurrentGame.rollState.outcome);
        scoreRoll(myCurrentGame.state.Fives, myCurrentGame.rollState.outcome, myCurrentGame);
        ctx.reply((bonus ? 'You got a bonus!\n' : '') + myCurrentGame.display());
    }),

    new DiscordCommand('yaht_sixes', ctx => {
        if (!requireRoll(ctx)) return;
        let myCurrentGame = currentGame.get(ctx.user.id);
        if (isJoker(myCurrentGame, myCurrentGame.rollState.outcome)) {
            if (!correspondingUpperUsed(myCurrentGame, myCurrentGame.rollState.outcome)) {
                let n = getYahtzeeValue(myCurrentGame, myCurrentGame.rollState.outcome);
                if (n != 6) {
                    ctx.reply("You must assign a joker to it's corresponding upper value before using it elsewhere.");
                    return;
                }
            }
        }
        let bonus = checkMultipleYahtzee(myCurrentGame, myCurrentGame.rollState.outcome);
        scoreRoll(myCurrentGame.state.Sixes, myCurrentGame.rollState.outcome, myCurrentGame);
        ctx.reply((bonus ? 'You got a bonus!\n' : '') + myCurrentGame.display());
    }),

    new DiscordCommand('yaht_three_of_a_kind', ctx => {
        if (!requireRoll(ctx)) return;
        let myCurrentGame = currentGame.get(ctx.user.id);
        if (isJoker(myCurrentGame, myCurrentGame.rollState.outcome)) {
            if (!correspondingUpperUsed(myCurrentGame, myCurrentGame.rollState.outcome)) {
                ctx.reply("You must assign a joker to it's corresponding upper value before using it elsewhere.");
                return;
            }
        }
        let bonus = checkMultipleYahtzee(myCurrentGame, myCurrentGame.rollState.outcome);
        scoreRoll(myCurrentGame.state.ThreeOfAKind, myCurrentGame.rollState.outcome, myCurrentGame);
        ctx.reply((bonus ? 'You got a bonus!\n' : '') + myCurrentGame.display());
    }),

    new DiscordCommand('yaht_four_of_a_kind', ctx => {
        if (!requireRoll(ctx)) return;
        let myCurrentGame = currentGame.get(ctx.user.id);
        if (isJoker(myCurrentGame, myCurrentGame.rollState.outcome)) {
            if (!correspondingUpperUsed(myCurrentGame, myCurrentGame.rollState.outcome)) {
                ctx.reply("You must assign a joker to it's corresponding upper value before using it elsewhere.");
                return;
            }
        }
        let bonus = checkMultipleYahtzee(myCurrentGame, myCurrentGame.rollState.outcome);
        scoreRoll(myCurrentGame.state.FourOfAKind, myCurrentGame.rollState.outcome, myCurrentGame);
        ctx.reply((bonus ? 'You got a bonus!\n' : '') + myCurrentGame.display());
    }),

    new DiscordCommand('yaht_full_house', ctx => {
        if (!requireRoll(ctx)) return;
        let myCurrentGame = currentGame.get(ctx.user.id);
        if (isJoker(myCurrentGame, myCurrentGame.rollState.outcome)) {
            if (!correspondingUpperUsed(myCurrentGame, myCurrentGame.rollState.outcome)) {
                ctx.reply("You must assign a joker to it's corresponding upper value before using it elsewhere.");
                return;
            }
        }
        let bonus = checkMultipleYahtzee(myCurrentGame, myCurrentGame.rollState.outcome);
        scoreRoll(myCurrentGame.state.FullHouse, myCurrentGame.rollState.outcome, myCurrentGame);
        ctx.reply((bonus ? 'You got a bonus!\n' : '') + myCurrentGame.display());
    }),

    new DiscordCommand('yaht_small_straight', ctx => {
        if (!requireRoll(ctx)) return;
        let myCurrentGame = currentGame.get(ctx.user.id);
        if (isJoker(myCurrentGame, myCurrentGame.rollState.outcome)) {
            if (!correspondingUpperUsed(myCurrentGame, myCurrentGame.rollState.outcome)) {
                ctx.reply("You must assign a joker to it's corresponding upper value before using it elsewhere.");
                return;
            }
        }
        let bonus = checkMultipleYahtzee(myCurrentGame, myCurrentGame.rollState.outcome);
        scoreRoll(myCurrentGame.state.SmallStraight, myCurrentGame.rollState.outcome, myCurrentGame);
        ctx.reply((bonus ? 'You got a bonus!\n' : '') + myCurrentGame.display());
    }),

    new DiscordCommand('yaht_large_straight', ctx => {
        if (!requireRoll(ctx)) return;
        let myCurrentGame = currentGame.get(ctx.user.id);
        if (isJoker(myCurrentGame, myCurrentGame.rollState.outcome)) {
            if (!correspondingUpperUsed(myCurrentGame, myCurrentGame.rollState.outcome)) {
                ctx.reply("You must assign a joker to it's corresponding upper value before using it elsewhere.");
                return;
            }
        }
        let bonus = checkMultipleYahtzee(myCurrentGame, myCurrentGame.rollState.outcome);
        scoreRoll(myCurrentGame.state.LargeStraight, myCurrentGame.rollState.outcome, myCurrentGame);
        ctx.reply((bonus ? 'You got a bonus!\n' : '') + myCurrentGame.display());
    }),

    new DiscordCommand('yaht_yahtzee', ctx => {
        if (!requireRoll(ctx)) return;
        let myCurrentGame = currentGame.get(ctx.user.id);
        scoreRoll(myCurrentGame.state.Yahtzee, myCurrentGame.rollState.outcome, myCurrentGame);
        ctx.reply(myCurrentGame.display());
    }),

    new DiscordCommand('yaht_chance', ctx => {
        if (!requireRoll(ctx)) return;
        let myCurrentGame = currentGame.get(ctx.user.id);
        if (isJoker(myCurrentGame, myCurrentGame.rollState.outcome)) {
            if (!correspondingUpperUsed(myCurrentGame, myCurrentGame.rollState.outcome)) {
                ctx.reply("You must assign a joker to it's corresponding upper value before using it elsewhere.");
                return;
            }
        }
        let bonus = checkMultipleYahtzee(myCurrentGame, myCurrentGame.rollState.outcome);
        scoreRoll(myCurrentGame.state.Chance, myCurrentGame.rollState.outcome, myCurrentGame);
        ctx.reply((bonus ? 'You got a bonus!\n' : '') + myCurrentGame.display());
    }),

    new DiscordCommand('yaht_board', ctx => {
        if (!requireGame(ctx)) return;
        ctx.reply(currentGame.get(ctx.user.id).display());
    })
]

module.exports = {
    funcDefs, funcNames
}