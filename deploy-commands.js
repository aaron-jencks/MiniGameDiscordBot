require("dotenv").config()
const ttt = require("./tictactoe.js");
const c4 = require("./connectfour.js");
const poker = require("./texasHoldEm.js");
const { Routes } = require('discord.js');
const { REST } = require('@discordjs/rest');

const commands = (ttt.funcNames.concat(c4.funcNames).concat(poker.funcNames))
	.map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands })
	.then(() => console.log('Successfully registered application commands.'))
	.catch(console.error);
