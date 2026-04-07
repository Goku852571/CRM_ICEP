import { useState, useRef, useEffect } from 'react';
import { Bell, Check, BellDot, Ticket, FileText, Calendar as CalendarIcon, Info, Sparkles } from 'lucide-react';
import { useNotifications, Notification } from '../hooks/useNotifications';
import { useNavigate } from 'react-router-dom';

const IconMap: Record<string, any> = {
  ticket_assigned: Ticket,
  ticket_status: Ticket,
  enrollment_completed: FileText,
  calendar_event: CalendarIcon,
  default: Info
};

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read_at) {
      markAsRead(notification.id);
    }
    
    setIsOpen(false);
    const { type, ticket_id, enrollment_id } = notification.data;
    
    switch (type) {
      case 'ticket_assigned':
      case 'ticket_status':
        navigate('/tickets', { state: { selectedTicketId: ticket_id } });
        break;
      case 'enrollment_completed':
        navigate('/enrollments', { state: { selectedEnrollmentId: enrollment_id } });
        break;
      case 'calendar_event':
        navigate('/calendar');
        break;
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2.5 rounded-xl transition-all duration-300 focus:outline-none active:scale-95 ${
          isOpen ? 'bg-surface-container-low text-primary' : 'text-on-surface-variant/60 hover:bg-surface-container-low hover:text-primary'
        }`}
      >
        {unreadCount > 0 ? (
          <div className="relative">
            <Bell size={20} className="animate-[wiggle_1s_ease-in-out_infinite]" />
            <div className="absolute -top-1 -right-1 h-4 w-4 bg-tertiary-fixed text-on-tertiary-fixed rounded-full border-2 border-surface flex items-center justify-center text-[8px] font-black shadow-sm">
              {unreadCount}
            </div>
          </div>
        ) : (
          <Bell size={20} />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-4 w-[400px] bg-surface-container-lowest rounded-3xl shadow-2xl shadow-primary/10 ghost-border overflow-hidden z-[100] animate-in fade-in slide-in-from-top-4 duration-300 origin-top-right">
          <div className="p-6 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-low/30">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary rounded-xl text-tertiary-fixed shadow-lg shadow-primary/20">
                <BellDot size={18} />
              </div>
              <div>
                <h3 className="font-headline font-extrabold text-primary text-sm uppercase tracking-tight">Centro de Alertas</h3>
                <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest whitespace-nowrap">
                  {unreadCount} Notificaciones sin leer
                </p>
              </div>
            </div>
            {unreadCount > 0 && (
              <button 
                onClick={(e) => { e.stopPropagation(); markAllAsRead(); }}
                className="text-[10px] font-black uppercase tracking-widest text-on-primary-container hover:underline underline-offset-8 transition-all"
              >
                Limpiar Todo
              </button>
            )}
          </div>
          
          <div className="max-h-[500px] overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-outline-variant/20 scrollbar-track-transparent">
            {notifications.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-surface-container-low flex items-center justify-center mb-4 opacity-40">
                  <Sparkles size={32} className="text-on-surface-variant" />
                </div>
                <h4 className="font-headline font-bold text-primary text-lg mb-1">Todo al día</h4>
                <p className="text-xs text-on-surface-variant opacity-60">No tienes alertas pendientes en este momento.</p>
              </div>
            ) : (
              <div className="divide-y divide-outline-variant/5">
                {notifications.map((notification: Notification) => {
                  const Icon = IconMap[notification.data.type] || IconMap.default;
                  const isRead = !!notification.read_at;
                  
                  return (
                    <div 
                      key={notification.id} 
                      onClick={() => handleNotificationClick(notification)}
                      className={`p-5 transition-all relative flex gap-4 cursor-pointer group hover:bg-surface-container-low/50 ${!isRead ? 'bg-primary/[0.02]' : ''}`}
                    >
                      <div className={`flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-105 ${
                        !isRead 
                          ? 'primary-gradient text-white shadow-lg shadow-primary/20' 
                          : 'bg-surface-container-high text-on-surface-variant/40'
                      }`}>
                        <Icon size={20} />
                      </div>

                      <div className="flex-1 min-w-0 pr-6">
                        <div className="flex justify-between items-start mb-1.5">
                          <p className={`text-sm font-bold tracking-tight truncate leading-tight ${!isRead ? 'text-primary' : 'text-on-surface-variant opacity-60'}`}>
                            {notification.data.title}
                          </p>
                          {!isRead && (
                            <div className="w-2 h-2 rounded-full bg-tertiary-fixed flex-shrink-0 ml-2 shadow-[0_0_8px_rgba(111,251,190,0.8)]" />
                          )}
                        </div>
                        <p className={`text-xs leading-relaxed line-clamp-2 ${!isRead ? 'text-on-surface-variant font-medium' : 'text-on-surface-variant/40 italic'}`}>
                          {notification.data.message}
                        </p>
                        <div className="flex items-center gap-3 mt-3">
                          <span className="text-[10px] font-black uppercase tracking-[0.15em] text-on-surface-variant/40">
                            {new Date(notification.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="text-[10px] font-bold text-on-primary-container/40 uppercase tracking-tighter">
                            #NOTIF-{notification.id.toString().slice(-4)}
                          </span>
                        </div>
                      </div>

                      <div className="absolute right-4 top-1/2 -translate-y-1/2 translate-x-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                        {!isRead ? (
                          <button 
                            onClick={(e) => { e.stopPropagation(); markAsRead(notification.id); }}
                            className="p-2 bg-white rounded-xl shadow-lg border border-outline-variant/10 text-primary hover:bg-primary hover:text-white transition-colors"
                            title="Marcar como leída"
                          >
                            <Check size={16} />
                          </button>
                        ) : (
                           <div className="p-2 text-on-surface-variant/20">
                             <Check size={16} />
                           </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          <div className="p-4 bg-surface-container-low/50 border-t border-outline-variant/10 text-center">
            <button 
              onClick={() => { setIsOpen(false); navigate('/notifications'); }}
              className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60 hover:text-primary transition-colors"
            >
              Ver Informe de Actividad Completo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
