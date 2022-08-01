require("dotenv").config()
const { funcNames } = require("./tictactoe.js");
const { Routes } = require('discord.js');
const { REST } = require('@discordjs/rest');

const commands = (funcNames)
	.map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands })
	.then(() => console.log('Successfully registered application commands.'))
	.catch(console.error);
