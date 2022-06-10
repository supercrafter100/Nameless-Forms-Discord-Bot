import { MessageReaction, User } from "discord.js";
import { Event } from "../handlers/EventHandler";
import EmojiToNumber from "../util/EmojiToNumber";

export default class InteractionCreate extends Event<"messageReactionAdd"> {
    public event = "messageReactionAdd";

    public run(reaction: MessageReaction, user: User) {
        if (
            reaction.message.channel.type === "DM" && 
            this.client.forms.activeForms.get(user.id) !== undefined && 
            reaction.emoji.name == "✅"
        ) {
            
            // Check if the message contains an embed
            if (reaction.message.embeds.length == 0) {
                return; // No embed found, not an application bot message
            }

            const session = this.client.forms.activeForms.get(user.id)!;

            // Check if the title of the embed contains the latest question index
            const embed = reaction.message.embeds[0];
            if (embed.title == undefined || embed.title.indexOf((session.questionNumber + 1).toString()) == -1) {
                return; // No embed found, not an application bot message
            }


            const field = session.form.fields[session.questionIndex];
            const options = this.client.forms.getOptionsFromField(field);

            const reactions = reaction.message.reactions.cache.filter(r => r.emoji.name !== "✅" && r.users.cache.get(user.id) !== undefined);
            const answers = [];
            
            for (const [emoji, _] of reactions) {
                const number = EmojiToNumber(emoji);
                if (number !== undefined && number <= options.length) {
                    answers.push(options[number - 1]);
                }
            }

            this.client.forms.handleOptionResponse(user, answers);
        }
    }
}
