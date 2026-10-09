const B = 'http://127.0.0.1:3005';

async function login(u, pw) {
  const r = await fetch(`${B}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: u, password: pw }),
  });
  return {
    status: r.status,
    cookie: r.headers.getSetCookie().map((c) => c.split(';')[0]).join('; '),
  };
}

async function call(cookie, path, method, body) {
  const opt = { method, headers: { cookie } };
  if (body) {
    opt.headers['Content-Type'] = 'application/json';
    opt.body = JSON.stringify(body);
  }
  const r = await fetch(B + path, opt);
  const txt = await r.text();
  let json;
  try { json = JSON.parse(txt); } catch { json = txt.slice(0, 120); }
  return { status: r.status, json };
}

(async () => {
  const pass = [];
  const fail = [];
  const check = (name, cond, extra = '') => {
    (cond ? pass : fail).push(`${name}${extra ? '  ' + extra : ''}`);
  };

  // ---- login it_spv (uji izin) & it_manager (Fixture + cleanup) ----
  const it = await login('it_spv', 'spv123');
  check('login it_spv', it.status === 200, `status=${it.status}`);
  const mgr = await login('it_manager', 'manager123');
  check('login it_manager', mgr.status === 200, `status=${mgr.status}`);

  // ---- Stock out: item 5 (IT-SPV boleh buat) ----
  // Item 7 (tahap 2): kategori + item wajib diisi, nama barang diambil server.
  const stockForSo = (await call(mgr.cookie, '/api/inventory', 'GET')).json.stocks.find(
    (s) => s.itemCode && s.currentStock > 0,
  );
  const so = await call(it.cookie, '/api/stock-out-transactions', 'POST', {
    date: '2026-10-09',
    category: stockForSo?.category ?? 'Headset',
    itemCode: stockForSo?.itemCode ?? null,
    outQty: 1,
  });
  check('IT-SPV buat stock out', so.status === 201, `status=${so.status} ${JSON.stringify(so.json).slice(0, 120)}`);
  check('requestedBy terisi otomatis', typeof so.json?.requestedBy === 'string' && so.json.requestedBy.length > 0, `requestedBy=${JSON.stringify(so.json?.requestedBy)}`);

  if (so.json?.id) {
    const noDel = await call(it.cookie, `/api/stock-out-transactions?id=${so.json.id}`, 'DELETE');
    check('IT-SPV tidak boleh hapus stock out', noDel.status === 403, `status=${noDel.status}`);
  }

  if (so.json?.id) {
    // IT-SPV memang tidak punya hak delete (itu yang diuji di bawah),
    // jadi cleanup memakai it_manager.
    const del = await call(mgr.cookie, `/api/stock-out-transactions?id=${so.json.id}`, 'DELETE');
    check('hapus data uji stock out', del.status === 200, `status=${del.status}`);
  }

  // ---- Booking: endDate/location wajib di DB ----
  const bkNoEnd = await call(it.cookie, '/api/bookings', 'POST', {
    borrowerName: 'Uji', startDate: '2026-10-10', location: 'Ruang A',
  });
  check('booking tanpa endDate tidak 500', bkNoEnd.status !== 500, `status=${bkNoEnd.status}`);
  check('booking endDate default ke startDate', bkNoEnd.json?.endDate === '2026-10-10', `endDate=${bkNoEnd.json?.endDate}`);

  const bkNoLoc = await call(it.cookie, '/api/bookings', 'POST', {
    borrowerName: 'Uji', startDate: '2026-10-10', endDate: '2026-10-10',
  });
  check('booking tanpa lokasi ditolak 400', bkNoLoc.status === 400, `status=${bkNoLoc.status} ${bkNoLoc.json?.error || ''}`);

  if (bkNoEnd.json?.id) {
    const del = await call(mgr.cookie, `/api/bookings?id=${bkNoEnd.json.id}`, 'DELETE');
    check('hapus booking uji', del.status === 200, `status=${del.status}`);
  }

  // ---- Item 9: return Good menambah stok ----
  const before = (await call(it.cookie, '/api/inventory', 'GET')).json;
  const code = 'HEADSET-UMUM';
  const b4 = (before.stocks || []).find((s) => s.itemCode === code)?.currentStock ?? 0;

  const cr = await call(it.cookie, '/api/transactions/items', 'POST', {
    date: '2026-10-09', employeeCategory: 'New Employee',
    nik: '999888777', name: 'Uji Return Stok', condition: 'New Use',
    vendor: 'Swapro', project: 'GoTo', deposit: 100000, note: 'uji',
  });
  check('buat headset tanpa itemCode', cr.status === 201, `status=${cr.status}`);

  await call(it.cookie, '/api/transactions/items', 'PUT', { id: cr.json?.id, status: 'Used' });
  const ret = await call(it.cookie, '/api/transactions/items', 'PUT', {
    id: cr.json?.id, status: 'Return', returnCondition: 'Good', returnNote: 'uji stok',
  });
  check('return Good sukses', ret.status === 200 && ret.json?.status === 'Good', `status=${ret.status} status=${ret.json?.status}`);

  const after = (await call(it.cookie, '/api/inventory', 'GET')).json;
  const aft = (after.stocks || []).find((s) => s.itemCode === code)?.currentStock ?? 0;
  check('stok bertambah +1 setelah return Good', aft === b4 + 1, `${b4} -> ${aft}`);

  // ---- Item 6: vendor dropdown tersedia ----
  const vendors = (await call(it.cookie, '/api/master/vendors?page=1&pageSize=200', 'GET')).json;
  const vlist = Array.isArray(vendors) ? vendors : vendors.data || [];
  check('daftar vendor terbaca untuk dropdown', vlist.length > 0, `${vlist.length} vendor`);

  // ---- Item 8: KPI dashboard IT ----
  const dash = (await call(it.cookie, '/api/dashboard', 'GET')).json;
  const labels = (dash.kpis || []).map((k) => k.label);
  check('dashboard ada Booking Asset Pending', labels.includes('Booking Asset Pending'), labels.join(' | '));
  check('dashboard ada Pengajuan Headset Pending', labels.includes('Pengajuan Headset Pending'));
  check('dashboard tidak ada Nilai Pengadaan', !labels.includes('Nilai Pengadaan'));

  // ---- Zarui role lain tetap ditolak ----
  for (const [u, pw] of [['qc_staff', 'staff123'], ['hr_staff', 'staff123']]) {
    const s = await login(u, pw);
    const p = await call(s.cookie, '/api/stock-out-transactions', 'POST', { itemName: 'x', outQty: 1 });
    check(`${u} tidak boleh buat stock out`, p.status === 403, `status=${p.status}`);
  }

  // ---- Bersihkan data uji ----
  await call(mgr.cookie, '/api/transactions/items/' + cr.json?.id, 'DELETE');

  console.log('=== LULUS ===');
  pass.forEach((p) => console.log('  OK  ' + p));
  if (fail.length) {
    console.log('=== GAGAL ===');
    fail.forEach((f) => console.log('  X   ' + f));
  }
  console.log(`\nTotal: lulus ${pass.length}, gagal ${fail.length}`);
  process.exit(fail.length ? 1 : 0);
})();