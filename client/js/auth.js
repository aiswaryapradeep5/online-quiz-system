const msg = document.getElementById('msg');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');

document.querySelectorAll('.tab').forEach((t) => {
  t.onclick = () => {
    document.querySelectorAll('.tab').forEach((x) => x.classList.remove('active'));
    t.classList.add('active');
    const which = t.dataset.tab;
    loginForm.classList.toggle('hidden', which !== 'login');
    registerForm.classList.toggle('hidden', which !== 'register');
  };
});

async function handle(form, path) {
  msg.textContent = '';
  const fd = new FormData(form);
  const body = Object.fromEntries(fd.entries());
  try {
    const { token, user } = await api(path, { method: 'POST', body, auth: false });
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    location.href = 'pages/api/quizzes.html';
  } catch (e) {
    msg.textContent = e.message + (e.details ? ` — ${e.details.join('; ')}` : '');
  }
}

loginForm.onsubmit = (e) => { e.preventDefault(); handle(loginForm, '/api/auth/login'); };
registerForm.onsubmit = (e) => { e.preventDefault(); handle(registerForm, '/api/auth/register'); };
