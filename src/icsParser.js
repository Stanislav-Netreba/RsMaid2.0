const ical = require('node-ical');
const pairTimes = ['08:30', '10:25', '12:20', '14:15', '16:10', '18:05'];
const days = ['Понеділок', 'Вівторок', 'Середа', 'Четвер', "П'ятниця", 'Субота'];

function getWeekStart(date = new Date()) {
	const d = new Date(date);
	const day = d.getDay();
	if (day === 0) d.setDate(d.getDate() + 1);
	const diff = (d.getDay() + 6) % 7;
	d.setDate(d.getDate() - diff);
	d.setHours(0, 0, 0, 0);
	return d;
}

async function parseICS(
	url,
	weekStart = getWeekStart(),
	weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000)
) {
	const events = await ical.async.fromURL(url);
	const weekData = {};

	for (const day of days) {
		weekData[day] = pairTimes.map(() => null);
	}

	for (const key in events) {
		const ev = events[key];
		if (ev.type !== 'VEVENT' || !ev.start) continue;
		if (ev.start < weekStart || ev.start > weekEnd) continue;

		const dayIndex = (ev.start.getDay() + 6) % 7;
		const dayName = days[dayIndex];

		const subject = ev.summary || 'Unknown';
		const description = ev.description || '';

		// Визначення типу пари для тегу
		let type = null;
		if (/lec\./i.test(description)) type = 'lecture';
		else if (/prc\./i.test(description)) type = 'practice';
		else if (/lab/i.test(description)) type = 'lab';

		// Витягуємо ПІБ викладача
		let teacher = '';
		const teacherMatch = description.match(/Викладачі:\s*([^,\\]+)\s*-\s*(lec\.|prc\.|lab\.)/i);
		if (teacherMatch) {
			teacher = teacherMatch[1].trim();
		} else {
			const fallback = description.match(/Викладачі:\s*([^,\\]+)/i);
			teacher = fallback ? fallback[1].trim() : '';
		}

		// Визначаємо аудиторію
		let aud = 'Онлайн';
		const audMatch = description.match(/ауд\.?\s*([^\s,\\]+)/i);
		if (audMatch) {
			aud = audMatch[1].trim();
		}

		// Формуємо текст клітинки: предмет + аудиторія - ПІБ
		const text = `${subject}\n${aud}${teacher ? ' - ' + teacher : ''}`;

		// Розподіляємо по парах
		let start = new Date(ev.start);
		const end = new Date(ev.end);
		while (start < end) {
			const pairIndex = pairTimes.findIndex((t) => {
				const [h, m] = t.split(':').map(Number);
				return start.getHours() === h && start.getMinutes() === m;
			});
			if (pairIndex === -1) break;

			weekData[dayName][pairIndex] = { text, type };

			const nextIndex = pairIndex + 1;
			if (nextIndex >= pairTimes.length) break;
			const [h, m] = pairTimes[nextIndex].split(':').map(Number);
			start = new Date(start);
			start.setHours(h, m, 0, 0);
		}
	}

	return weekData;
}

module.exports = { parseICS, pairTimes, days, getWeekStart };
