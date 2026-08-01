/* ── SPLASH ── */
function setSplashLang(lang) {
    currentLang = lang;
    document.getElementById('splash-lang-en').classList.toggle('active', lang === 'en');
    document.getElementById('splash-lang-fil').classList.toggle('active', lang === 'fil');
    document.getElementById('splash-welcome').textContent = lang === 'fil' ? 'MALIGAYANG PAGDATING SA' : 'WELCOME TO THE';
    document.getElementById('splash-office').innerHTML = lang === 'fil' ? 'Tanggapan ng Munisipal<br>na Tagapagpanatili ng Sibil' : 'Office of the Municipal<br>Civil Registrar';
    document.getElementById('splash-btn-text').textContent = lang === 'fil' ? 'Pindutin para Pumasok' : 'Tap to Enter';
    document.getElementById('splash-hint').textContent = lang === 'fil' ? 'Pindutin kahit saan upang magpatuloy' : 'Touch anywhere to continue';
}
function enterApp() {
    const splash = document.getElementById('splash');
    splash.classList.add('exit');
    // Sync lang toggle in app with splash selection
    setTimeout(() => {
        splash.style.display = 'none';
        const app = document.getElementById('app-content');
        app.style.display = 'flex';
        // Apply the language chosen on splash to the app
        setLang(currentLang);
        refreshIcons();
    }, 440);
}
/* ── TRANSLATION ENGINE ── */
let currentLang = 'en';
const BTN_LABELS = {
    next: { en: 'Next Step', fil: 'Susunod' },
    submit: { en: 'Submit Request', fil: 'Isumite' },
    back: { en: 'Back', fil: 'Bumalik' },
};
function setLang(lang) {
    currentLang = lang;
    // Toggle button styles
    document.getElementById('lang-en').classList.toggle('active', lang === 'en');
    document.getElementById('lang-fil').classList.toggle('active', lang === 'fil');
    // Translate all elements with data-en / data-fil
    document.querySelectorAll('[data-en]').forEach(el => {
        // Skip inputs/selects — handle separately
        if (el.tagName === 'INPUT' || el.tagName === 'OPTION')
            return;
        // For elements that contain HTML (like notice span)
        const val = el.getAttribute(`data-${lang}`);
        if (val !== null)
            el.innerHTML = val;
    });
    // Translate input placeholders
    document.querySelectorAll('input[data-en-placeholder]').forEach(el => {
        el.placeholder = el.getAttribute(`data-${lang}-placeholder`) || el.getAttribute('data-en-placeholder');
    });
    document.querySelectorAll('textarea[data-en-placeholder]').forEach(el => {
        el.placeholder = el.getAttribute(`data-${lang}-placeholder`) || el.getAttribute('data-en-placeholder');
    });
    // Translate select options
    document.querySelectorAll('select option[data-en]').forEach(el => {
        el.textContent = el.getAttribute(`data-${lang}`) || el.getAttribute('data-en');
    });
    // Re-apply dynamic button text based on current step
    updateButtonLabels();
}
function updateButtonLabels() {
    const nextTextEl = document.getElementById('btn-next-text');
    const backTextEl = document.getElementById('btn-back-text');
    if (nextTextEl) {
        const key = currentStep === 3 ? 'submit' : 'next';
        nextTextEl.textContent = BTN_LABELS[key][currentLang];
    }
    if (backTextEl)
        backTextEl.textContent = BTN_LABELS.back[currentLang];
}
/* ── SAFE ICON REFRESH ── */
function refreshIcons() {
    if (window.lucide)
        lucide.createIcons();
}
/* ── STATE ── */
const SVC_MAP = {
    B: { name: 'Birth Certificate', window: 'Window 1', icon: 'file-plus' },
    M: { name: 'Marriage Certificate', window: 'Window 2', icon: 'heart' },
    D: { name: 'Death Certificate', window: 'Window 3', icon: 'file-x' },
    C: { name: 'Correction of Entry', window: 'Window 4', icon: 'pencil' },
};
let currentStep = 1;
const TOTAL_STEPS = 3;
/* ── CLOCK ── */
function updateClock() {
    const now = new Date();
    const t = now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: false });
    document.getElementById('clock').textContent = t;
    document.getElementById('status-time').textContent =
        `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
}
setInterval(updateClock, 10000);
updateClock();
/* ── STEP PROGRESS ── */
function updateProgress(step) {
    document.getElementById('step-num').textContent = step;
    ['1', '2', '3', '4'].forEach((n, i) => {
        const lbl = document.getElementById(`lbl-${n}`);
        const fill = document.getElementById(`fill-${n}`);
        const stepN = i + 1;
        lbl.className = 'step-label' + (stepN < step ? ' done' : stepN === step ? ' active' : '');
        if (stepN < step) {
            fill.style.width = '100%';
            fill.classList.add('done-green');
        }
        else if (stepN === step) {
            fill.style.width = '100%';
            fill.classList.remove('done-green');
        }
        else {
            fill.style.width = '0%';
            fill.classList.remove('done-green');
        }
    });
}
/* ── NAVIGATION ── */
const SVG_ARROW = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`;
const SVG_BACK = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>`;
const SVG_CHECK = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;"><polyline points="20 6 9 17 4 12"/></svg>`;
const SVG_PLUS = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`;
function showStep(n) {
    document.querySelectorAll('.step-panel').forEach(p => p.classList.remove('active'));
    document.getElementById(`step-${n}`).classList.add('active');
    updateProgress(n);
    const btnBack = document.getElementById('btn-back');
    const btnNext = document.getElementById('btn-next');
    btnBack.style.display = n > 1 ? '' : 'none';
    if (n === 4) {
        btnNext.innerHTML = `<span class="btn-text" id="btn-next-text">${BTN_LABELS.submit[currentLang]}</span> ${SVG_CHECK}`;
        btnNext.className = 'btn btn-green';
    }
    else {
        btnNext.innerHTML = `<span class="btn-text" id="btn-next-text">${BTN_LABELS.next[currentLang]}</span> ${SVG_ARROW}`;
        btnNext.className = 'btn btn-primary';
    }
    document.getElementById('scroll-body').scrollTo({ top: 0, behavior: 'smooth' });
    currentStep = n;
}
function goBack() {
    if (currentStep > 1)
        showStep(currentStep - 1);
}
function goNext() {
    if (currentStep === 1) {
        if (!validateStep1())
            return;
        populateConfirm();
        showStep(2);
    }
    else if (currentStep === 2) {
        if (!validateStep2())
            return;
        populateConfirm();
        showStep(3);
    }
    else if (currentStep === 3) {
        if (!validateStep3())
            return;
        populateConfirm();
        showStep(4);
    }
    else if (currentStep === 4) {
        submitRequest();
    }
}
/* ── VALIDATION ── */
function validateStep1() {
    const svc = document.querySelector('input[name="service"]:checked');
    const errEl = document.getElementById('svc-error');
    if (!svc) {
        errEl.style.display = 'block';
        return false;
    }
    errEl.style.display = 'none';
    return true;
}
function validateStep2() {
    let valid = true;
    const ownerName = document.getElementById('owner-name');
    const ownerRelationship = document.getElementById('owner-relationship');
    [ownerName, ownerRelationship].forEach(el => {
        el.classList.remove('error');
    });
    if (!ownerName.value.trim()) {
        ownerName.classList.add('error');
        valid = false;
    }
    if (!ownerRelationship.value) {
        ownerRelationship.classList.add('error');
        valid = false;
    }
    if (!valid)
        showToast(currentLang === 'fil' ? 'Punan ang mga kinakailangang field.' : 'Please fill in the required fields.', 'error');
    return valid;
}
function validateStep3() {
    let valid = true;
    const fname = document.getElementById('fname');
    const lname = document.getElementById('lname');
    const contact = document.getElementById('contact');
    [fname, lname, contact].forEach(el => {
        el.classList.remove('error');
    });
    if (!fname.value.trim()) {
        fname.classList.add('error');
        valid = false;
    }
    if (!lname.value.trim()) {
        lname.classList.add('error');
        valid = false;
    }
    const ph = contact.value.replace(/\D/g, '');
    if (!ph || ph.length < 10) {
        contact.classList.add('error');
        valid = false;
    }
    if (!valid)
        showToast(currentLang === 'fil' ? 'Punan ang mga kinakailangang field.' : 'Please fill in the required fields.', 'error');
    return valid;
}
/* ── CONFIRM ── */
function populateConfirm() {
    const svc = document.querySelector('input[name="service"]:checked');
    const pur = document.querySelector('input[name="purpose"]:checked');
    const ownerName = document.getElementById('owner-name').value.trim();
    const ownerRelationship = document.getElementById('owner-relationship');
    const fname = document.getElementById('fname').value.trim();
    const lname = document.getElementById('lname').value.trim();
    const contact = document.getElementById('contact').value.trim();
    const copies = document.getElementById('copies').value;
    if (svc) {
        const s = SVC_MAP[svc.value];
        document.getElementById('confirm-svc-name').textContent = s.name;
    }
    document.getElementById('c-owner-name').textContent = ownerName || '—';
    document.getElementById('c-owner-relationship').textContent = ownerRelationship.selectedOptions.length
        ? ownerRelationship.selectedOptions[0].textContent
        : '—';
    document.getElementById('c-name').textContent = fname && lname ? `${fname} ${lname}` : '—';
    document.getElementById('c-contact').textContent = contact || '—';
    document.getElementById('c-purpose').textContent = pur ? pur.value : 'Not specified';
    document.getElementById('c-copies').textContent = copies + (copies === '1' ? ' copy' : ' copies');
}
/* ── SUBMIT ── */
function submitRequest() {
    const btn = document.getElementById('btn-next');
    btn.classList.add('loading');
    issueNumber()
        .catch(() => {
        showToast(currentLang === 'fil'
            ? 'May problema sa koneksyon. Subukang muli.'
            : 'Connection problem. Please try again.', 'error');
    })
        .finally(() => {
        btn.classList.remove('loading');
    });
}
async function issueNumber() {
    const svc = document.querySelector('input[name="service"]:checked');
    if (!svc)
        return;
    const code = svc.value;
    const pur = document.querySelector('input[name="purpose"]:checked');
    const ownerName = document.getElementById('owner-name').value.trim();
    const ownerRelationship = document.getElementById('owner-relationship').value;
    const fname = document.getElementById('fname').value.trim();
    const lname = document.getElementById('lname').value.trim();
    const contact = document.getElementById('contact').value.trim();
    // Claim the next number for this service (real shared counter, not local-only)
    const counters = (await fbGet('counters')) || { B: 0, M: 0, D: 0, C: 0 };
    const num = (counters[code] || 0) + 1;
    const numStr = code + String(num).padStart(3, '0');
    await fbUpdate('counters', { [code]: num });
    // Write the ticket into the real shared queue so staff/TV display see it
    await fbSet(`queue/${numStr}`, {
        code,
        status: 'waiting',
        name: fname ? `${fname} ${lname}` : null,
        contact: contact || null,
        purpose: pur ? pur.value : null,
        ownerName: ownerName || null,
        relationship: ownerRelationship || null,
    });
    // Fill ticket
    const s = SVC_MAP[code];
    const serving = (await fbGet('serving')) || { B: 0, M: 0, D: 0, C: 0 };
    const pos = Math.max(0, num - (serving[code] || 0));
    document.getElementById('ticket-number').textContent = numStr;
    document.getElementById('ticket-svc').textContent = `${s.name} · ${s.window}`;
    document.getElementById('ticket-name').textContent = fname ? `${fname} ${lname}` : 'Queue Member';
    document.getElementById('ticket-time').textContent = new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true });
    document.getElementById('ticket-position').textContent = pos <= 1
        ? (currentLang === 'fil' ? 'Ikaw ang susunod!' : 'You are next!')
        : (currentLang === 'fil' ? `Puwesto ${pos} sa pila` : `Position ${pos} in queue`);
    showSuccess();
}
/* ── SUCCESS MICRO-INTERACTION ── */
function showSuccess() {
    // Hide form UI
    document.getElementById('step-progress').style.display = 'none';
    document.getElementById('form-footer').style.display = 'none';
    document.querySelectorAll('.step-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('success-screen').classList.add('show');
    document.getElementById('bottom-nav').style.display = 'flex';
    // Animate ring
    setTimeout(() => {
        document.getElementById('success-ring-prog').classList.add('animate');
    }, 60);
    // Animate checkmark
    setTimeout(() => {
        document.getElementById('success-check').classList.add('animate');
    }, 700);
    // Confetti
    setTimeout(launchConfetti, 800);
    showToast(currentLang === 'fil' ? 'Naibigay na ang inyong numero!' : 'Your number has been issued!', 'success');
}
function getAnotherNumber() {
    // Reset everything
    document.querySelectorAll('input[type="radio"]').forEach(r => r.checked = false);
    document.getElementById('owner-name').value = '';
    document.getElementById('owner-relationship').value = '';
    document.getElementById('fname').value = '';
    document.getElementById('lname').value = '';
    document.getElementById('contact').value = '';
    document.getElementById('notes').value = '';
    document.getElementById('copies').value = '1';
    document.getElementById('svc-error').style.display = 'none';
    ['owner-name', 'owner-relationship', 'fname', 'lname', 'contact'].forEach(id => document.getElementById(id).classList.remove('error'));
    // Reset success screen
    document.getElementById('success-screen').classList.remove('show');
    document.getElementById('success-ring-prog').classList.remove('animate');
    document.getElementById('success-check').classList.remove('animate');
    document.getElementById('step-progress').style.display = '';
    document.getElementById('form-footer').style.display = '';
    document.getElementById('bottom-nav').style.display = 'none';
    // Reset button
    const btn = document.getElementById('btn-next');
    btn.innerHTML = `<span class="btn-text" id="btn-next-text">${BTN_LABELS.next[currentLang]}</span> ${SVG_ARROW}`;
    btn.className = 'btn btn-primary';
    showStep(1);
}
/* ── CONFETTI ── */
function launchConfetti() {
    const wrap = document.getElementById('confetti-wrap');
    const COLORS = ['#A8722A', '#D9AA55', '#1A2B3C', '#4ade80', '#60a5fa', '#f472b6', '#facc15'];
    for (let i = 0; i < 52; i++) {
        const p = document.createElement('div');
        p.className = 'confetti-particle';
        const startX = Math.random() * 100;
        const delay = Math.random() * 0.7;
        const dur = 1.4 + Math.random() * 1.2;
        const size = 5 + Math.random() * 7;
        p.style.cssText = `
       left:${startX}%;
       width:${size}px;height:${size}px;
       background:${COLORS[Math.floor(Math.random() * COLORS.length)]};
       animation-duration:${dur}s;
       animation-delay:${delay}s;
       border-radius:${Math.random() > .5 ? '50%' : '2px'};
     `;
        wrap.appendChild(p);
        setTimeout(() => p.remove(), (delay + dur) * 1000 + 200);
    }
}
/* ── TOAST ── */
function showToast(msg, type = 'info') {
    const area = document.getElementById('toast-area');
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<span>${msg}</span>`;
    area.appendChild(t);
    setTimeout(() => {
        t.classList.add('removing');
        setTimeout(() => t.remove(), 250);
    }, 3000);
}
/* ── MOBILE KEYBOARD: keep footer visible ── */
/* When a text field is focused on mobile, the virtual keyboard pushes up the
   viewport. We listen to visualViewport changes and nudge the sticky footer. */
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
        const footer = document.getElementById('form-footer');
        const keyboardHeight = window.innerHeight - window.visualViewport.height;
        // Only apply when keyboard is likely open (height diff > 100px)
        if (keyboardHeight > 100) {
            footer.style.paddingBottom = (keyboardHeight + 12) + 'px';
        }
        else {
            footer.style.paddingBottom = `calc(0.75rem + var(--safe-bottom))`;
        }
    });
}
/* Also: blur all inputs when tapping "Next" so keyboard dismisses first on iOS */
document.getElementById('btn-next').addEventListener('touchstart', () => {
    if (document.activeElement && document.activeElement.blur)
        document.activeElement.blur();
}, { passive: true });
/* ── INIT ── */
showStep(1);