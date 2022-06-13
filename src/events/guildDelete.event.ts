import { CommandInteraction, Guild } from "discord.js";
import { Event } from "../handlers/EventHandler";

export default class InteractionCreate extends Event<"guildDelete"> {
    public event = "guildDelete";

    public run(guild: Guild) {
        this.client.logger.info("Left guild", guild.name);
        this.client.database.apikeys.delete(guild.id);
        this.client.database.apiurls.delete(guild.id);
        this.client.database.clearFormsEnabled(guild.id);
    }
}
