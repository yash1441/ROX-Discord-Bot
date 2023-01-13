const {
	SlashCommandBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChannelType,
	StringSelectMenuBuilder,
} = require("discord.js");
const feishu = require("../feishu.js");
require("dotenv").config();

module.exports = {
	data: new SlashCommandBuilder()
		.setName("reload")
		.setDescription("Reload data from the database.")
		.addSubcommand((subcommand) =>
			subcommand
				.setName("creators")
				.setDescription("Add Creator role to the accepted users.")
		),

	async execute(interaction, client) {
		if (interaction.user.id != process.env.MY_ID) {
			return;
		}
		const subCommand = interaction.options.getSubcommand();

		if (subCommand === "creators") {
			await interaction.reply({
				content: "Updating the list of creators and star creators...",
				ephemeral: true,
			});

			let tenantToken = await feishu.authorize(
				process.env.FEISHU_ID,
				process.env.FEISHU_SECRET
			);

			let response = JSON.parse(
				await feishu.getRecords(
					tenantToken,
					process.env.ROX_CREATOR_BASE,
					process.env.ROX_CREATOR,
					`CurrentValue.[Status] = "Accepted"`
				)
			);

			let creatorList = [];

			if (response.data.total) {
				for (const item of response.data.items) {
					creatorList.push({
						discordId: item.fields["Discord ID"],
						creatorType: item.fields["Creator Type"],
						recordId: item.record_id,
					});
				}

				for (const creator of creatorList) {
					const guild = client.guilds.cache.get(process.env.ROX_SERVER);
					const member = guild.members.cache.get(creator.discordId);
					const role =
						creator.creatorType == "Creator"
							? process.env.CREATOR_ROLE
							: creator.creatorType == "Star Creator"
							? process.env.STAR_CREATOR_ROLE
							: undefined;

					if (member == undefined) {
						await feishu.updateRecord(
							tenantToken,
							process.env.ROX_CREATOR_BASE,
							process.env.ROX_CREATOR,
							creator.recordId,
							{ fields: { Status: "Failed" } }
						);
					} else {
						await member.roles
							.add(role)
							.catch(() => {
								feishu.updateRecord(
									tenantToken,
									process.env.ROX_CREATOR_BASE,
									process.env.ROX_CREATOR,
									creator.recordId,
									{ fields: { Status: "Failed" } }
								);
							})
							.then(() => {
								feishu.updateRecord(
									tenantToken,
									process.env.ROX_CREATOR_BASE,
									process.env.ROX_CREATOR,
									creator.recordId,
									{ fields: { Status: "Done" } }
								);
							});
					}
				}
				interaction.editReply({ content: "Updated!", ephemeral: true });
			} else {
				interaction.editReply({
					content: "No creators accepted yet.",
					ephemeral: true,
				});
			}
		}
	},
};
