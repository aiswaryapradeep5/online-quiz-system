const user = getUser();
if (!user || user.role !== 'admin') location.href = '../index.html';
document.getElementById('logoutBtn').onclick = logout;

const msg = document.getElementById('msg');
const quizForm = document.getElementById('quizForm');
const quizzesTbody = document.querySelector('#quizzes tbody');
const quizSelect = document.getElementById('quizSelect');
const questionForm = document.getElementById('questionForm');
const optionsBox = document.getElementById('optionsBox');
const questionsList = document.getElementById('questionsList');

function setMsg(t, ok = false) { msg.textContent = t; msg.className = 'msg' + (ok ? ' ok' : ''); }

async function loadQuizzes() {
  const { items } = await api('/admin/api/quizzes');
  quizzesTbody.innerHTML = '';
  quizSelect.innerHTML = '<option value="">— pick a quiz —</option>';
  items.forEach((q) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${q.id}</td><td>${q.title}</td>
      <td>${q.is_published ? 'yes' : 'no'}</td><td>${q.question_count}</td>
      <td><button data-act="edit">Edit</button>
          <button data-act="del">Delete</button></td>`;
    tr.querySelector('[data-act=edit]').onclick = () => fillQuiz(q);
    tr.querySelector('[data-act=del]').onclick = async () => {
      if (!confirm('Delete quiz?')) return;
      await api(`/admin/api/quizzes/${q.id}`, { method: 'DELETE' });
      loadQuizzes();
    };
    quizzesTbody.appendChild(tr);
    const opt = document.createElement('option');
    opt.value = q.id; opt.textContent = q.title;
    quizSelect.appendChild(opt);
  });
}

function fillQuiz(q) {
  quizForm.id.value = q.id;
  quizForm.title.value = q.title;
  quizForm.description.value = q.description || '';
  quizForm.durationSeconds.value = q.duration_seconds;
  quizForm.isPublished.checked = !!q.is_published;
}
document.getElementById('resetQuiz').onclick = () => quizForm.reset();

quizForm.onsubmit = async (e) => {
  e.preventDefault();
  const body = {
    title: quizForm.title.value,
    description: quizForm.description.value,
    durationSeconds: Number(quizForm.durationSeconds.value),
    isPublished: quizForm.isPublished.checked,
  };
  try {
    const id = quizForm.id.value;
    if (id) await api(`/admin/api/quizzes/${id}`, { method: 'PUT', body });
    else await api('/admin/api/quizzes', { method: 'POST', body });
    quizForm.reset();
    setMsg('Saved.', true);
    loadQuizzes();
  } catch (err) { setMsg(err.message + (err.details ? `: ${err.details.join('; ')}` : '')); }
};

function addOptionRow(text = '', isCorrect = false) {
  const div = document.createElement('div');
  div.className = 'option';
  div.innerHTML = `<input class="opt-text" placeholder="Option text" value="${text.replace(/"/g, '&quot;')}">
    <label><input class="opt-correct" type="checkbox" ${isCorrect ? 'checked' : ''}> correct</label>
    <button type="button" class="rm">×</button>`;
  div.querySelector('.rm').onclick = () => div.remove();
  optionsBox.appendChild(div);
}
document.getElementById('addOption').onclick = () => addOptionRow();
document.getElementById('resetQuestion').onclick = () => {
  questionForm.reset(); optionsBox.innerHTML = '';
};

async function loadQuestions() {
  questionsList.innerHTML = '';
  const id = quizSelect.value;
  if (!id) return;
  const { questions } = await api(`/admin/api/quizzes/${id}/full`);
  questions.forEach((q) => {
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = `<p><strong>#${q.id}</strong> [pos ${q.position}, ${q.points}pt] ${q.text}</p>
      <ul>${q.options.map((o) =>
        `<li>${o.is_correct ? '✅' : '◻️'} ${o.text}</li>`).join('')}</ul>
      <button data-act="edit">Edit</button>
      <button data-act="del">Delete</button>`;
    div.querySelector('[data-act=edit]').onclick = () => {
      questionForm.id.value = q.id;
      questionForm.text.value = q.text;
      questionForm.points.value = q.points;
      questionForm.position.value = q.position;
      optionsBox.innerHTML = '';
      q.options.forEach((o) => addOptionRow(o.text, !!o.is_correct));
    };
    div.querySelector('[data-act=del]').onclick = async () => {
      if (!confirm('Delete question?')) return;
      await api(`/admin/questions/${q.id}`, { method: 'DELETE' });
      loadQuestions();
    };
    questionsList.appendChild(div);
  });
}
quizSelect.onchange = loadQuestions;

questionForm.onsubmit = async (e) => {
  e.preventDefault();
  const quizId = Number(quizSelect.value);
  if (!quizId) return setMsg('Pick a quiz first');
  const options = [...optionsBox.children].map((row) => ({
    text: row.querySelector('.opt-text').value.trim(),
    isCorrect: row.querySelector('.opt-correct').checked,
  })).filter((o) => o.text);
  const body = {
    quizId,
    text: questionForm.text.value,
    points: Number(questionForm.points.value),
    position: Number(questionForm.position.value),
    options,
  };
  try {
    const id = questionForm.id.value;
    if (id) await api(`/admin/questions/${id}`, { method: 'PUT', body });
    else await api('/admin/questions', { method: 'POST', body });
    questionForm.reset(); optionsBox.innerHTML = '';
    setMsg('Saved.', true);
    loadQuestions(); loadQuizzes();
  } catch (err) { setMsg(err.message + (err.details ? `: ${err.details.join('; ')}` : '')); }
};

loadQuizzes();
