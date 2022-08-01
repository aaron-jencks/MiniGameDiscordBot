require("dotenv").config()
const discord = require("discord.js")
const { funcDefs } = require("./tictactoe.js");

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