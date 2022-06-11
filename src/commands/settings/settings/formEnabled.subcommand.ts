import { Subcommand } from "@crystaldevelopment/command-handler/dist";
import { ApplicationCommandOptionType } from "discord-api-types";
import { CommandInteraction } from "discord.js";
import Bot from "../../../managers/Bot";

export default class extends Subcommand {
    public name = "formenabled";
    public description = "Enable or disable the filling in of a form";
    public options = [
        {
            type: ApplicationCommandOptionType.Number as number,
            name: "form",
            description: "The form ID to enable or disable",
            required: true,
        },
        {
            type: ApplicationCommandOptionType.Boolean as number,
            name: "enabled",
            description: "Whether the form is enabled or not", 
            required: true,
        },
    ];

    public onStart(): void {
        null;
    }

    public onLoad() {
        null;
    }

    public async run(interaction: CommandInteraction) {
        if (!interaction.guildId || !interaction.guild) {
            interaction.reply("This command can only be used in a server");
            return;
        }
        const client = interaction.client as Bot;
        
        if (!(await client.getApiCredentials(interaction.guildId))) {
            interaction.reply("You haven't set up the api credentials!");
            return;
        }

        const formId = interaction.options.getNumber("form")!;
        const enabled = interaction.options.getBoolean("enabled")!;

        // Check if the api url + key is valid
        const form = await client.formsApi.getFormInfo(interaction.guildId, formId).catch(() => undefined);
        if (!form) {
            interaction.reply("The form does not exist");
            return;
        }

        await client.database.SetFormEnabled(interaction.guildId, formId.toString(), enabled);

        interaction.reply("The form has been " + (enabled ? "enabled" : "disabled"));
    }
}
