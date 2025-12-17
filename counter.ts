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
                const replyMessage = await message.reply('You cannot send a message twice in a row. ROUGE COLÈRE');
                setTimeout(async () => {
                    message.delete().catch();
                    replyMessage.delete().catch();
                }, 1500);
                return;
            }

            if(message.content.startsWith(`${lastNumber + 1} `) || message.content.startsWith(`${lastNumber + 1}\n`) || message.content == `${lastNumber + 1}`) {
                lastNumber++;

                this.redis.set(`mochibot:counter`, lastNumber);
                this.redis.set(`mochibot:lastCounter`, message.author.id);
                await message.react('CONTENT');
            }else{
                const replyMessage = await message.reply(`This number is incorrect! ROUGE COLÈRE`);
                setTimeout(async () => {
                    await message.delete().catch();
                    await replyMessage.delete().catch();
                }, 1500);
            }
        }
    }
                           }
