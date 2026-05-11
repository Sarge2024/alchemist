import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, collection } from 'firebase/firestore';
import { AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react';

export default function FirebaseDebug() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const runTests = async () => {
    setLoading(true);
    const testResults = [];

    // Teste 1: Leitura em recipes (Público)
    try {
      await getDoc(doc(db, 'recipes', 'test-id-diagnostico'));
      testResults.push({ name: 'Leitura em recipes', status: 'Allowed', color: 'text-green-600', icon: CheckCircle });
    } catch (e: any) {
      testResults.push({ name: 'Leitura em recipes', status: 'Denied', error: e.message, color: 'text-red-600', icon: XCircle });
    }

    // Teste 2: Escrita em recipes (Privado)
    try {
      await setDoc(doc(db, 'recipes', 'test-write-diagnostico'), { title: 'Test' });
      testResults.push({ name: 'Escrita em recipes', status: 'Allowed (Warning: Should be Denied if not logged in!)', color: 'text-yellow-600', icon: AlertTriangle });
    } catch (e: any) {
      testResults.push({ name: 'Escrita em recipes', status: 'Denied (Correct behavior)', color: 'text-green-600', icon: CheckCircle });
    }

    // Teste 3: Leitura em outra coleção (Privado)
    try {
      await getDoc(doc(db, 'users', 'test-user-diagnostico'));
      testResults.push({ name: 'Leitura em users', status: 'Allowed (Warning: Should be Denied!)', color: 'text-yellow-600', icon: AlertTriangle });
    } catch (e: any) {
      testResults.push({ name: 'Leitura em users', status: 'Denied (Correct behavior)', color: 'text-green-600', icon: CheckCircle });
    }

    setResults(testResults);
    setLoading(false);
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
        <Info className="text-primary" /> Diagnóstico Firebase
      </h1>
      
      <div className="bg-surface-container p-6 rounded-3xl shadow-sm mb-6 border border-stone-100">
        <p className="text-on-surface-variant mb-4">
          Este painel executa testes de conexão reais contra o banco de dados configurado no aplicativo.
        </p>
        <button 
          onClick={runTests}
          disabled={loading}
          className="px-6 py-3 bg-primary text-on-primary rounded-xl font-bold hover:bg-primary/90 transition-all disabled:opacity-50"
        >
          {loading ? 'Executando...' : 'Rodar Testes de Permissão'}
        </button>
      </div>

      <div className="space-y-4">
        {results.map((res, i) => (
          <div key={i} className="flex flex-col p-4 bg-white rounded-2xl border border-stone-100 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-lg">{res.name}</span>
              <res.icon className={`w-6 h-6 ${res.color}`} />
            </div>
            <p className={`font-medium ${res.color}`}>{res.status}</p>
            {res.error && <p className="text-xs text-stone-400 mt-2 font-mono">{res.error}</p>}
          </div>
        ))}
      </div>

      <div className="mt-8 pt-8 border-t border-stone-100 text-xs text-stone-400 font-mono">
        <p>Configuração Atual:</p>
        <p>Project: {(db as any).app?.options?.projectId || 'Unknown'}</p>
        <p>Database: {(db as any).databaseId?.database || '(default)'}</p>
      </div>
    </div>
  );
}
