import { Collection, User } from "discord.js";
import { ApiForm, FormField } from "../types";
import NumberToEmoji from "../util/NumberToEmoji";
import Bot from "./Bot";

interface FormSession {
    form: ApiForm;
    user: User;
    guildId: string;
    questionIndex: number;
    questionNumber: number;
    answers: { [key: string]: string | string[] };
}

const fieldTypes = {
    1: "text",
    2: "Options",
    3: "Text area",
    4: "Help box",
    5: "Barrier",
    6: "Number",
    7: "Email adress",
    8: "Radio checkbox",
    9: "Checkbox",
    10: "File"
}

export default class {

    public activeForms: Collection<string, FormSession> = new Collection();

    constructor (private readonly bot: Bot) {};

    public async fill(guildId: string, formInfo: ApiForm, user: User) {
        const session = this.createSession(guildId, formInfo, user);
        this.activeForms.set(user.id, session);
        this.AskQuestion(session);
    }

    public async handleResponse(user: User, response: string) {
        const session = this.activeForms.get(user.id);
        if (!session) {
            this.bot.logger.error("No session found for user " + user.id);
            return;
        }

        const field = session.form.fields[session.questionIndex];

        // Verify response
        const errors = this.verifyField(field, response);
        if (errors.length > 0) {
            const embed = this.bot.embeds.base();
            embed.setDescription('The following errors occured during the verification of your response:\n' + errors.map(error => "• " + error).join('\n'));
            session.user.send({ embeds: [ embed ]});
            this.AskQuestion(session);
            return;
        }

        this.successfulAnswer(session, response);
    }

    public async handleOptionResponse(user: User, choices: string[]) {
        const session = this.activeForms.get(user.id);
        if (!session) {
            this.bot.logger.error("No session found for user " + user.id);
            return;
        }

        const field = session.form.fields[session.questionIndex];

        // Verify response
        const errors = this.verifyOptionsField(field, choices);
        if (errors.length > 0) {
            const embed = this.bot.embeds.base();
            embed.setDescription('The following errors occured during the verification of your response:\n' + errors.map(error => "• " + error).join('\n'));
            session.user.send({ embeds: [ embed ]});
            this.AskQuestion(session);
            return;
        }

        this.successfulAnswer(session, choices);
    }

    public successfulAnswer(session: FormSession, response: string | string[]) {
        
        const field = session.form.fields[session.questionIndex];

        session.answers[field.id] = response;
        session.questionIndex++;
        session.questionNumber++;

        if (session.questionIndex >= session.form.fields.length) {
            
            // Confirmation embed
            const embed = this.bot.embeds.baseNoFooter();
            embed.setDescription('`✅` Form submitted!');
            session.user.send({ embeds: [ embed ]});
            
            // Submit form to website
            this.submitForm(session);
            return;
        }

        this.AskQuestion(session);
    }

    private submitForm(session: FormSession) {
        this.bot.formsApi.submitForm(session.guildId, session.form.id, session.answers);
        this.activeForms.delete(session.user.id);
    }
    

    private async AskQuestion(session: FormSession) {

        // Ensure we aren't asking a question that is not a question
        while (!this.isQuestionObject(session.form.fields[session.questionIndex])) {
            session.questionIndex++;
            if (session.questionIndex >= session.form.fields.length) {
                this.submitForm(session);
                return;
            }
        }

        const questionContent = this.createQuestionText(session.form.fields[session.questionIndex]);
        const embed = this.bot.embeds.baseNoFooter();

        embed.setTitle(`Question #${session.questionNumber + 1}`);
        embed.setDescription(questionContent);

        const msg = await session.user.send({ embeds: [ embed ]});
        
        // Respond with all the choices if its an options embed
        if (["2", "8", "9"].includes(session.form.fields[session.questionIndex].type)) {
            for (let i = 1; i <= this.getOptionsFromField(session.form.fields[session.questionIndex]).length; i++) {
                await msg.react(NumberToEmoji(i));
            }
            await msg.react('✅');
        }
    }

    //
    // Verification of field
    //

    private verifyField(field: FormField, response: string) : string[] {
        
        const errors = [];

        const min = parseInt(field.min)
        if (min !== 0 && response.length < min) {
            errors.push(`Too short! Minimum length is ${field.min}`);
        }
        
        const max = parseInt(field.max);
        if (max !== 0 && response.length > max) {
            errors.push(`Too long! Maximum length is ${field.max}`);
        }

        if (field.type == "6" && !/^[0-9]+$/.test(response)) {
            errors.push(`Not a number!`);
        }

        if (field.type == "7" && !/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(response)) {
            errors.push(`Not a valid email adress!`);
        }

        return errors;
    }

    private verifyOptionsField(field: FormField, choices: string[]): string[] {

        const errors = [];

        if (choices.length < 1) {
            errors.push("You need to select at least one option!");
        }

        if ((field.type === "2" || field.type == "8") && choices.length > 1) {
            errors.push(`You can only select one option!`);
        }

        return errors;
    }

    // 
    //  Utils
    //

    private createSession(guildId: string, formInfo: ApiForm, user: User) {
        return {
            form: formInfo,
            user,
            guildId,
            questionIndex: 0,
            questionNumber: 0,
            answers: {},
        };
    }

    private createQuestionText(field: FormField) {
        const content = [];

        switch(field.type) {
            case "1":
            case "3":
                content.push(field.name);
                content.push('');
                break;

            case "2":
            case "8":
            case "9":
                {
                    content.push(field.name);
                    content.push(`Type: ${fieldTypes[field.type]}`)
                    content.push('');
                    const options = this.getOptionsFromField(field);
                    const optionStrings = options.map((option, index) => `${NumberToEmoji(index + 1)} ${option}`)
                    content.push(optionStrings.join('\n'));
                }
                break;
        }

        const min = parseInt(field.min);
        const max = parseInt(field.max);

        if (min != 0 || max != 0) {
            
            if (min !== 0) {
                content.push(`Min characters: \`${field.min}\``);
            }

            if (max !== 0) {
                content.push(`Max characters: \`${field.max}\``);
            }
        }
        return content.join('\n');
    }

    public getOptionsFromField(field: FormField) {
        const options = field.options.split('\r,');
        return options;
    }

    private isQuestionObject(field: FormField) {
        if (["4", "5", "10"].includes(field.type)) {
            return false;
        }
        return true;
    }
}