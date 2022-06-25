import chalk from "chalk";
import Discord from "discord.js";
import Logger from "../handlers/Logger";
import EventHandler from "../handlers/EventHandler";
import Database from "../database/Database";
import { CommandHandler } from "@crystaldevelopment/command-handler";
import Embeds from "../util/Embeds";
import FormHandler from './FormHandler';
import FormsApiHandler from "./FormsApiHandler";


export default class Bot extends Discord.Client<true> {
    //      Handlers

    public readonly commands = new CommandHandler(this, {
        createCommands: true,
        updateCommands: true,
        deleteCommands: true,
        ...(process.env.GUILDID && { guildId: process.env.GUILDID })

    });
    public readonly events = new EventHandler(this);
    public readonly forms = new FormHandler(this);
    public readonly formsApi = new FormsApiHandler(this);

    //      Util

    public readonly logger = new Logger();
    public readonly database = new Database(this);
    public readonly embeds = new Embeds(this);


    //      Misc

    public readonly extension: string;
    public readonly devmode: boolean;

    constructor(options: Discord.ClientOptions) {
        super(options);

        this.logger.prefix = chalk.green("BOT");
        this.devmode = process.env.npm_lifecycle_event == "dev";
        this.extension = this.devmode ? ".ts" : ".js";
        this.logger.info("Starting bot...");
        this.start();
    }

    private async start() {
        await this.events.start();
        await this.database.start();
        this.forms.startCleanupTimer();
    }

    public async getApiCredentials(guildId: string) {
        const apiUrl = await this.database.apiurls.get(guildId);
        const apiKey = await this.database.apikeys.get(guildId);

        if (!apiUrl || !apiKey) {
            return undefined;
        }

        return {
            url: apiUrl + (apiUrl.endsWith('/') ? '' : '/'),
            key: apiKey,
        }

    }
}
