import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { differenceInMinutes, differenceInHours, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface Notification {
  id: string;
  type: 'urgency' | 'pendency' | 'delay' | 'financial';
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  link?: string;
  metadata?: any;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string>('');

  // Get user role
  useEffect(() => {
    async function fetchUserRole() {
      if (!user?.id) return;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      if (!error && data) {
        setUserRole(data.role);
      }
    }
    
    fetchUserRole();
  }, [user]);

  // Fetch notifications
  useEffect(() => {
    if (!user?.id || !userRole) return;

    fetchNotifications();

    // Set up real-time subscriptions
    const ordersChannel = supabase
      .channel('orders-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            fetchNotifications();
          }
        }
      )
      .subscribe();

    const pendenciesChannel = supabase
      .channel('pendencies-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pendencies'
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            fetchNotifications();
          }
        }
      )
      .subscribe();

    const financialChannel = supabase
      .channel('financial-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'financial_entries'
        },
        (payload) => {
          if (payload.eventType === 'INSERT' && userRole === 'owner') {
            fetchNotifications();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(pendenciesChannel);
      supabase.removeChannel(financialChannel);
    };
  }, [user, userRole]);

  async function fetchNotifications() {
    if (!user?.id) return;
    
    setLoading(true);
    const notificationsList: Notification[] = [];
    
    try {
      // Fetch urgent orders
      const { data: urgentOrders } = await supabase
        .from('orders')
        .select('id, order_number, created_at, document_count, urgent_document_count')
        .eq('is_urgent', true)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(5);

      if (urgentOrders) {
        urgentOrders.forEach(order => {
          notificationsList.push({
            id: `urgent-${order.id}`,
            type: 'urgency',
            title: `Pedido Urgente #${order.order_number}`,
            description: `${order.urgent_document_count || order.document_count} documento(s) urgente(s)`,
            timestamp: order.created_at,
            read: false,
            link: '/orders'
          });
        });
      }

      // Fetch new pendencies
      const { data: pendencies } = await supabase
        .from('pendencies')
        .select('id, c4u_id, error_type, created_at, description')
        .eq('status', 'pending')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(5);

      if (pendencies) {
        pendencies.forEach(pendency => {
          notificationsList.push({
            id: `pendency-${pendency.id}`,
            type: 'pendency',
            title: `Nova Pendência ${pendency.c4u_id}`,
            description: pendency.description.substring(0, 100) + (pendency.description.length > 100 ? '...' : ''),
            timestamp: pendency.created_at,
            read: false,
            link: '/pendencies'
          });
        });
      }

      // Fetch delayed orders
      const { data: delayedOrders } = await supabase
        .from('orders')
        .select('id, order_number, created_at, document_count')
        .eq('has_delay', true)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(5);

      if (delayedOrders) {
        delayedOrders.forEach(order => {
          notificationsList.push({
            id: `delay-${order.id}`,
            type: 'delay',
            title: `Pedido com Atraso #${order.order_number}`,
            description: `${order.document_count} documento(s) em atraso`,
            timestamp: order.created_at,
            read: false,
            link: '/orders'
          });
        });
      }

      // Fetch financial updates (only for owner role)
      if (userRole === 'owner') {
        const { data: financialEntries } = await supabase
          .from('financial_entries')
          .select('id, type, category, description, amount, created_at')
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false })
          .limit(5);

        if (financialEntries) {
          financialEntries.forEach(entry => {
            notificationsList.push({
              id: `financial-${entry.id}`,
              type: 'financial',
              title: entry.type === 'revenue' ? 'Nova Receita' : 'Nova Despesa',
              description: `${entry.description} - R$ ${entry.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
              timestamp: entry.created_at,
              read: false,
              link: '/dashboard-financeiro'
            });
          });
        }
      }

      // Sort by timestamp
      notificationsList.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setNotifications(notificationsList);
      setUnreadCount(notificationsList.filter(n => !n.read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast({
        title: "Erro ao carregar notificações",
        description: "Não foi possível carregar as notificações",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }

  function markAsRead(notificationId: string) {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }

  function markAllAsRead() {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }

  function getTimeAgo(timestamp: string) {
    const now = new Date();
    const date = new Date(timestamp);
    const minutes = differenceInMinutes(now, date);
    const hours = differenceInHours(now, date);
    const days = differenceInDays(now, date);

    if (minutes < 1) return 'agora';
    if (minutes < 60) return `${minutes} min atrás`;
    if (hours < 24) return `${hours}h atrás`;
    if (days < 7) return `${days}d atrás`;
    return date.toLocaleDateString('pt-BR');
  }

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    getTimeAgo,
    refresh: fetchNotifications
  };
}