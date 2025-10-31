import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toSaoPauloTime } from '@/lib/dateUtils';

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
  const [previousUnreadCount, setPreviousUnreadCount] = useState(0);
  const [readNotifications, setReadNotifications] = useState<Set<string>>(new Set());

  // Function to play notification sound
  const playNotificationSound = () => {
    try {
      const audio = new Audio('/notification-sound.mp3');
      audio.volume = 0.5; // Moderate volume
      audio.play().catch(() => {
        // Silently handle autoplay blocking
      });
    } catch (error) {
      // Silently handle any audio errors
    }
  };

  // Load read notifications from database
  useEffect(() => {
    async function loadReadNotifications() {
      if (!user?.id) return;
      
      const { data, error } = await supabase
        .from('notification_reads')
        .select('notification_id')
        .eq('user_id', user.id);
      
      if (!error && data) {
        setReadNotifications(new Set(data.map(item => item.notification_id)));
      }
    }
    
    loadReadNotifications();
  }, [user]);

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

  // Detect unread count changes and play sound
  useEffect(() => {
    if (unreadCount > previousUnreadCount && previousUnreadCount !== 0) {
      playNotificationSound();
    }
    setPreviousUnreadCount(unreadCount);
  }, [unreadCount]);

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
      // First, reload read notifications from database to ensure we have the latest state
      const { data: readData, error: readError } = await supabase
        .from('notification_reads')
        .select('notification_id')
        .eq('user_id', user.id);
      
      if (!readError && readData) {
        setReadNotifications(new Set(readData.map(item => item.notification_id)));
      }
      
      const currentReadNotifications = readData ? new Set(readData.map(item => item.notification_id)) : new Set();
      
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
          const notificationId = `urgent-${order.id}`;
          notificationsList.push({
            id: notificationId,
            type: 'urgency',
            title: `Pedido Urgente #${order.order_number}`,
            description: `${order.urgent_document_count || order.document_count} documento(s) urgente(s)`,
            timestamp: order.created_at,
            read: currentReadNotifications.has(notificationId),
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
          const notificationId = `pendency-${pendency.id}`;
          notificationsList.push({
            id: notificationId,
            type: 'pendency',
            title: `Nova Pendência ${pendency.c4u_id}`,
            description: pendency.description.substring(0, 100) + (pendency.description.length > 100 ? '...' : ''),
            timestamp: pendency.created_at,
            read: currentReadNotifications.has(notificationId),
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
          const notificationId = `delay-${order.id}`;
          notificationsList.push({
            id: notificationId,
            type: 'delay',
            title: `Pedido com Atraso #${order.order_number}`,
            description: `${order.document_count} documento(s) em atraso`,
            timestamp: order.created_at,
            read: currentReadNotifications.has(notificationId),
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
            const notificationId = `financial-${entry.id}`;
            notificationsList.push({
              id: notificationId,
              type: 'financial',
              title: entry.type === 'revenue' ? 'Nova Receita' : 'Nova Despesa',
              description: `${entry.description} - R$ ${entry.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
              timestamp: entry.created_at,
              read: currentReadNotifications.has(notificationId),
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

  async function markAsRead(notificationId: string) {
    if (!user?.id) return;
    
    // Save to database
    await supabase
      .from('notification_reads')
      .upsert({
        user_id: user.id,
        notification_id: notificationId
      });
    
    // Update local state
    setReadNotifications(prev => new Set([...prev, notificationId]));
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }

  async function markAllAsRead() {
    if (!user?.id) return;
    
    // Get all unread notification IDs
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    
    // Save all to database
    const inserts = unreadIds.map(notificationId => ({
      user_id: user.id,
      notification_id: notificationId
    }));
    
    if (inserts.length > 0) {
      await supabase
        .from('notification_reads')
        .upsert(inserts);
    }
    
    // Update local state
    const newReadNotifications = new Set([...readNotifications, ...unreadIds]);
    setReadNotifications(newReadNotifications);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    
    // Refresh notifications to ensure sync with database
    await fetchNotifications();
  }

  function getTimeAgo(timestamp: string) {
    try {
      // Convert UTC notification date to São Paulo time
      const notificationDate = toSaoPauloTime(timestamp);
      return formatDistanceToNow(notificationDate, { 
        addSuffix: true, 
        locale: ptBR 
      });
    } catch {
      return 'Data inválida';
    }
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