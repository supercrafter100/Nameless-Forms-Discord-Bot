import { Command } from "@crystaldevelopment/command-handler/dist";
import { ApplicationCommandOptionData, CommandInteraction } from "discord.js";
import { ApplicationCommandOptionTypes } from "discord.js/typings/enums";
import Bot from "../managers/Bot";

export default class extends Command {
    public name = "fill";
    public description = "Fill in a form via discord";
    public options: ApplicationCommandOptionData[] = [
        {
            name: "name",
            description: "The form to fill in",
            type: ApplicationCommandOptionTypes.STRING,
            required: true,
        }
    ];

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
        if (!(await client.getApiCredentials(interaction.guildId))) {
            interaction.reply("You haven't set up the api credentials!");
            return;
        }
        
        const formName = interaction.options.getString("name")!;
        const formInfo = await client.formsApi.getFormInfoByName(interaction.guildId, formName) || await client.formsApi.getFormInfo(interaction.guildId, parseInt(formName)); // Fall back to id if name is not found
        if (!formInfo) {
            interaction.reply("Could not find form with name " + formName);
            return;
        }

        // Check if form is enabled or disabled
        const enabled = await client.database.GetFormEnabled(interaction.guildId, formInfo.id.toString());

        if (!enabled) {
            interaction.reply("The form is disabled");
            return;
        }

        // Check if it has file input fields
        const hasFileInputFields = formInfo.fields.some(field => field.type === "10");
        if (hasFileInputFields) {
            interaction.reply("This form has file input fields, the discord bot does not support this field so it cannot be filled in...");
            return;
        }

        const success = await interaction.user.createDM(true).catch(() => {
            interaction.reply("Could not create dm channel. Ensure you have your DMs enabled.");
            return false;
        });

        if (!success) {
            return;
        }

        client.forms.fill(interaction.guildId, formInfo, interaction.user);
        interaction.reply('You have been sent a DM with the form');
    }
}
