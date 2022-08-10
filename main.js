require("dotenv").config()
const discord = require("discord.js")
const ttt = require("./tictactoe.js");
const c4 = require("./connectfour.js");
const poker = require("./texasHoldEm.js");
const yaht = require("./yahtzee.js");

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

	funcDefs.forEach(f => {
        if (f.matches(commandName)) {
            f.execute(interaction);
        }
    })
});

client.login(process.env.TOKEN)