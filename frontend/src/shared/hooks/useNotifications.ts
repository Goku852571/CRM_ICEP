import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useAuth } from './useAuth';

export interface Notification {
  id: string;
  type: string;
  data: {
    type: string;
    title: string;
    message: string;
    ticket_id?: number;
    enrollment_id?: number;
  };
  read_at: string | null;
  created_at: string;
}

const playNotificationSound = () => {
  try {
    const context = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = context.createOscillator();
    const gain = context.createGain();
    
    osc.connect(gain);
    gain.connect(context.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, context.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1400, context.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0, context.currentTime);
    gain.gain.linearRampToValueAtTime(0.1, context.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.5);
    
    osc.start(context.currentTime);
    osc.stop(context.currentTime + 0.5);
  } catch (e) {
    console.error('Audio play failed', e);
  }
};

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [previousCount, setPreviousCount] = useState<number>(0);
  const isInitialLoad = useRef(true);

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await api.get('/notifications');
      return response.data.data;
    },
    enabled: !!user,
    refetchInterval: 10000, // Poll every 10 seconds
  });

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  useEffect(() => {
    if (!isInitialLoad.current) {
      if (unreadCount > previousCount) {
        // We have new unread notifications
        playNotificationSound();
      }
    } else {
      isInitialLoad.current = false;
    }
    setPreviousCount(unreadCount);
  }, [unreadCount, previousCount]);

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await api.post('/notifications/mark-all-read');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  return {
    notifications,
    unreadCount,
    markAsRead: (id: string) => markAsReadMutation.mutate(id),
    markAllAsRead: () => markAllAsReadMutation.mutate(),
  };
}
