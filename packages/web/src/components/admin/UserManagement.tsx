'use client';

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  AlertCircle, 
  MoreHorizontal, 
  UserCog, 
  UserX,
  Download,
  Search,
  RotateCw,
  CheckCircle,
  XCircle,
  Shield,
  FileText,
  Eye,
  Lock,
  Unlock,
  Edit,
  UserPlus
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { adminApi } from '@/lib/api/admin';
import { formatDate } from '@/lib/utils/formatters';
import { UserDetailView } from './UserDetailView';
import { BlockUserDialog } from './BlockUserDialog';
import { ExportDialog } from './ExportDialog';

// Types for user data
interface User {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive' | 'suspended' | 'pending' | 'blocked';
  role: 'user' | 'admin';
  createdAt: string;
  lastLogin?: string;
  verificationStatus: 'verified' | 'unverified' | 'pending';
  blockedUntil?: string;
}

export function UserManagement() {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [verificationFilter, setVerificationFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false);
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      // In a real app, this would be an API call
      // const data = await adminApi.getUsers();
      // setUsers(data);
      
      // Mock data for demonstration
      const mockUsers: User[] = [
        {
          id: '1',
          name: 'Juan Pérez',
          email: 'juan.perez@example.com',
          status: 'active',
          role: 'user',
          createdAt: '2023-01-15T10:30:00Z',
          lastLogin: '2023-06-01T08:45:00Z',
          verificationStatus: 'verified',
        },
        {
          id: '2',
          name: 'María González',
          email: 'maria.gonzalez@example.com',
          status: 'active',
          role: 'admin',
          createdAt: '2023-02-20T14:15:00Z',
          lastLogin: '2023-06-02T11:30:00Z',
          verificationStatus: 'verified',
        },
        {
          id: '3',
          name: 'Carlos Rodríguez',
          email: 'carlos.rodriguez@example.com',
          status: 'inactive',
          role: 'user',
          createdAt: '2023-03-05T09:45:00Z',
          lastLogin: '2023-05-15T16:20:00Z',
          verificationStatus: 'verified',
        },
        {
          id: '4',
          name: 'Ana López',
          email: 'ana.lopez@example.com',
          status: 'suspended',
          role: 'user',
          createdAt: '2023-04-10T13:00:00Z',
          lastLogin: '2023-05-10T10:05:00Z',
          verificationStatus: 'unverified',
        },
        {
          id: '5',
          name: 'Roberto Martínez',
          email: 'roberto.martinez@example.com',
          status: 'pending',
          role: 'user',
          createdAt: '2023-05-25T15:30:00Z',
          verificationStatus: 'pending',
        },
        {
          id: '6',
          name: 'Laura Sánchez',
          email: 'laura.sanchez@example.com',
          status: 'active',
          role: 'user',
          createdAt: '2023-01-30T11:20:00Z',
          lastLogin: '2023-06-03T09:15:00Z',
          verificationStatus: 'verified',
        },
        {
          id: '7',
          name: 'Miguel Hernández',
          email: 'miguel.hernandez@example.com',
          status: 'active',
          role: 'user',
          createdAt: '2023-02-15T16:45:00Z',
          lastLogin: '2023-05-28T14:30:00Z',
          verificationStatus: 'verified',
        },
        {
          id: '8',
          name: 'Isabel Díaz',
          email: 'isabel.diaz@example.com',
          status: 'inactive',
          role: 'user',
          createdAt: '2023-03-20T10:10:00Z',
          lastLogin: '2023-04-15T11:55:00Z',
          verificationStatus: 'unverified',
        },
      ];
      
      setUsers(mockUsers);
      setFilteredUsers(mockUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los usuarios',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    // Filter users based on search term and filters
    let result = users;

    if (searchTerm) {
      const lowercasedSearch = searchTerm.toLowerCase();
      result = result.filter(
        user =>
          user.name.toLowerCase().includes(lowercasedSearch) ||
          user.email.toLowerCase().includes(lowercasedSearch)
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter(user => user.status === statusFilter);
    }

    if (verificationFilter !== 'all') {
      result = result.filter(user => user.verificationStatus === verificationFilter);
    }

    setFilteredUsers(result);
  }, [users, searchTerm, statusFilter, verificationFilter]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const aVal = a[sortField as keyof User] ?? '';
    const bVal = b[sortField as keyof User] ?? '';
    const cmp = String(aVal).localeCompare(String(bVal));
    return sortDirection === 'asc' ? cmp : -cmp;
  });

  const totalPages = Math.ceil(sortedUsers.length / pageSize);
  const paginatedUsers = sortedUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsEditDialogOpen(true);
  };

  const handleViewUserDetails = (userId: string) => {
    setViewingUserId(userId);
  };

  const handleBackFromDetails = () => {
    setViewingUserId(null);
  };

  const handleBlockUser = async (
    userId: string,
    reason: string,
    duration: 'temporary' | 'permanent',
    durationDays?: number,
    notifyUser = true,
    comments?: string
  ) => {
    try {
      setIsLoading(true);
      
      const response = await adminApi.blockUser({
        userId,
        reason,
        permanent: duration === 'permanent',
        durationDays: durationDays || 0,
        notifyUser,
        comments
      });
      
      // Update the user in the local state
      setUsers(prev => 
        prev.map(user => 
          user.id === userId 
            ? { ...user, status: 'blocked', blockedUntil: response.blockedUntil } 
            : user
        )
      );
      
      toast({
        title: 'Usuario bloqueado',
        description: `El usuario ha sido bloqueado ${duration === 'permanent' ? 'permanentemente' : `por ${durationDays} días`}.`,
      });
    } catch (error) {
      console.error('Error blocking user:', error);
      toast({
        title: 'Error',
        description: 'No se pudo bloquear al usuario. Intente nuevamente.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnblockUser = async (userId: string) => {
    try {
      setIsLoading(true);
      
      await adminApi.unblockUser({ 
        userId,
        adminId: 'current-admin-id',
        adminName: 'Administrador',
        reason: 'Desbloqueo manual',
        notifyUser: true
      });
      
      // Update the user in the local state
      setUsers(prev => 
        prev.map(user => 
          user.id === userId 
            ? { ...user, status: 'active', blockedUntil: undefined } 
            : user
        )
      );
      
      toast({
        title: 'Usuario desbloqueado',
        description: 'El usuario ha sido desbloqueado correctamente.',
      });
    } catch (error) {
      console.error('Error unblocking user:', error);
      toast({
        title: 'Error',
        description: 'No se pudo desbloquear al usuario. Intente nuevamente.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveUserChanges = async () => {
    if (!selectedUser) return;
    
    try {
      // In a real app, this would be an API call
      // await adminApi.updateUser(selectedUser.id, {
      //   status: selectedUser.status,
      //   role: selectedUser.role,
      // });
      
      // Update local state
      setUsers(users.map(user => 
        user.id === selectedUser.id ? selectedUser : user
      ));
      
      toast({
        title: 'Usuario actualizado',
        description: `Los cambios para ${selectedUser.name} se han guardado correctamente`,
      });
      
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el usuario',
        variant: 'destructive',
      });
    }
  };

  const handleStatusChange = (status: string) => {
    if (!selectedUser) return;
    
    setSelectedUser({
      ...selectedUser,
      status: status as User['status'],
    });
  };

  const handleRoleChange = (role: string) => {
    if (!selectedUser) return;
    
    setSelectedUser({
      ...selectedUser,
      role: role as User['role'],
    });
  };

  const getStatusBadge = (status: User['status'], blockedUntil?: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Activo</Badge>;
      case 'inactive':
        return <Badge variant="outline">Inactivo</Badge>;
      case 'suspended':
      case 'blocked':
        return (
          <div className="flex flex-col gap-1">
            <Badge variant="destructive">
              {status === 'blocked' ? 'Bloqueado' : 'Suspendido'}
            </Badge>
            {blockedUntil && (
              <span className="text-xs text-muted-foreground">
                Hasta: {formatDate(blockedUntil)}
              </span>
            )}
          </div>
        );
      case 'pending':
        return <Badge variant="secondary">Pendiente</Badge>;
      default:
        return null;
    }
  };

  const getVerificationBadge = (status: User['verificationStatus']) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-blue-500">Verificado</Badge>;
      case 'unverified':
        return <Badge variant="outline" className="border-amber-500 text-amber-500">No verificado</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pendiente</Badge>;
      default:
        return null;
    }
  };

  // Si estamos viendo los detalles de un usuario, mostrar esa vista
  if (viewingUserId) {
    return (
      <UserDetailView 
        userId={viewingUserId} 
        onBack={handleBackFromDetails} 
      />
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Gestión de Usuarios</CardTitle>
        <CardDescription>
          Administra los usuarios registrados en la plataforma
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger className="w-[150px] h-9">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="active">Activos</SelectItem>
                  <SelectItem value="inactive">Inactivos</SelectItem>
                  <SelectItem value="suspended">Suspendidos</SelectItem>
                  <SelectItem value="pending">Pendientes</SelectItem>
                  <SelectItem value="blocked">Bloqueados</SelectItem>
                </SelectContent>
              </Select>
              
              <Select
                value={verificationFilter}
                onValueChange={setVerificationFilter}
              >
                <SelectTrigger className="w-[150px] h-9">
                  <SelectValue placeholder="Verificación" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="verified">Verificados</SelectItem>
                  <SelectItem value="unverified">No verificados</SelectItem>
                  <SelectItem value="pending">Pendientes</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2 h-9"
                onClick={() => setIsExportDialogOpen(true)}
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Exportar</span>
              </Button>
            </div>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center py-6">
              <RotateCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort('name')}>
                      Usuario {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort('status')}>
                      Estado {sortField === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort('verificationStatus')}>
                      Verificación {sortField === 'verificationStatus' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort('role')}>
                      Rol {sortField === 'role' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort('createdAt')}>
                      Fecha Registro {sortField === 'createdAt' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort('lastLogin')}>
                      Último Acceso {sortField === 'lastLogin' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                        No se encontraron usuarios
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </TableCell>
                        <TableCell>{getStatusBadge(user.status, user.blockedUntil)}</TableCell>
                        <TableCell>{getVerificationBadge(user.verificationStatus)}</TableCell>
                        <TableCell>
                          {user.role === 'admin' ? (
                            <Badge className="bg-purple-500">
                              <Shield className="h-3 w-3 mr-1" />
                              Admin
                            </Badge>
                          ) : 'Usuario'}
                        </TableCell>
                        <TableCell>{formatDate(user.createdAt)}</TableCell>
                        <TableCell>
                          {user.lastLogin ? formatDate(user.lastLogin) : 'Nunca'}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Abrir menú</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => handleViewUserDetails(user.id)}>
                                <Eye className="h-4 w-4 mr-2" />
                                Ver detalles
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditUser(user)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Editar usuario
                              </DropdownMenuItem>
                              {user.status === 'blocked' || user.status === 'suspended' ? (
                                <DropdownMenuItem onClick={() => handleUnblockUser(user.id)}>
                                  <Unlock className="h-4 w-4 mr-2 text-green-500" />
                                  Desbloquear usuario
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setIsBlockDialogOpen(true);
                                  }}
                                >
                                  <Lock className="h-4 w-4 mr-2" />
                                  Bloquear usuario
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
          
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Filas por página:</span>
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}>
                <SelectTrigger className="w-[70px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">
                {filteredUsers.length === 0 ? '0' : `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, filteredUsers.length)}`} de {filteredUsers.length} usuarios
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
                «
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                Anterior
              </Button>
              <span className="text-sm px-2">Página {currentPage} de {totalPages || 1}</span>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>
                Siguiente
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(totalPages)} disabled={currentPage >= totalPages}>
                »
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
      
      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>
              Modifica los detalles del usuario. Haz clic en guardar cuando termines.
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={selectedUser.name}
                  readOnly
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={selectedUser.email}
                  readOnly
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Estado</Label>
                <Select
                  value={selectedUser.status}
                  onValueChange={handleStatusChange}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Selecciona un estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="inactive">Inactivo</SelectItem>
                    <SelectItem value="suspended">Suspendido</SelectItem>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="blocked">Bloqueado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Rol</Label>
                <Select
                  value={selectedUser.role}
                  onValueChange={handleRoleChange}
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Selecciona un rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuario</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveUserChanges}>Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Block User Dialog */}
      <BlockUserDialog
        open={isBlockDialogOpen}
        onOpenChange={setIsBlockDialogOpen}
        user={selectedUser}
        onBlock={handleBlockUser}
        currentAdminId="current-admin-id"
        currentAdminName="Administrador"
      />

      {/* Export Dialog */}
      <ExportDialog
        open={isExportDialogOpen}
        onOpenChange={setIsExportDialogOpen}
        userCount={filteredUsers.length}
        filters={{ status: statusFilter, verificationStatus: verificationFilter, search: searchTerm }}
      />
    </Card>
  );
} 