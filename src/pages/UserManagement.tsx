import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Shield, 
  Search, 
  Filter, 
  MoreVertical, 
  UserPlus, 
  Mail, 
  ShieldAlert, 
  CheckCircle2, 
  Loader2,
  Trash2,
  UserCheck,
  ChevronDown
} from 'lucide-react';
import { MemberService } from '../infra/services/MemberService';
import { UserProfile } from '../infra/services/userService';
import { useAuth } from '../context/AuthContext';
import { Avatar } from '../components/Avatar';

export default function UserManagement() {
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [updatingUid, setUpdatingUid] = useState<string | null>(null);
  const { isAdmin } = useAuth();

  useEffect(() => {
    if (isAdmin) {
      fetchMembers();
    }
  }, [isAdmin]);

  const fetchMembers = async () => {
    try {
      const data = await MemberService.getAllMembers();
      setMembers(data);
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (uid: string, newRole: string) => {
    setUpdatingUid(uid);
    try {
      await MemberService.updateMemberRole(uid, newRole);
      setMembers(prev => prev.map(m => m.uid === uid ? { ...m, role: newRole as any } : m));
    } catch (error) {
      alert('Falha ao atualizar permissões. Verifique se o backend está rodando.');
    } finally {
      setUpdatingUid(null);
    }
  };

  const filteredMembers = members.filter(m => {
    const search = searchTerm.toLowerCase();
    const matchesSearch = !search || 
      (m.displayName?.toLowerCase().includes(search)) ||
      (m.email?.toLowerCase().includes(search));
    const matchesRole = roleFilter === 'all' || m.role === roleFilter;
    return Boolean(matchesSearch && matchesRole);
  });

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-stone-900">Acesso Negado</h1>
        <p className="text-stone-500">Você não tem permissão para acessar esta área.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 pb-24">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <div className="flex items-center gap-3 text-primary font-bold mb-2 uppercase tracking-widest text-sm">
            <Shield className="w-5 h-5" /> Administração
          </div>
          <h1 className="text-5xl font-bold text-on-surface mb-2 tracking-tight">Gestão de Membros</h1>
          <p className="text-on-surface-variant text-lg max-w-2xl">
            Gerencie os níveis de acesso e colabore com a comunidade de alquimistas do prato.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Buscar por nome ou e-mail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-stone-100 focus:border-primary outline-none transition-all text-sm font-medium shadow-sm"
            />
          </div>
          <select 
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full sm:w-auto px-6 py-4 rounded-2xl border-2 border-stone-100 bg-white focus:border-primary outline-none transition-all text-sm font-bold text-stone-600 shadow-sm appearance-none cursor-pointer"
          >
            <option value="all">Todos os Níveis</option>
            <option value="member">Membros</option>
            <option value="collaborator">Colaboradores</option>
            <option value="chef">Chefs</option>
            <option value="admin">Admins</option>
          </select>
        </div>
      </header>

      {/* Members Grid/Table */}
      <div className="bg-white rounded-[2.5rem] shadow-xl shadow-stone-200/50 border border-stone-100 overflow-hidden">
        {loading ? (
          <div className="p-24 flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <p className="font-bold text-stone-400 animate-pulse">Carregando alquimistas...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-stone-50/50 border-b border-stone-100">
                  <th className="px-8 py-6 text-xs font-bold uppercase tracking-widest text-stone-400">Usuário</th>
                  <th className="px-8 py-6 text-xs font-bold uppercase tracking-widest text-stone-400">Nível de Acesso</th>
                  <th className="px-8 py-6 text-xs font-bold uppercase tracking-widest text-stone-400">Localização</th>
                  <th className="px-8 py-6 text-xs font-bold uppercase tracking-widest text-stone-400 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                <AnimatePresence mode="popLayout">
                  {filteredMembers.map((member, index) => (
                    <motion.tr 
                      key={member.uid}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: index * 0.05 }}
                      className="group hover:bg-stone-50/30 transition-colors"
                    >
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 shadow-sm group-hover:scale-105 transition-transform">
                            <Avatar src={member.photoURL} alt={member.displayName} size="lg" />
                          </div>
                          <div>
                            <div className="font-bold text-stone-900 flex items-center gap-2">
                              {member.displayName}
                              {member.role === 'admin' && <Shield className="w-3.5 h-3.5 text-primary fill-primary/10" />}
                            </div>
                            <div className="text-stone-400 text-xs font-medium flex items-center gap-1.5 mt-0.5">
                              <Mail className="w-3 h-3" /> {member.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="relative inline-block group/role">
                          <span className={`
                            px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2
                            ${member.role === 'admin' ? 'bg-primary/10 text-primary border border-primary/20' : 
                              member.role === 'chef' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 
                              member.role === 'collaborator' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 
                              'bg-stone-100 text-stone-500 border border-stone-200'}
                          `}>
                            {member.role === 'admin' ? 'Admin' : 
                             member.role === 'chef' ? 'Chef' :
                             member.role === 'collaborator' ? 'Colaborador' : 'Membro'}
                            <ChevronDown className="w-3 h-3 opacity-50" />
                          </span>
                          
                          {/* Role Select Dropdown on Hover */}
                          <div className="absolute top-full left-0 mt-2 bg-white rounded-2xl shadow-2xl border border-stone-100 opacity-0 invisible group-hover/role:opacity-100 group-hover/role:visible transition-all z-20 py-2 min-w-[160px]">
                            {['member', 'collaborator', 'chef', 'admin'].map(r => (
                              <button
                                key={r}
                                disabled={updatingUid === member.uid}
                                onClick={() => handleUpdateRole(member.uid, r)}
                                className={`
                                  w-full text-left px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-stone-50 transition-colors flex items-center justify-between
                                  ${member.role === r ? 'text-primary' : 'text-stone-500'}
                                `}
                              >
                                {r === 'member' ? 'Membro' : r === 'collaborator' ? 'Colaborador' : r === 'chef' ? 'Chef' : 'Admin'}
                                {member.role === r && <UserCheck className="w-3.5 h-3.5" />}
                              </button>
                            ))}
                          </div>
                        </div>
                        {updatingUid === member.uid && (
                          <div className="mt-2 flex items-center gap-2 text-[10px] font-bold text-primary">
                            <Loader2 className="w-3 h-3 animate-spin" /> Atualizando...
                          </div>
                        )}
                      </td>
                      <td className="px-8 py-6">
                        <div className="text-sm font-medium text-stone-600">
                          {member.state}, {member.country}
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link 
                            to={`/profile/${member.uid}`}
                            className="p-2.5 text-stone-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                            title="Ver Perfil"
                          >
                            <UserPlus className="w-5 h-5" />
                          </Link>
                          <button 
                            className="p-2.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                            title="Banir"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
            
            {filteredMembers.length === 0 && (
              <div className="p-24 text-center">
                <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Search className="w-8 h-8 text-stone-200" />
                </div>
                <h3 className="text-xl font-bold text-stone-900 mb-2">Nenhum membro encontrado</h3>
                <p className="text-stone-500">Tente ajustar seus filtros de busca ou role.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Summary Footer */}
      <div className="mt-8 flex flex-wrap gap-4">
        <div className="bg-stone-50 px-6 py-4 rounded-3xl border border-stone-100 flex items-center gap-4">
          <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm text-primary">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-stone-400">Total de Membros</div>
            <div className="text-xl font-bold text-stone-900">{members.length} Alquimistas</div>
          </div>
        </div>
        
        <div className="bg-stone-50 px-6 py-4 rounded-3xl border border-stone-100 flex items-center gap-4">
          <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm text-amber-500">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-stone-400">Colaboradores Ativos</div>
            <div className="text-xl font-bold text-stone-900">{members.filter(m => m.role === 'collaborator').length}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
