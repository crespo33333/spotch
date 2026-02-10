'use client';

import React, { useState } from 'react';
import { trpc } from '../../utils/trpc';
import { Send, Gem, Ban, Search } from 'lucide-react';

export default function UsersPage() {
    const usersList = trpc.admin.getAllUsers.useQuery();
    const [targetUser, setTargetUser] = useState<{ id: number, name: string } | null>(null);
    const [pushTitle, setPushTitle] = useState('');
    const [pushBody, setPushBody] = useState('');

    const toggleBan = trpc.admin.toggleUserBan.useMutation({
        onSuccess: () => usersList.refetch()
    });

    const togglePremium = trpc.admin.toggleUserPremium.useMutation({
        onSuccess: () => usersList.refetch()
    });

    const sendDirect = trpc.admin.sendPushToUser.useMutation({
        onSuccess: (data) => {
            alert(`Sent push to ${targetUser?.name}`);
            setPushTitle('');
            setPushBody('');
            setTargetUser(null);
        },
        onError: (err) => alert("Failed: " + err.message)
    });

    const handlePushSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!pushTitle || !pushBody || !targetUser) return;
        sendDirect.mutate({ userId: targetUser.id, title: pushTitle, body: pushBody });
    };

    return (
        <>
            <header className="mb-12 flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-black tracking-tight">User Management</h2>
                    <p className="text-slate-500">View and manage all registered users.</p>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <input
                        placeholder="Search currently disabled"
                        disabled
                        className="bg-slate-900 border border-slate-800 rounded-full pl-10 pr-6 py-2 w-64 text-sm focus:outline-none opacity-50 cursor-not-allowed"
                    />
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* User List Table */}
                <div className="lg:col-span-2 bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden self-start">
                    <div className="px-8 py-6 border-b border-slate-800 flex justify-between items-center">
                        <h3 className="font-black uppercase tracking-widest text-sm text-slate-500">All Users</h3>
                        <span className="text-xs text-slate-500">{usersList.data?.length ?? 0} users</span>
                    </div>
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-slate-500 text-xs border-b border-slate-800">
                                <th className="px-8 py-4">USER</th>
                                <th className="px-8 py-4">ID</th>
                                <th className="px-8 py-4">LVL</th>
                                <th className="px-8 py-4">STATUS</th>
                                <th className="px-8 py-4 text-right">ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {usersList.data?.map(user => (
                                <tr key={user.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                                    <td className="px-8 py-4 font-bold">{user.name || 'Anonymous'}</td>
                                    <td className="px-8 py-4 text-slate-500 font-mono text-xs">{user.id}</td>
                                    <td className="px-8 py-4 font-bold text-cyan-500">{user.level}</td>
                                    <td className="px-8 py-4">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${user.isBanned ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                            {user.isBanned ? 'Banned' : 'Active'}
                                        </span>
                                        {user.isPremium && (
                                            <span className="ml-2 px-3 py-1 rounded-full text-[10px] font-black uppercase bg-pink-500/10 text-pink-500">Premium</span>
                                        )}
                                    </td>
                                    <td className="px-8 py-4 text-right flex justify-end gap-2">
                                        <button
                                            onClick={() => setTargetUser({ id: user.id, name: user.name || 'Anonymous' })}
                                            title="Send Message"
                                            className="p-2 bg-slate-800 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-500 rounded-lg transition-all"
                                        >
                                            <Send size={16} />
                                        </button>
                                        <button
                                            onClick={() => togglePremium.mutate({ userId: user.id, isPremium: !user.isPremium })}
                                            title={user.isPremium ? "Revoke Premium" : "Grant Premium"}
                                            className={`p-2 bg-slate-800 rounded-lg transition-all ${user.isPremium ? 'text-pink-500 bg-pink-500/10' : 'text-slate-400 hover:text-pink-500 hover:bg-pink-500/20'}`}
                                        >
                                            <Gem size={16} />
                                        </button>
                                        <button
                                            onClick={() => toggleBan.mutate({ userId: user.id, isBanned: !user.isBanned })}
                                            title={user.isBanned ? "Unban" : "Ban"}
                                            className={`p-2 bg-slate-800 rounded-lg transition-all ${user.isBanned ? 'text-rose-500 bg-rose-500/10' : 'text-slate-400 hover:text-rose-500 hover:bg-rose-500/20'}`}
                                        >
                                            <Ban size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Action Panel (Push) */}
                {targetUser && (
                    <div className="lg:col-span-1 border border-slate-800 bg-slate-900 rounded-3xl p-8 sticky top-12 self-start">
                        <h3 className="font-black uppercase tracking-widest text-sm text-slate-500 mb-6 flex items-center gap-2">
                            <Send size={14} className="text-emerald-500" />
                            SEND TO @{targetUser.name}
                        </h3>

                        <form onSubmit={handlePushSubmit} className="flex flex-col gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Notice Title</label>
                                <input
                                    value={pushTitle}
                                    onChange={e => setPushTitle(e.target.value)}
                                    placeholder="Private Message"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Message Body</label>
                                <textarea
                                    value={pushBody}
                                    onChange={e => setPushBody(e.target.value)}
                                    placeholder="Write your message here..."
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm h-32 focus:outline-none focus:border-cyan-500"
                                />
                            </div>

                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setTargetUser(null)}
                                    className="flex-1 bg-slate-800 py-4 rounded-xl font-bold text-xs uppercase text-slate-400 hover:bg-slate-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={sendDirect.isPending}
                                    className="flex-[2] bg-emerald-600 hover:bg-emerald-500 py-4 rounded-xl font-black tracking-widest text-xs uppercase text-white shadow-xl shadow-emerald-500/10"
                                >
                                    {sendDirect.isPending ? 'Sending...' : 'Send'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </>
    );
}
