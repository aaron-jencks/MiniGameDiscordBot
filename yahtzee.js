const { SlashCommandBuilder } = require('discord.js');
const { DiscordCommand } = require('./discord-command-templates.js');
const { boxString } = require('./utils.js');

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
         }).join('') : 'Not used yet');
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
        }
    }

    calculateUpper() {
        let sum = 0;
        sum += this.state.Aces.entryScore + this.state.Twos.entryScore + this.state.Threes.entryScore + 
            this.state.Fours.entryScore + this.state.Fives.entryScore + this.state.Sixes.entryScore;
        return sum + ((sum >= 63) ? 35 : 0);
    }

    display() {
        let entries = ["Entries:"]

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
        for(let i = 0; i < 3; i++) {
            if (this.board[0][i] != 0 && this.board[0][i] == this.board[1][i] && this.board[0][i] == this.board[2][i]) return true;  // Vertical checks
            if (this.board[i][0] != 0 && this.board[i][0] == this.board[i][1] && this.board[i][0] == this.board[i][2]) return true;  // Horizontal checks
            if (!hasEmpty) {
                for (let j = 0; j < 3; j++) {
                    if (this.board[i][j] == 0) {
                        hasEmpty = true;
                        break;
                    }
                }
            }
        }

        return (this.board[0][0] != 0 && this.board[0][0] == this.board[1][1] && this.board[0][0] == this.board[2][2]) ||            // Diagonal 1
            (this.board[2][0] != 0 && this.board[2][0] == this.board[1][1] && this.board[1][1] == this.board[0][2]) ||               // Diagonal 2
            !hasEmpty;                                                                                                               // Cat's game
    }
}

const funcNames = [
    new SlashCommandBuilder().setName('yaht_new').setDescription('Starts a new Yahtzee game for the current user'),
	new SlashCommandBuilder().setName('yaht_roll').setDescription('Rolls the dice for the current Yahtzee game'),
    new SlashCommandBuilder().setName('yaht_score').setDescription('Decides how to score the current Yahtzee roll'),
    new SlashCommandBuilder().setName('yaht_hold').setDescription('Holds the selected dice for rerolling')
        .addIntegerOption(option => option.setName('die').setDescription('Dice to hold (0-4)')),
    new SlashCommandBuilder().setName('yaht_release').setDescription('Releases the selected dice for rerolling')
        .addIntegerOption(option => option.setName('die').setDescription('Dice to hold (0-4)')),
    new SlashCommandBuilder().setName('yaht_board').setDescription('Displays the Yahtzee board'),
]

const funcDefs = [
    new DiscordCommand('yaht_new', ctx => { 
        currentGame.set(ctx.user.id, new YahtzeeBoard());
        ctx.reply("Created a new Yahtzee Game!\n"+currentGame.get(ctx.user.id).display());
    }),

    new DiscordCommand('ttt_play', ctx => {
        if (!currentGame.has(ctx.guildId)) {
            ctx.reply("You need to start a new game with 'ttt.new' first!");
            return;
        }

        const row = ctx.options.getInteger("row");
        const column = ctx.options.getInteger("column");

        let myCurrentGame = currentGame.get(ctx.guildId);

        if (myCurrentGame.isValid(row, column)) {
            myCurrentGame.place(row, column);
            myCurrentGame.togglePlayer();
        }
        else {
            ctx.reply(`Sorry but (${row}, ${column}) is not valid!\n${myCurrentGame.display()}`);
            return;
        }

        if (myCurrentGame.isOver()) {
            ctx.reply(myCurrentGame.display() + `\n${(myCurrentGame.winner() == 0) ? "Cat's Game!" : 
                (((myCurrentGame.winner() == 1) ? myCurrentGame.player1 : myCurrentGame.player2) + " wins!")}`);
        }
        else ctx.reply(myCurrentGame.display());
    }),

    new DiscordCommand('ttt_board', ctx => {
        if (!currentGame.has(ctx.guildId)) {
            ctx.reply("You need to start a new game with 'ttt.new' first!");
            return;
        }
        ctx.reply(currentGame.get(ctx.guildId).display());
    })
]

module.exports = {
    funcDefs, funcNames
}