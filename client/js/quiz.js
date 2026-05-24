const user = getUser();
if (!user) location.href = '../index.html';
const quizId = Number(sessionStorage.getItem('startQuizId'));
if (!quizId) location.href = 'quizzes.html';

const form = document.getElementById('quizForm');
const timerEl = document.getElementById('timer');
const msg = document.getElementById('msg');
let attemptId = null, expiresAt = null, tickHandle = null;

function fmt(s) {
  s = Math.max(0, Math.floor(s));
  const m = String(Math.floor(s / 60)).padStart(2, '0');
  const r = String(s % 60).padStart(2, '0');
  return `${m}:${r}`;
}

function tick() {
  const left = (new Date(expiresAt).getTime() - Date.now()) / 1000;
  timerEl.textContent = fmt(left);
  timerEl.textContent = fmt(left);

if (left <= 60) {
  timerEl.style.color = 'red';
  timerEl.style.fontWeight = 'bold';
}
  if (left <= 0) {
    clearInterval(tickHandle);
    submit(true);
  }
}

(async () => {
  try {
    const data = await api('api/attempts/start', { method: 'POST', body: { quizId } });
    attemptId = data.attemptId;
    expiresAt = data.expiresAt;
    document.getElementById('quizTitle').textContent = data.quiz.title;
    data.questions.forEach((q, i) => {
      const div = document.createElement('div');
      div.className = 'card';
      div.innerHTML = `<p><strong>Q${i + 1}.</strong> ${q.text} <em>(${q.points} pt)</em></p>` +
        q.options.map((o) =>
          `<label class="option"><input type="radio" name="q_${q.id}" value="${o.id}"> ${o.text}</label>`
        ).join('');
      form.appendChild(div);
    });
    tickHandle = setInterval(tick, 500); tick();
  } catch (e) {
    msg.textContent = e.message;
  }
})();

async function submit(expired = false) {
  const answers = [];
  form.querySelectorAll('input[type=radio]:checked').forEach((i) => {
    answers.push({
      questionId: Number(i.name.slice(2)),
      optionId: Number(i.value),
    });
  });
  try {
    const res = await api(`api/attempts/${attemptId}/submit`, {
      method: 'POST', body: { answers },
    });
    sessionStorage.setItem('lastResult', JSON.stringify(res));
    location.href = 'result.html';
  } catch (e) {
    msg.textContent = (expired ? 'Time up. ' : '') + e.message;
  }
}

document.getElementById('submitBtn').onclick = () => submit(false);
