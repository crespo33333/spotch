
import { useState, useEffect } from 'react';
import { trpc } from './utils/trpc';
import { Activity, Users, MapPin, Bell, Trash2, Shield, Search, Ban, CheckCircle } from 'lucide-react';

function App() {
  const [adminId, setAdminId] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'spots' | 'announcements'>('dashboard');

  // Form States
  const [notifMessage, setNotifMessage] = useState('');
  const [targetUser, setTargetUser] = useState<{ id: number; name: string } | null>(null);
  const [directNotifMessage, setDirectNotifMessage] = useState('');
  const [editingBroadcast, setEditingBroadcast] = useState<{ id: number; title: string; body: string; link?: string | null } | null>(null);

  // Queries
  const { data: spots, refetch: refetchSpots, error: spotsError } = trpc.spot.getRankings.useQuery(undefined, {
    enabled: isLoggedIn,
    retry: false
  });
  const { data: stats, refetch: refetchStats, error: statsError } = trpc.admin.getStats.useQuery(undefined, {
    enabled: isLoggedIn,
    retry: false
  });
  const { data: userList, refetch: refetchUsers, error: usersError } = trpc.admin.getAllUsers.useQuery(undefined, {
    enabled: isLoggedIn,
    retry: false
  });
  const { data: broadcastList, refetch: refetchBroadcasts, error: broadcastsError } = trpc.admin.listBroadcasts.useQuery(undefined, {
    enabled: isLoggedIn,
    retry: false
  });


  // Mutations
  const broadcastMutation = trpc.admin.broadcastPush.useMutation();
  const sendPushToUserMutation = trpc.admin.sendPushToUser.useMutation();
  const banMutation = trpc.admin.toggleUserBan.useMutation();
  const deleteSpotMutation = trpc.admin.deleteSpot.useMutation();
  const updateBroadcastMutation = trpc.admin.updateBroadcast.useMutation();
  const deleteBroadcastMutation = trpc.admin.deleteBroadcast.useMutation();

  useEffect(() => {
    const savedId = localStorage.getItem('spotch_admin_id');
    if (savedId) {
      setAdminId(savedId);
      setIsLoggedIn(true);
    }
  }, []);

  const anyError = spotsError || statsError || usersError || broadcastsError;


  const handleLogin = () => {
    if (!adminId) return;
    localStorage.setItem('spotch_admin_id', adminId);
    setIsLoggedIn(true);
    setTimeout(() => {
      refetchSpots();
      refetchStats();
      refetchUsers();
      refetchBroadcasts();
    }, 500);
  };

  const handleLogout = () => {
    localStorage.removeItem('spotch_admin_id');
    setIsLoggedIn(false);
    setAdminId('');
  };

  const sendNotification = async () => {
    if (!notifMessage) return;
    try {
      await broadcastMutation.mutateAsync({
        title: 'Spotch Announcement 📢',
        body: notifMessage
      });
      alert('Sent successfully!');
      setNotifMessage('');
      refetchBroadcasts();
      refetchStats();
    } catch (e) {
      alert('Error: ' + (e as any).message);
    }
  };

  const handleUpdateBroadcast = async () => {
    if (!editingBroadcast) return;
    try {
      await updateBroadcastMutation.mutateAsync({
        id: editingBroadcast.id,
        title: editingBroadcast.title,
        body: editingBroadcast.body,
        link: editingBroadcast.link
      });
      alert('Updated successfully!');
      setEditingBroadcast(null);
      refetchBroadcasts();
    } catch (e) {
      alert('Error: ' + (e as any).message);
    }
  };

  const handleDeleteBroadcast = async (id: number) => {
    if (!confirm("Are you sure you want to delete this announcement?")) return;
    try {
      await deleteBroadcastMutation.mutateAsync({ id });
      refetchBroadcasts();
      refetchStats();
    } catch (e) {
      alert("Action failed: " + (e as any).message);
    }
  };

  const toggleBan = async (id: number, currentBan: boolean) => {
    try {
      await banMutation.mutateAsync({ userId: id, isBanned: !currentBan });
      refetchUsers();
    } catch (e) {
      alert("Action failed: " + (e as any).message);
    }
  };

  const sendDirectNotification = async () => {
    if (!targetUser || !directNotifMessage) return;
    try {
      await sendPushToUserMutation.mutateAsync({
        userId: targetUser.id,
        title: 'Spotch Alert 🔔',
        body: directNotifMessage
      });
      alert('Sent successfully!');
      setTargetUser(null);
      setDirectNotifMessage('');
    } catch (e) {
      alert('Error: ' + (e as any).message);
    }
  };

  const deleteSpot = async (id: number) => {
    if (!confirm("Are you sure you want to deactivate this spot?")) return;
    try {
      await deleteSpotMutation.mutateAsync({ spotId: id });
      refetchSpots();
      refetchStats();
    } catch (e) {
      alert("Action failed: " + (e as any).message);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-xl w-96">
          <h1 className="text-2xl font-black text-slate-900 mb-6 text-center">Spotch Admin</h1>
          <input
            type="text"
            className="w-full p-3 border border-slate-200 rounded-lg mb-4"
            placeholder="Enter Admin User ID"
            value={adminId}
            onChange={e => setAdminId(e.target.value)}
          />
          <button
            onClick={handleLogin}
            className="w-full bg-[#00C2FF] text-white font-bold py-3 rounded-lg hover:bg-[#00A0D1] transition"
          >
            Access Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white p-6 hidden md:flex flex-col justify-between h-screen sticky top-0">
        <div>
          <div className="text-2xl font-black text-[#00C2FF] mb-10 tracking-tighter">Spotch Admin</div>
          <nav className="space-y-2">
            <NavItem icon={<Activity />} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
            <NavItem icon={<Users />} label="Users" active={activeTab === 'users'} onClick={() => setActiveTab('users')} />
            <NavItem icon={<MapPin />} label="Spots" active={activeTab === 'spots'} onClick={() => setActiveTab('spots')} />
            <NavItem icon={<Bell />} label="Announcements" active={activeTab === 'announcements'} onClick={() => setActiveTab('announcements')} />
          </nav>
        </div>
        <button onClick={handleLogout} className="text-slate-500 text-sm hover:text-white pb-4">Logout</button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-8">
          <div className="flex flex-col">
            <h2 className="text-3xl font-black text-slate-800 capitalize">{activeTab}</h2>
            {anyError && (
              <span className="text-xs font-bold text-red-500 mt-1 italic">
                ⚠️ Connectivity error: {(anyError as any).message || 'API Unreachable'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-white px-4 py-2 rounded-full border border-slate-200 flex items-center gap-2">
              <Search size={16} className="text-slate-400" />
              <input placeholder="Search..." className="outline-none text-sm" />
            </div>
            <div className="w-10 h-10 bg-[#FF4785] rounded-full flex items-center justify-center font-bold text-white">A</div>
          </div>
        </header>


        {activeTab === 'dashboard' && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <StatCard title="Total Users" value={stats?.users || '...'} trend="+12%" icon={<Users className="text-[#00C2FF]" />} />
              <StatCard title="Active Spots" value={stats?.spots || '...'} trend="+5" icon={<MapPin className="text-[#FF4785]" />} />
              <StatCard title="Broadcasts" value={broadcastList?.length || '0'} trend="+1" icon={<Bell className="text-orange-500" />} />
              <StatCard title="Revenue (Vol)" value={`$${stats?.volume || 0}`} trend="-" icon={<Shield className="text-green-500" />} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Quick Spots View */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="font-bold text-lg mb-4">Recent Spots</h3>
                <div className="space-y-4">
                  {spots?.slice(0, 5).map((spot: any) => (
                    <div key={spot.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">{spot.country}</div>
                        <div>
                          <div className="font-bold">{spot.name}</div>
                          <div className="text-xs text-slate-400">{spot.points} points collected</div>
                        </div>
                      </div>
                      <button onClick={() => deleteSpot(spot.id)} className="text-slate-300 hover:text-red-500 transition"><Trash2 size={18} /></button>
                    </div>
                  ))}
                  {(!spots || spots.length === 0) && <div className="text-slate-400 text-sm italic">No recent activity</div>}
                </div>

              </div>

              {/* Recent Announcements */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="font-bold text-lg mb-4">Latest Announcements</h3>
                <div className="space-y-4">
                  {broadcastList?.slice(0, 5).map((b: any) => (
                    <div key={b.id} className="p-4 bg-slate-50 rounded-xl">
                      <div className="font-bold text-slate-800">{b.title}</div>
                      <div className="text-xs text-slate-500 mt-1 line-clamp-2">{b.body}</div>
                    </div>
                  ))}
                  {(!broadcastList || broadcastList.length === 0) && <div className="text-slate-400 text-sm italic">No announcements sent yet</div>}
                </div>

              </div>
            </div>
          </>
        )}

        {activeTab === 'users' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-400 text-xs font-black uppercase tracking-widest border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Joined</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                {userList?.map((user: any) => (
                  <tr key={user.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200"></div>
                        <div>
                          <div className="font-bold text-slate-700">{user.name}</div>
                          <div className="text-xs text-slate-400">{user.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${user.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-600'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(user.createdAt || '').toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      {user.isBanned ? (
                        <div className="flex items-center gap-1 text-red-500 font-bold">
                          <Ban size={14} /> Banned
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-green-500 font-bold">
                          <CheckCircle size={14} /> Active
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right flex items-center justify-end gap-3">
                      <button
                        onClick={() => setTargetUser({ id: user.id, name: user.name || 'Anonymous' })}
                        disabled={!user.pushToken}
                        className={`text-xs font-bold px-2 py-1 rounded border transition ${user.pushToken ? 'text-[#00C2FF] border-[#00C2FF] hover:bg-[#00C2FF] hover:text-white' : 'text-slate-300 border-slate-200 cursor-not-allowed'}`}
                      >
                        Push
                      </button>
                      <button
                        onClick={() => toggleBan(user.id, !!user.isBanned)}
                        className={`font-bold transition ${user.isBanned ? 'text-green-500 hover:text-green-700' : 'text-red-500 hover:text-red-700'}`}
                      >
                        {user.isBanned ? 'Unban' : 'Ban'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'announcements' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* New Announcement Form */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-fit sticky top-8">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-[#00C2FF]"><Bell size={20} /> Create New Broadcast</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Message</label>
                  <textarea
                    className="w-full border border-slate-200 rounded-xl p-3 h-32 resize-none text-sm outline-none focus:border-[#00C2FF] transition"
                    placeholder="Wanna share something with all users?"
                    value={notifMessage}
                    onChange={e => setNotifMessage(e.target.value)}
                  />
                </div>
                <button
                  onClick={sendNotification}
                  disabled={broadcastMutation.isLoading || !notifMessage}
                  className="w-full bg-[#00C2FF] text-white font-bold py-3 rounded-xl hover:bg-opacity-90 disabled:opacity-50 shadow-lg shadow-[#00C2FF]/20"
                >
                  {broadcastMutation.isLoading ? 'Sending...' : 'Send Global Push'}
                </button>
              </div>
            </div>

            {/* History Table */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-slate-800">Broadcast History</h3>
                <button onClick={() => refetchBroadcasts()} className="text-xs font-bold text-[#00C2FF] hover:underline">Refresh</button>
              </div>
              <div className="divide-y divide-slate-100">
                {broadcastList?.map((b: any) => (
                  <div key={b.id} className="p-6 hover:bg-slate-50/50 transition">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-bold text-slate-800">{b.title}</h4>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">{new Date(b.createdAt || '').toLocaleString()}</span>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingBroadcast({ id: b.id, title: b.title, body: b.body, link: b.link })}
                          className="p-1 px-3 rounded border border-[#00C2FF] text-[#00C2FF] text-xs font-bold hover:bg-[#00C2FF] hover:text-white transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteBroadcast(b.id)}
                          className="p-2 text-slate-300 hover:text-red-500 transition"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">{b.body}</p>
                    {b.link && (
                      <div className="mt-2 text-[10px] font-bold text-blue-500 flex items-center gap-1">
                        🔗 {b.link}
                      </div>
                    )}
                  </div>
                ))}
                {(!broadcastList || broadcastList.length === 0) && (
                  <div className="p-12 text-center text-slate-400 italic">No historical broadcasts found</div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Edit Broadcast Modal */}
      {editingBroadcast && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-xl text-slate-800">Edit Announcement</h3>
              <button onClick={() => setEditingBroadcast(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase mb-2">Title</label>
                <input
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:border-[#00C2FF] outline-none"
                  value={editingBroadcast.title}
                  onChange={e => setEditingBroadcast({ ...editingBroadcast, title: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase mb-2">Body</label>
                <textarea
                  className="w-full border border-slate-200 rounded-xl p-3 h-32 resize-none text-sm focus:border-[#00C2FF] outline-none"
                  value={editingBroadcast.body}
                  onChange={e => setEditingBroadcast({ ...editingBroadcast, body: e.target.value })}
                />
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={() => setEditingBroadcast(null)} className="flex-1 py-3 font-bold text-slate-400">Cancel</button>
                <button
                  onClick={handleUpdateBroadcast}
                  className="flex-[2] bg-[#00C2FF] text-white font-bold py-3 rounded-xl shadow-lg shadow-[#00C2FF]/30"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Direct Push Modal */}
      {targetUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-xl text-slate-800">Direct Push to {targetUser.name}</h3>
              <button onClick={() => setTargetUser(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-6">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Message Content</label>
              <textarea
                className="w-full border border-slate-200 rounded-xl p-4 h-32 resize-none text-slate-700 focus:border-[#00C2FF] outline-none transition"
                placeholder="Type your message here..."
                value={directNotifMessage}
                onChange={e => setDirectNotifMessage(e.target.value)}
              />
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setTargetUser(null)}
                  className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={sendDirectNotification}
                  disabled={sendPushToUserMutation.isLoading || !directNotifMessage}
                  className="flex-[2] bg-[#00C2FF] text-white font-bold py-3 rounded-xl hover:bg-opacity-90 disabled:opacity-50 shadow-lg shadow-[#00C2FF]/30 transition"
                >
                  {sendPushToUserMutation.isLoading ? 'Sending...' : 'Send Now'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const NavItem = ({ icon, label, active, onClick }: any) => (
  <div
    onClick={onClick}
    className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition ${active ? 'bg-[#00C2FF] text-white font-bold shadow-lg shadow-[#00C2FF]/20' : 'text-slate-400 hover:bg-slate-800'}`}
  >
    {icon}
    <span>{label}</span>
  </div>
);

const StatCard = ({ title, value, trend, icon }: any) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
    <div className="flex justify-between items-start mb-4">
      <div className="p-3 bg-slate-50 rounded-xl">{icon}</div>
      <span className="text-green-500 text-xs font-bold bg-green-50 px-2 py-1 rounded-full">{trend}</span>
    </div>
    <div className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-1">{title}</div>
    <div className="text-3xl font-black text-slate-800">{value}</div>
  </div>
);

export default App;
