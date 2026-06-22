import React, { useEffect, useState } from 'react';
import { BookOpen, Check, Loader2, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UnansweredQuery {
  id: string;
  queryText: string;
  context: string | null;
  status: string;
  createdAt: string;
  user: { displayName: string, email: string } | null;
}

export function AdminKnowledgeWallet() {
  const [queries, setQueries] = useState<UnansweredQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchQueries();
  }, []);

  const fetchQueries = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('app_api_key') || import.meta.env.VITE_APP_API_KEY || 'development_key';
      const res = await fetch('/api/admin/unanswered-queries', {
        headers: {
          'x-api-key': token
        }
      });
      const data = await res.json();
      if (data.success && data.queries) {
        setQueries(data.queries);
      }
    } catch (err) {
      console.error('Failed to fetch unanswered queries:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      setUpdating(id);
      const token = localStorage.getItem('app_api_key') || import.meta.env.VITE_APP_API_KEY || 'development_key';
      const res = await fetch(`/api/admin/unanswered-queries/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': token
        },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.success) {
        setQueries(queries.map(q => q.id === id ? { ...q, status } : q));
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  const pendingCount = queries.filter(q => q.status === 'PENDING').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-amber-500 flex items-center">
            <BookOpen className="w-6 h-6 mr-3" />
            Carteira de Questões
          </h2>
          <p className="text-stone-400 text-sm mt-1">
            Termos, receitas ou dúvidas não compreendidas pela IA que aguardam inclusão no Acervo.
          </p>
        </div>
        <div className="bg-stone-900 border border-stone-800 rounded-lg px-4 py-2 text-center">
          <span className="block text-2xl font-bold text-amber-500">{pendingCount}</span>
          <span className="text-xs text-stone-500 uppercase tracking-wider">Pendentes</span>
        </div>
      </div>

      <div className="grid gap-4">
        {queries.map(query => (
          <div key={query.id} className={`p-5 rounded-xl border ${query.status === 'RESOLVED' ? 'bg-stone-900/50 border-stone-800' : 'bg-stone-900 border-amber-900/50'}`}>
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="flex items-center space-x-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${query.status === 'RESOLVED' ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-500'}`}>
                    {query.status === 'RESOLVED' ? 'INCLUÍDO' : 'PENDENTE'}
                  </span>
                  <span className="text-xs text-stone-500">
                    {format(new Date(query.createdAt), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
                
                <h3 className={`text-lg font-medium ${query.status === 'RESOLVED' ? 'text-stone-400 line-through decoration-stone-600' : 'text-stone-200'}`}>
                  "{query.queryText}"
                </h3>
                
                {query.user && (
                  <p className="text-sm text-stone-500">
                    Perguntado por <span className="text-stone-300">{query.user.displayName}</span>
                  </p>
                )}
              </div>

              {query.status === 'PENDING' && (
                <div className="flex items-center space-x-2">
                  <button
                    disabled={updating === query.id}
                    onClick={() => handleUpdateStatus(query.id, 'RESOLVED')}
                    className="flex items-center px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {updating === query.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                    Marcar como Incluído
                  </button>
                </div>
              )}

              {query.status === 'RESOLVED' && (
                <div className="flex items-center space-x-2">
                  <button
                    disabled={updating === query.id}
                    onClick={() => handleUpdateStatus(query.id, 'PENDING')}
                    className="flex items-center px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {updating === query.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                    Desfazer
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {queries.length === 0 && (
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-8 text-center">
            <BookOpen className="w-12 h-12 text-stone-700 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-stone-300 mb-1">Carteira Vazia</h3>
            <p className="text-stone-500">A IA respondeu a todas as perguntas corretamente ou ainda não foi testada.</p>
          </div>
        )}
      </div>
    </div>
  );
}
