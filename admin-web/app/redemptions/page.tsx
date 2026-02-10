'use client';

import React from 'react';
import { trpc } from '../../utils/trpc';
import { Gift, CheckCircle, XCircle, Clock } from 'lucide-react';

export default function RedemptionsPage() {
    const redemptionsList = trpc.admin.getAllRedemptions.useQuery();
    const updateStatus = trpc.admin.updateRedemptionStatus.useMutation({
        onSuccess: () => redemptionsList.refetch(),
        onError: (err) => alert("Failed: " + err.message)
    });

    return (
        <>
            <header className="mb-12">
                <h2 className="text-3xl font-black tracking-tight">Redemptions</h2>
                <p className="text-slate-500">Track and fulfill point exchange requests.</p>
            </header>

            <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-800 flex justify-between items-center">
                    <h3 className="font-black uppercase tracking-widest text-sm text-slate-500">Request History</h3>
                    <span className="text-xs text-slate-500">{redemptionsList.data?.length ?? 0} requests</span>
                </div>
                <table className="w-full text-left">
                    <thead>
                        <tr className="text-slate-500 text-xs border-b border-slate-800">
                            <th className="px-8 py-4">USER</th>
                            <th className="px-8 py-4">REWARD</th>
                            <th className="px-8 py-4">COST</th>
                            <th className="px-8 py-4">DATE</th>
                            <th className="px-8 py-4">STATUS</th>
                            <th className="px-8 py-4 text-right">ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {redemptionsList.data?.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-8 py-8 text-center text-slate-500 italic">No redemptions found.</td>
                            </tr>
                        ) : redemptionsList.data?.map(req => (
                            <tr key={req.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                                <td className="px-8 py-4 font-bold text-slate-200">{req.user?.name}</td>
                                <td className="px-8 py-4">
                                    <div className="flex items-center gap-2">
                                        <Gift size={16} className="text-fuchsia-500" />
                                        <span className="text-sm font-bold">{req.coupon?.name}</span>
                                    </div>
                                    {req.code && <div className="text-[10px] text-slate-500 font-mono mt-1">Code: {req.code}</div>}
                                </td>
                                <td className="px-8 py-4 font-mono font-bold text-slate-400">{req.coupon?.cost?.toLocaleString()}</td>
                                <td className="px-8 py-4 text-xs text-slate-500">{new Date(req.redeemedAt as string).toLocaleDateString()}</td>
                                <td className="px-8 py-4">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1 w-fit ${req.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' :
                                            req.status === 'rejected' ? 'bg-rose-500/10 text-rose-500' :
                                                'bg-amber-500/10 text-amber-500'
                                        }`}>
                                        {req.status === 'completed' ? <CheckCircle size={10} /> :
                                            req.status === 'rejected' ? <XCircle size={10} /> :
                                                <Clock size={10} />}
                                        {req.status}
                                    </span>
                                </td>
                                <td className="px-8 py-4 text-right">
                                    {req.status === 'pending' && (
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => updateStatus.mutate({ id: req.id, status: 'completed' })}
                                                className="p-2 bg-emerald-600/20 text-emerald-500 hover:bg-emerald-600 hover:text-white rounded-lg transition-all"
                                                title="Complete"
                                            >
                                                <CheckCircle size={16} />
                                            </button>
                                            <button
                                                onClick={() => updateStatus.mutate({ id: req.id, status: 'rejected' })}
                                                className="p-2 bg-rose-600/20 text-rose-500 hover:bg-rose-600 hover:text-white rounded-lg transition-all"
                                                title="Reject"
                                            >
                                                <XCircle size={16} />
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}
