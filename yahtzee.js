const { SlashCommandBuilder } = require('discord.js');
const { DiscordCommand } = require('./discord-command-templates.js');

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
        return this.name + (this.entryDice ? this.entryDice.map(c => { 
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
    constructor(p1, p2, p1o) {
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
        sum += this.state.Aces + this.state.Twos + this.state.Threes + this.state.Fours + this.state.Fives + this.state.Sixes;
        return sum + ((sum >= 63) ? 35 : 0);
    }

    display() {
        var result = "";
        
    }

    place(r, c) {
        if (this.isValid(r, c)) this.board[r][c] = this.player ? 1 : 2;
    }

    togglePlayer() { this.player = !this.player; }

    isValid(r, c) {
        return r >= 0 && r < 3 && c >= 0 && c < 3 && this.board[r][c] == 0;
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

    winner() {
        if (this.isOver()) {
            for(var i = 0; i < 3; i++) {
                if (this.board[0][i] != 0 && this.board[0][i] == this.board[1][i] && this.board[0][i] == this.board[2][i]) return this.board[0][i];  // Vertical checks
                if (this.board[i][0] != 0 && this.board[i][0] == this.board[i][1] && this.board[i][0] == this.board[i][2]) return this.board[i][0];  // Horizontal checks
            }

            if (this.board[0][0] != 0 && this.board[0][0] == this.board[1][1] && this.board[0][0] == this.board[2][2]) return this.board[0][0];      // Diagonal 1
            if (this.board[2][0] != 0 && this.board[2][0] == this.board[1][1] && this.board[1][1] == this.board[0][2]) return this.board[2][0];      // Diagonal 2
    
            return 0;                                                                                                                                // Cat's game
        }
        return -1;
    }
}

const funcNames = [
    new SlashCommandBuilder().setName('ttt_new').setDescription('Starts a new tic tac toe game'),
	new SlashCommandBuilder().setName('ttt_play').setDescription('Plays at a position in a tic tac toe game, syntax: ttt.play row column')
        .addIntegerOption(option => option.setName("row").setDescription("The row to play on").setRequired(true))
        .addIntegerOption(option => option.setName("column").setDescription("The column to play on").setRequired(true)),
    new SlashCommandBuilder().setName('ttt_board').setDescription('Displays the current game board'),
]

const funcDefs = [
    new DiscordCommand('ttt_new', ctx => { 
        currentGame.set(ctx.guildId, new TicTacToeBoard('Xs', 'Os', Math.random() >= 0.5));
        ctx.reply("Created a new Tic Tac Toe Game!\n"+currentGame.get(ctx.guildId).display());
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