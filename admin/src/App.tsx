
import { useState, useEffect } from 'react';
import { trpc } from './utils/trpc';
import { Activity, Users, MapPin, Bell, Trash2, Shield, Search, Ban, CheckCircle } from 'lucide-react';

function App() {
  const [adminId, setAdminId] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'spots'>('dashboard');

  // Form States
  const [notifMessage, setNotifMessage] = useState('');

  // Queries
  const { data: spots, refetch: refetchSpots } = trpc.spot.getRankings.useQuery(undefined, { enabled: isLoggedIn });
  const { data: stats, refetch: refetchStats } = trpc.admin.getStats.useQuery(undefined, { enabled: isLoggedIn });
  const { data: userList, refetch: refetchUsers } = trpc.admin.listUsers.useQuery({}, { enabled: isLoggedIn });

  // Mutations
  const broadcastMutation = trpc.admin.broadcastNotification.useMutation();
  const banMutation = trpc.admin.banUser.useMutation();
  const deleteSpotMutation = trpc.admin.deleteSpot.useMutation();

  useEffect(() => {
    const savedId = localStorage.getItem('spotch_admin_id');
    if (savedId) {
      setAdminId(savedId);
      setIsLoggedIn(true);
    }
  }, []);

  const handleLogin = () => {
    if (!adminId) return;
    localStorage.setItem('spotch_admin_id', adminId);
    setIsLoggedIn(true);
    setTimeout(() => {
      refetchSpots();
      refetchStats();
      refetchUsers();
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
    } catch (e) {
      alert('Error: ' + (e as any).message);
    }
  };

  const toggleBan = async (id: number, currentBan: boolean) => {
    try {
      await banMutation.mutateAsync({ userId: id, ban: !currentBan });
      refetchUsers();
    } catch (e) {
      alert("Action failed: " + (e as any).message);
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
          </nav>
        </div>
        <button onClick={handleLogout} className="text-slate-500 text-sm hover:text-white pb-4">Logout</button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-black text-slate-800 capitalize">{activeTab}</h2>
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
              <StatCard title="Total Users" value={stats?.userCount || '...'} trend="+12%" icon={<Users className="text-[#00C2FF]" />} />
              <StatCard title="Active Spots" value={stats?.spotCount || '...'} trend="+5" icon={<MapPin className="text-[#FF4785]" />} />
              <StatCard title="Broadcasts" value="3" trend="+1" icon={<Bell className="text-orange-500" />} />
              <StatCard title="Revenue (Est)" value="$0" trend="-" icon={<Shield className="text-green-500" />} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Notification Console */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-fit">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Bell size={20} /> Push Console</h3>
                <textarea
                  className="w-full border border-slate-200 rounded-xl p-3 mb-4 h-32 resize-none"
                  placeholder="Message content..."
                  value={notifMessage}
                  onChange={e => setNotifMessage(e.target.value)}
                />
                <button onClick={sendNotification} disabled={broadcastMutation.isLoading} className="w-full bg-[#00C2FF] text-white font-bold py-2 rounded-lg hover:bg-opacity-90 disabled:opacity-50">
                  {broadcastMutation.isLoading ? 'Sending...' : 'Send Broadcast'}
                </button>
              </div>

              {/* Quick Spots View */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-2">
                <h3 className="font-bold text-lg mb-4">Recent Activity</h3>
                <div className="space-y-4">
                  {spots?.slice(0, 3).map(spot => (
                    <div key={spot.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">{spot.country}</div>
                        <div>
                          <div className="font-bold">{spot.name}</div>
                          <div className="text-xs text-slate-400">{spot.points} points collected</div>
                        </div>
                      </div>
                      <button onClick={() => deleteSpot(spot.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={18} /></button>
                    </div>
                  ))}
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
                {userList?.map(user => (
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
                    <td className="px-6 py-4 text-right">
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

        {activeTab === 'spots' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-400 text-xs font-black uppercase tracking-widest border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Spot Name</th>
                  <th className="px-6 py-4">Location</th>
                  <th className="px-6 py-4">Consumption</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                {spots?.map(spot => (
                  <tr key={spot.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3 text-2xl">
                        {spot.country}
                        <div className="text-sm font-bold text-slate-700">{spot.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {spot.lat.toFixed(4)}, {spot.lng.toFixed(4)}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-700">
                      {spot.points} pts
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => deleteSpot(spot.id)} className="text-red-400 hover:text-red-600 transition">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
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
