'use client';

import React, { useState } from 'react';
import { trpc } from '../../utils/trpc';
import { Gift, Plus, Power } from 'lucide-react';

export default function CouponsPage() {
    const couponsList = trpc.admin.getAllCoupons.useQuery();
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        cost: 1000,
        type: 'gift_card',
        stock: '' as string | number
    });

    const createCoupon = trpc.admin.createCoupon.useMutation({
        onSuccess: () => {
            couponsList.refetch();
            setShowForm(false);
            setFormData({ name: '', description: '', cost: 1000, type: 'gift_card', stock: '' });
        },
        onError: (err) => alert(err.message)
    });

    const toggleStatus = trpc.admin.toggleCouponStatus.useMutation({
        onSuccess: () => couponsList.refetch()
    });

    return (
        <>
            <header className="mb-12 flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-black tracking-tight">Coupons</h2>
                    <p className="text-slate-500">Manage redeemable rewards.</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2 bg-pink-600 hover:bg-pink-500 text-white font-bold py-3 px-6 rounded-xl transition-all"
                >
                    <Plus size={20} /> New Coupon
                </button>
            </header>

            {showForm && (
                <div className="mb-12 bg-slate-900 border border-slate-700 rounded-3xl p-8">
                    <h3 className="font-bold text-lg mb-6">Create New Coupon</h3>
                    <div className="grid grid-cols-2 gap-6 mb-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Name</label>
                            <input
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-pink-500 outline-none"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Cost (Points)</label>
                            <input
                                type="number"
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-pink-500 outline-none"
                                value={formData.cost}
                                onChange={e => setFormData({ ...formData, cost: parseInt(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Description</label>
                            <input
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-pink-500 outline-none"
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Stock (Leave empty for infinite)</label>
                            <input
                                type="number"
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-pink-500 outline-none"
                                value={formData.stock}
                                onChange={e => setFormData({ ...formData, stock: e.target.value })}
                                placeholder="Infinite"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Type</label>
                            <select
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-pink-500 outline-none"
                                value={formData.type}
                                onChange={e => setFormData({ ...formData, type: e.target.value })}
                            >
                                <option value="gift_card">Gift Card</option>
                                <option value="donation">Donation</option>
                                <option value="premium">Premium</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3">
                        <button onClick={() => setShowForm(false)} className="text-slate-400 font-bold px-6 py-3">Cancel</button>
                        <button
                            onClick={() => createCoupon.mutate({
                                ...formData,
                                cost: Number(formData.cost),
                                stock: formData.stock === '' ? null : Number(formData.stock)
                            })}
                            className="bg-white text-slate-900 font-black px-8 py-3 rounded-xl hover:bg-slate-200"
                        >
                            Create Coupon
                        </button>
                    </div>
                </div>
            )}

            <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-800 flex justify-between items-center">
                    <h3 className="font-black uppercase tracking-widest text-sm text-slate-500">Active Coupons</h3>
                    <span className="text-xs text-slate-500">{couponsList.data?.length ?? 0} items</span>
                </div>
                <table className="w-full text-left">
                    <thead>
                        <tr className="text-slate-500 text-xs border-b border-slate-800">
                            <th className="px-8 py-4">NAME</th>
                            <th className="px-8 py-4">TYPE</th>
                            <th className="px-8 py-4">COST</th>
                            <th className="px-8 py-4">STOCK</th>
                            <th className="px-8 py-4 text-right">STATUS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {couponsList.data?.map(coupon => (
                            <tr key={coupon.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                                <td className="px-8 py-4 font-bold max-w-xs truncate">
                                    <div className="flex items-center gap-2">
                                        <Gift size={16} className="text-pink-500" />
                                        {coupon.name}
                                    </div>
                                    <div className="text-xs text-slate-500 font-normal mt-1">{coupon.description}</div>
                                </td>
                                <td className="px-8 py-4">
                                    <span className="bg-slate-800 px-2 py-1 rounded text-xs border border-slate-700 font-mono">{coupon.type}</span>
                                </td>
                                <td className="px-8 py-4 font-mono font-bold text-slate-200">{coupon.cost.toLocaleString()} P</td>
                                <td className="px-8 py-4 font-mono text-slate-400">{coupon.stock === null ? '∞' : coupon.stock}</td>
                                <td className="px-8 py-4 text-right">
                                    <button
                                        onClick={() => toggleStatus.mutate({ id: coupon.id, isActive: !coupon.isActive })}
                                        className={`p-2 rounded-lg transition-all ${coupon.isActive ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' : 'bg-slate-800 text-slate-500 hover:text-slate-300'}`}
                                        title={coupon.isActive ? "Deactivate" : "Activate"}
                                    >
                                        <Power size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}
