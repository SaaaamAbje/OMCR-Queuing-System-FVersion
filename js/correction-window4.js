const SVC_CODE = 'C';
const SVC_NAME = 'Correction of Entry';
const SVC_WIN = 'Window 4';
let STAFF_NAME = 'Lynie Samortin'; // fallback until real login; overwritten with the logged-in user's display_name
const REQUIRED_ROLE = 'correction';
const ALL_SVCS = {
    B: { name: 'Birth Certificate', window: 'Window 1' },
    M: { name: 'Marriage Certificate', window: 'Window 2' },
    D: { name: 'Death Certificate', window: 'Window 3' },
    C: { name: 'Correction of Entry', window: 'Window 4' },
};
let currentServing = null;
let isActive = false;
let activityLog = [];
let auditLog = [];
let activePriority = null;
let transferTarget = null;
let currentUser = null;
let modalCallback = null;
/* ── AUTH ──
   fbGet/fbSet/fbUpdate now come from js/supabase-client.js (loaded before
   this file) — same call signatures as before, backed by Supabase instead
   of Firebase. Only the sign-in flow itself changed. */
async function doLogin() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errEl = document.getElementById('login-error');
    const btn = document.getElementById('login-btn');
    errEl.classList.remove('show');
    if (!email || !password) {
        errEl.textContent = 'Please enter your email and password.';
        errEl.classList.add('show');
        return;
    }
    btn.textContent = 'Signing in...';
    btn.disabled = true;
    try {
        const { localId, idToken } = await sbSignIn(email, password);
        const roleData = await sbGetStaffRole(localId, idToken);
        if (!roleData) {
            errEl.textContent = 'Account not configured. Contact admin.';
            errEl.classList.add('show');
            btn.textContent = 'Sign In';
            btn.disabled = false;
            return;
        }
        const { role, displayName } = roleData;
        if (role !== REQUIRED_ROLE && role !== 'admin') {
            errEl.textContent = `Access denied. This portal is for ${REQUIRED_ROLE} window only.`;
            errEl.classList.add('show');
            btn.textContent = 'Sign In';
            btn.disabled = false;
            return;
        }
        STAFF_NAME = displayName || email;
        currentUser = { uid: localId, email, displayName: STAFF_NAME, role };
        sessionStorage.setItem('omcr_session_' + REQUIRED_ROLE, JSON.stringify(currentUser));
        document.getElementById('login-overlay').classList.add('hidden');
        document.getElementById('staff-pill').textContent = STAFF_NAME;
    }
    catch (e) {
        errEl.textContent = 'Incorrect email or password.';
        errEl.classList.add('show');
        btn.textContent = 'Sign In';
        btn.disabled = false;
    }
}
function doLogout() {
    sessionStorage.removeItem('omcr_session_' + REQUIRED_ROLE);
    currentUser = null;
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
    document.getElementById('login-error').classList.remove('show');
    const btn = document.getElementById('login-btn');
    btn.textContent = 'Sign In';
    btn.disabled = false;
    document.getElementById('login-overlay').classList.remove('hidden');
}
(function () {
    try {
        const s = sessionStorage.getItem('omcr_session_' + REQUIRED_ROLE);
        if (s) {
            currentUser = JSON.parse(s);
            document.getElementById('login-overlay').classList.add('hidden');
            document.getElementById('staff-pill').textContent = currentUser.displayName;
        }
    }
    catch (e) {
        sessionStorage.removeItem('omcr_session_' + REQUIRED_ROLE);
    }
})();
/* ── REFRESH ── */
async function refresh() {
    try {
        const [counters, serving, queueData, activeWindows] = await Promise.all([
            fbGet('counters'), fbGet('serving'), fbGet('queue'), fbGet('activeWindows')
        ]);
        const c = counters || {};
        const s = serving || {};
        const total = c[SVC_CODE] || 0;
        const served = s[SVC_CODE] || 0;
        const waiting = Math.max(0, total - served);
        const pct = total > 0 ? Math.round((served / total) * 100) : 0;
        isActive = !!(activeWindows && activeWindows[SVC_CODE]);
        const numDisp = served > 0 ? SVC_CODE + String(served).padStart(3, '0') : '—';
        const numEl = document.getElementById('sh-number');
        if (numEl.textContent !== numDisp) {
            numEl.classList.remove('pop');
            void numEl.offsetWidth;
            numEl.classList.add('pop');
            numEl.textContent = numDisp;
        }
        numEl.classList.toggle('active', isActive);
        document.getElementById('stat-issued').textContent = total;
        document.getElementById('stat-waiting').textContent = waiting;
        document.getElementById('stat-served').textContent = served;
        document.getElementById('progress-fill').style.width = pct + '%';
        document.getElementById('progress-pct').textContent = pct + '% served';
        const canCall = waiting > 0 && !isActive;
        const row = document.getElementById('action-row');
        if (isActive) {
            row.innerHTML = `<button class="btn btn-done" onclick="doneServing()">Done</button><button class="btn btn-recall" onclick="recallNumber()">Recall</button><button class="btn btn-skip" onclick="confirmSkip()">Skip</button><button class="btn btn-transfer" onclick="openTransfer()">Transfer</button><button class="btn btn-reset" onclick="confirmReset()">Reset</button>`;
        }
        else {
            row.innerHTML = `<button class="btn btn-call" ${!canCall ? 'disabled' : ''} onclick="callNext()">Call Next Number</button><button class="btn btn-reset" onclick="confirmReset()">Reset</button>`;
        }
        const q = queueData ? Object.values(queueData).filter(e => e.code === SVC_CODE && e.status === 'waiting').sort((a, b) => (a.num || '').localeCompare(b.num || '')) : [];
        const nl = document.getElementById('next-list');
        nl.innerHTML = q.length === 0 ? '<div class="empty-next">No one waiting.</div>' : q.slice(0, 6).map((e, i) => `<div class="next-item ${i === 0 ? 'is-next' : ''}"><div class="next-pos">${i === 0 ? '→' : i + 1}</div><div class="next-num">${e.num}</div>${i === 0 ? '<div class="next-badge">Next</div>' : ''}<button class="next-void-btn" onclick="voidTicket('${e.num}')" title="Void this ticket">×</button></div>`).join('');
        document.getElementById('sync-label').textContent = 'Live · ' + new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
    catch (e) {
        document.getElementById('sync-label').textContent = 'Offline';
    }
}
/* ── VOID TICKET ── */
function voidTicket(numStr) {
    openModal('Void This Ticket?', `${numStr} will be removed from the queue. This cannot be undone.`, async () => {
        try {
            await fbUpdate(`queue/${numStr}`, { status: 'voided', voidedBy: STAFF_NAME, voidedAt: Date.now() });
            addLog(numStr, 'Voided — client left before being called', 'reset');
            showToast(`${numStr} voided`, 'danger');
            refresh();
        }
        catch (e) {
            showToast('Error: ' + e.message, 'error');
        }
    });
}
/* ── CALL NEXT ── */
async function callNext() {
    try {
        const [counters, serving] = await Promise.all([fbGet('counters'), fbGet('serving')]);
        const total = (counters || {})[SVC_CODE] || 0;
        let served = (serving || {})[SVC_CODE] || 0;
        let next = served + 1;
        let entry = null;
        let numStr = '';
        while (next <= total) {
            numStr = SVC_CODE + String(next).padStart(3, '0');
            entry = await fbGet(`queue/${numStr}`);
            if (entry && entry.status === 'voided') {
                addLog(numStr, 'Voided ticket skipped', 'reset');
                next++;
                continue;
            }
            break;
        }
        if (next > total) {
            await fbUpdate('serving', { [SVC_CODE]: total });
            showToast('No clients waiting.', 'info');
            return;
        }
        served = next;
        await fbUpdate('serving', { [SVC_CODE]: served });
        await fbUpdate('activeWindows', { [SVC_CODE]: true });
        await fbUpdate(`queue/${numStr}`, { handledBy: STAFF_NAME, status: 'serving' });
        if (activePriority) {
            await fbUpdate(`queue/${numStr}`, { priority: activePriority });
        }
        currentServing = { ...(entry || {}), num: numStr, handledBy: STAFF_NAME };
        updateCallerCard(numStr, currentServing);
        addLog(numStr, `Called to ${SVC_WIN}`, 'called');
        showToast(`Now serving <strong>${numStr}</strong>`, 'success');
        try {
            const today = todayKey();
            const cur = await fbGet(`daily/${today}`) || 0;
            await fbSet(`daily/${today}`, cur + 1);
        }
        catch (e) { }
        refresh();
    }
    catch (e) {
        showToast('Error: ' + e.message, 'error');
    }
}
async function doneServing() {
    try {
        const s = (await fbGet('serving') || {});
        const numStr = SVC_CODE + String(s[SVC_CODE] || 0).padStart(3, '0');
        await fbUpdate('activeWindows', { [SVC_CODE]: false });
        await fbUpdate(`queue/${numStr}`, { status: 'done' });
        addLog(numStr, 'Completed', 'info');
        showToast(`Done serving ${numStr}`, 'success');
        currentServing = null;
        document.getElementById('cp-body').innerHTML = '<div class="cp-empty">Press "Call Next Number" to continue.</div>';
        document.getElementById('cp-num').textContent = '—';
        document.getElementById('notes-wrap').style.display = 'none';
        refresh();
    }
    catch (e) {
        showToast('Error: ' + e.message, 'error');
    }
}
async function recallNumber() {
    try {
        const s = (await fbGet('serving') || {});
        const num = s[SVC_CODE] || 0;
        if (!num) {
            showToast('No number being served.', 'info');
            return;
        }
        const numStr = SVC_CODE + String(num).padStart(3, '0');
        await fbUpdate(`queue/${numStr}`, { recalledAt: Date.now(), status: 'serving' });
        addLog(numStr, 'Recalled', 'called');
        showToast(`Recalled ${numStr}`, 'success');
    }
    catch (e) {
        showToast('Error: ' + e.message, 'error');
    }
}
function confirmSkip() {
    openModal('Skip This Number?', 'The client did not show up. Their number will be marked as skipped.', async () => {
        try {
            const s = (await fbGet('serving') || {});
            const numStr = SVC_CODE + String(s[SVC_CODE] || 0).padStart(3, '0');
            await fbUpdate(`queue/${numStr}`, { status: 'skipped' });
            await fbUpdate('activeWindows', { [SVC_CODE]: false });
            addLog(numStr, 'Skipped — client did not show', 'reset');
            showToast(`${numStr} skipped`, 'danger');
            currentServing = null;
            document.getElementById('cp-body').innerHTML = '<div class="cp-empty">Number skipped.</div>';
            document.getElementById('cp-num').textContent = '—';
            document.getElementById('notes-wrap').style.display = 'none';
            refresh();
        }
        catch (e) {
            showToast('Error: ' + e.message, 'error');
        }
    });
}
function confirmReset() {
    openModal(`Reset ${SVC_NAME} Queue?`, `This will clear all ${SVC_CODE}-Series numbers. Cannot be undone.`, async () => {
        try {
            await fbUpdate('counters', { [SVC_CODE]: 0 });
            await fbUpdate('serving', { [SVC_CODE]: 0 });
            await fbUpdate('activeWindows', { [SVC_CODE]: false });
            const q = await fbGet('queue') || {};
            for (const [key, val] of Object.entries(q)) {
                if (val.code === SVC_CODE)
                    await fbSet(`queue/${key}`, null);
            }
            addLog(null, 'Queue reset', 'reset');
            showToast('Queue reset', 'danger');
            currentServing = null;
            document.getElementById('cp-body').innerHTML = '<div class="cp-empty">Queue was reset.</div>';
            document.getElementById('cp-num').textContent = '—';
            document.getElementById('notes-wrap').style.display = 'none';
            refresh();
        }
        catch (e) {
            showToast('Reset failed: ' + e.message, 'error');
        }
    });
}
/* ── TRANSFER ── */
let _transferTarget = null;
function openTransfer() {
    if (!currentServing) {
        showToast('No client being served.', 'info');
        return;
    }
    const opts = document.getElementById('transfer-options');
    opts.innerHTML = Object.entries(ALL_SVCS).filter(([c]) => c !== SVC_CODE).map(([c, s]) => `
    <div class="transfer-option" onclick="selectTransfer('${c}',this)">
     <div class="transfer-option-code">${c}</div>
     <div>${s.name} — ${s.window}</div>
    </div>`).join('');
    _transferTarget = null;
    document.getElementById('transfer-modal').classList.add('show');
}
function selectTransfer(code, el) { document.querySelectorAll('.transfer-option').forEach(o => o.classList.remove('selected')); el.classList.add('selected'); _transferTarget = code; }
async function confirmTransfer() {
    if (!_transferTarget || !currentServing)
        return;
    try {
        const numStr = currentServing.num;
        const counters = await fbGet('counters') || {};
        const newCount = (counters[_transferTarget] || 0) + 1;
        const newNum = _transferTarget + String(newCount).padStart(3, '0');
        await fbUpdate('counters', { [_transferTarget]: newCount });
        await fbSet(`queue/${newNum}`, { ...currentServing, num: newNum, code: _transferTarget, status: 'waiting', transferredFrom: numStr, transferredBy: STAFF_NAME, transferredAt: Date.now() });
        await fbUpdate(`queue/${numStr}`, { status: 'transferred', transferredTo: newNum });
        await fbUpdate('activeWindows', { [SVC_CODE]: false });
        addLog(numStr, `Transferred → ${newNum}`, 'info');
        showToast(`${numStr} transferred to ${newNum}`, 'success');
        closeTransferModal();
        currentServing = null;
        document.getElementById('cp-body').innerHTML = '<div class="cp-empty">Client transferred.</div>';
        document.getElementById('cp-num').textContent = '—';
        document.getElementById('notes-wrap').style.display = 'none';
        refresh();
    }
    catch (e) {
        showToast('Transfer failed: ' + e.message, 'error');
    }
}
function closeTransferModal() { document.getElementById('transfer-modal').classList.remove('show'); _transferTarget = null; }
/* ── CALLER CARD ── */
function updateCallerCard(numStr, entry) {
    document.getElementById('cp-num').textContent = numStr;
    document.getElementById('notes-wrap').style.display = 'block';
    document.getElementById('notes-textarea').value = entry?.staffNote || '';
    if (!entry || (!entry.ownerName && !entry.name)) {
        document.getElementById('cp-body').innerHTML = '<div class="cp-empty">No client info on file.</div>';
        return;
    }
    document.getElementById('cp-body').innerHTML = `
    <div class="cp-section"><div class="cp-section-label">Document Owner</div><div class="cp-section-value">${entry.ownerName || '—'}</div></div>
    <div class="cp-section"><div class="cp-section-label">Requestor</div><div class="cp-section-value">${entry.name || '—'}</div><div class="cp-section-sub">${entry.relationship || ''}</div></div>
    <div class="cp-section"><div class="cp-section-label">Purpose</div><div class="cp-section-value" style="font-size:.82rem;">${entry.purpose || 'Not specified'}</div></div>
    <div class="cp-handled"><div class="cp-handled-label">Handled By</div><div class="cp-handled-value">${STAFF_NAME}</div></div>`;
}
/* ── NOTES ── */
async function saveNote() {
    if (!currentServing)
        return;
    const note = document.getElementById('notes-textarea').value.trim();
    try {
        await fbUpdate(`queue/${currentServing.num}`, { staffNote: note, staffNoteBy: STAFF_NAME, staffNoteAt: Date.now() });
        const s = document.getElementById('notes-saved');
        s.classList.add('show');
        setTimeout(() => s.classList.remove('show'), 2000);
        addLog(currentServing.num, 'Note saved', 'info');
    }
    catch (e) {
        showToast('Failed to save note', 'error');
    }
}
/* ── PRIORITY ── */
function setPriority(type) {
    activePriority = activePriority === type ? null : type;
    ['senior', 'pwd', 'pregnant'].forEach(t => {
        const b = document.getElementById(`pri-btn-${t}`);
        if (b)
            b.classList.remove(`active-${t}`);
    });
    if (activePriority) {
        document.getElementById(`pri-btn-${activePriority}`)?.classList.add(`active-${activePriority}`);
        showToast(`Priority: ${activePriority.toUpperCase()}`, 'info');
    }
}
/* ── HISTORY ── */
async function searchHistory() {
    const query = document.getElementById('history-query').value.trim().toLowerCase();
    const results = document.getElementById('history-results');
    if (!query) {
        results.innerHTML = '<div class="history-empty">Enter a name or ticket number.</div>';
        return;
    }
    results.innerHTML = '<div class="history-empty">Searching...</div>';
    try {
        const q = await fbGet('queue') || {};
        const matches = Object.values(q).filter(e => {
            return (e.name || '').toLowerCase().includes(query) || (e.ownerName || '').toLowerCase().includes(query) || (e.num || '').toLowerCase().includes(query);
        }).slice(0, 10);
        results.innerHTML = matches.length === 0 ? '<div class="history-empty">No records found.</div>' : matches.map(e => `
      <div class="history-item">
       <div style="display:flex;align-items:center;gap:.5rem;justify-content:space-between;">
        <span class="history-item-num">${e.num || '—'}</span>
        <span style="font-size:.6rem;font-weight:700;text-transform:uppercase;">${e.status || '—'}</span>
       </div>
       <div class="history-item-name">Owner: ${e.ownerName || '—'} · Req: ${e.name || '—'}</div>
       <div class="history-item-meta">${e.relationship || ''} · ${e.handledBy ? 'By: ' + e.handledBy : ''}</div>
       ${e.staffNote ? `<div class="history-note">${e.staffNote}</div>` : ''}
      </div>`).join('');
    }
    catch (e) {
        results.innerHTML = '<div class="history-empty">Error loading records.</div>';
    }
}
/* ── CHECKLIST ── */
function toggleCheck(i) {
    const item = document.getElementById(`cli-${i}`);
    const chk = document.getElementById(`chk-${i}`);
    if (item)
        item.classList.toggle('checked', chk.checked);
}
/* ── LOG ── */
function addLog(num, action, type) {
    const time = new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    activityLog.unshift({ num, action, type, time });
    if (activityLog.length > 50)
        activityLog.pop();
    renderLog();
    writeAudit(action, num, '', type);
}
function renderLog() {
    const body = document.getElementById('log-body');
    if (!activityLog.length) {
        body.innerHTML = '<div class="log-empty">No activity yet.</div>';
        return;
    }
    body.innerHTML = activityLog.map(e => `<div class="log-item"><div class="log-time">${e.time}</div><div class="log-num">${e.num || '—'}</div><div class="log-action">${e.action}</div></div>`).join('');
}
function clearLog() { activityLog = []; renderLog(); showToast('Log cleared', 'info'); }
/* ── AUDIT ── */
async function writeAudit(action, num, detail, type) {
    const now = new Date();
    const entry = { ts: now.toISOString(), time: now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }), date: now.toISOString().split('T')[0], num: num || '—', action, detail: detail || '', type: type || 'info', staff: STAFF_NAME, window: SVC_WIN, service: SVC_NAME };
    auditLog.unshift(entry);
    if (auditLog.length > 100)
        auditLog.pop();
    renderAuditLog();
    try {
        await fbSet(`audit/${entry.date}/${SVC_CODE}_${now.getTime()}`, entry);
    }
    catch (e) { }
}
function renderAuditLog() {
    const body = document.getElementById('audit-body');
    if (!body)
        return;
    if (!auditLog.length) {
        body.innerHTML = '<div class="audit-empty">No actions recorded yet.</div>';
        return;
    }
    body.innerHTML = auditLog.map(e => `<div class="audit-item"><div class="audit-time">${e.time}</div><div class="audit-num">${e.num}</div><div class="audit-action">${e.action}</div><div class="audit-user">${e.staff}</div></div>`).join('');
}
function exportAuditLog() {
    if (!auditLog.length) {
        showToast('No entries to export.', 'info');
        return;
    }
    const csv = [['Time', 'Ticket', 'Action', 'Staff', 'Window'], ...auditLog.map(e => [e.time, e.num, e.action, e.staff, e.window])].map(r => r.map(v => `"${(v || '').toString().replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `audit_${SVC_CODE}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
}
/* ── BACKUP ── */
async function backupToFirebase() {
    try {
        const [c, s] = await Promise.all([fbGet('counters'), fbGet('serving')]);
        await fbSet(`backups/manual_${new Date().toISOString().replace(/[:.]/g, '-')}`, { counters: c, serving: s, ts: new Date().toISOString(), by: STAFF_NAME, window: SVC_WIN });
        showToast('Backup saved', 'success');
    }
    catch (e) {
        showToast('Backup failed', 'error');
    }
}
setInterval(async () => {
    try {
        const [c, s] = await Promise.all([fbGet('counters'), fbGet('serving')]);
        await fbSet(`backups/auto_${new Date().toISOString().replace(/[:.]/g, '-')}`, { counters: c, serving: s, autoBackup: true, ts: new Date().toISOString() });
    }
    catch (e) { }
}, 7200000);
/* ── TOAST ── */
function showToast(msg, type = 'info') {
    const a = document.getElementById('toast-area');
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<span>${msg}</span>`;
    a.appendChild(t);
    setTimeout(() => { t.classList.add('removing'); setTimeout(() => t.remove(), 260); }, 3500);
}
/* ── MODAL ── */
function openModal(title, body, cb) { document.getElementById('modal-title').textContent = title; document.getElementById('modal-body').textContent = body; modalCallback = cb; document.getElementById('modal-backdrop').classList.add('show'); }
function closeModal() { document.getElementById('modal-backdrop').classList.remove('show'); modalCallback = null; }
document.getElementById('modal-confirm-btn').onclick = () => {
    closeModal();
    if (modalCallback)
        modalCallback();
};
/* ── CLOCK ── */
function updateClock() { document.getElementById('topbar-clock').textContent = new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }); }
/* ── TODAY KEY ── */
function todayKey() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
/* ── INIT ── */
refresh();
setInterval(refresh, 2000);
setInterval(updateClock, 1000);
updateClock();
if (window.lucide)
    lucide.createIcons();