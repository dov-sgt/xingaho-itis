'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { Truck, PackageCheck, ShieldAlert } from 'lucide-react';

export default function DeliveryOrdersPage() {
  const { can, role, canAccess, user, apiFetch } = useAuth();
  const { toast } = useToast();
  const [dos, setDos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [receiveModal, setReceiveModal] = useState<any>(null);
  const [receiveQty, setReceiveQty] = useState('');

  const fetchDOs = () => {
    setLoading(true);
    apiFetch('/api/transactions/delivery-orders')
      .then((res) => { if (!res.ok) throw new Error('Gagal'); return res.json(); })
      .then((data) => { setDos(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => { toast('error', 'Gagal memuat DO'); setLoading(false); });
  };

  useEffect(() => { fetchDOs(); }, []);

  const handleReceive = async () => {
    setSaving(true);
    try {
      const res = await apiFetch('/api/transactions/delivery-orders', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: receiveModal.id, qtyReceived: parseInt(receiveQty), status: parseInt(receiveQty) >= receiveModal.qtyOrdered ? 'Received' : 'Partial', recipient: user?.name }),
      });
      if (res.ok) {
        toast('success', parseInt(receiveQty) >= receiveModal.qtyOrdered ? 'DO Received - Stock bertambah' : 'DO Partial - Sebagian diterima');
        setReceiveModal(null); fetchDOs();
      } else {
        const result = await res.json();
        toast('error', result.error || 'Gagal');
      }
    } catch { toast('error', 'Gagal'); }
    setSaving(false);
  };

  if (!canAccess('delivery_order')) {
    return (<div className="p-8 bg-white rounded-2xl border border-slate-200 text-center"><ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" /><h3 className="text-base font-bold text-slate-800">Akses Ditolak</h3><p className="text-xs text-slate-500 mt-1">Role {role} tidak punya akses.</p></div>);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Truck className="w-5 h-5 text-indigo-600" /><span>Delivery Order</span></h1>
        <p className="text-xs text-slate-500 mt-0.5">Data otomatis dari Purchase Order yang sudah Approve. Hanya bisa Receive / Partial.</p>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead><tr className="bg-slate-50 border-b text-slate-400 uppercase text-[10px]"><th className="py-3 px-4">No DO</th><th className="py-3 px-4">Tgl</th><th className="py-3 px-4">Vendor</th><th className="py-3 px-4">Item</th><th className="py-3 px-4 text-center">Order Qty</th><th className="py-3 px-4 text-center">Received</th><th className="py-3 px-4 text-center">Status</th><th className="py-3 px-4 text-center">Aksi</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={8} className="py-8 text-center text-slate-400">Memuat...</td></tr> :
                dos.length === 0 ? <tr><td colSpan={8} className="py-8 text-center text-slate-400">Belum ada DO. Buat PR dulu.</td></tr> :
                  dos.map((d) => {
                    const sc: Record<string, string> = { Received: 'bg-emerald-50 text-emerald-700 border-emerald-200', Partial: 'bg-amber-50 text-amber-700 border-amber-200', Pending: 'bg-slate-100 text-slate-600' };
                    return (
                      <tr key={d.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 font-mono font-bold text-indigo-600">{d.doNumber}</td>
                        <td className="py-3 px-4 text-slate-500">{new Date(d.date).toLocaleDateString('id-ID')}</td>
                        <td className="py-3 px-4 font-bold">{d.vendorName}</td>
                        <td className="py-3 px-4">{d.itemName}</td>
                        <td className="py-3 px-4 text-center font-bold">{d.qtyOrdered}</td>
                        <td className="py-3 px-4 text-center">{d.qtyReceived}</td>
                        <td className="py-3 px-4 text-center"><span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${sc[d.status] || 'bg-slate-100'}`}>{d.status}</span></td>
                        <td className="py-3 px-4 text-center">
                          {d.status !== 'Received' && can('delivery_order', 'update') && (
                            <button onClick={() => { setReceiveModal(d); setReceiveQty(String(d.qtyOrdered)); }} className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded text-[11px] border border-emerald-200">Receive</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receive Modal */}
      {receiveModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <h3 className="text-sm font-bold mb-4">Receive DO {receiveModal.doNumber}</h3>
            <div className="p-3 bg-slate-50 rounded-xl mb-4 text-xs">
              <div className="font-bold">{receiveModal.itemName}</div>
              <div className="text-slate-500">Order: {receiveModal.qtyOrdered} | Already received: {receiveModal.qtyReceived}</div>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Qty Diterima</label>
                <input type="number" min="1" max={receiveModal.qtyOrdered} value={receiveQty} onChange={(e) => setReceiveQty(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border rounded-xl" />
                {parseInt(receiveQty) < receiveModal.qtyOrdered && <p className="text-amber-600 text-[11px] mt-1">Kurang dari order → status Partial</p>}
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t">
                <button onClick={() => setReceiveModal(null)} className="px-4 py-2 border rounded-xl">Batal</button>
                <button onClick={handleReceive} disabled={saving} className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-semibold disabled:opacity-50">{saving ? 'Memproses...' : 'Confirm Receive'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
