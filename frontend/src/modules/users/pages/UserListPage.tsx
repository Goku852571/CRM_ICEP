import { useState, useEffect } from 'react';
import { getUsers, deleteUser, User } from '@/modules/users/services/userService';
import { useAuth } from '@/shared/hooks/useAuth';
import UserForm from '../components/UserForm';

export default function UserListPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const { hasPermission } = useAuth();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await getUsers(1, search);
      setUsers(response.data); // Using .data directly because service returns the body
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search]);

  const handleDelete = async (id: number) => {
    if (window.confirm('¿Estás seguro de eliminar este usuario?')) {
      try {
        await deleteUser(id);
        fetchUsers();
      } catch (error) {
        alert('Error al eliminar usuario');
      }
    }
  };

  const handleCreate = () => {
    setSelectedUser(null);
    setIsModalOpen(true);
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Gestión de Usuarios</h1>
        {hasPermission('users.create') && (
          <button 
            onClick={handleCreate}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Nuevo Usuario
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow border overflow-hidden">
        <div className="p-4 border-b">
          <input
            type="text"
            placeholder="Buscar por nombre o correo..."
            className="w-full md:w-1/3 border p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 text-gray-600 font-medium">
              <tr>
                <th className="px-6 py-3 border-b">Nombre</th>
                <th className="px-6 py-3 border-b">Email</th>
                <th className="px-6 py-3 border-b">Roles</th>
                <th className="px-6 py-3 border-b text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-gray-500">Cargando usuarios...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-gray-500">No se encontraron usuarios.</td>
                </tr>
              ) : (
                users.map((user: User) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 font-medium text-gray-900">{user.name}</td>
                    <td className="px-6 py-4 text-gray-600">{user.email}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1 flex-wrap">
                        {user.roles.map((role: { id: number; name: string }) => (
                          <span key={role.id} className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-medium">
                            {role.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                       {hasPermission('users.edit') && (
                         <button 
                           onClick={() => handleEdit(user)}
                           className="text-blue-600 hover:text-blue-800 font-medium"
                         >
                           Editar
                         </button>
                       )}
                       {hasPermission('users.create') && (
                         <button onClick={() => handleDelete(user.id)} className="text-red-600 hover:text-red-800 font-medium">Eliminar</button>
                       )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <UserForm
          user={selectedUser}
          onClose={() => setIsModalOpen(false)}
          onSuccess={fetchUsers}
        />
      )}
    </div>
  );
}
