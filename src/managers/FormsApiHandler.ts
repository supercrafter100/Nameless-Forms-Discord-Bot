import Bot from "./Bot";
import fetch from 'node-fetch';
import { ApiForm } from "../types";

export default class {

    constructor (private readonly bot: Bot) {};

    public async getForms(guildId: string) {
        const apiCredentials = await this.bot.getApiCredentials(guildId);
        if (!apiCredentials) {
            return [];
        }
        const forms = await fetch(`${apiCredentials.url}forms`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${apiCredentials.key}`,
            }
        }).then((res) => res.json()) as { forms: ApiForm[] };
        return forms.forms;
    }

    public async getFormInfo(guildId: string, formId: number) {
        const apiCredentials = await this.bot.getApiCredentials(guildId);
        if (!apiCredentials) {
            return;
        }

        const form = await fetch(`${apiCredentials.url}forms/${formId}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${apiCredentials.key}`,
            }
        }).then((res) => res.json()) as ApiForm;

        if (!form.fields) {
            return; // Something went wrong as this should always be set
        }

        return form;
    }

    public async submitForm(guildId: string, formId: number, answers: { [key: string]: string | string[] }) {
        const apiCredentials = await this.bot.getApiCredentials(guildId);
        if (!apiCredentials) {
            return;
        }

        const body = {
            field_values: answers,
        }

        await fetch(`${apiCredentials.url}forms/${formId}/submissions/create`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiCredentials.key}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body)
        }).then((res) => res.json())
    }
}