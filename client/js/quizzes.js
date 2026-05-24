const user = getUser();

if (!user) location.href = '../index.html';

if (user?.role === 'admin') {
  document.getElementById('adminLink').classList.remove('hidden');
}

document.getElementById('logoutBtn').onclick = logout;

let page = 1;
const limit = 9;

const list = document.getElementById('list');
const pageInfo = document.getElementById('pageInfo');
const search = document.getElementById('search');

async function load() {
  try {
    const q = encodeURIComponent(search.value.trim());

    // FIXED ROUTE
    const data = await api(`/api/quizzes?page=${page}&limit=${limit}&search=${q}`, {
      auth: false
    });

    list.innerHTML = '';

    data.items.forEach((quiz) => {
      const div = document.createElement('div');

      div.className = 'card';

      div.innerHTML = `
        <h3>${quiz.title}</h3>
        <p>${quiz.description || ''}</p>
        <p class="muted">
          ${quiz.question_count} questions ·
          ${quiz.duration_seconds}s ·
          by ${quiz.author}
        </p>
        <button>Start</button>
      `;

      div.querySelector('button').onclick = () => {
        sessionStorage.setItem('startQuizId', quiz.id);
        location.href = 'quiz.html';
      };

      list.appendChild(div);
    });

    const pages = Math.max(1, Math.ceil(data.total / limit));

    pageInfo.textContent = `Page ${page} / ${pages}`;

  } catch (e) {
    console.error(e);
  }
}

document.getElementById('prev').onclick = () => {
  if (page > 1) {
    page--;
    load();
  }
};

document.getElementById('next').onclick = () => {
  page++;
  load();
};

search.oninput = () => {
  page = 1;
  load();
};

load();

(async () => {
  const tbody = document.querySelector('#attempts tbody');

  try {

    // FIXED ROUTE
    const { items } = await api('/api/attempts/me');

    items.forEach((a) => {
      const tr = document.createElement('tr');

      tr.innerHTML = `
        <td>${a.quiz_title}</td>
        <td>${a.status}</td>
        <td>${a.score ?? '—'} / ${a.total_points ?? '—'}</td>
        <td>${a.started_at}</td>
      `;

      tbody.appendChild(tr);
    });

  } catch (e) {
    console.error(e);
  }
})();
