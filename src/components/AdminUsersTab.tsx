import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Shield, Users, Crown, Search, UserCheck, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AddExternalUserDialog } from './AddExternalUserDialog';

interface User {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  organization?: string | null;
  created_at: string;
  user_roles?: {
    role: 'admin' | 'member';
  }[];
}

interface AdminUsersTabProps {
  users: User[];
  updateUserRole: (userId: string, newRole: 'admin' | 'member') => Promise<void>;
  loading?: boolean;
  onUserCreated?: () => void;
}

export function AdminUsersTab({ users, updateUserRole, loading, onUserCreated }: AdminUsersTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'member'>('all');
  const [showAddExternalUser, setShowAddExternalUser] = useState(false);
  const { toast } = useToast();

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.organization || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const currentRole = user.user_roles?.[0]?.role || 'member';
    const matchesRole = roleFilter === 'all' || currentRole === roleFilter;
    
    return matchesSearch && matchesRole;
  }).sort((a, b) => {
    // Sort by role first (admin before member), then by email
    const roleA = a.user_roles?.[0]?.role || 'member';
    const roleB = b.user_roles?.[0]?.role || 'member';
    
    if (roleA !== roleB) {
      return roleA === 'admin' ? -1 : 1;
    }
    
    // Then sort by email
    return a.email.localeCompare(b.email);
  });

  const adminCount = users.filter(user => user.user_roles?.[0]?.role === 'admin').length;
  const memberCount = users.filter(user => user.user_roles?.[0]?.role === 'member').length;

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'member') => {
    try {
      await updateUserRole(userId, newRole);
      toast({
        title: 'Role Updated',
        description: `User role has been successfully updated to ${newRole}.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update user role. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const getRoleBadgeProps = (role?: string) => {
    switch (role) {
      case 'admin':
        return {
          variant: 'default' as const,
          className: 'bg-primary text-primary-foreground',
          icon: Crown
        };
      case 'member':
      default:
        return {
          variant: 'secondary' as const,
          className: 'bg-muted text-muted-foreground',
          icon: UserCheck
        };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <Shield className="h-6 w-6" />
          Admin Users Management
        </h2>
        <p className="text-muted-foreground mt-2">
          Manage user roles and administrative privileges for registered members
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Crown className="h-4 w-4" />
              Admin Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{adminCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Member Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{memberCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Admin User Assignments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users by name, email, or organization..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowAddExternalUser(true)}
                className="whitespace-nowrap"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add External User
              </Button>
              <Select value={roleFilter} onValueChange={(value: 'all' | 'admin' | 'member') => setRoleFilter(value)}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin Only</SelectItem>
                  <SelectItem value="member">Member Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Users List */}
          <div className="space-y-2">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No users found matching your criteria.</p>
              </div>
            ) : (
              filteredUsers.map((user) => {
                const currentRole = user.user_roles?.[0]?.role || 'member';
                const badgeProps = getRoleBadgeProps(currentRole);
                const BadgeIcon = badgeProps.icon;
                const userName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unnamed User';
                const isProtectedAdmin = user.email === 'keith.fowlkes@hessconsortium.org';

                return (
                  <Card key={user.user_id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">
                              {userName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-foreground truncate">
                              {userName}
                            </p>
                            <Badge variant={badgeProps.variant} className={badgeProps.className}>
                              <BadgeIcon className="h-3 w-3 mr-1" />
                              {currentRole}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                          {user.organization && (
                            <p className="text-xs text-muted-foreground truncate">{user.organization}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {currentRole === 'member' ? (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Crown className="h-4 w-4 mr-1" />
                                Make Admin
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Promote to Administrator</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to promote <strong>{userName}</strong> to administrator? 
                                  This will give them full system access and privileges.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleRoleChange(user.user_id, 'admin')}
                                  className="bg-primary hover:bg-primary/90"
                                >
                                  Promote to Admin
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        ) : (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                disabled={isProtectedAdmin}
                              >
                                <UserCheck className="h-4 w-4 mr-1" />
                                Remove Admin
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove Administrator Privileges</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to remove administrator privileges from <strong>{userName}</strong>? 
                                  They will become a regular member with limited access.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleRoleChange(user.user_id, 'member')}
                                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                                >
                                  Remove Admin
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                        {isProtectedAdmin && (
                          <Badge variant="outline" className="text-xs">
                            Protected
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      <AddExternalUserDialog
        open={showAddExternalUser}
        onOpenChange={setShowAddExternalUser}
        onUserCreated={() => {
          onUserCreated?.();
          setShowAddExternalUser(false);
        }}
      />
    </div>
  );
}