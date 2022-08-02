const { SlashCommandBuilder } = require('discord.js');
const { DiscordCommand } = require('./discord-command-templates.js');

var currentGame = new Map();

class ConnectFourBoard {
    constructor(p1, p2, p1o) {
        this.player1 = p1
        this.player2 = p2
        this.player = p1o
        this.board = [
            [0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0],
        ]
    }

    display() {
        var result = "```It's " + (this.player ? this.player1 : this.player2) + "'s turn!\n\u250c\u2500\u252C\u2500\u252C\u2500\u252C\u2500\u252C\u2500\u252C\u2500\u252C\u2500\u2510\n";
        for(var r = 0; r < 6; r++) {
            result += '\u2502';
            for(var c = 0; c < 7; c++) {
                result += (this.board[r][c] == 0) ? ' ' : ((this.board[r][c] == 2) ? '\u25CB' : '\u25CF');
                result += '\u2502';
            }
            if (r < 5) result += "\n\u251c\u2500\u253C\u2500\u253C\u2500\u253C\u2500\u253C\u2500\u253C\u2500\u253C\u2500\u2524\n";
        }
        result += "\n\u2514\u2500\u2534\u2500\u2534\u2500\u2534\u2500\u2534\u2500\u2534\u2500\u2534\u2500\u2518\n 0 1 2 3 4 5 6```";
        return result;
    }

    place(c) {
        if (this.isValid(c)) {
            for (let r = 0; r < 5; r++) {
                if (this.board[r + 1][c] != 0) {
                    this.board[r][c] = this.player ? 1 : 2;
                    return;
                }
            }
            this.board[5][c] = this.player ? 1 : 2;
            return;
        }
    }

    togglePlayer() { this.player = !this.player; }

    isValid(c) {
        return c >= 0 && c < 6 && this.board[0][c] == 0;
    }

    isOver() {
        const containsFour = c => {
            let counter = 0;
            let currentStreak = -1;

            // Horizontal
            for (let i = 0; i < 6; i++) {
                if (this.board[i][c] == currentStreak) {
                    counter++;
                    if (counter >= 4 && currentStreak != 0) return true;
                }
                else {
                    currentStreak = this.board[i][c];
                    counter = 1;
                }
            }

            if (c < 6) {
                counter = 0;
                currentStreak = -1;

                // Vertical
                for (let i = 0; i < 7; i++) {
                    if (this.board[c][i] == currentStreak) {
                        counter++;
                        if (counter >= 4 && currentStreak != 0) return true;
                    }
                    else {
                        currentStreak = this.board[c][i];
                        counter = 1;
                    }
                }

                counter = 0;
                currentStreak = -1;

                // Diagonal 1
                const diagonal_counter = [4, 5, 6, 6, 5, 4]
                let startRow = (c < 3) ? (2 - c) : 0;
                let startColumn = (c < 3) ? 0 : (c - 2);
                for (let i = 0; i < diagonal_counter[c]; i++) {
                    let cell = this.board[startRow + i][startColumn + i];
                    if (cell == currentStreak) {
                        counter++;
                        if (counter >= 4 && currentStreak != 0) return true;
                    }
                    else {
                        currentStreak = cell;
                        counter = 1;
                    }
                }

                counter = 0;
                currentStreak = -1;

                // Diagonal 2
                startRow = (c < 3) ? (c + 3) : 5;
                startColumn = (c < 3) ? 0 : (c - 2);
                for (let i = 0; i < diagonal_counter[c]; i++) {
                    let cell = this.board[startRow - i][startColumn + i];
                    if (cell == currentStreak) {
                        counter++;
                        if (counter >= 4 && currentStreak != 0) return true;
                    }
                    else {
                        currentStreak = cell;
                        counter = 1;
                    }
                }
            }
        }

        for (let i = 0; i < 7; i++) {
            if (containsFour(i)) return true;
        }

        return false;
    }

    winner() {
        const containsFour = c => {
            let counter = 0;
            let currentStreak = -1;

            // Horizontal
            for (let i = 0; i < 6; i++) {
                if (this.board[i][c] == currentStreak) {
                    counter++;
                    if (counter >= 4 && currentStreak != 0) return currentStreak;
                }
                else {
                    currentStreak = this.board[i][c];
                    counter = 1;
                }
            }

            if (c < 6) {
                counter = 0;
                currentStreak = -1;

                // Vertical
                for (let i = 0; i < 7; i++) {
                    if (this.board[c][i] == currentStreak) {
                        counter++;
                        if (counter >= 4 && currentStreak != 0) return currentStreak;
                    }
                    else {
                        currentStreak = this.board[c][i];
                        counter = 1;
                    }
                }

                counter = 0;
                currentStreak = -1;

                // Diagonal 1
                const diagonal_counter = [4, 5, 6, 6, 5, 4]
                let startRow = (c < 3) ? (2 - c) : 0;
                let startColumn = (c < 3) ? 0 : (c - 2);
                for (let i = 0; i < diagonal_counter[c]; i++) {
                    let cell = this.board[startRow + i][startColumn + i];
                    if (cell == currentStreak) {
                        counter++;
                        if (counter >= 4 && currentStreak != 0) return currentStreak;
                    }
                    else {
                        currentStreak = cell;
                        counter = 1;
                    }
                }

                counter = 0;
                currentStreak = -1;

                // Diagonal 2
                startRow = (c < 3) ? (c + 3) : 5;
                startColumn = (c < 3) ? 0 : (c - 2);
                for (let i = 0; i < diagonal_counter[c]; i++) {
                    let cell = this.board[startRow - i][startColumn + i];
                    if (cell == currentStreak) {
                        counter++;
                        if (counter >= 4 && currentStreak != 0) return currentStreak;
                    }
                    else {
                        currentStreak = cell;
                        counter = 1;
                    }
                }
            }

            return -1;
        }

        for (let i = 0; i < 7; i++) {
            let winner = containsFour(i);
            if (winner > 0) return winner;
        }

        return -1;
    }
}

const funcNames = [
    new SlashCommandBuilder().setName('c4_new').setDescription('Starts a new connect four game'),
	new SlashCommandBuilder().setName('c4_play').setDescription('Plays at a position in a connect four game, syntax: c4_play column')
        .addIntegerOption(option => option.setName("column").setDescription("The column to play on").setRequired(true)),
    new SlashCommandBuilder().setName('c4_board').setDescription('Displays the current game board'),
]

const funcDefs = [
    new DiscordCommand('c4_new', ctx => { 
        currentGame.set(ctx.guildId, new ConnectFourBoard('White', 'Black', Math.random() >= 0.5));
        ctx.reply("Created a new Connect Four Game!\n"+currentGame.get(ctx.guildId).display());
    }),

    new DiscordCommand('c4_play', ctx => {
        if (!currentGame.has(ctx.guildId)) {
            ctx.reply("You need to start a new game with 'ttt.new' first!");
            return;
        }

        const column = ctx.options.getInteger("column");

        let myCurrentGame = currentGame.get(ctx.guildId);

        if (myCurrentGame.isValid(column)) {
            myCurrentGame.place(column);
            myCurrentGame.togglePlayer();
        }
        else {
            ctx.reply(`Sorry but ${column} is not valid!\n${myCurrentGame.display()}`);
            return;
        }

        if (myCurrentGame.isOver()) {
            ctx.reply(myCurrentGame.display() + `\n${(myCurrentGame.winner() == -1) ? "It's a tie!" : 
                (((myCurrentGame.winner() == 1) ? myCurrentGame.player1 : myCurrentGame.player2) + "wins!")}`);
        }
        else ctx.reply(myCurrentGame.display());
    }),

    new DiscordCommand('c4_board', ctx => {
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