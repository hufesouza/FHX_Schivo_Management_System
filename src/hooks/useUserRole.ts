import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type AppRole = 'admin' | 'engineering' | 'operations' | 'quality' | 'npi' | 'supply_chain';

export function useUserRole() {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRole() {
      // Don't set loading=false until auth is done loading
      if (authLoading) {
        console.log('useUserRole: Auth still loading, waiting...');
        return;
      }
      
      if (!user) {
        console.log('useUserRole: No user, setting role to null');
        setRole(null);
        setLoading(false);
        return;
      }

      console.log('useUserRole: Fetching role for user:', user.id);
      
      try {
        // Fetch all roles for the user (they may have multiple)
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        console.log('useUserRole: Query result:', { data, error });

        if (error) {
          console.error('Error fetching user role:', error);
          setRole(null);
        } else if (data && data.length > 0) {
          // User has at least one role - use the first one
          // Priority: admin > engineering > operations > quality > npi > supply_chain
          const rolePriority: AppRole[] = ['admin', 'engineering', 'operations', 'quality', 'npi', 'supply_chain'];
          const userRoles = data.map(r => r.role as AppRole);
          const primaryRole = rolePriority.find(r => userRoles.includes(r)) || userRoles[0];
          console.log('useUserRole: User has roles:', userRoles, 'Using primary:', primaryRole);
          setRole(primaryRole);
        } else {
          console.log('useUserRole: No roles found');
          setRole(null);
        }
      } catch (err) {
        console.error('Error fetching user role:', err);
        setRole(null);
      } finally {
        setLoading(false);
      }
    }

    fetchRole();
  }, [user, authLoading]);

  // Check if user can edit a specific section
  const canEditSection = (section: 'header' | 'engineering' | 'operations' | 'quality' | 'programming' | 'handover' | 'npi-final' | 'supply-chain'): boolean => {
    if (!role) return false;
    if (role === 'admin') return true;
    
    switch (section) {
      case 'header':
        // Header can be edited by anyone with a role
        return true;
      case 'engineering':
        return role === 'engineering';
      case 'operations':
        return role === 'operations';
      case 'quality':
        return role === 'quality';
      case 'programming':
        // Programming review can be done by engineering
        return role === 'engineering';
      case 'handover':
        // Handover can be edited by engineering, operations, and quality (each signs their section)
        return role === 'engineering' || role === 'operations' || role === 'quality';
      case 'npi-final':
        return role === 'npi';
      case 'supply-chain':
        return role === 'supply_chain';
      default:
        return false;
    }
  };

  return {
    role,
    loading,
    canEditSection,
    hasRole: !!role,
  };
}
