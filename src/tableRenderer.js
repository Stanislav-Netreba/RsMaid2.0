const nodeHtmlToImage = require('node-html-to-image');
const os = require('os');
const { pairTimes, days } = require('./icsParser');
const { getCurrentPairIndex } = require('./timeUtils');

async function renderScheduleBuffer(weekData) {
	let puppeteerArgs;

	if (os.platform() === 'linux' && os.arch().startsWith('arm')) {
		// Raspberry Pi
		puppeteerArgs = {
			executablePath: '/usr/bin/chromium-browser', // перевір через: which chromium-browser
			args: ['--no-sandbox', '--disable-setuid-sandbox'],
		};
	}

	const rowCount = pairTimes.length;
	const headerHeight = 60;
	const imageWidth = 1920;
	const imageHeight = 1080;
	const rowHeight = Math.floor((imageHeight - headerHeight) / rowCount);

	const now = new Date();
	const currentDayIndex = now.getDay() === 0 ? 6 : now.getDay() - 1;
	const currentDay = days[currentDayIndex];
	const currentPair = getCurrentPairIndex(pairTimes);

	const html = `
  <html>
  <head>
    <meta charset="UTF-8">
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600&display=swap');
      html, body { margin:0; padding:0; width:${imageWidth}px; height:${imageHeight}px; background:#fff; font-family:'Montserrat', sans-serif; font-size:24px; }
      table { border-collapse: separate; border-spacing:0; width:100%; height:100%; table-layout: fixed; }
      th, td { border:1px solid #CBD5E1; padding:10px; text-align:center; vertical-align:middle; word-wrap:break-word; border-radius:12px; }
      th { background:#1E3A8A; color:#fff; height:${headerHeight}px; font-weight:bold; font-size:30px; }
      tbody tr { height: ${rowHeight}px; }
      td.time-column { background:#E5E7EB; color:#1F2937; font-weight:bold; font-size:26px; }
      td.empty-even { background:#fff; }
      td.empty-odd { background:#F3F4F6; }

      td.lecture { background:#DBEAFE; color:#1E3A8A; }
      td.practice { background:#FFF7ED; color:#B45309; }
      td.lab { background:#D1FAE5; color:#065F46; }

      td.current { background:#F87171 !important; color:#fff !important; }
      td.next { background:#FBBF24 !important; color:#000 !important; }

      .tag { position:absolute; top:5px; left:5px; font-size:14px; font-weight:bold; padding:2px 6px; border-radius:4px; color:#fff; }
      .tag.lecture { background:#3B82F6; }
      .tag.practice { background:#F59E0B; }
      .tag.lab { background:#10B981; }

      .cell-content { margin-top:20px; white-space: pre-line; text-align:left; }
    </style>
  </head>
  <body>
    <table>
      <thead>
        <tr>
          <th>Час</th>
          ${days.map((d) => `<th>${d[0].toUpperCase() + d.slice(1)}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${pairTimes
			.map(
				(time, i) => `
          <tr>
            <td class="time-column">${time}</td>
            ${days
				.map((day) => {
					const lesson = weekData[day][i];
					if (!lesson) {
						const emptyBg = i % 2 === 0 ? 'empty-even' : 'empty-odd';
						return `<td class="${emptyBg}"></td>`;
					}

					let className = lesson.type || '';
					if (day === currentDay && currentPair.index === i) {
						className += currentPair.type === 'current' ? ' current' : ' next';
					}

					let tagHTML = '';
					if (lesson.type === 'lecture') tagHTML = '<div class="tag lecture">Лекція</div>';
					else if (lesson.type === 'practice') tagHTML = '<div class="tag practice">Практика</div>';
					else if (lesson.type === 'lab') tagHTML = '<div class="tag lab">Лаб</div>';

					return `<td class="${className}" style="position: relative; padding:8px;">
                        ${tagHTML}
                        <div class="cell-content">${lesson.text}</div>
                      </td>`;
				})
				.join('')}
          </tr>
        `
			)
			.join('')}
      </tbody>
    </table>
  </body>
  </html>
  `;

	return await nodeHtmlToImage({
		output: undefined,
		html,
		quality: 100,
		width: imageWidth,
		height: imageHeight,
		puppeteerArgs,
	});
}

module.exports = { renderScheduleBuffer };
