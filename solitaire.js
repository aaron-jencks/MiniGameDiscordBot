const { SlashCommandBuilder, userMention } = require('discord.js');
const { DiscordCommand } = require('./discord-command-templates.js');
const { CardDeck } = require("./card_games.js");
const PokerHand = require("poker-hand-evaluator");
const { combinations, boxString, stringAlignmentEnum, concatMultilineStrings } = require("./utils.js");

var currentGame = new Map();