import { Client, Message, OmitPartialGroupDMChannel } from "discord.js";
import { createClient, RedisClientType } from "redis";

export class Counter {
    
    private redis : RedisClientType|undefined;

    constructor(
        private readonly client : Client
    ) {
        client.on('messageCreate', (e) => this.onMessage(e));
    }

    async onMessage(message : OmitPartialGroupDMChannel<Message<boolean>>) {

        if(message.author.bot) return;

        if(this.redis == undefined){
            this.redis = await createClient({url: process.env.REDIS_URL});
            await this.redis.connect();
        }

        if(message.channelId == process.env.COUNTER_CHANNEL_ID) {
            let lastNumber = parseInt(await this.redis.get(`countbot:counter`) ?? '0');
            let lastSender = await this.redis.get(`countbot:lastCounter`);

            if(lastSender == message.author.id) {
                const replyMessage = await message.reply('Tu ne peux pas envoyer deux messages d\'affilé <:no:1450807672239816755>');
                setTimeout(async () => {
                    message.delete().catch();
                    replyMessage.delete().catch();
                }, 1500);
                return;
            }

            if(message.content.startsWith(`${lastNumber + 1} `) || message.content.startsWith(`${lastNumber + 1}\n`) || message.content == `${lastNumber + 1}`) {
                lastNumber++;

                this.redis.set(`countbot:counter`, lastNumber);
                this.redis.set(`countbot:lastCounter`, message.author.id);
                await message.react('<:yes:1450807671342104668>');
            }else{
                const replyMessage = await message.reply(`Cela n'est pas un nombre ! <:no:1450807672239816755>`);
                setTimeout(async () => {
                    await message.delete().catch();
                    await replyMessage.delete().catch();
                }, 1500);
            }
        }
    }
                           }
