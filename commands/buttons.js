const {
	SlashCommandBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
} = require("discord.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("buttons")
		.setDescription("Sets up embed and buttons for respective actions.")
		.addSubcommand((subcommand) =>
			subcommand
				.setName("apply-creator")
				.setDescription("Setup Creator Application.")
				.addChannelOption((option) =>
					option
						.setName("channel")
						.setDescription("Input the channel.")
						.setRequired(true)
				)
		),
	async execute(interaction, client) {
		await interaction.deferReply();
		if (interaction.user.id != process.env.MY_ID) {
			interaction.deleteReply();
			return;
		}
		const subCommand = interaction.options.getSubcommand();
		const channel = interaction.options.getChannel("channel");

		if (subCommand === "apply-creator") {
			const applyCreatorButton = new ButtonBuilder()
				.setCustomId("applyCreator")
				.setLabel("Apply")
				.setStyle(ButtonStyle.Success)
				.setEmoji("✅");

			const applyCreatorEmbed = new EmbedBuilder()
				.setTitle(`ROX Creator Program`)
				.setDescription(`Apply to the ROX Creator Program below.`)
				.setColor(`2596bE`);

			const applyCreatorRow = new ActionRowBuilder().addComponents([
				applyCreatorButton,
			]);

			client.channels.fetch(channel.id).then((channel) =>
				channel.send({
					embeds: [applyCreatorEmbed],
					components: [applyCreatorRow],
				})
			);
		}
		await interaction.deleteReply();
	},
};
