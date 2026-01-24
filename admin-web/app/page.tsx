'use client';

import React, { useState } from 'react';
import { trpc } from '../utils/trpc';
import {
  Users,
  MapPin,
  Send,
  ShieldAlert,
  TrendingUp,
  Search,
  Bell,
  Trash2,
  Ban,
  Gem
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminDashboard() {
  const [pushTitle, setPushTitle] = useState('');
  const [pushBody, setPushBody] = useState('');

  const [targetUser, setTargetUser] = useState<{ id: number, name: string } | null>(null);
  const [editingBroadcast, setEditingBroadcast] = useState<{ id: number; title: string; body: string; link?: string | null } | null>(null);

  const stats = trpc.admin.getStats.useQuery();
  const usersList = trpc.admin.getAllUsers.useQuery();
  const broadcasts = trpc.admin.listBroadcasts.useQuery();

  const broadcast = trpc.admin.broadcastPush.useMutation({
    onSuccess: (data) => {
      alert(`Sent push to ${data.sent} devices!`);
      setPushTitle('');
      setPushBody('');
      broadcasts.refetch();
    },
    onError: (err) => alert("Failed: " + err.message)
  });

  const sendDirect = trpc.admin.sendPushToUser.useMutation({
    onSuccess: (data) => {
      alert(`Sent push to ${targetUser?.name} (Ticket: ${data.ticket.status})`);
      setPushTitle('');
      setPushBody('');
      setTargetUser(null);
    },
    onError: (err) => alert("Failed: " + err.message)
  });

  const toggleBan = trpc.admin.toggleUserBan.useMutation({
    onSuccess: () => {
      usersList.refetch();
    }
  });

  const togglePremium = trpc.admin.toggleUserPremium.useMutation({
    onSuccess: () => {
      usersList.refetch();
    }
  });


  const updateBroadcast = trpc.admin.updateBroadcast.useMutation({
    onSuccess: () => {
      alert("Updated broadcast successfully!");
      setEditingBroadcast(null);
      broadcasts.refetch();
    },
    onError: (err) => alert("Failed update: " + err.message)
  });

  const deleteBroadcast = trpc.admin.deleteBroadcast.useMutation({
    onSuccess: () => {
      broadcasts.refetch();
    },
    onError: (err) => alert("Failed delete: " + err.message)
  });

  const handlePushSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pushTitle || !pushBody) return;

    if (targetUser) {
      sendDirect.mutate({ userId: targetUser.id, title: pushTitle, body: pushBody });
    } else {
      if (confirm('Are you sure you want to send this to ALL users?')) {
        broadcast.mutate({ title: pushTitle, body: pushBody });
      }
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 p-6 flex flex-col gap-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-cyan-500 to-fuchsia-500 rounded-xl" />
          <h1 className="text-xl font-black italic tracking-tighter">SPOTCH <span className="text-slate-500 text-xs translate-y-[-1px] inline-block">ADMIN</span></h1>
        </div>

        <nav className="flex flex-col gap-2 text-sm font-medium">
          <button className="flex items-center gap-3 px-4 py-3 bg-slate-900 text-white rounded-xl border border-slate-700">
            <TrendingUp size={18} /> Dashboard
          </button>
          <button className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-slate-900 rounded-xl transition-colors">
            <Users size={18} /> Users
          </button>
          <button className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-slate-900 rounded-xl transition-colors">
            <MapPin size={18} /> Spots
          </button>
          <button className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-slate-900 rounded-xl transition-colors">
            <Bell size={18} /> Push Console
          </button>
          <button className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-slate-900 rounded-xl transition-colors">
            <ShieldAlert size={18} /> Security
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-12">
        <header className="flex justify-between items-center mb-12">
          <div>
            <h2 className="text-3xl font-black tracking-tight">System Overview</h2>
            <p className="text-slate-500">Real-time management for the Spotch ecosystem.</p>
          </div>

          <div className="flex gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input
                placeholder="Search everything..."
                className="bg-slate-900 border border-slate-800 rounded-full pl-10 pr-6 py-2 w-64 text-sm focus:outline-none focus:border-cyan-500/50"
              />
            </div>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-6 mb-12">
          <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-3xl rounded-full" />
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-cyan-500/10 rounded-2xl text-cyan-400">
                <Users size={24} />
              </div>
            </div>
            <h3 className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-1">Total Users</h3>
            <div className="text-4xl font-black">{stats.data?.users ?? '--'}</div>
          </div>

          <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-fuchsia-500/5 blur-3xl rounded-full" />
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-fuchsia-500/10 rounded-2xl text-fuchsia-400">
                <MapPin size={24} />
              </div>
            </div>
            <h3 className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-1">Active Spots</h3>
            <div className="text-4xl font-black">{stats.data?.spots ?? '--'}</div>
          </div>

          <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full" />
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400">
                <TrendingUp size={24} />
              </div>
            </div>
            <h3 className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-1">Point Volume</h3>
            <div className="text-4xl font-black">{stats.data?.volume.toLocaleString() ?? '--'} <span className="text-sm text-slate-500">P</span></div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-12">
          {/* User List Table */}
          <div className="col-span-2 bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-800 flex justify-between items-center">
              <h3 className="font-black uppercase tracking-widest text-sm text-slate-500">Recent Growth</h3>
              <button className="text-xs font-bold text-cyan-500 hover:underline">View All Users</button>
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
                    </td>
                    <td className="px-8 py-4 text-right flex justify-end gap-2">
                      <button
                        onClick={() => setTargetUser({ id: user.id, name: user.name || 'Anonymous' })}
                        title="Prepare Push"
                        className="p-2 bg-slate-800 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-500 rounded-lg transition-all"
                      >
                        <Send size={16} />
                      </button>
                      <button
                        onClick={() => togglePremium.mutate({ userId: user.id, isPremium: !user.isPremium })}
                        title={user.isPremium ? "Revoke Premium" : "Grant Premium"}
                        className="p-2 bg-slate-800 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-500 rounded-lg transition-all"
                      >
                        <Gem size={16} fill={user.isPremium ? "currentColor" : "none"} />
                      </button>
                      <button
                        onClick={() => toggleBan.mutate({ userId: user.id, isBanned: !user.isBanned })}

                        title={user.isBanned ? "Unban" : "Ban"}
                        className="p-2 bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-500 rounded-lg transition-all"
                      >
                        <Ban size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Push Console Side */}
          <div className="col-span-1 border border-slate-800 bg-slate-900 rounded-3xl p-8 sticky top-6 self-start">
            <h3 className="font-black uppercase tracking-widest text-sm text-slate-500 mb-6 flex items-center gap-2">
              <Send size={14} className={targetUser ? "text-emerald-500" : "text-cyan-500"} />
              {targetUser ? `SEND TO @${targetUser.name}` : 'GLOBAL BROADCAST'}
            </h3>

            {targetUser && (
              <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex justify-between items-center">
                <span className="text-xs text-emerald-400 font-bold">Targeting: {targetUser.name}</span>
                <button
                  onClick={() => setTargetUser(null)}
                  className="text-[10px] text-slate-400 hover:text-white bg-slate-800 px-2 py-1 rounded"
                >
                  CANCEL
                </button>
              </div>
            )}

            <form onSubmit={handlePushSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Notice Title</label>
                <input
                  value={pushTitle}
                  onChange={e => setPushTitle(e.target.value)}
                  placeholder="App Update Notification"
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

              <button
                type="submit"
                disabled={broadcast.isPending || sendDirect.isPending}
                className={`mt-4 w-full bg-gradient-to-r ${targetUser ? 'from-emerald-600 to-teal-600' : 'from-cyan-600 to-fuchsia-600'} py-4 rounded-xl font-black tracking-widest text-xs uppercase hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-cyan-500/10`}
              >
                {broadcast.isPending || sendDirect.isPending ? 'SENDING...' : targetUser ? 'SEND MESSAGE' : 'SEND TO ALL DEVICES'}
              </button>
            </form>

            <div className="mt-8 p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
              <p className="text-[10px] text-amber-500 font-bold leading-relaxed">
                <ShieldAlert size={10} className="inline mr-1" />
                {targetUser ? 'Only this specific user will receive the notification.' : 'WARNING: This will send a notification to every user in the database. Use with caution.'}
              </p>
            </div>
          </div>
        </div>

        {/* Broadcast History */}
        <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden mb-12">
          <div className="px-8 py-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 backdrop-blur-sm sticky top-0">
            <h3 className="font-black uppercase tracking-widest text-sm text-slate-500">Broadcast History</h3>
            <button onClick={() => broadcasts.refetch()} className="text-xs font-bold text-cyan-500 hover:underline">Refresh</button>
          </div>
          <div className="divide-y divide-slate-800">
            {broadcasts.data?.map((b) => (
              <div key={b.id} className="p-6 hover:bg-slate-800/30 transition flex justify-between items-start group">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h4 className="font-bold text-slate-200">{b.title}</h4>
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                      {new Date(b.createdAt as string).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400">{b.body}</p>
                  {b.link && <div className="text-xs text-blue-400 mt-1 font-mono">{b.link}</div>}
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setEditingBroadcast({ id: b.id, title: b.title, body: b.body, link: b.link })}
                    className="p-2 text-cyan-500 hover:bg-cyan-500/10 rounded-lg font-bold text-xs"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Delete this broadcast?")) deleteBroadcast.mutate({ id: b.id });
                    }}
                    className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            {(!broadcasts.data || broadcasts.data.length === 0) && (
              <div className="p-12 text-center text-slate-500 italic">No broadcasts sent yet.</div>
            )}
          </div>
        </div>

        {/* Edit Modal */}
        <AnimatePresence>
          {editingBroadcast && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                className="bg-slate-900 border border-slate-700 rounded-3xl p-8 w-full max-w-lg shadow-2xl"
              >
                <h3 className="text-xl font-bold mb-6">Edit Broadcast</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Title</label>
                    <input
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-cyan-500 outline-none"
                      value={editingBroadcast.title}
                      onChange={e => setEditingBroadcast({ ...editingBroadcast, title: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Body</label>
                    <textarea
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm h-32 resize-none focus:border-cyan-500 outline-none"
                      value={editingBroadcast.body}
                      onChange={e => setEditingBroadcast({ ...editingBroadcast, body: e.target.value })}
                    />
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setEditingBroadcast(null)}
                      className="flex-1 py-3 font-bold text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        updateBroadcast.mutate({
                          id: editingBroadcast.id,
                          title: editingBroadcast.title,
                          body: editingBroadcast.body,
                          link: editingBroadcast.link
                        });
                      }}
                      className="flex-[2] bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-cyan-500/20"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
