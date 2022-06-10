import { Command } from "@crystaldevelopment/command-handler/dist";
import { ApplicationCommandOptionData, CommandInteraction } from "discord.js";
import Bot from "../managers/Bot";
import markdownTable from 'markdown-table';

export default class extends Command {
    public name = "forms";
    public description = "List all forms on the site";
    public options: ApplicationCommandOptionData[] = [];

    public onStart(): void {
        null;
    }

    public onLoad(): void {
        null;
    }

    public async run(interaction: CommandInteraction): Promise<any> {

        if (!interaction.guildId || !interaction.guild) {
            interaction.reply("This command can only be used in a server");
            return;
        }

        const client = interaction.client as Bot;
        if (!client.getApiCredentials(interaction.guildId)) {
            interaction.reply("You haven't set up the api credentials!");
            return;
        }

        const forms = await client.formsApi.getForms(interaction.guildId);
        if (!forms || !forms.length) {
            interaction.reply("There are no forms on the site");
            return;
        }

        

        const table = [];
        table.push(["ID", "Name"]);
        table.push(...forms.map((form) => [form.id.toString(), form.title]));

        const embed = client.embeds.baseNoFooter();
        embed.setDescription("```" + markdownTable(table) + "```");
        interaction.reply({
            embeds: [embed],
        });
    }
}