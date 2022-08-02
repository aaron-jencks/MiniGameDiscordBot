const { SlashCommandBuilder } = require('discord.js');
const { DiscordCommand } = require('./discord-command-templates.js');

var currentGame = new Map();

class TicTacToeBoard {
    constructor(p1, p2, p1o) {
        this.player1 = p1
        this.player2 = p2
        this.player = p1o
        this.board = [
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0]
        ]
    }

    display() {
        var result = "```It's " + (this.player ? this.player1 : this.player2) + "'s turn!\n\u250c\u2500\u252C\u2500\u252C\u2500\u2510\n";
        for(var r = 0; r < 3; r++) {
            result += '\u2502';
            for(var c = 0; c < 3; c++) {
                result += (this.board[r][c] == 0) ? ' ' : ((this.board[r][c] == 2) ? '\u25CB' : '\u2573');
                result += '\u2502';
            }
            if (r < 2) result += "\n\u251c\u2500\u253C\u2500\u253C\u2500\u2524\n";
        }
        result += "\n\u2514\u2500\u2534\u2500\u2534\u2500\u2518```";
        return result;
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
                (((myCurrentGame.winner() == 1) ? myCurrentGame.player1 : myCurrentGame.player2) + "wins!")}`);
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