'use strict';

const https = require('https');
const fetch = require('node-fetch');
const { Telegraf } = require('telegraf');
const timeTable = require('./timetable.json');
const WolframAlphaAPI = require('wolfram-alpha-api');


require('dotenv').config();

const bot = new Telegraf(process.env.token);
const waApi = new WolframAlphaAPI(process.env.wolfram);

bot.start(ctx => {
  ctx.reply('Привет!\n' +
    'Посмотри список команд либо отправь /help, чтобы узнать, что я умею');
});

bot.help(ctx => {
  ctx.reply('/wa - Wolfram Alpha запрос\n' +
    '/wa_full - То же самое, но с полным ответом картинкой\n' +
    '/ud - Urban Dictionary запрос\n' +
    '/od - Oxford Dictionary запрос\n' +
    '/help - Список команд\n' +
    '/donate - Кинуть автору на хостинг)\n');
});

bot.command('wa', async ctx => {
  const input = ctx.message.text.split(' ').slice(1).join(' ');

  async function wa(request) {
    try {
      const result = await waApi.getShort(request);
      await ctx.reply(result);
    } catch (err) {
      if (err.message.includes('No short answer available')) {
        try {
          await ctx.reply('Короткий вариант недоступен, кидаю фотку');
          const result = await waApi.getSimple(request); // URI (with suffix)
          const base64 = result.toString().replace(/^.{22}/, '');
          await ctx.replyWithPhoto({ source: Buffer.from(base64, 'base64') });
        } catch (err) {
          await ctx.reply(err.message);
        }
      } else await ctx.reply(err.message);
    }
  }

  if (!input && ctx.message.reply_to_message) {
    await wa(ctx.message.reply_to_message.text);
  } else if (!input) {
    ctx.reply('Введи запрос после команды или ' +
      'отправь команду в ответ на сообщение');
  } else {
    await wa(input);
  }
});

bot.command('wa_full', async ctx => {
  const input = ctx.message.text.split(' ').slice(1).join(' ');

  async function waFull(request) {
    try {
      const result = await waApi.getSimple(request); // URI (with suffix)
      const base64 = result.toString().replace(/^.{22}/, '');
      await ctx.replyWithPhoto({ source: Buffer.from(base64, 'base64') });
    } catch (err) {
      await ctx.reply(err.message);
    }
  }

  if (!input && ctx.message.reply_to_message) {
    const request = ctx.message.reply_to_message.text;
    await waFull(request);
  } else if (!input) {
    ctx.reply('Введи запрос после команды или ' +
      'отправь команду в ответ на сообщение');
  } else {
    await waFull(input);
  }
});

bot.command('ud', async ctx => {
  const input = ctx.message.text.split(' ').slice(1).join(' ');

  async function ud(request) {
    try {
      const result = await fetch(request);
      const json = await result.json();
      await ctx.replyWithMarkdown('*Определение:*\n' +
        `${json.list[0].definition}\n` +
        '\n*Пример использования:*\n' +
        `${json.list[0].example}`);
    } catch (err) {
      await ctx.reply('Ничего не найдено');
      console.log(err.message);
    }
  }

  if (!input && ctx.message.reply_to_message) {
    const url = `http://api.urbandictionary.com/v0/define?term=${ctx.message.reply_to_message.text}`;
    await ud(url);
  } else if (!input) {
    ctx.reply('Введи запрос после команды или ' +
      'отправь команду в ответ на сообщение');
  } else {
    const url = `http://api.urbandictionary.com/v0/define?term=${input}`;
    await ud(url);
  }
});

bot.command('od', async ctx => {
  const input = ctx.message.text.split(' ').slice(1).join(' ');

  function od(request) {
    const options = {
      host: 'od-api.oxforddictionaries.com',
      port: '443',
      path: `/api/v2/entries/en-us/${request}`,
      method: 'GET',
      headers: {
        'app_id': process.env.app_id,
        'app_key': process.env.app_key,
      }
    };

    https.get(options, resp => {
      let body = '';
      resp.on('data', d => {
        body += d;
      });
      resp.on('end', () => {
        const json = JSON.parse(body);
        // fs.writeFile(`${request}.json`, JSON.stringify(json), err => {
        //   if (err) {
        //     console.log(err);
        //   }
        // });

        const main = json.results[0].lexicalEntries[0].entries[0].senses[0];

        let examples = '';
        if (main.examples) {
          examples = `\n*Пример использования:*\n${main.examples[0].text}`;
        }
        ctx.replyWithMarkdown('*Определение:*\n' +
          `${main.definitions[0]}\n` + examples);
      });
    });
  }

  if (!input && ctx.message.reply_to_message) {
    const input = ctx.message.reply_to_message.text;
    od(input);
  } else if (!input) {
    ctx.reply('Введи запрос после команды или ' +
      'отправь команду в ответ на сообщение');
  } else {
    od(input);
  }
});

Date.prototype.getWeek = function() {
  const day = new Date(this.getFullYear(), 0, 1);
  return Math.ceil((((this - day) / 86400000) + day.getDay() + 1) / 7);
};

bot.command('get_schedule', async ctx => {
  const weekNumber = (new Date()).getWeek();

  let lessons;
  if (!(weekNumber % 2)) lessons = timeTable['first_week'];
  if (weekNumber % 2) lessons = timeTable['second_week'];

  const dayOfWeek = (new Date()).getDay();

  if (dayOfWeek === 0 || dayOfWeek === 6) {
    await ctx.reply('Сегодня выходной!');
  }

  const schedule = Object.keys(lessons);
  const day = lessons[schedule[dayOfWeek - 1]];

  // let reply = '';
  // for (let numberOfPara = 1; numberOfPara <= day.length; numberOfPara++) {
  //   const para = day[numberOfPara - 1];
  //   reply += `*${numberOfPara} пара (${`${para[lesson_time]}`})*`;
  // }

  let message = '';
  let counter = 1;
  for (const pair of day) {
    message += `*${counter} пара:*\n`;
    const lessonKeys = Object.keys(pair);
    for (const key of lessonKeys) {
      message += `${pair[key]}\n`;
    }
    counter++;
  }
  ctx.replyWithMarkdown(message).catch(e => {
    ctx.reply(e.message);
  });
});

bot.command('get_week', ctx => {
  const weekNumber = (new Date()).getWeek();
  if (weekNumber % 2) ctx.reply('Щас вторая неделя');
  ctx.reply('Щас первая неделя');

});

bot.command('donate', ctx => {
  ctx.reply('5375414126741049');
});

bot.hears(/^[fф]$/i, ctx => {
  ctx.reply('F');
});

bot.command('ping', ctx => {
  ctx.reply('i\'m here');
});

bot.command('send', ctx => {
  const input = ctx.message.text.split(' ').slice(1).join(' ');

  if (ctx.message.chat.id === parseInt(process.env.me)) {
    ctx.telegram.sendMessage(process.env.group, input)
      .catch(e => { ctx.reply(e.message); });
  }
});

// Для пересылки сообщений с ссылками на пары
bot.on('channel_post', ctx => {
  const senderChatId = ctx.update.channel_post.sender_chat.id;
  if (senderChatId === parseInt(process.env.channel)) {
    ctx.forwardMessage(process.env.group);
  }
});

bot.launch().then(() => console.log('Bot has successfully started!'));
