import Keyv from "@keyvhq/core";
import KeyvSQLite from "@keyvhq/sqlite";

import { join } from "path";
import Bot from "../managers/Bot";

export default class Database {
    public apiurls!: Keyv<string>;
    public apikeys!: Keyv<string>;

    constructor(public readonly client: Bot) {}

    private started = false;
    public async start() {
        if (this.started)
            return this.logger.warn(
                "Tried to start db, bit it's already started"
            );
        this.started = true;

        this.apiurls = new Keyv({
            store: new KeyvSQLite({
                uri: `sqlite://${join(__dirname, "../../data/db.sqlite")}`,
            }),
            namespace: "apiurls",
        });
        this.apikeys = new Keyv({
            store: new KeyvSQLite({
                uri: `sqlite://${join(__dirname, "../../data/db.sqlite")}`,
            }),
            namespace: "apikeys",
        });
    }

    public get logger() {
        return this.client.logger;
    }
}
