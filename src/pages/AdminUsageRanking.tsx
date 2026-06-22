import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Trophy, Clock, FileText, Target, Loader2, ArrowLeft } from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { getAssetUrl } from '../lib/assets';

interface RankingUser {
  id: string;
  name: string;
  email: string;
  photoURL: string | null;
  totalSessionTime: number; // in seconds
  totalPageViews: number;
  totalScoredActions: number;
}

export function AdminUsageRanking() {
  const [ranking, setRanking] = useState<RankingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<RankingUser | null>(null);

  useEffect(() => {
    fetchRanking();
  }, []);

  const fetchRanking = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('app_api_key') || import.meta.env.VITE_APP_API_KEY || 'development_key';
      const res = await fetch('/api/admin/usage-ranking', {
        headers: {
          'x-api-key': token
        }
      });
      const data = await res.json();
      if (data.success && data.ranking) {
        setRanking(data.ranking);
      }
    } catch (err) {
      console.error('Failed to fetch ranking:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes} min`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  if (selectedUser) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <button 
          onClick={() => setSelectedUser(null)}
          className="flex items-center text-sm text-stone-400 hover:text-amber-500 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Voltar ao Ranking
        </button>

        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6">
          <div className="flex items-center space-x-4 mb-8">
            <Avatar src={selectedUser.photoURL} alt={selectedUser.name} size="lg" />
            <div>
              <h2 className="text-2xl font-bold text-amber-500">{selectedUser.name}</h2>
              <p className="text-stone-400">{selectedUser.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-stone-950 border border-stone-800 rounded-xl p-6 flex flex-col items-center justify-center text-center">
              <Clock className="w-10 h-10 text-blue-400 mb-3" />
              <h3 className="text-sm font-medium text-stone-400 uppercase tracking-wider mb-1">Tempo de Login</h3>
              <p className="text-3xl font-bold text-white">{formatTime(selectedUser.totalSessionTime)}</p>
            </div>
            
            <div className="bg-stone-950 border border-stone-800 rounded-xl p-6 flex flex-col items-center justify-center text-center">
              <FileText className="w-10 h-10 text-emerald-400 mb-3" />
              <h3 className="text-sm font-medium text-stone-400 uppercase tracking-wider mb-1">Páginas Acessadas</h3>
              <p className="text-3xl font-bold text-white">{selectedUser.totalPageViews}</p>
              <p className="text-xs text-stone-500 mt-2">Atividades não pontuadas</p>
            </div>

            <div className="bg-stone-950 border border-stone-800 rounded-xl p-6 flex flex-col items-center justify-center text-center">
              <Target className="w-10 h-10 text-amber-500 mb-3" />
              <h3 className="text-sm font-medium text-stone-400 uppercase tracking-wider mb-1">Atividades Pontuadas</h3>
              <p className="text-3xl font-bold text-white">{selectedUser.totalScoredActions}</p>
              <p className="text-xs text-stone-500 mt-2">Interações no Acervo/Lounge</p>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-amber-500 flex items-center">
          <Trophy className="w-6 h-6 mr-3" />
          Ranking de Utilização
        </h2>
      </div>

      <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-stone-950 border-b border-stone-800">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-stone-400 uppercase tracking-wider">#</th>
                <th className="px-6 py-4 text-xs font-semibold text-stone-400 uppercase tracking-wider">Membro</th>
                <th className="px-6 py-4 text-xs font-semibold text-stone-400 uppercase tracking-wider text-right">Tempo Logado</th>
                <th className="px-6 py-4 text-xs font-semibold text-stone-400 uppercase tracking-wider text-right">Acessos</th>
                <th className="px-6 py-4 text-xs font-semibold text-stone-400 uppercase tracking-wider text-right">Pontuadas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800">
              {ranking.map((user, index) => (
                <tr 
                  key={user.id} 
                  className="hover:bg-stone-800/50 cursor-pointer transition-colors"
                  onClick={() => setSelectedUser(user)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                      index === 0 ? 'bg-amber-500/20 text-amber-500' :
                      index === 1 ? 'bg-stone-300/20 text-stone-300' :
                      index === 2 ? 'bg-orange-600/20 text-orange-600' :
                      'bg-stone-800 text-stone-400'
                    }`}>
                      {index + 1}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Avatar src={user.photoURL} alt={user.name} size="sm" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-white">{user.name}</p>
                        <p className="text-xs text-stone-400">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-stone-300">
                    {formatTime(user.totalSessionTime)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-stone-300">
                    {user.totalPageViews}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-amber-500 font-medium">
                    {user.totalScoredActions}
                  </td>
                </tr>
              ))}
              {ranking.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-stone-500">
                    Nenhum dado de telemetria encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
