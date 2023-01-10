const {
	SlashCommandBuilder,
	PermissionFlagsBits,
	EmbedBuilder,
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

	async execute(interaction, client) {
		await interaction.deferReply({ ephemeral: true });

		const channel = interaction.options.getChannel("channel");
		const questions = interaction.options.getInteger("questions");
		const difficulty = interaction.options.getString("difficulty") ?? "Random";
		const elimination = interaction.options.getBoolean("elimination") ?? false;

		await interaction.editReply({
			content: `${channel}, ${questions}, ${difficulty}, ${elimination}`,
		});

		// let tenantToken = await feishu.authorize(
		// 	process.env.FEISHU_ID,
		// 	process.env.FEISHU_SECRET
		// );

		// let response = JSON.parse(
		// 	await feishu.getRecords(
		// 		tenantToken,
		// 		process.env.OX_QUIZ_BASE,
		// 		process.env.OX_QUIZ
		// 	)
		// );
	},
};

function hasElementOccurringThrice(array) {
	const counts = {};

	for (const element of array) {
		if (element in counts) {
			counts[element]++;
		} else {
			counts[element] = 1;
		}
	}

	for (const element in counts) {
		if (counts[element] === 3) {
			return element;
		}
	}

	return null;
}

function containsAllElements(array, mainArray) {
	const set = new Set(array);

	for (const element of mainArray) {
		if (!set.has(element)) {
			return false;
		}
	}

	return true;
}
