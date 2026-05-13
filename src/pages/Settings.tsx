import { useState, useEffect } from "react";
import { Plus, MapPin, Edit2, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { usersApi } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

export function Settings() {
  const { user, role } = useAuth();
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'operator',
    job_title: ''
  });

  const canManage = role === 'owner' || role === 'admin';

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await usersApi.list();
      setUsersList(res.users);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleOpenModal = (userToEdit: any = null) => {
    if (userToEdit) {
      setEditingUser(userToEdit);
      setFormData({
        email: userToEdit.email,
        password: '',
        full_name: userToEdit.full_name,
        role: userToEdit.role,
        job_title: userToEdit.job_title || ''
      });
    } else {
      setEditingUser(null);
      setFormData({ email: '', password: '', full_name: '', role: 'operator', job_title: '' });
    }
    setIsModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        // Update
        const payload: any = {
          full_name: formData.full_name,
          role: formData.role,
          job_title: formData.job_title
        };
        await usersApi.update(editingUser.id, payload);
      } else {
        // Create
        await usersApi.create(formData);
      }
      setIsModalOpen(false);
      loadUsers();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar usuário');
    }
  };

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    try {
      await usersApi.update(userId, { is_active: !currentStatus });
      loadUsers();
    } catch (err) {
      alert('Erro ao alterar status');
    }
  };

  const getRoleLabel = (roleId: string, jobTitle?: string) => {
    if (jobTitle) return jobTitle;
    const map: any = {
      owner: 'Proprietário',
      admin: 'Gerente / Admin',
      operator: 'Operador (Padrão)',
      viewer: 'Visualizador'
    };
    return map[roleId] || roleId;
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      <h2 className="text-xl font-bold dark:text-white">Configuração</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full max-w-5xl">
        
        {/* Personalização (Mantido como Visual) */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
          <h3 className="font-semibold text-lg dark:text-white mb-2">Personalização</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">Mude as cores do sistema</p>

          <div className="flex flex-wrap gap-4 mb-6">
             <button className="w-16 h-10 rounded border-2 border-emerald-500 bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]"></button>
             <button className="w-16 h-10 rounded border-2 border-transparent bg-indigo-500"></button>
             <button className="w-32 h-10 rounded border-2 border-transparent bg-orange-500"></button>
          </div>
        </div>

        {/* Logo (Mantido como Visual) */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center">
           <h3 className="font-semibold text-lg dark:text-white mb-6 w-full text-left">Upload de logo</h3>
           
           <div className="w-32 h-32 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border-2 border-dashed border-zinc-300 dark:border-zinc-700 flex flex-col items-center justify-center mb-6 text-zinc-400 hover:border-emerald-500 hover:text-emerald-500 cursor-pointer">
              <div className="w-12 h-12 bg-emerald-500 text-white rounded flex items-center justify-center font-bold text-2xl mb-2">
                S
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-900 dark:text-white">SOLUÇÕES</span>
           </div>

           <button className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-4 py-2 rounded-lg text-sm font-medium">
              Carregar Logo
           </button>
        </div>

        {/* Usuários Ativos - AGORA FUNCIONAL */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm lg:col-span-2">
           <div className="flex items-center justify-between mb-6">
             <h3 className="font-semibold text-lg dark:text-white">Equipe e Atendentes ({usersList.length})</h3>
             {canManage && (
               <button 
                 onClick={() => handleOpenModal()}
                 className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
               >
                 <Plus size={16} /> Adicionar Usuário
               </button>
             )}
           </div>
           
           <div className="space-y-4">
             {loading ? (
               <div className="text-zinc-500 text-sm">Carregando usuários...</div>
             ) : (
               <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left">
                   <thead className="text-xs text-zinc-500 uppercase bg-zinc-50 dark:bg-zinc-800/50 dark:text-zinc-400">
                     <tr>
                       <th className="px-4 py-3 rounded-l-lg">Nome / Email</th>
                       <th className="px-4 py-3">Cargo (Função)</th>
                       <th className="px-4 py-3">Nível Acesso</th>
                       <th className="px-4 py-3">Status</th>
                       <th className="px-4 py-3 rounded-r-lg">Ações</th>
                     </tr>
                   </thead>
                   <tbody>
                     {usersList.map((u) => (
                       <tr key={u.id} className="border-b border-zinc-100 dark:border-zinc-800/50">
                         <td className="px-4 py-3">
                           <div className="font-medium text-zinc-900 dark:text-white">{u.full_name}</div>
                           <div className="text-xs text-zinc-500">{u.email}</div>
                         </td>
                         <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                           {u.job_title || '-'}
                         </td>
                         <td className="px-4 py-3">
                           <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
                             {u.role === 'owner' ? 'Proprietário' : 
                              u.role === 'admin' ? 'Admin' : 
                              u.role === 'operator' ? 'Operador' : 'Visualizador'}
                           </span>
                         </td>
                         <td className="px-4 py-3">
                           {u.is_active ? (
                             <span className="flex items-center text-emerald-500 text-xs font-medium"><CheckCircle2 size={14} className="mr-1"/> Ativo</span>
                           ) : (
                             <span className="flex items-center text-red-500 text-xs font-medium"><XCircle size={14} className="mr-1"/> Inativo</span>
                           )}
                         </td>
                         <td className="px-4 py-3 flex gap-2">
                           {canManage && u.id !== user?.id && u.role !== 'owner' && (
                             <>
                               <button 
                                 onClick={() => handleOpenModal(u)}
                                 className="p-1.5 text-zinc-400 hover:text-blue-500 transition-colors"
                                 title="Editar"
                               >
                                 <Edit2 size={16} />
                               </button>
                               <button 
                                 onClick={() => handleToggleActive(u.id, u.is_active)}
                                 className="p-1.5 text-zinc-400 hover:text-amber-500 transition-colors"
                                 title={u.is_active ? "Inativar" : "Reativar"}
                               >
                                 {u.is_active ? <Trash2 size={16} /> : <CheckCircle2 size={16} />}
                               </button>
                             </>
                           )}
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             )}
           </div>
        </div>

      </div>

      {/* Modal de Criação / Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
              <h3 className="font-bold text-lg dark:text-white">
                {editingUser ? 'Editar Usuário' : 'Novo Usuário (Atendente)'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <XCircle size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Nome Completo</label>
                <input 
                  type="text" required
                  value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">E-mail (Login)</label>
                <input 
                  type="email" required disabled={!!editingUser}
                  value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500 disabled:opacity-50 dark:text-white"
                />
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Senha Provisória</label>
                  <input 
                    type="password" required minLength={8}
                    value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:text-white"
                  />
                  <p className="text-xs text-zinc-500 mt-1">Mínimo 8 caracteres.</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Cargo Visível</label>
                  <input 
                    type="text" placeholder="Ex: Vendedor, Caixa, Estoquista"
                    value={formData.job_title} onChange={e => setFormData({...formData, job_title: e.target.value})}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Permissões de Sistema</label>
                  <select 
                    value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:text-white"
                  >
                    <option value="admin">Gerente (Admin - Total Acesso)</option>
                    <option value="operator">Operador (Vendas, Caixa, Estoque)</option>
                    <option value="viewer">Visualizador (Apenas Leitura)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-900 font-medium">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors">
                  {editingUser ? 'Salvar Alterações' : 'Criar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}