import chalk from "chalk";
import { Collection, MessageAttachment, User } from "discord.js";
import { ApiForm, ApiFormSubmitError, ApiFormSubmitResponse, FormField } from "../types";
import NumberToEmoji from "../util/NumberToEmoji";
import Bot from "./Bot";
import fetch from 'node-fetch';

export type sessionAnswers = {
    [key: string]: string | string[]
}

export type fileAnswers = {
    [key: string]: string
}

export interface FormSession {
    form: ApiForm;
    user: User;
    guildId: string;
    questionIndex: number;
    questionNumber: number;
    answers: sessionAnswers;
    files: fileAnswers;
    startedAt: Date;
}

export enum fieldTypes {
    TEXT = '1',
    OPTIONS = '2',
    TEXT_AREA = '3',
    HELP_BOX = '4',
    BARRIER = '5',
    NUMBER = '6',
    EMAIL_ADRESS = '7',
    RADIO_CHECKBOX = '8',
    CHECKBOX = '9',
    FILE = '10'
}

export default class {

    public activeForms: Collection<string, FormSession> = new Collection();
    private formTimeout = 3600000; // 1 hour
    private allowedImageExtensions = [".png", ".jpg", ".jpeg"];

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

    public async handleFileResponse(user: User, files: MessageAttachment[]) {
        const session = this.activeForms.get(user.id);
        if (!session) {
            this.bot.logger.error("No session found for user " + user.id);
            return;
        }

        // If the field doesn't support it
        const field = session.form.fields[session.questionIndex];
        if (field.type !== fieldTypes.FILE) {
            const embed = this.bot.embeds.base();
            embed.setDescription("You cannot attach files to this question!");
            session.user.send({ embeds: [ embed ]});
            this.AskQuestion(session);
            return;
        }

        if (files.length > 1) {
            const embed = this.bot.embeds.base();
            embed.setDescription("You can only attach one file!");
            session.user.send({ embeds: [ embed ]});
            this.AskQuestion(session);
            return;
        }

        const file = files[0];

        // Check if their extensions are allowed
        if (!this.allowedImageExtensions.some(extension => file.name?.endsWith(extension))) {
            const embed = this.bot.embeds.base();
            embed.setDescription("The file was not ending with the correct extensions. The allowed extensions are: " + this.allowedImageExtensions.map(ext => `\`${ext}\``).join(', ')); // This is way too long. Whatever
            session.user.send({ embeds: [ embed ]});
            this.AskQuestion(session);
            return;
        }

        const imageRequest = await fetch(file.url || file.proxyURL);
        const blob = await imageRequest.arrayBuffer();
        const image = `data:${imageRequest.headers.get("content-type")};base64,${Buffer.from(blob).toString("base64")}`;

        if (!image) {
            throw new Error("Something went wrong while trying to retrieve image from Discord");
        }

        this.successfulAnswer(session, image as any);
    }

    public successfulAnswer(session: FormSession, response: string | string[]) {
        
        const field = session.form.fields[session.questionIndex];

        if (field.type === fieldTypes.FILE) session.files[field.id] = response as string 
        
        session.answers[field.id] = response;
        session.questionIndex++;
        session.questionNumber++;

        if (session.questionIndex >= session.form.fields.length) {
            // Submit form to website
            this.submitForm(session);
            return;
        }

        this.AskQuestion(session);
    }

    private async submitForm(session: FormSession) {

        let response: ApiFormSubmitError | ApiFormSubmitResponse | undefined;

        const userInfo = await this.bot.formsApi.getUserInfo(session.guildId, session.user.id);
        if (!userInfo) {
            response = await this.bot.formsApi.submitForm(session.guildId, session.form.id, session.answers);
        } else {
            response = await this.bot.formsApi.submitForm(session.guildId, session.form.id, session.answers, session.user.id);
        }   

        if (response && "error" in response) {
            // Error embed
            const embed = this.bot.embeds.baseNoFooter();
            embed.setDescription("`❌` An error occured while submitting your form:\n\n" + (Array.isArray(response.meta) ? response.meta.join('\n') : `\`${JSON.stringify(response)}\``));
            session.user.send({ embeds: [ embed ]});
        } else {
            // Confirmation embed
            const embed = this.bot.embeds.baseNoFooter();
            embed.setDescription('`✅` Form submitted!');
            session.user.send({ embeds: [ embed ]});
        }

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
        if ([fieldTypes.OPTIONS, fieldTypes.RADIO_CHECKBOX, fieldTypes.CHECKBOX].includes(session.form.fields[session.questionIndex].type as fieldTypes)) {
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

        if (field.type == fieldTypes.NUMBER && !/^[0-9]+$/.test(response)) {
            errors.push(`Not a number!`);
        }

        if (field.type == fieldTypes.EMAIL_ADRESS && !/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(response)) {
            errors.push(`Not a valid email adress!`);
        }

        return errors;
    }

    private verifyOptionsField(field: FormField, choices: string[]): string[] {

        const errors = [];

        if (choices.length < 1) {
            errors.push("You need to select at least one option!");
        }

        if ((field.type === fieldTypes.OPTIONS || field.type == fieldTypes.RADIO_CHECKBOX) && choices.length > 1) {
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
            files: {},
            startedAt: new Date(),
        };
    }

    private createQuestionText(field: FormField) {
        const content = [];

        switch(field.type) {
            case fieldTypes.TEXT:
            case fieldTypes.TEXT_AREA:
                content.push(field.name);
                content.push('');
                break;

            case fieldTypes.OPTIONS:
            case fieldTypes.RADIO_CHECKBOX:
            case fieldTypes.CHECKBOX:
                {
                    content.push(field.name);
                    content.push(`Type: ${this.getFieldTypeFromId(field.type)}`)
                    content.push('');
                    const options = this.getOptionsFromField(field);
                    const optionStrings = options.map((option, index) => `${NumberToEmoji(index + 1)} ${option}`)
                    content.push(optionStrings.join('\n'));
                }
                break;
            
            case fieldTypes.FILE:
                {
                    content.push(field.name);
                    content.push(`*Please paste the file(s) below in one message*`);
                    content.push('');
                }
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
        const options = (typeof field.options == "string") ? field.options.split('\r,') : field.options;
        return options;
    }

    private getFieldTypeFromId(id: string) {
        const typeIndex = Object.values(fieldTypes).indexOf(id as unknown as fieldTypes);
        return Object.keys(fieldTypes)[typeIndex]
    }

    private isQuestionObject(field: FormField) {
        if ([fieldTypes.HELP_BOX, fieldTypes.BARRIER, fieldTypes.FILE].includes(field.type as fieldTypes)) {
            return false;
        }
        return true;
    }

    //
    // Form expiration handling to prevent memory increasing exponentially
    //

    public startCleanupTimer() {
        setInterval(() => this.cleanUpForms(), 60000); // Every minute
    }

    private cleanUpForms() {
        const now = new Date();
        for (const form of this.activeForms.toJSON()) {
            if (now.getTime() - form.startedAt.getTime() > this.formTimeout) {
                form.user.send("Your form has expired! Please execute the command again in the server to start a new form.");
                this.bot.logger.info("Form from user " + chalk.yellow(form.user.id) + " has expired!");
                this.activeForms.delete(form.user.id);
            }
        }
    }
}