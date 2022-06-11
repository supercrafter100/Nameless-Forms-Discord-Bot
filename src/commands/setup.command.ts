import { Command } from "@crystaldevelopment/command-handler/dist";
import { ApplicationCommandOptionType } from "discord-api-types";
import { ApplicationCommandOptionData, CommandInteraction } from "discord.js";
import fetch from "node-fetch";
import Bot from "../managers/Bot";
import Embeds from "../util/Embeds";

export default class extends Command {
    public name = "setup";
    public description = "Setup the discord bot";
    public options: ApplicationCommandOptionData[] = [];

    public onStart(): void {
        null;
    }

    public onLoad(): void {
        null;
    }

    public async run(interaction: CommandInteraction): Promise<any> {
        const client = interaction.client as Bot;

        // Step 1, introduction & requesting api key
        const embed = client.embeds
            .base()
            .setDescription(
                [
                    "Thank you for using the bot!",
                    "",
                    "To get started, you will need to head to your website and log into StaffCP.",
                    "After this, go to `StaffCP > Configuration > Api` and enable your api. Copy the api url and api key and use the `/settings set apikey <url> <key>` slash command to setup these settings.",
                    "",
                    "To enable or disable the filling in of forms via discord, you can view all the available forms using the `/settings list` slash command. To then enable or disable a form, use the `/settings set formenabled <formid> <true/false>` slash command."
                ].join("\n")
            );
        interaction.reply({
            embeds: [embed],
        });
    }
}
