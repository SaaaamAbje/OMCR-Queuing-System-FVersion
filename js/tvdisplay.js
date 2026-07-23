const SVCS = {
    B: { name: 'Birth Certificate', window: 'Window 1' },
    M: { name: 'Marriage Certificate', window: 'Window 2' },
    D: { name: 'Death Certificate', window: 'Window 3' },
    C: { name: 'Correction of Entry', window: 'Window 4' },
};
let soundEnabled = true;
let lastAnnouncedNum = {};
let voices = [];
if (window.speechSynthesis) {
    voices = window.speechSynthesis.getAvailableVoices();
    window.speechSynthesis.onvoiceschanged = () => { voices = window.speechSynthesis.getAvailableVoices(); };
}
function toggleSound() {
    soundEnabled = !soundEnabled;
    document.getElementById('sound-icon').textContent = soundEnabled ? '🔊' : '🔇';
    document.getElementById('sound-label').textContent = soundEnabled ? 'Sound On' : 'Sound Off';
}
function playChime() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + i * .18);
            gain.gain.setValueAtTime(0, ctx.currentTime + i * .18);
            gain.gain.linearRampToValueAtTime(.35, ctx.currentTime + i * .18 + .04);
            gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + i * .18 + .38);
            osc.start(ctx.currentTime + i * .18);
            osc.stop(ctx.currentTime + i * .18 + .4);
        });
    }
    catch (e) { }
}
function announceNumber(numStr, svcName, windowName) {
    if (!soundEnabled || !window.speechSynthesis)
        return;
    playChime();
    setTimeout(() => {
        window.speechSynthesis.cancel();
        const code = numStr[0];
        const num = numStr.slice(1).replace(/^0+/, '') || '0';
        const text = `Now serving number ${code} ${num.split('').join(' ')} — ${svcName} — please proceed to ${windowName}.`;
        const utt = new SpeechSynthesisUtterance(text);
        utt.rate = .88;
        utt.pitch = 1;
        utt.volume = 1;
        const pref = voices.find(v => v.lang.startsWith('en'));
        if (pref)
            utt.voice = pref;
        window.speechSynthesis.speak(utt);
        setTimeout(() => { if (soundEnabled)
            window.speechSynthesis.speak(new SpeechSynthesisUtterance(text)); }, 4000);
    }, 900);
}
async function fbGet(path) {
    const r = await fetch(`${FIREBASE_URL}/${path}.json`, { method: 'GET', mode: 'cors' });
    if (!r.ok)
        throw new Error('HTTP ' + r.status);
    return r.json();
}
async function refresh() {
    try {
        const [counters, serving, queueData] = await Promise.all([fbGet('counters'), fbGet('serving'), fbGet('queue')]);
        const c = counters || {};
        const s = serving || {};
        const q = queueData ? Object.values(queueData) : [];
        for (const code of ['B', 'M', 'D', 'C']) {
            const issued = c[code] || 0;
            const served = s[code] || 0;
            const waiting = Math.max(0, issued - served);
            const nsNum = served > 0 ? code + String(served).padStart(3, '0') : '—';
            const nsEl = document.getElementById('ns-' + code);
            if (nsEl.textContent !== nsNum) {
                nsEl.style.transform = 'scale(1.15)';
                nsEl.style.opacity = '.6';
                setTimeout(() => { nsEl.textContent = nsNum; nsEl.style.transform = ''; nsEl.style.opacity = ''; }, 180);
                if (nsNum !== '—')
                    checkAnnounce(code, nsNum, SVCS[code].name, SVCS[code].window);
            }
            document.getElementById('col-' + code).classList.toggle('is-serving', served > 0 && waiting > 0);
            document.getElementById('st-issued-' + code).textContent = issued;
            document.getElementById('st-waiting-' + code).textContent = waiting;
            document.getElementById('st-served-' + code).textContent = served;
            const svcQ = q.filter(e => e.code === code && e.status === 'waiting').sort((a, b) => (a.num || '').localeCompare(b.num || ''));
            const ql = document.getElementById('ql-' + code);
            ql.innerHTML = svcQ.length === 0 ? '<div class="empty-queue">No one waiting</div>' :
                svcQ.slice(0, 6).map((e, i) => `<div class="queue-item ${i === 0 ? 'is-next' : ''}"><div class="queue-item-pos">${i === 0 ? '→' : i + 1}</div><div class="queue-item-num">${e.num}</div>${i === 0 ? '<div class="next-tag">Next</div>' : ''}</div>`).join('');
        }
        document.getElementById('connecting-overlay').classList.remove('show');
        document.getElementById('live-dot').style.background = '#4ade80';
        document.getElementById('live-text').textContent = 'Live';
        document.getElementById('footer-ticker').textContent = 'Last synced: ' + new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
    catch (e) {
        document.getElementById('live-dot').style.background = '#f87171';
        document.getElementById('live-text').textContent = 'Offline';
    }
}
function checkAnnounce(code, numStr, svcName, windowName) {
    if (lastAnnouncedNum[code] !== numStr) {
        lastAnnouncedNum[code] = numStr;
        announceNumber(numStr, svcName, windowName);
    }
}
function updateClock() {
    const now = new Date();
    document.getElementById('clock').textContent = now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    document.getElementById('clock-date').textContent = now.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}
document.getElementById('connecting-overlay').classList.add('show');
refresh();
setInterval(refresh, 2000);
setInterval(updateClock, 1000);
updateClock();