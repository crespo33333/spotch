'use client';

import React, { useState } from 'react';
import { trpc } from '../../utils/trpc';
import { MapPin, Trash2, ExternalLink, Search } from 'lucide-react';

export default function SpotsPage() {
    const [search, setSearch] = useState('');
    const spotsList = trpc.admin.getAllSpots.useQuery({ search: search || undefined });
    const deleteSpot = trpc.admin.deleteSpot.useMutation({
        onSuccess: () => spotsList.refetch(),
        onError: (err) => alert("Failed to delete: " + err.message)
    });

    return (
        <>
            <header className="mb-12 flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-black tracking-tight">Spot Management</h2>
                    <p className="text-slate-500">Monitor and moderate user-created spots.</p>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <input
                        placeholder="Search Spots..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="bg-slate-900 border border-slate-800 rounded-full pl-10 pr-6 py-2 w-64 text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                    />
                </div>
            </header>

            <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-800 flex justify-between items-center">
                    <h3 className="font-black uppercase tracking-widest text-sm text-slate-500">Active Spots</h3>
                    <span className="text-xs text-slate-500">{spotsList.data?.length ?? 0} spots</span>
                </div>
                <table className="w-full text-left">
                    <thead>
                        <tr className="text-slate-500 text-xs border-b border-slate-800">
                            <th className="px-8 py-4">SPOT NAME</th>
                            <th className="px-8 py-4">CATEGORY</th>
                            <th className="px-8 py-4">CREATED BY</th>
                            <th className="px-8 py-4">POINTS</th>
                            <th className="px-8 py-4 text-right">ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {spotsList.data?.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-8 py-8 text-center text-slate-500 italic">No spots found.</td>
                            </tr>
                        ) : spotsList.data?.map(spot => (
                            <tr key={spot.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors group">
                                <td className="px-8 py-4 font-bold max-w-xs truncate">
                                    <div className="flex items-center gap-2">
                                        <MapPin size={16} className="text-cyan-500" />
                                        {spot.name}
                                    </div>
                                </td>
                                <td className="px-8 py-4 text-slate-400 text-sm">
                                    <span className="bg-slate-800 px-2 py-1 rounded text-xs border border-slate-700">{spot.category}</span>
                                </td>
                                <td className="px-8 py-4 text-sm font-bold text-slate-300">{spot.spotter?.name || 'Unknown'}</td>
                                <td className="px-8 py-4 font-mono text-cyan-500 font-bold">{spot.totalPoints.toLocaleString()} P</td>
                                <td className="px-8 py-4 text-right">
                                    <button
                                        onClick={() => {
                                            if (confirm(`Delete spot "${spot.name}"? This cannot be undone.`)) {
                                                deleteSpot.mutate({ spotId: spot.id });
                                            }
                                        }}
                                        title="Delete Spot"
                                        className="p-2 bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-500 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 size={16} />
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
