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
	if (interaction.isChatInputCommand()) {
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
