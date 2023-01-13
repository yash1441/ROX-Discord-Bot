const {
	SlashCommandBuilder,
	PermissionFlagsBits,
	EmbedBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
} = require("discord.js");
const fs = require("fs");
const feishu = require("../feishu.js");
require("dotenv").config();

module.exports = {
	data: new SlashCommandBuilder()
		.setName("quiz")
		.setDescription("Host a quiz.")
		.addChannelOption((option) =>
			option
				.setName("channel")
				.setDescription("Channel to host the quiz on.")
				.setRequired(true)
		)
		.addIntegerOption((option) =>
			option
				.setName("questions")
				.setDescription("The number of questions in the quiz.")
				.setRequired(true)
				.setMinValue(1)
		)
		.addStringOption((option) =>
			option
				.setName("difficulty")
				.setDescription("The difficulty of the quiz.")
				.setRequired(false)
				.addChoices(
					{ name: "Easy", value: "Easy" },
					{ name: "Normal", value: "Normal" },
					{ name: "Hard", value: "Hard" }
				)
		)
		.addBooleanOption((option) =>
			option
				.setName("elimination")
				.setDescription("Whether the quiz is elimination.")
				.setRequired(false)
		),

	async execute(interaction, client) {},
};
