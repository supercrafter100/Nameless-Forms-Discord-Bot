import { CommandInteraction, Message } from "discord.js";
import { Event } from "../handlers/EventHandler";

export default class InteractionCreate extends Event<"messageCreate"> {
    public event = "messageCreate";

    public run(msg: Message) {
        if (msg.channel.type === "DM" && this.client.forms.activeForms.get(msg.author.id) !== undefined) {
            this.client.forms.handleResponse(msg.author, msg.content);
        }
    }
}
