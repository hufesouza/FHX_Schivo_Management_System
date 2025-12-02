import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type AppRole = 'admin' | 'engineering' | 'operations' | 'quality' | 'npi' | 'supply_chain';

export function useUserRole() {
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRole() {
      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching user role:', error);
          setRole(null);
        } else {
          setRole(data?.role as AppRole || null);
        }
      } catch (err) {
        console.error('Error fetching user role:', err);
        setRole(null);
      } finally {
        setLoading(false);
      }
    }

    fetchRole();
  }, [user]);

  // Check if user can edit a specific section
  const canEditSection = (section: 'header' | 'engineering' | 'operations' | 'quality' | 'npi-final' | 'supply-chain'): boolean => {
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
