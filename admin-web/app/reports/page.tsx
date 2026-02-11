'use client';

import React, { useState } from 'react';
import { trpc } from '../../utils/trpc';
import { ShieldAlert, CheckCircle, XCircle, ExternalLink, User, MapPin, MessageSquare, Trash2, Ban } from 'lucide-react';

export default function ReportsPage() {
    const [filter, setFilter] = useState<'pending' | 'resolved' | 'dismissed'>('pending');
    const reportsQuery = trpc.admin.getReports.useQuery({ status: filter });

    const resolveMutation = trpc.admin.resolveReport.useMutation({
        onSuccess: () => reportsQuery.refetch(),
        onError: (err) => alert("Error: " + err.message)
    });

    const handleAction = async (reportId: number, status: 'resolved' | 'dismissed', action: 'none' | 'ban_user' | 'delete_content' | 'delete_spot' = 'none') => {
        if (action !== 'none' && !confirm(`Are you sure you want to ${action.replace('_', ' ')}?`)) return;

        await resolveMutation.mutateAsync({
            id: reportId,
            status,
            action
        });
    };

    const getTargetIcon = (type: string) => {
        switch (type) {
            case 'user': return <User size={16} className="text-fuchsia-500" />;
            case 'spot': return <MapPin size={16} className="text-cyan-500" />;
            case 'comment': return <MessageSquare size={16} className="text-emerald-500" />;
            default: return <ShieldAlert size={16} />;
        }
    };

    return (
        <div className="container mx-auto max-w-6xl">
            <header className="mb-12">
                <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
                    <ShieldAlert className="text-rose-500" size={32} />
                    Moderation Queue
                </h2>
                <p className="text-slate-500">Review and act on user reports.</p>
            </header>

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-8 bg-slate-900 p-1 rounded-xl w-fit border border-slate-800">
                {(['pending', 'resolved', 'dismissed'] as const).map((s) => (
                    <button
                        key={s}
                        onClick={() => setFilter(s)}
                        className={`px-6 py-2 rounded-lg text-sm font-bold capitalize transition-all ${filter === s
                                ? 'bg-slate-800 text-white shadow-lg'
                                : 'text-slate-500 hover:text-slate-300'
                            }`}
                    >
                        {s}
                    </button>
                ))}
            </div>

            <div className="grid gap-6">
                {reportsQuery.isLoading && <div className="text-slate-500">Loading reports...</div>}
                {reportsQuery.data?.length === 0 && (
                    <div className="p-12 text-center border border-slate-800 rounded-3xl bg-slate-900/50 text-slate-500 italic">
                        No {filter} reports found. Good job! 🎉
                    </div>
                )}

                {reportsQuery.data?.map((report) => (
                    <div key={report.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row gap-6 hover:border-slate-700 transition-colors">

                        {/* Report Meta */}
                        <div className="md:w-64 flex-shrink-0 flex flex-col gap-4 border-r border-slate-800 pr-6">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase">
                                {getTargetIcon(report.targetType)}
                                Report #{report.id}
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 mb-1">Reporter</div>
                                <div className="font-bold text-slate-300">{report.reporter?.name || 'Unknown'}</div>
                                <div className="text-xs text-slate-600 font-mono">ID: {report.reporterId}</div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 mb-1">Reason</div>
                                <div className="text-rose-400 font-bold text-sm bg-rose-500/5 p-2 rounded-lg border border-rose-500/10">
                                    "{report.reason}"
                                </div>
                            </div>
                            <div className="text-[10px] text-slate-600 font-mono mt-auto">
                                {new Date(report.createdAt as string).toLocaleString()}
                            </div>
                        </div>

                        {/* Target Content */}
                        <div className="flex-1">
                            <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 text-cyan-500">Target Content ({report.targetType})</h4>

                            <div className="bg-black/20 rounded-xl p-4 border border-slate-800 mb-6">
                                {report.targetDetails ? (
                                    <>
                                        {report.targetType === 'user' && (
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center font-bold text-xl text-slate-500">
                                                    {(report.targetDetails as any).name?.[0]}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-lg">{(report.targetDetails as any).name}</div>
                                                    <div className="text-slate-500 text-sm">{(report.targetDetails as any).bio || 'No bio'}</div>
                                                </div>
                                            </div>
                                        )}
                                        {report.targetType === 'spot' && (
                                            <div>
                                                <div className="font-bold text-lg mb-1">{(report.targetDetails as any).name}</div>
                                                <div className="text-slate-400 text-sm mb-2">{(report.targetDetails as any).description}</div>
                                                <div className="flex gap-2 text-xs">
                                                    <span className="bg-slate-800 px-2 py-1 rounded text-slate-400">{(report.targetDetails as any).category}</span>
                                                    <span className="text-cyan-500 font-mono">{(report.targetDetails as any).totalPoints} pts</span>
                                                </div>
                                            </div>
                                        )}
                                        {report.targetType === 'comment' && (
                                            <div>
                                                <div className="text-slate-300 text-lg font-serif italic mb-2">"{(report.targetDetails as any).content}"</div>
                                                <div className="text-xs text-slate-500">
                                                    by <span className="text-slate-400 font-bold">@{(report.targetDetails as any).user?.name || 'Unknown'}</span>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="text-slate-500 italic">Content not found (might have been deleted)</div>
                                )}
                            </div>

                            {/* Actions */}
                            {filter === 'pending' && (
                                <div className="flex gap-3 justify-end">
                                    <button
                                        onClick={() => handleAction(report.id, 'dismissed')}
                                        className="px-4 py-2 rounded-lg font-bold text-xs uppercase text-slate-400 hover:bg-slate-800 transition-colors"
                                    >
                                        Dismiss
                                    </button>

                                    <div className="h-8 w-px bg-slate-800 mx-2"></div>

                                    {report.targetType === 'comment' && (
                                        <button
                                            onClick={() => handleAction(report.id, 'resolved', 'delete_content')}
                                            className="px-4 py-2 rounded-lg font-bold text-xs uppercase bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border border-rose-500/20 flex items-center gap-2"
                                        >
                                            <Trash2 size={14} /> Delete Filter
                                        </button>
                                    )}

                                    {report.targetType === 'spot' && (
                                        <button
                                            onClick={() => handleAction(report.id, 'resolved', 'delete_spot')}
                                            className="px-4 py-2 rounded-lg font-bold text-xs uppercase bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border border-rose-500/20 flex items-center gap-2"
                                        >
                                            <Trash2 size={14} /> Delete Spot
                                        </button>
                                    )}

                                    <button
                                        onClick={() => handleAction(report.id, 'resolved', 'ban_user')}
                                        className="px-4 py-2 rounded-lg font-bold text-xs uppercase bg-slate-800 text-rose-400 hover:bg-slate-700 border border-transparent hover:border-rose-500/30 flex items-center gap-2"
                                    >
                                        <Ban size={14} /> Ban User
                                    </button>

                                    <button
                                        onClick={() => handleAction(report.id, 'resolved', 'none')}
                                        className="px-4 py-2 rounded-lg font-bold text-xs uppercase bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                                    >
                                        <CheckCircle size={14} /> Resolve (No Action)
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
