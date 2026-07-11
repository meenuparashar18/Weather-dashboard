
const NEWS_API_KEY = '';
const GEMINI_API_KEY = '';

const WMO_ICONS = {
  0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
  45: '🌫️', 48: '🌫️',
  51: '🌦️', 53: '🌦️', 55: '🌧️',
  61: '🌧️', 63: '🌧️', 65: '🌧️',
  71: '❄️', 73: '❄️', 75: '❄️',
  80: '🌦️', 81: '🌧️', 82: '⛈️',
  95: '⛈️', 96: '⛈️', 99: '⛈️'
};

const WMO_DESC = {
  0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Foggy', 48: 'Icy fog',
  51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
  61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
  71: 'Light snow', 73: 'Moderate snow', 75: 'Heavy snow',
  80: 'Rain showers', 81: 'Moderate showers', 82: 'Violent showers',
  95: 'Thunderstorm', 96: 'Thunderstorm + hail', 99: 'Thunderstorm + hail'
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

let currentWeatherContext = '';
let currentNewsContext = '';

function getRecentSearches() {
  return JSON.parse(localStorage.getItem('recentSearches') || '[]');
}

function saveSearch(city) {
  let searches = getRecentSearches();
  searches = [city, ...searches.filter(s => s.toLowerCase() !== city.toLowerCase())].slice(0, 5);
  localStorage.setItem('recentSearches', JSON.stringify(searches));
  renderChips();
}

function renderChips() {
  const searches = getRecentSearches();
  const container = document.getElementById('recent-searches');
  if (searches.length === 0) { container.innerHTML = ''; return; }
  container.innerHTML = '<span>Recent:</span>' + searches.map(s =>
    `<div class="chip" onclick="searchCity('${s}')">${s}</div>`
  ).join('');
}

function searchCity(name) {
  document.getElementById('city-input').value = name;
  fetchAll();
}

async function geocode(city) {
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`);
  const data = await res.json();
  if (!data.results || data.results.length === 0) throw new Error(`City "${city}" not found.`);
  return data.results[0];
}

async function fetchWeather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weathercode&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=3`;
  const res = await fetch(url);
  return res.json();
}

function renderWeather(location, data) {
  const c = data.current;
  const code = c.weathercode;
  const card = document.getElementById('weather-card');
  card.innerHTML = `
    <div class="card-label">Current Weather</div>
    <div class="weather-main">
      <div class="weather-icon">${WMO_ICONS[code] || '🌡️'}</div>
      <div>
        <div class="weather-temp">${Math.round(c.temperature_2m)}°C</div>
      </div>
    </div>
    <div class="weather-city">${location.name}, ${location.country}</div>
    <div class="weather-desc">${WMO_DESC[code] || 'Unknown'}</div>
    <div class="weather-stats" style="margin-top:16px">
      <div class="stat-box">
        <div class="stat-label">Humidity</div>
        <div class="stat-value">${c.relative_humidity_2m}%</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Wind</div>
        <div class="stat-value">${c.wind_speed_10m} km/h</div>
      </div>
    </div>
  `;

  currentWeatherContext = `City: ${location.name} , ${location.country}. Temperature: ${Math.round(c.temperature_2m)}°C Condition: ${WMO_DESC[code] || 'Unknown'}. Humidity: ${c.relative_humidity_2m}% Wind: ${c.wind_speed_10m} km/h`;

  const forecastCard = document.getElementById('forecast-card');
  forecastCard.style.display = 'block';
  const row = document.getElementById('forecast-row');
  row.innerHTML = data.daily.time.map((dateStr, i) => {
    const d = new Date(dateStr);
    return `
      <div class="forecast-item">
        <div class="f-day">${i === 0 ? 'Today' : DAYS[d.getDay()]}</div>
        <div class="f-icon">${WMO_ICONS[data.daily.weathercode[i]] || '🌡️'}</div>
        <div class="f-temp">${Math.round(data.daily.temperature_2m_max[i])}° / ${Math.round(data.daily.temperature_2m_min[i])}°</div>
      </div>
    `;
  }).join('');
}

async function fetchNews(query) {
   const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&max=6&apikey=${NEWS_API_KEY}`;
  const res = await fetch(url);
  return res.json();
}

function renderNews(data) {
  const grid = document.getElementById('news-grid');
  const articles = (data.articles || []).filter(a => a.title);
  if (articles.length === 0) {
    grid.innerHTML = `<div style="color:var(--muted); font-size:0.85rem; padding:12px">No news found for this search.</div>`;
    return;
  }
  grid.innerHTML = articles.map(a => `
    <a class="news-card" href="${a.url || '#'}" target="_blank" rel="noopener">
      <div class="news-source">${a.source?.name || 'News'}</div>
      <div class="news-title">${a.title}</div>
      <div class="news-date">${new Date(a.publishedAt).toLocaleDateString('en-IN', {day:'numeric', month:'short'})}</div>
    </a>
  `).join('');
  currentNewsContext = 'Recent Headlines: ' + articles.slice(0,4).map(a => a.title).join(' | ');
}

function showWeatherError(msg) {
  const el = document.getElementById('weather-error');
  el.textContent = '⚠ ' + msg;
  el.style.display = 'block';
}

function hideWeatherError() {
  document.getElementById('weather-error').style.display = 'none';
}

function showNewsError(msg) {
  const el = document.getElementById('news-error');
  el.textContent = '⚠ ' + msg;
  el.style.display = 'block';
}

function hideNewsError() {
  document.getElementById('news-error').style.display = 'none';
}

async function fetchAll() {
  const city = document.getElementById('city-input').value.trim();
  if (!city) return;

  hideWeatherError();
  hideNewsError();

  document.getElementById('weather-card').innerHTML = `
    <div class="card-label">Current Weather</div>
    <div class="skeleton sk-big"></div>
    <div class="skeleton sk-line" style="width:60%"></div>
    <div class="skeleton sk-line" style="width:40%"></div>
  `;
  document.getElementById('forecast-card').style.display = 'none';
  document.getElementById('news-grid').innerHTML = `
    <div class="loading-news">
      <div class="skeleton sk-line" style="width:80%; margin-bottom:14px"></div>
      <div class="skeleton sk-line" style="width:60%"></div>
    </div>
  `;

  try {
    const location = await geocode(city);
    const weatherData = await fetchWeather(location.latitude, location.longitude);
    renderWeather(location, weatherData);
    saveSearch(city);
  } catch (err) {
    showWeatherError(err.message || 'Weather data unavailable.');
    document.getElementById('weather-card').innerHTML = '<div class="card-label">Current Weather</div><p style="color:var(--muted); font-size:0.85rem">—</p>';
  }

  try {
    const newsData = await fetchNews(city);
    renderNews(newsData);
  } catch (err) {
    showNewsError('News API error. Please try again.');
    document.getElementById('news-grid').innerHTML = '';
  }

  document.getElementById('last-updated').textContent = 'Updated ' + new Date().toLocaleTimeString('en-IN', {hour: '2-digit', minute: '2-digit'});
}

function getChatHistory() {
  return JSON.parse(localStorage.getItem("chatHistory") || '[]');
}

function saveChatHistory(history) {
  const trimmed = history.slice(-10);
  localStorage.setItem('chatHistory', JSON.stringify(trimmed));
}

function getTime() {
  return new Date().toLocaleTimeString('en-IN', {hour:'2-digit', minute:'2-digit'});
}

function appendMessage(role, text) {
  const container = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  
  div.innerHTML = `
    <div class="msg-avatar">✦</div>
    <div>
      <div class="msg-bubble">${text}</div>
      <div class="msg-time">${getTime()}</div>
    </div>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return div;
}

function showtyping() {
  const container = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = 'msg ai';
  div.id = 'typing-msg';
  div.innerHTML = `
    <div class="msg-avatar">✦</div>
    <div class="typing-indicator"> 
       <span></span> <span></span> <span></span>
    </div>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function removeTyping() {
  const el = document.getElementById('typing-msg');
  if (el) el.remove();
}

function useSuggestion(el) {
  document.getElementById('ai-input').value = el.textContent;
  sendMessage();
}

function clearChat() {
  localStorage.removeItem('chatHistory');
  const container = document.getElementById('chat-messages');
  container.innerHTML = `
    <div class="msg ai">
      <div class="msg-avatar">✦</div>
      <div>
        <div class="msg-bubble">Hello! I'm your AI assistant. Ask me anything about weather, news, or any topic you're curious about.</div>
        <div class="msg-time">Just now</div>
      </div>
    </div>
  `;
}

async function sendMessage() {
  const input = document.getElementById('ai-input');
  const userText = input.value.trim();
  if (!userText) return;


  input.value = '';
  appendMessage('user', userText);

 
  const history = getChatHistory();
  history.push({ role: 'user', text: userText });
  saveChatHistory(history);

 
  showtyping();

 
  const systemContext = `You are a helpful assistant embedded in a weather and news dashboard called InfoDash.
Current dashboard data:
- Weather: ${currentWeatherContext || 'No weather data loaded'}
- News: ${currentNewsContext || 'No news loaded yet'}
Keep answers concise and friendly. If the user asks about weather or news, use the context above.`;

  
  const contents = [
    {
      role: 'user',
      parts: [{ text: `${systemContext}\n\nUser says: ${userText}` }]
    }
  ];

  try {
   
   const response = await fetch(
`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
{
    method: "POST",
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
        contents
    })
});

    const data = await response.json();
    removeTyping();

    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      const aiText = data.candidates[0].content.parts[0].text;
      appendMessage('ai', aiText);
      
      const updatedHistory = getChatHistory();
      updatedHistory.push({ role: 'ai', text: aiText });
      saveChatHistory(updatedHistory);
    } else {
    
      console.error('API Error Response:', data);
      appendMessage('ai', `API Error: ${data.error?.message || 'Please check your Gemini API key.'}`);
    }
  } catch (error) {
    removeTyping();
    appendMessage('ai', 'Connection error. Please check your network.');
    console.error('Catch Error:', error);
  }
}


document.getElementById('city-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') fetchAll();
});

document.getElementById('ai-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') sendMessage();
});


renderChips();
document.getElementById('city-input').value = 'Delhi';
fetchAll();