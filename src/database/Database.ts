import Keyv from "@keyvhq/core";
import KeyvSQL from "@keyvhq/mysql";
import Bot from "../managers/Bot";
import Mysql2 from "mysql2/promise";

export default class Database {
    public apiurls!: Keyv<string>;
    public apikeys!: Keyv<string>;
    public connection!: Mysql2.Pool;

    constructor(public readonly client: Bot) {}

    private started = false;
    public async start() {
        if (this.started)
            return this.logger.warn(
                "Tried to start db, bit it's already started"
            );
        this.started = true;

        this.connection = Mysql2.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME,
            port: parseInt(process.env.DB_PORT!),
        });

        // Create forms_enabled table
        await this.connection.query(`CREATE TABLE IF NOT EXISTS forms_enabled (
            guild_id VARCHAR(255) NOT NULL,
            form_id VARCHAR(255) NOT NULL,
            enabled TINYINT(1) NOT NULL,
            PRIMARY KEY (guild_id, form_id)
        )`);

        this.apiurls = this.GetDatabaseForNamespace("apiurls");
        this.apikeys = this.GetDatabaseForNamespace("apikeys");
    }
    
    public GetDatabaseForNamespace(namespace: string) {

        const url = `mysql://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;
        const keyv = new Keyv({
            store: new KeyvSQL(url, {
                table: namespace,
            })
        });

        return keyv;
    }

    public async SetFormEnabled(guildId: string, formId: string, enabled: boolean) {
        await this.connection.query(`INSERT INTO forms_enabled (guild_id, form_id, enabled) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE enabled = ?`, [guildId, formId, enabled, enabled]);
    }

    public async GetFormEnabled(guildId: string, formId: string) {
        const row = await this.connection.query(`SELECT enabled FROM forms_enabled WHERE guild_id = ? AND form_id = ?`, [guildId, formId]).then((res) => res[0]) as any; // Typings are shit
        if (row.length == 0) {
            return false;
        }

        return row[0].enabled == 1;
    }

    public async clearFormsEnabled(guildId: string) {
        await this.connection.query(`DELETE FROM forms_enabled WHERE guild_id = ?`, [guildId]);
    }

    public get logger() {
        return this.client.logger;
    }
}
