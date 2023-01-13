const {
	Client,
	Collection,
	GatewayIntentBits,
	Partials,
	ChannelType,
	ActionRowBuilder,
	EmbedBuilder,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
	StringSelectMenuBuilder,
	ActivityType,
	ButtonBuilder,
	ButtonStyle,
} = require("discord.js");
const fs = require("fs");
const path = require("path");
const request = require("request-promise");
const feishu = require("./feishu.js");
require("dotenv").config();

let quizPressed = [],
	quizEliminated = [],
	quizOn = false,
	quizPoints = [];

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildMessageReactions,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildPresences,
		GatewayIntentBits.DirectMessages,
		GatewayIntentBits.MessageContent,
	],
	partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

////////////////////
/// ADD COMMANDS ///
////////////////////

let files = fs.readdirSync("./"),
	file;

for (file of files) {
	if (file.startsWith("autoAdd")) {
		require("./" + file);
	}
}

client.commands = new Collection();

const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
	.readdirSync(commandsPath)
	.filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	const command = require(filePath);
	client.commands.set(command.data.name, command);
}

////////////////////
//// BOT EVENTS ////
////////////////////

client.on("ready", () => {
	console.log("* Discord bot connected. *");
	client.user.setPresence({
		activities: [
			{
				name: `Ragnarok X`,
				type: ActivityType.Playing,
			},
		],
		status: `dnd`,
	});
});

client.on("interactionCreate", async (interaction) => {
	if (interaction.isChatInputCommand() && interaction.commandName != "quiz") {
		const command = interaction.client.commands.get(interaction.commandName);

		if (!command) return;

		try {
			await command.execute(interaction, client);
		} catch (error) {
			console.error(error);
			await interaction.editReply({
				content: "There was an error while executing this command!",
			});
		}
	} else if (interaction.commandName === "quiz") {
		if (!quizOn)
			await interaction.reply({
				content: "Starting quiz...",
				ephemeral: true,
			});
		else
			return await interaction.reply({
				content: "Quiz already in progress.",
				ephemeral: true,
			});

		const channel = interaction.options.getChannel("channel");
		const questions = interaction.options.getInteger("questions");
		const difficulty = interaction.options.getString("difficulty") ?? "Random";
		const elimination = interaction.options.getBoolean("elimination") ?? false;

		quizOn = true;

		await startQuiz(channel, questions, difficulty, elimination, 5000);

		quizOn = false;
	} else if (interaction.isButton()) {
		if (interaction.customId === "applyCreator") {
			const creatorModal = new ModalBuilder()
				.setCustomId("creatorModal")
				.setTitle("ROX Creator Program");
			const creatorUID = new TextInputBuilder()
				.setCustomId("creatorUID")
				.setLabel("In-Game UID")
				.setStyle(TextInputStyle.Short)
				.setRequired(true);
			const creatorChannel = new TextInputBuilder()
				.setCustomId("creatorChannel")
				.setLabel("Channel Link")
				.setStyle(TextInputStyle.Short)
				.setRequired(true);
			const creatorCountry = new TextInputBuilder()
				.setCustomId("creatorCountry")
				.setLabel("Which country are you from?")
				.setStyle(TextInputStyle.Short)
				.setRequired(true);

			let firstQuestion = new ActionRowBuilder().addComponents(creatorUID);
			let secondQuestion = new ActionRowBuilder().addComponents(creatorChannel);
			let thirdQuestion = new ActionRowBuilder().addComponents(creatorCountry);

			creatorModal.addComponents(firstQuestion, secondQuestion, thirdQuestion);

			await interaction.showModal(creatorModal);
		} else if (interaction.customId.startsWith("Button")) {
			await interaction.deferReply({ ephemeral: true });

			const discordId = interaction.user.id;

			if (quizEliminated.includes(discordId)) {
				return await interaction.editReply({
					content: "You have been eliminated from the quiz!",
				});
			} else if (quizPressed.includes(discordId)) {
				return await interaction.editReply({
					content: "You have already answered this question!",
				});
			} else quizPressed.push(discordId);

			let chosenAnswer = interaction.customId[6];
			let correctAnswer = interaction.customId[7];
			let elimination = interaction.customId.length > 8 ? true : false;

			if (chosenAnswer === correctAnswer) {
				if (!checkUserId(interaction.user.username))
					quizPoints.push({ ID: interaction.user.username, Points: 1 });
				else await addPoints(interaction.user.username, 1);
				return await interaction.editReply({
					content: "Correct answer! You got **1** point!",
				});
			} else {
				if (!checkUserId(interaction.user.username))
					quizPoints.push({ ID: interaction.user.username, Points: 0 });
				if (elimination) {
					quizEliminated.push(discordId);
					return await interaction.editReply({
						content: "Incorrect answer! You have been eliminated!",
					});
				} else {
					return await interaction.editReply({
						content: "Incorrect answer! You got **0** points!",
					});
				}
			}
		}
	} else if (interaction.isModalSubmit()) {
		if (interaction.customId === "creatorModal") {
			await interaction.deferReply({ ephemeral: true });

			let c1 = interaction.fields.getTextInputValue("creatorUID");
			let c2 = interaction.fields.getTextInputValue("creatorChannel");
			let c3 = interaction.fields.getTextInputValue("creatorCountry");

			let creator = {
				fields: {
					"Discord ID": interaction.user.id,
					"Discord Name": interaction.user.tag,
					"In-Game UID": c1,
					"Channel Link": {
						text: c2,
						link: c2,
					},
					Country: c3,
				},
			};

			let tenantToken = await feishu.authorize(
				process.env.FEISHU_ID,
				process.env.FEISHU_SECRET
			);

			let response = JSON.parse(
				await feishu.getRecords(
					tenantToken,
					process.env.ROX_CREATOR_BASE,
					process.env.ROX_CREATOR,
					`CurrentValue.[Discord ID] = "${interaction.user.id}"`
				)
			);

			if (response.data.total) {
				return await interaction.editReply({
					content: "You can only apply once.",
				});
			}

			let success = await feishu.createRecord(
				tenantToken,
				process.env.ROX_CREATOR_BASE,
				process.env.ROX_CREATOR,
				creator
			);

			if (success) {
				await interaction.editReply({
					content: "Your application has been submitted successfully.",
				});
			} else {
				await interaction.editReply({
					content:
						"An error occurred. Please try again later or contact **Simon#0988**.",
				});
			}
		}
	}
});

client.login(process.env.DISCORD_TOKEN);

async function startQuiz(
	channel,
	questions,
	difficulty,
	elimination,
	time = 20000
) {
	let tenantToken = await feishu.authorize(
		process.env.FEISHU_ID,
		process.env.FEISHU_SECRET
	);

	quizPoints.length = 0;
	quizPoints = [];
	quizEliminated.length = 0;
	quizPressed.length = 0;

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

	let questionNumber = 0;

	for (const question of shuffledQuestions) {
		await new Promise((resolve) => setTimeout(resolve, time));

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
				quizPressed.length = 0;
				setTimeout(function () {
					message.edit({ embeds: [embed], components: [rowDisabled] });
				}, time);
			});
	}

	await new Promise((resolve) => setTimeout(resolve, time));

	await channel.send({ content: "Quiz has ended." });
	const message = await createPointsTable();
	await channel.send({
		content: "Results:\n```" + message + "```",
	});
}

async function addPoints(discordId, points) {
	for (let i = 0; i < quizPoints.length; i++) {
		if (quizPoints[i].ID == discordId) {
			quizPoints[i].Points += points;
			return console.log(
				`Added ${points} points to ${quizPoints[i].id}'s account.`
			);
		}
	}
	return console.log(`User with ID ${discordId} not found.`);
}

function checkUserId(discordId) {
	const user = quizPoints.find((user) => user.ID === discordId);
	if (user) return true;
	else return false;
}

async function createPointsTable() {
	let table = "Name  | Points\n";
	for (let i = 0; i < quizPoints.length; i++) {
		table += `${quizPoints[i].ID}    | ${quizPoints[i].Points}\n`;
	}
	return table;
}
