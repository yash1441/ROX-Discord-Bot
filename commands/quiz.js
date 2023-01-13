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

let quizOn = false;
let { quizEliminated, quizPoints } = require("../index.js");

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
		if (!quizOn)
			await interaction.reply({ content: "Starting quiz...", ephemeral: true });
		else
			return await interaction.reply({
				content: "Quiz already in progress.",
				ephemeral: true,
			});

		const channel = interaction.options.getChannel("channel");
		const questions = interaction.options.getInteger("questions");
		const difficulty = interaction.options.getString("difficulty") ?? "Random";
		const elimination = interaction.options.getBoolean("elimination") ?? false;

		await startQuiz(channel, questions, difficulty, elimination);
	},
};

async function startQuiz(channel, questions, difficulty, elimination) {
	let tenantToken = await feishu.authorize(
		process.env.FEISHU_ID,
		process.env.FEISHU_SECRET
	);

	let response,
		questionsDB = [];

	switch (difficulty) {
		case "Random":
			response = JSON.parse(
				await feishu.getRecords(
					tenantToken,
					process.env.OX_QUIZ_BASE,
					process.env.OX_QUIZ
				)
			);
			break;
		default:
			response = JSON.parse(
				await feishu.getRecords(
					tenantToken,
					process.env.OX_QUIZ_BASE,
					process.env.OX_QUIZ,
					`CurrentValue.[Difficulty] = "${difficulty}"`
				)
			);
			break;
	}

	for (const record of response.data.items) {
		questionsDB.push({
			question: record.fields.Question,
			answer: record.fields.Answer,
		});
	}

	if (questions > questionsDB.length) {
		questions = questionsDB.length;
	}

	let shuffledQuestions = questionsDB
		.sort(() => Math.random() - 0.5)
		.slice(0, questions);
	let shuffledQuestionsLength = shuffledQuestions.length;

	await channel.send({ content: "Quiz starting in 20 seconds..." });
	await new Promise((resolve) => setTimeout(resolve, 20000));

	let questionNumber = 0;

	for (const question of shuffledQuestions) {
		const embed = new EmbedBuilder()
			.setTitle("Quiz")
			.setDescription(question.question)
			.setColor(0x00ff00)
			.setFooter({
				text:
					"Question " +
					(++questionNumber).toString() +
					"/" +
					shuffledQuestionsLength,
			});

		let oButton, xButton, buttonId;

		if (question.answer == "O") {
			elimination ? (buttonId = "Oe") : (buttonId = "O");
			oButton = new ButtonBuilder()
				.setCustomId("ButtonO" + buttonId)
				.setStyle(ButtonStyle.Success)
				.setLabel("O");
			xButton = new ButtonBuilder()
				.setCustomId("ButtonX" + buttonId)
				.setStyle(ButtonStyle.Danger)
				.setLabel("X");
		} else if (question.answer == "X") {
			elimination ? (buttonId = "Xe") : (buttonId = "X");
			oButton = new ButtonBuilder()
				.setCustomId("ButtonO" + buttonId)
				.setStyle(ButtonStyle.Success)
				.setLabel("O");
			xButton = new ButtonBuilder()
				.setCustomId("ButtonX" + buttonId)
				.setStyle(ButtonStyle.Danger)
				.setLabel("X");
		}

		const oButtonDisabled = new ButtonBuilder()
			.setCustomId("oButton")
			.setStyle(ButtonStyle.Success)
			.setLabel("O")
			.setDisabled(true);

		const xButtonDisabled = new ButtonBuilder()
			.setCustomId("xButton")
			.setStyle(ButtonStyle.Danger)
			.setLabel("X")
			.setDisabled(true);

		const row = new ActionRowBuilder().addComponents([oButton, xButton]);
		const rowDisabled = new ActionRowBuilder().addComponents([
			oButtonDisabled,
			xButtonDisabled,
		]);

		await channel
			.send({ embeds: [embed], components: [row] })
			.then((message) => {
				quizEliminated = [];
				setTimeout(function () {
					message.edit({ embeds: [embed], components: [rowDisabled] });
				}, 20000);
			});

		await new Promise((resolve) => setTimeout(resolve, 20000));
	}

	await channel.send({ content: "Quiz has ended." });
	await channel
		.send({ content: "Results:\n```json" + JSON.stringify(quizPoints) + "```" })
		.then(() => {
			quizPoints = [];
		});
}
