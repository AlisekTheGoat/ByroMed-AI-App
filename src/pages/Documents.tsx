import React, { useEffect, useState } from 'react';

type StoredDoc = { name: string; path: string; size: number; addedAt: number };

const Documents = () => {
  const [docs, setDocs] = useState<StoredDoc[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const load = async () => {
    try {
      setLoading(true);
      const list = await window.api.docs.list();
      // newest first
      setDocs(list.sort((a: StoredDoc, b: StoredDoc) => b.addedAt - a.addedAt));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleUpload = async () => {
    setLoading(true);
    try {
      const saved = await window.api.docs.pickAndSave();
      if (saved.length > 0) await load();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (name: string) => {
    const ok = confirm(`Smazat dokument "${name}"?`);
    if (!ok) return;
    setLoading(true);
    try {
      await window.api.docs.delete(name);
      await load();
    } finally {
      setLoading(false);
    }
  };

  const fmtSize = (n: number) => {
    if (n < 1024) return `${n} B`;
    if (n < 1024*1024) return `${(n/1024).toFixed(1)} KB`;
    return `${(n/1024/1024).toFixed(1)} MB`;
  };

  const fmtDate = (ms: number) => new Date(ms).toLocaleString('cs-CZ');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dokumenty</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Správa vašich lékařských dokumentů a zpráv
          </p>
        </div>
        <button onClick={handleUpload} disabled={loading} className="btn btn-primary disabled:opacity-60">
          <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          {loading ? 'Pracuji…' : 'Nahrát dokument'}
        </button>
      </div>

      <div className="card p-5">
        <div className="text-sm text-gray-600 dark:text-gray-300">Uloženo lokálně v adresáři aplikace. Celkem: {docs.length} souborů.</div>

        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Nedávné dokumenty</h3>
            <button className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
              Zobrazit vše
            </button>
          </div>
          
          <div className="overflow-hidden border border-gray-200 dark:border-gray-700 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Název</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Velikost</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Přidáno</th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Akce</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {docs.length === 0 ? (
                  <tr>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300" colSpan={4}>Zatím žádné dokumenty.</td>
                  </tr>
                ) : (
                  docs.map((doc) => (
                    <tr key={doc.name} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{doc.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{fmtSize(doc.size)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{fmtDate(doc.addedAt)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                        <a className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300" href={`file://${doc.path}`}>Otevřít</a>
                        <button onClick={()=>handleDelete(doc.name)} className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300">Smazat</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Documents;
