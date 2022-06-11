import { join } from "path";
import dotenv from "dotenv";
import Logger from "./handlers/Logger";
import chalk from "chalk";
import Bot from "./managers/Bot";
import { Intents, Options } from "discord.js";
import { ActivityType } from "discord-api-types";

dotenv.config();

// Setting up

const logger = new Logger();
logger.prefix = chalk.bold.redBright("MASTER");
const devmode = process.env.npm_lifecylce_event == "dev";

const logtype = devmode ? "warn" : "info";

logger.blank();
logger[logtype]("=================================");
logger[logtype](
    "Running bot in",
    devmode ? chalk.red("DEV") : chalk.green("PROD"),
    "mode"
);
logger[logtype]("=================================");
logger.blank();

const client = new Bot({
    intents: [
        Intents.FLAGS.DIRECT_MESSAGE_REACTIONS,
        Intents.FLAGS.DIRECT_MESSAGES,
        Intents.FLAGS.GUILDS
    ],
    makeCache: Options.cacheWithLimits({
        MessageManager: 10,
        PresenceManager: 0,
    }),
    presence: {
        activities: [
            {
                name: "NamelessMC Forms",
                type: "WATCHING"
            },
        ],
    },
});

client.events.load(join(__dirname, "events"));
client.commands.loadFromDirectory(join(__dirname, "./commands"));

if (client.devmode) {
    client.login(process.env.DEV_TOKEN ?? process.env.TOKEN);
} else {
    client.login(process.env.TOKEN);
}
