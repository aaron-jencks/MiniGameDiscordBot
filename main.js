require("dotenv").config()
const discord = require("discord.js")
const ttt = require("./tictactoe.js");
const c4 = require("./connectfour.js");
const poker = require("./texasHoldEm.js");
const yaht = require("./yahtzee.js");
const { Routes } = require('discord.js');
const { REST } = require('@discordjs/rest');

const commands = (ttt.funcNames.concat(c4.funcNames).concat(poker.funcNames).concat(yaht.funcNames))
	.map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands })
	.then(() => console.log('Successfully registered application commands.'))
	.catch(console.error);

const funcDefs = ttt.funcDefs.concat(c4.funcDefs).concat(poker.funcDefs).concat(yaht.funcDefs);

const client = new discord.Client({
    intents: discord.GatewayIntentBits.Guilds,
})

client.on("ready", () => {
    console.log(`Logged in as ${client.user.tag}!`)
})

client.on('interactionCreate', async interaction => {
	if (!interaction.isChatInputCommand()) return;

	const { commandName } = interaction;

	for (const f of funcDefs) {
        if (f.matches(commandName)) {
            await f.execute(interaction);
        }
    }
});

client.login(process.env.TOKEN)