window.API_BASE = 'http://localhost:4000/api';

window.api = async function (path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const t = localStorage.getItem('token');
    if (t) headers.Authorization = `Bearer ${t}`;
  }
  const res = await fetch(window.API_BASE + path, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.details = data.details;
    throw err;
  }
  return data;
};

window.getUser = () => {
  try { return JSON.parse(localStorage.getItem('user') || 'null'); }
  catch { return null; }
};

window.logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  location.href = '/index.html';
};
