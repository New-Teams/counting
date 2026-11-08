import { Client, Message, OmitPartialGroupDMChannel } from "discord.js";
import { createClient, RedisClientType } from "redis";

type GuildMessage = OmitPartialGroupDMChannel<Message<boolean>>;

export class Counter {

    private redisPromise: Promise<RedisClientType> | undefined;
    private queue: Promise<void> = Promise.resolve();

    constructor(
        private readonly client: Client
    ) {
        client.on('messageCreate', (message) => {
            if (message.author.bot) return;
            if (message.channelId !== process.env.COUNTER_CHANNEL_ID) return;

            this.queue = this.queue
                .then(() => this.onMessage(message))
                .catch((err) => console.error('[Counter]', err));
        });
    }

    private getRedis(): Promise<RedisClientType> {
        if (!this.redisPromise) {
            const redis = createClient({ url: process.env.REDIS_URL }) as RedisClientType;
            redis.on('error', (err) => console.error('[Redis]', err));
            this.redisPromise = redis.connect().then(() => redis);
        }
        return this.redisPromise;
    }

    private async rejectMessage(message: GuildMessage, text: string) {
        const replyMessage = await message.reply(text).catch(() => null);
        setTimeout(() => {
            message.delete().catch(() => {});
            replyMessage?.delete().catch(() => {});
        }, 1500);
    }

    private async onMessage(message: GuildMessage) {
        const redis = await this.getRedis();

        const lastNumber = parseInt(await redis.get('countbot:counter') ?? '0');
        const lastSender = await redis.get('countbot:lastCounter');

        if (lastSender === message.author.id) {
            await this.rejectMessage(message, 'Tu ne peux pas envoyer deux messages d\'affilée <:no:1450807672239816755>');
            return;
        }

        const expected = `${lastNumber + 1}`;
        const content = message.content;

        if (content === expected || content.startsWith(`${expected} `) || content.startsWith(`${expected}\n`)) {
            await redis.set('countbot:counter', lastNumber + 1);
            await redis.set('countbot:lastCounter', message.author.id);
            await message.react('<:yes:1450807671342104668>').catch(() => {});
        } else {
            await this.rejectMessage(message, 'Cela n\'est pas un nombre ! <:no:1450807672239816755>');
        }
    }
}
