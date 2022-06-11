import { Subcommand } from "@crystaldevelopment/command-handler/dist";
import { CommandInteraction } from "discord.js";
import markdownTable from "markdown-table";
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
        
        // Forms enabled / disabled
        const embed2 = client.embeds.base();
        const forms = await client.formsApi.getForms(interaction.guildId);
        if (!forms || !forms.length) {
            embed2.setDescription('No forms on the site');
        } else {
            const table = [];
            table.push(["ID", "Name", "Enabled"]);
            for (const form of forms) {
                const enabled = await client.database.GetFormEnabled(interaction.guildId, form.id.toString());
                table.push([form.id.toString(), form.title, enabled ? "Yes" : "No"]);
            }
    
            embed2.setDescription("```" + markdownTable(table) + "```");
        }

        // Send the embed
        interaction.reply({ embeds: [embed, embed2], ephemeral: true });
    }
}
