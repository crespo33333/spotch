'use client';

import React, { useState } from 'react';
import { trpc } from '../../utils/trpc';
import { MapPin, Plus, Trash2, Trophy } from 'lucide-react';

export default function QuestsPage() {
    const questsList = trpc.admin.getAllQuests.useQuery();
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        rewardPoints: 500,
        conditionType: 'visit_count',
        conditionValue: 1
    });

    const createQuest = trpc.admin.createQuest.useMutation({
        onSuccess: () => {
            questsList.refetch();
            setShowForm(false);
            setFormData({ title: '', description: '', rewardPoints: 500, conditionType: 'visit_count', conditionValue: 1 });
        },
        onError: (err) => alert(err.message)
    });

    const deleteQuest = trpc.admin.deleteQuest.useMutation({
        onSuccess: () => questsList.refetch(),
        onError: (err) => alert("Failed to delete: " + err.message)
    });

    return (
        <>
            <header className="mb-12 flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-black tracking-tight">Quests</h2>
                    <p className="text-slate-500">Gamification challenges.</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-white font-bold py-3 px-6 rounded-xl transition-all"
                >
                    <Plus size={20} /> New Quest
                </button>
            </header>

            {showForm && (
                <div className="mb-12 bg-slate-900 border border-slate-700 rounded-3xl p-8">
                    <h3 className="font-bold text-lg mb-6">Create New Quest</h3>
                    <div className="grid grid-cols-2 gap-6 mb-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Title</label>
                            <input
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-amber-500 outline-none"
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Reward (Points)</label>
                            <input
                                type="number"
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-amber-500 outline-none"
                                value={formData.rewardPoints}
                                onChange={e => setFormData({ ...formData, rewardPoints: parseInt(e.target.value) })}
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Description</label>
                            <input
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-amber-500 outline-none"
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Condition Type</label>
                            <select
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-amber-500 outline-none"
                                value={formData.conditionType}
                                onChange={e => setFormData({ ...formData, conditionType: e.target.value })}
                            >
                                <option value="visit_count">Visit Count</option>
                                <option value="friend_count">Friend Count</option>
                                <option value="premium_status">Premium Status</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Condition Value</label>
                            <input
                                type="number"
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-amber-500 outline-none"
                                value={formData.conditionValue}
                                onChange={e => setFormData({ ...formData, conditionValue: parseInt(e.target.value) })}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3">
                        <button onClick={() => setShowForm(false)} className="text-slate-400 font-bold px-6 py-3">Cancel</button>
                        <button
                            onClick={() => createQuest.mutate({
                                ...formData,
                                conditionType: formData.conditionType as any
                            })}
                            className="bg-white text-slate-900 font-black px-8 py-3 rounded-xl hover:bg-slate-200"
                        >
                            Create Quest
                        </button>
                    </div>
                </div>
            )}

            <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-800 flex justify-between items-center">
                    <h3 className="font-black uppercase tracking-widest text-sm text-slate-500">Active Quests</h3>
                    <span className="text-xs text-slate-500">{questsList.data?.length ?? 0} quests</span>
                </div>
                <table className="w-full text-left">
                    <thead>
                        <tr className="text-slate-500 text-xs border-b border-slate-800">
                            <th className="px-8 py-4">QUEST</th>
                            <th className="px-8 py-4">CONDITION</th>
                            <th className="px-8 py-4">REWARD</th>
                            <th className="px-8 py-4 text-right">ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {questsList.data?.map(quest => (
                            <tr key={quest.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors group">
                                <td className="px-8 py-4 font-bold max-w-xs truncate">
                                    <div className="flex items-center gap-2">
                                        <Trophy size={16} className="text-amber-500" />
                                        {quest.title}
                                    </div>
                                    <div className="text-xs text-slate-500 font-normal mt-1">{quest.description}</div>
                                </td>
                                <td className="px-8 py-4 text-sm text-slate-400">
                                    {quest.conditionType} >= {quest.conditionValue}
                                </td>
                                <td className="px-8 py-4 font-mono font-bold text-slate-200">{quest.rewardPoints.toLocaleString()} <span className="text-amber-500">XP</span></td>
                                <td className="px-8 py-4 text-right">
                                    <button
                                        onClick={() => {
                                            if (confirm(`Delete quest "${quest.title}"?`)) {
                                                deleteQuest.mutate({ id: quest.id });
                                            }
                                        }}
                                        className="p-2 rounded-lg transition-all text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100"
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
