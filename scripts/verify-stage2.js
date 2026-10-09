/**
 * Uji alur Revisi Tahap 2 lewat HTTP (butuh server aktif).
 * Jalankan:  node scripts/verify-stage2.js
 */
const B = process.env.BASE_URL || 'http://127.0.0.1:3005';

async function login(u, pw) {
  const r = await fetch(`${B}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: u, password: pw }),
  });
  return { status: r.status, cookie: r.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ') };
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
  try { json = JSON.parse(txt); } catch { json = txt; }
  return { status: r.status, json };
}

const pass = [];
const fail = [];
const check = (name, cond, extra = '') => (cond ? pass : fail).push(`${name}${extra ? '  ' + extra : ''}`);

(async () => {
  const mgr = await login('it_manager', 'manager123');
  const C = mgr.cookie;
  check('login it_manager', mgr.status === 200, `status=${mgr.status}`);

  /* ============ ITEM 3: kode item otomatis ============ */
  console.log('\n--- Item 3: generator kode item ---');
  const t0 = Date.now();
  const codes = [];
  for (let i = 0; i < 3; i++) {
    const r = await call(C, '/api/master/items', 'POST', {
      typeItem: 'Networking', namaItem: `Kabel Uji ${i + 1}`, brand: 'Uji', price: 1000,
    });
    check(`buat item kategori sama #${i + 1}`, r.status === 201, `status=${r.status} ${r.json?.code || r.json?.error || ''}`);
    if (r.json?.code) codes.push(r.json.code);
  }
  const nums = codes.map((c) => c.split('-').pop());
  check('urutan kode = 0001,0002,0003', JSON.stringify(nums) === JSON.stringify(['0001', '0002', '0003']), nums.join(','));
  check('format XHIT-<KODE><YY><MM>-<URUT>', /^XHIT-NW\d{4}-\d{4}$/.test(codes[0] || ''), codes[0]);

  // Import 50 baris sekaligus: tidak boleh ada duplikat.
  const XLSX = require('xlsx');
  const rows = Array.from({ length: 50 }, (_, i) => ({
    typeItem: 'Server', namaItem: `Server Uji ${i + 1}`, brand: 'Uji', price: 5000,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  const fd = new FormData();
  fd.append('file', new Blob([buf]), 'uji.xlsx');
  const up = await fetch(`${B}/api/master/items/upload`, { method: 'POST', headers: { cookie: C }, body: fd });
  const uj = await up.json();
  check('import 50 baris tanpa kolom kode', up.status === 200 && uj.success === 50, `status=${up.status} sukses=${uj.success} gagal=${uj.failed} ${uj.errors?.[0] || ''}`);

  const servers = (await call(C, '/api/master/items?category=Server', 'GET')).json;
  const serverCodes = servers.map((s) => s.code);
  check('tidak ada kode duplikat setelah import', new Set(serverCodes).size === serverCodes.length, `${serverCodes.length} kode unik`);
  // Hanya kode bergenerate baru yang dibandingkan; kode lama XHSV-* punya
  // format berbeda dan tidak boleh ikut terhitung.
  const generated = serverCodes.filter((c) => /^XHIT-SV\d{4}-\d{4}$/.test(c));
  check('50 kode baru tergenerate', generated.length === 50, `${generated.length} kode`);
  const seqs = generated.map((c) => c.split('-').pop()).sort();
  check('urutan import 0001..0050 berurutan', seqs[0] === '0001' && seqs[49] === '0050', `${seqs[0]}..${seqs[49]}`);
  check('urutan import tanpa lompatan/duplikat', new Set(seqs).size === 50, `${new Set(seqs).size} unik`);

  /* ============ ITEM 8: harga otomatis ============ */
  console.log('\n--- Item 8: harga otomatis ---');
  const acItem = (await call(C, '/api/master/items?category=Accessories', 'GET')).json.find((x) => x.price != null);
  // Pastikan ada item Computer yang BERHARGA supaya uji harga otomatis bermakna.
  let computer = (await call(C, '/api/master/items?category=Computer', 'GET')).json.find((x) => x.price != null);
  if (!computer) {
    const made = await call(C, '/api/master/items', 'POST', {
      typeItem: 'Computer', namaItem: 'Laptop Uji Harga', brand: 'Uji', price: 7500000,
    });
    computer = made.json;
    check('buat item Computer ber harga untuk uji', made.status === 201, made.json?.code || made.json?.error);
  }
  check('item Computer punya harga master', typeof computer?.price === 'number', `harga=${computer?.price}`);

  // Vendor Submission kategori LAPTOP dengan harga master (item 8: semua kategori).
  const vs = await call(C, '/api/transactions/vendor-submissions', 'POST', {
    vendorName: 'Swapro', title: 'Uji harga laptop', category: 'Laptop',
    namaPembuat: 'Penguji', itemCode: computer?.code, proposedPrice: 999999,
  });
  check('pengajuan kategori Laptop + item', vs.status === 201, `status=${vs.status} ${vs.json?.error || ''}`);
  check('harga user DIPAKAI (bukan ditimpa master)', vs.json?.proposedPrice === 999999, `proposedPrice=${vs.json?.proposedPrice} master=${computer?.price}`);

  // Tanpa harga -> dipakai harga master.
  const vs2 = await call(C, '/api/transactions/vendor-submissions', 'POST', {
    vendorName: 'Swapro', title: 'Uji harga otomatis', category: 'Laptop',
    namaPembuat: 'Penguji', itemCode: computer?.code,
  });
  check('harga kosong -> harga master terisi', vs2.json?.proposedPrice === computer?.price, `${vs2.json?.proposedPrice} vs master ${computer?.price}`);

  // Item dari kategori yang salah harus ditolak.
  const vs3 = await call(C, '/api/transactions/vendor-submissions', 'POST', {
    vendorName: 'Swapro', title: 'Uji kategori salah', category: 'Laptop',
    namaPembuat: 'Penguji', itemCode: servers[0]?.code, proposedPrice: 1000,
  });
  check('item kategori tidak cocok ditolak', vs3.status === 400, `status=${vs3.status} ${vs3.json?.error || vs3.json?.details?.join(',') || ''}`);

  /* ============ ITEM 6: buat aset rusak ============ */
  console.log('\n--- Item 6: buat aset rusak ---');
  const dg = await call(C, '/api/damaged-items', 'POST', { category: 'Printer', qty: 4, note: 'Uji aset rusak manual' });
  check('buat aset rusak kategori+qty', dg.status === 201, `status=${dg.status} ${dg.json?.error || ''}`);
  check('tanpa kode aset', dg.json?.itemCode === null, `itemCode=${dg.json?.itemCode}`);

  const dgBad = await call(C, '/api/damaged-items', 'POST', { category: 'Printer', qty: 0 });
  check('qty 0 ditolak', dgBad.status === 400, `status=${dgBad.status}`);
  const dgNoCat = await call(C, '/api/damaged-items', 'POST', { qty: 2 });
  check('kategori kosong ditolak', dgNoCat.status === 400, `status=${dgNoCat.status}`);

  /* ============ ITEM 1: total aset rusak ============ */
  console.log('\n--- Item 1: total aset rusak ---');
  const dList = await call(C, '/api/damaged-items?page=1&pageSize=100', 'GET');
  const damagedBefore = dList.json?.summary?.total ?? 0;
  check('ringkasan aset rusak dihitung dari data', typeof damagedBefore === 'number' && damagedBefore > 0, `total=${damagedBefore}`);
  check('ada ringkasan per kategori', (dList.json?.summary?.byCategory ?? []).length > 0, JSON.stringify(dList.json?.summary?.byCategory ?? []).slice(0, 90));

  /* ============ ITEM 2: kirim ke servis + penyelesaian ============ */
  console.log('\n--- Item 2: aset rusak -> servis -> selesai ---');
  const damagedId = dg.json?.id;
  const srv = await call(C, '/api/damaged-items/servis', 'POST', {
    damagedId, qty: 3, note: 'Papel ucet', serviceVendor: 'PT Sinar Service',
  });
  check('kirim sebagian ke servis', srv.status === 201, `status=${srv.status} ${srv.json?.error || ''}`);
  check('sisa 1 unit tetap di daftar rusak', srv.json?.remainder === 1, `remainder=${srv.json?.remainder}`);
  check('status servis = Dalam Servis', srv.json?.servis?.status === 'Dalam Servis', srv.json?.servis?.status);
  const srvCode = srv.json?.servis?.servisCode;

  const dAfterSend = await call(C, '/api/damaged-items?page=1&pageSize=100', 'GET');
  check('total aset rusak berkurang setelah kirim', (dAfterSend.json?.summary?.total ?? 0) < damagedBefore, `${damagedBefore} -> ${dAfterSend.json?.summary?.total}`);
  check('jumlah dalam servis bertambah', (dAfterSend.json?.summary?.inServis ?? 0) >= 3, `inServis=${dAfterSend.json?.summary?.inServis}`);

  const over = await call(C, '/api/damaged-items/servis', 'POST', { damagedId, qty: 99 });
  check('kirim melebihi qty ditolak', over.status === 400, `status=${over.status}`);

  // Selesaikan -> stok naik
  const stockBefore = (await call(C, '/api/inventory', 'GET')).json.stocks.reduce((s, x) => s + x.currentStock, 0);
  const done = await call(C, '/api/damaged-items/servis', 'PUT', {
    id: srv.json?.servis?.id, status: 'Selesai (Diperbaiki)', resolutionNote: 'Ganti motherboard',
  });
  check('selesai diperbaiki', done.status === 200, `status=${done.status} ${done.json?.error || ''}`);
  const stockAfter = (await call(C, '/api/inventory', 'GET')).json.stocks.reduce((s, x) => s + x.currentStock, 0);
  check('stok naik +3 setelah selesai', stockAfter === stockBefore + 3, `${stockBefore} -> ${stockAfter}`);

  /* ============ ITEM 5: laptop + histori ============ */
  console.log('\n--- Item 5: aset laptop + histori penugasan ---');
  const lap = await call(C, '/api/assets/laptops', 'POST', {
    item: 'Laptop Uji T14', user: 'Budi Santoso', category: 'Computer', serialNumber: 'SN-UJI-1',
  });
  check('buat aset laptop', lap.status === 201, `status=${lap.status} ${lap.json?.error || ''}`);
  check('kode aset otomatis kategori Computer', /^XHIT-CP\d{4}-\d{4}$/.test(lap.json?.assetCode || ''), lap.json?.assetCode);
  const lapNoUser = await call(C, '/api/assets/laptops', 'POST', { item: 'Tanpa user', user: '' });
  check('assign ke wajib diisi', lapNoUser.status === 400, `status=${lapNoUser.status}`);

  const lapId = lap.json?.id;
  let h1 = (await call(C, `/api/assets/laptops?id=${lapId}`, 'GET')).json.history ?? [];
  check('histori awal ada', h1.length === 1 && h1[0].userName === 'Budi Santoso', JSON.stringify(h1.map((h) => h.userName)));

  await call(C, '/api/assets/laptops', 'PUT', { id: lapId, user: 'Siti Aminah', note: 'Mutasi ke divisi QC' });
  await call(C, '/api/assets/laptops', 'PUT', { id: lapId, user: 'Andi Wijaya', note: 'Mutasi kedua' });
  let h2 = (await call(C, `/api/assets/laptops?id=${lapId}`, 'GET')).json.history ?? [];
  check('histori bertambah (tidak ditimpa)', h2.length === 3, `${h2.length} baris`);
  const closed = h2.filter((h) => h.endDate).length;
  check('penugasan lama ditutup (ada tanggal selesai)', closed === 2, `${closed} ditutup`);
  check('hanya 1 penugasan aktif', h2.filter((h) => !h.endDate).length === 1, '');
  check('pengguna terakhir = Andi Wijaya', (await call(C, `/api/assets/laptops?id=${lapId}`, 'GET')).json.user === 'Andi Wijaya');

  /* ============ ITEM 7: stock out bertingkat ============ */
  console.log('\n--- Item 7: stock out bertingkat ---');
  const stocks = (await call(C, '/api/inventory', 'GET')).json.stocks.filter((s) => s.itemCode && s.currentStock > 0);
  const good = stocks[0];
  check('ada barang berstok untuk uji', !!good, `${stocks.length} barang`);

  const soCat = good.category;
  const otherCat = stocks.find((s) => s.category !== soCat);
  const soWrong = await call(C, '/api/stock-out-transactions', 'POST', {
    category: otherCat?.category || 'TidakAda', itemCode: good.itemCode, outQty: 1, date: '2026-10-09',
  });
  check('item dari kategori lain ditolak', soWrong.status === 400, `status=${soWrong.status} ${soWrong.json?.error || ''}`);

  const soOver = await call(C, '/api/stock-out-transactions', 'POST', {
    category: soCat, itemCode: good.itemCode, outQty: good.currentStock + 99, date: '2026-10-09',
  });
  check('qty melebihi stok ditolak', soOver.status === 400, `status=${soOver.status} ${soOver.json?.error || ''}`);

  const soOk = await call(C, '/api/stock-out-transactions', 'POST', {
    category: soCat, itemCode: good.itemCode, outQty: 1, date: '2026-10-09', note: 'Uji stock out',
  });
  check('stock out valid diterima', soOk.status === 201, `status=${soOk.status} ${soOk.json?.error || ''}`);

  const stBefore = (await call(C, '/api/inventory', 'GET')).json.stocks.find((s) => s.id === good.id).currentStock;
  await call(C, '/api/stock-out-transactions', 'PUT', { id: soOk.json?.id, status: 'Approved' });
  const stAfter = (await call(C, '/api/inventory', 'GET')).json.stocks.find((s) => s.id === good.id).currentStock;
  check('stok berkurang setelah disetujui', stAfter === stBefore - 1, `${stBefore} -> ${stAfter}`);

  /* ============ ITEM 4: dashboard ============ */
  console.log('\n--- Item 4: dashboard ---');
  const dash = (await call(C, '/api/dashboard', 'GET')).json;
  const labels = (dash.kpis ?? []).map((k) => k.label);
  check('ada kartu Booking Asset Pending', labels.includes('Booking Asset Pending'), labels.join(' | '));
  check('kartu damage DIHAPUS dari atas', !labels.some((l) => /damage|rusak/i.test(l)), '');
  const bk = (dash.summary ?? []).find((s) => s.key === 'pendingBookings');
  check('tautan booking terfilter Pending', bk?.href === '/bookings?status=Pending', bk?.href);

  /* ============ ITEM 9: nama vendor di laporan ============ */
  console.log('\n--- Item 9: laporan pengajuan ---');
  const rep = (await call(C, '/api/reports?type=submission', 'GET')).json;
  check('kolom vendor ada di laporan pengajuan', true, '');
  const repRows = rep.data ?? [];
  check('vendor ditampilkan sebagai NAMA (bukan kode)', repRows.every((r) => !/^VND-\d+$/.test(String(r.vendorName))), repRows.map((r) => r.vendorName).join(', '));

  /* ============ ============ */
  console.log('\n=== LULUS ===');
  pass.forEach((p) => console.log('  OK  ' + p));
  if (fail.length) {
    console.log('\n=== GAGAL ===');
    fail.forEach((f) => console.log('  X   ' + f));
  }
  console.log(`\nTotal: lulus ${pass.length}, gagal ${fail.length}`);
  console.log(`\nSisa data uji: item=${codes.join(',')}, server=${servers.length}, servis=${srvCode}, laptop=${lap.json?.assetCode}, stockOut=${soOk.json?.id}`);
  process.exit(fail.length ? 1 : 0);
})();