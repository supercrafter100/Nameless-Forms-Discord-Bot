import { Subcommand } from "@crystaldevelopment/command-handler/dist";
import { CommandInteraction } from "discord.js";
import Bot from "../../managers/Bot";

export default class extends Subcommand {
    public name = "list";
    public description = "List all settings";
    public options = [];

    public onStart(): void {
        null;
    }

    public onLoad(): void {
        null;
    }

    public async run(interaction: CommandInteraction) {
        if (!interaction.guild || !interaction.guildId) {
            interaction.reply("This command can only be used in a server");
            return;
        }

        const client = interaction.client as Bot;

        // Get all the data for this discord server
        const apiurl = await client.database.apiurls.get(interaction.guildId);
        const apikey = await client.database.apikeys.get(interaction.guildId);

        // Build the embed
        const embed = client.embeds.base();
        embed.setDescription(
            [
                `🌐 **Api url**: ${apiurl ? `\`${apiurl}\`` : "*Not set*"}`,
                `🔑 **API Key**: ${apikey ? `\`${apikey}\`` : "*Not set*"}`,
            ].join("\n")
        );

        // Send the embed
        interaction.reply({ embeds: [embed], ephemeral: true });
    }
}
