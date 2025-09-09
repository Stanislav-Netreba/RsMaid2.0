require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const { parseICS, getWeekStart, pairTimes, days } = require('./src/icsParser');
const { renderScheduleBuffer } = require('./src/tableRenderer');

const bot = new TelegramBot(process.env.TG_TOKEN, { polling: true });
const USER_LINKS_FILE = './userLinks.json';

function readUserLinks() {
	try {
		const data = fs.readFileSync(USER_LINKS_FILE, 'utf-8');
		return JSON.parse(data);
	} catch (err) {
		return {};
	}
}

function writeUserLinks(data) {
	fs.writeFileSync(USER_LINKS_FILE, JSON.stringify(data, null, 2));
}

async function sendSchedule(chatId, link) {
	try {
		const weekStart = getWeekStart();
		const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);

		const weekData = await parseICS(link, weekStart, weekEnd);
		const buffer = await renderScheduleBuffer(weekData);

		await bot.sendPhoto(chatId, buffer);
	} catch (err) {
		console.error(err);
		bot.sendMessage(chatId, 'Сталася помилка при генерації розкладу.');
	}
}

// --- /schedule ---
bot.onText(/\/schedule(@\w+)?/, async (msg) => {
	const chatId = msg.chat.id;
	const username = msg.from.username;
	const userLinks = readUserLinks();
	const link = userLinks[username];

	if (link && link.startsWith('https://my.kpi.ua/calendar/ical')) {
		await sendSchedule(chatId, link);
	} else {
		bot.sendMessage(chatId, 'У вас нема лінки на розклад', {
			reply_markup: {
				inline_keyboard: [[{ text: 'Додати', callback_data: 'add_link' }]],
			},
		});
	}
});

// --- /remove ---
bot.onText(/\/remove(@\w+)?/, async (msg) => {
	const chatId = msg.chat.id;
	const username = msg.from.username;
	const userLinks = readUserLinks();

	if (!userLinks[username]) {
		bot.sendMessage(chatId, 'У вас немає лінки, яку можна видалити.');
		return;
	}

	bot.sendMessage(chatId, 'Чи видалити вашу лінку?', {
		reply_markup: {
			inline_keyboard: [
				[
					{ text: 'Видалити', callback_data: 'remove_link' },
					{ text: 'Скасувати', callback_data: 'cancel_remove' },
				],
			],
		},
	});
});

bot.onText(/\/ping(@\w+)?/, async (msg) => {
	await msg.sendMessage(msg.chat.id, 'pong');
});

// --- callback кнопки ---
bot.on('callback_query', async (query) => {
	const chatId = query.message.chat.id;
	const username = query.from.username;

	switch (query.data) {
		case 'add_link':
			bot.sendPhoto(chatId, './src/stock.png', {
				caption: 'Введіть ваш лінк на розклад:',
			});

			bot.once('message', async (msg) => {
				const newLink = msg.text.trim();
				if (!newLink.startsWith('https://my.kpi.ua/calendar/ical')) {
					bot.sendMessage(chatId, 'Лінка має починатися з https://my.kpi.ua/calendar/ical');
					return;
				}

				const userLinks = readUserLinks();
				userLinks[username] = newLink;
				writeUserLinks(userLinks);

				// відправляємо підтвердження
				await bot.sendMessage(chatId, 'Лінка успішно збережена ✅');

				// одразу показуємо розклад
				await sendSchedule(chatId, newLink);
			});
			break;

		case 'remove_link':
			const userLinks = readUserLinks();
			if (userLinks[username]) {
				delete userLinks[username];
				writeUserLinks(userLinks);
				bot.sendMessage(chatId, 'Ваша лінка була успішно видалена.');
			} else {
				bot.sendMessage(chatId, 'Лінка не знайдена.');
			}
			break;

		case 'cancel_remove':
			bot.sendMessage(chatId, 'Видалення лінки скасовано.');
			break;
	}

	bot.answerCallbackQuery(query.id);
});

console.log('Бот запущено...');
