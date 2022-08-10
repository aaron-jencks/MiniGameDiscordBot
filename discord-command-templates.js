class DiscordCommand {
    constructor(name, callback) {
        this.name = name;
        this.callback = callback;
    }

    matches(cmd) {
        return cmd === this.name;
    }

    async execute(ctx) {
        await this.callback(ctx);
    }
}

module.exports = { DiscordCommand }