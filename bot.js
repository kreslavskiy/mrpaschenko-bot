'use strict';

const config = require('config');
const fetch = require('node-fetch');
const { Telegraf } = require('telegraf');
const base64ToImage = require('base64-to-image');
const WolframAlphaAPI = require('wolfram-alpha-api');
const bot = new Telegraf(config.get('token'));
const waApi = new WolframAlphaAPI(config.get('wolfram'));

bot.start(ctx => {
  ctx.reply('Привет!\n' +
    'Посмотри список команд либо отправь /help, чтобы узнать, что я умею');
});

bot.help(ctx => {
  ctx.reply('/wa - Wolfram Alpha запрос\n' +
    '/help - Список команд');
});

bot.command('wa', async ctx => {
  const inputArray = ctx.message.text.split(' ');
  inputArray.shift();
  const input = inputArray.join(' ');

  async function wa(request) {
    try {
      const result = await waApi.getShort(request);
      await ctx.reply(result);
    } catch (err) {
      await ctx.reply(err.message);
    }
  }

  if (!input && ctx.message.reply_to_message) {
    const request = ctx.message.reply_to_message.text;
    await wa(request);
  } else if (!input) {
    ctx.reply('Введи запрос после команды или ' +
      'отправь команду в ответ на сообщение');
  } else {
    await wa(input);
  }
});

bot.command('wa_simple', async ctx => {
  const inputArray = ctx.message.text.split(' ');
  inputArray.shift();
  const input = inputArray.join(' ');

  async function wa(request) {
    try {
      try {
        await ctx.replyWithDocument({ source: `./pics/${input}.jpg` });
      } catch {
        const result = await waApi.getSimple(request);
        const picProperties = { 'fileName': `${input}`, 'type': 'jpg' };
        await base64ToImage(result, './pics/', picProperties);
        await ctx.replyWithDocument({ source: `./pics/${input}.jpg` });
      }
    } catch (err) {
      await ctx.reply(err.message);
    }
  }

  if (!input && ctx.message.reply_to_message) {
    const request = ctx.message.reply_to_message.text;
    await wa(request);
  } else if (!input) {
    ctx.reply('Введи запрос после команды или ' +
      'отправь команду в ответ на сообщение');
  } else {
    await wa(input);
  }
});

bot.command('ud', ctx => {
  const inputArray = ctx.message.text.split(' ');
  inputArray.shift();
  const input = inputArray.join(' ');

  function ud(url) {
    fetch(url)
      .then(res => res.json())
      .then(json => {
        ctx.replyWithMarkdown('*Определение:*\n' +
          `${json.list[0].definition}\n` +
          '\n*Пример использования:*\n' +
          `${json.list[0].example}`);
      }).catch(() => {
        ctx.reply('Ничего не найдено');
      });
  }

  if (!input && ctx.message.reply_to_message) {
    const url = `http://api.urbandictionary.com/v0/define?term=${ctx.message.reply_to_message.text}`;
    ud(url);
  } else if (!input) {
    ctx.reply('Введи запрос после команды или ' +
      'отправь команду в ответ на сообщение');
  } else {
    const url = `http://api.urbandictionary.com/v0/define?term=${input}`;
    ud(url);
  }
});

bot.command('f', ctx => {
  ctx.reply('F');
});

bot.command('ping', ctx => {
  ctx.reply('i\'m here');
});

bot.on('channel_post', ctx => {
  const senderChatId = ctx.update.channel_post.sender_chat.id;
  if (senderChatId === parseFloat(config.get('channel'))) {
    ctx.forwardMessage(config.get('group'));
  }
});

bot.launch().then(() => console.log('Bot has successfully started!'));
