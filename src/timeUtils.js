function getMonday(date) {
	const d = new Date(date);
	const day = d.getDay();
	const diff = (day + 6) % 7;
	d.setDate(d.getDate() - diff);
	d.setHours(0, 0, 0, 0);
	return d;
}

function getWeekNumber(date) {
	const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
	const dayNum = (d.getUTCDay() + 6) % 7;
	d.setUTCDate(d.getUTCDate() - dayNum + 3);
	const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
	const diff = d - firstThursday;
	return 1 + Math.round(diff / (7 * 24 * 60 * 60 * 1000));
}

function isNowBetween(start, end) {
	const now = new Date();
	const [sh, sm] = start.split(':').map(Number);
	const [eh, em] = end.split(':').map(Number);
	const startDate = new Date(now);
	startDate.setHours(sh, sm, 0, 0);
	const endDate = new Date(now);
	endDate.setHours(eh, em, 0, 0);
	return now >= startDate && now <= endDate;
}

/**
 * Повертає індекс поточної пари або -1
 * @param {string[]} pairTimes - масив часу початку пар ['08:30', ...]
 * @param {number} lessonDuration - тривалість пари у хв
 * @param {number} breakDuration - тривалість перерви у хв
 */
function getCurrentPairIndex(pairTimes, lessonDuration = 105, breakDuration = 20) {
	const now = new Date();
	for (let i = 0; i < pairTimes.length; i++) {
		const [h, m] = pairTimes[i].split(':').map(Number);
		const pairStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
		const pairEnd = new Date(pairStart.getTime() + lessonDuration * 60 * 1000);
		if (now >= pairStart && now <= pairEnd) return { index: i, type: 'current' };

		const breakStart = new Date(pairEnd.getTime());
		const breakEnd = new Date(breakStart.getTime() + breakDuration * 60 * 1000);
		if (now >= breakStart && now <= breakEnd) return { index: i, type: 'next' };
	}
	return { index: -1, type: null };
}

module.exports = { getMonday, getWeekNumber, isNowBetween, getCurrentPairIndex };
