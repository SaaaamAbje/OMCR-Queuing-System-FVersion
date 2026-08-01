/* ══════════════════════════════════════════════════════════════
   SUPABASE CLIENT — Firebase-compatible shim
   ══════════════════════════════════════════════════════════════
   Every staff/TV page previously called fbGet(path) / fbSet(path,data) /
   fbUpdate(path,data) against a Firebase Realtime Database tree. This file
   provides the SAME function names and call signatures, backed by Supabase
   (Postgres via PostgREST) instead — so none of the ~150 existing call
   sites across the page scripts needed to change, only what's underneath.

   Requires SUPABASE_URL and SUPABASE_ANON_KEY to be defined first
   (see js/config.js).
   ── */
function sbHeaders(extra) {
    return Object.assign({
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${sbAccessToken || SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
    }, extra || {});
}
let sbAccessToken = null; // set after a successful staff login (sbSignIn)
async function sbRest(path, options) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, Object.assign({}, options, {
        headers: sbHeaders(options && options.headers),
    }));
    if (!r.ok) {
        const body = await r.text();
        throw new Error(`Supabase ${r.status}: ${body}`);
    }
    const text = await r.text();
    return text ? JSON.parse(text) : null;
}
/* ── Postgres row <-> Firebase-style camelCase object ── */
function queueRowToEntry(row) {
    if (!row)
        return null;
    return {
        num: row.num,
        code: row.code,
        status: row.status,
        name: row.name,
        contact: row.contact,
        purpose: row.purpose,
        ownerName: row.owner_name,
        relationship: row.relationship,
        priority: row.priority,
        handledBy: row.handled_by,
        transferredFrom: row.transferred_from,
        transferredTo: row.transferred_to,
        transferredBy: row.transferred_by,
        transferredAt: row.transferred_at,
        recalledAt: row.recalled_at,
        staffNote: row.staff_note,
        staffNoteBy: row.staff_note_by,
        staffNoteAt: row.staff_note_at,
        ts: row.created_at,
    };
}
function entryToQueueRow(num, entry) {
    const row = { num };
    if ('code' in entry)
        row.code = entry.code;
    if ('status' in entry)
        row.status = entry.status;
    if ('name' in entry)
        row.name = entry.name;
    if ('contact' in entry)
        row.contact = entry.contact;
    if ('purpose' in entry)
        row.purpose = entry.purpose;
    if ('ownerName' in entry)
        row.owner_name = entry.ownerName;
    if ('relationship' in entry)
        row.relationship = entry.relationship;
    if ('priority' in entry)
        row.priority = entry.priority;
    if ('handledBy' in entry)
        row.handled_by = entry.handledBy;
    if ('transferredFrom' in entry)
        row.transferred_from = entry.transferredFrom;
    if ('transferredTo' in entry)
        row.transferred_to = entry.transferredTo;
    if ('transferredBy' in entry)
        row.transferred_by = entry.transferredBy;
    if ('transferredAt' in entry)
        row.transferred_at = entry.transferredAt;
    if ('recalledAt' in entry)
        row.recalled_at = entry.recalledAt;
    if ('staffNote' in entry)
        row.staff_note = entry.staffNote;
    if ('staffNoteBy' in entry)
        row.staff_note_by = entry.staffNoteBy;
    if ('staffNoteAt' in entry)
        row.staff_note_at = entry.staffNoteAt;
    return row;
}
/* ── fbGet / fbSet / fbUpdate: same signatures as before ── */
async function fbGet(path) {
    if (path === 'counters') {
        const rows = await sbRest('service_counters?select=code,count');
        const obj = {};
        rows.forEach(r => obj[r.code] = r.count);
        return obj;
    }
    if (path === 'serving') {
        const rows = await sbRest('serving_numbers?select=code,current_number');
        const obj = {};
        rows.forEach(r => obj[r.code] = r.current_number);
        return obj;
    }
    if (path === 'activeWindows') {
        const rows = await sbRest('active_windows?select=code,active');
        const obj = {};
        rows.forEach(r => obj[r.code] = r.active);
        return obj;
    }
    if (path === 'queue') {
        const rows = await sbRest('queue?select=*');
        const obj = {};
        rows.forEach(r => obj[r.num] = queueRowToEntry(r));
        return obj;
    }
    const queueMatch = path.match(/^queue\/(.+)$/);
    if (queueMatch) {
        const rows = await sbRest(`queue?num=eq.${encodeURIComponent(queueMatch[1])}&select=*`);
        return rows.length ? queueRowToEntry(rows[0]) : null;
    }
    const dailyMatch = path.match(/^daily\/(.+)$/);
    if (dailyMatch) {
        const rows = await sbRest(`daily_counts?date=eq.${encodeURIComponent(dailyMatch[1])}&select=count`);
        return rows.length ? rows[0].count : null;
    }
    console.warn('fbGet: unsupported path', path);
    return null;
}
async function fbSet(path, data) {
    const queueMatch = path.match(/^queue\/(.+)$/);
    if (queueMatch) {
        const num = queueMatch[1];
        if (data === null) {
            await sbRest(`queue?num=eq.${encodeURIComponent(num)}`, { method: 'DELETE' });
            return;
        }
        const row = entryToQueueRow(num, data);
        await sbRest('queue?on_conflict=num', {
            method: 'POST',
            headers: { 'Prefer': 'resolution=merge-duplicates' },
            body: JSON.stringify(row),
        });
        return;
    }
    const dailyMatch = path.match(/^daily\/(.+)$/);
    if (dailyMatch) {
        const date = dailyMatch[1];
        await sbRest('daily_counts?on_conflict=date', {
            method: 'POST',
            headers: { 'Prefer': 'resolution=merge-duplicates' },
            body: JSON.stringify({ date, count: data }),
        });
        return;
    }
    const auditMatch = path.match(/^audit\/([^/]+)\/(.+)$/);
    if (auditMatch) {
        const date = auditMatch[1];
        await sbRest('audit_log', {
            method: 'POST',
            body: JSON.stringify({
                date,
                time: data.time,
                ts: data.ts,
                code: data.code,
                num: data.num,
                action: data.action,
                detail: data.detail,
                type: data.type,
                staff: data.staff,
                window_name: data.window,
                service_name: data.service,
            }),
        });
        return;
    }
    const backupMatch = path.match(/^backups\/(manual|auto)_(.+)$/);
    if (backupMatch) {
        await sbRest('backups', {
            method: 'POST',
            body: JSON.stringify({
                kind: backupMatch[1],
                counters: data.counters,
                serving: data.serving,
                by: data.by || null,
                window_name: data.window || null,
            }),
        });
        return;
    }
    console.warn('fbSet: unsupported path', path);
}
async function fbUpdate(path, data) {
    if (path === 'counters') {
        for (const code of Object.keys(data)) {
            await sbRest('service_counters?on_conflict=code', {
                method: 'POST',
                headers: { 'Prefer': 'resolution=merge-duplicates' },
                body: JSON.stringify({ code, count: data[code] }),
            });
        }
        return;
    }
    if (path === 'serving') {
        for (const code of Object.keys(data)) {
            await sbRest('serving_numbers?on_conflict=code', {
                method: 'POST',
                headers: { 'Prefer': 'resolution=merge-duplicates' },
                body: JSON.stringify({ code, current_number: data[code] }),
            });
        }
        return;
    }
    if (path === 'activeWindows') {
        for (const code of Object.keys(data)) {
            await sbRest('active_windows?on_conflict=code', {
                method: 'POST',
                headers: { 'Prefer': 'resolution=merge-duplicates' },
                body: JSON.stringify({ code, active: data[code] }),
            });
        }
        return;
    }
    const queueMatch = path.match(/^queue\/(.+)$/);
    if (queueMatch) {
        const num = queueMatch[1];
        const row = entryToQueueRow(num, data);
        delete row.num; // PATCH target is in the query string, not the body
        await sbRest(`queue?num=eq.${encodeURIComponent(num)}`, {
            method: 'PATCH',
            body: JSON.stringify(row),
        });
        return;
    }
    console.warn('fbUpdate: unsupported path', path);
}
/* ── Auth: replaces the identitytoolkit.googleapis.com call ── */
// Returns { localId, idToken } shaped like the old Firebase Auth response,
// so the calling code in each page's doLogin() needs minimal changes.
async function sbSignIn(email, password) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });
    if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        const err = new Error(body.error_description || body.msg || `Login failed (${r.status})`);
        throw err;
    }
    const data = await r.json();
    sbAccessToken = data.access_token;
    return { localId: data.user.id, idToken: data.access_token };
}
// Looks up the signed-in user's role AND display name from staff_roles.
// Returns { role, displayName } or null if the account isn't configured.
async function sbGetStaffRole(userId, idToken) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/staff_roles?user_id=eq.${encodeURIComponent(userId)}&select=role,display_name`, {
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${idToken}` },
    });
    if (!r.ok)
        return null;
    const rows = await r.json();
    return rows.length ? { role: rows[0].role, displayName: rows[0].display_name } : null;
}