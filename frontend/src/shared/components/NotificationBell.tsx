import { useState, useRef, useEffect } from 'react';
import { Bell, Check, BellDot, Ticket, FileText, Calendar as CalendarIcon, Info } from 'lucide-react';
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
        className="relative p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors focus:outline-none"
      >
        {unreadCount > 0 ? (
          <div className="relative">
            <Bell size={22} className="text-gray-700 animate-[wiggle_1s_ease-in-out_infinite]" />
            <div className="absolute top-0 right-0 h-2.5 w-2.5 bg-red-400 rounded-full animate-ping opacity-75"></div>
            <div className="absolute top-0 right-0 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white"></div>
          </div>
        ) : (
          <Bell size={22} />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h3 className="font-bold text-gray-900 font-primary flex items-center gap-2">
              <BellDot size={18} className="text-blue-600" /> Notificaciones
            </h3>
            {unreadCount > 0 && (
              <button 
                onClick={(e) => { e.stopPropagation(); markAllAsRead(); }}
                className="text-xs text-blue-600 font-bold hover:bg-blue-50 px-2 py-1 rounded transition"
              >
                Marcar todas
              </button>
            )}
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <p className="text-sm">No tienes notificaciones recientes</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {notifications.map((notification: Notification) => {
                  const Icon = IconMap[notification.data.type] || IconMap.default;
                  return (
                    <div 
                      key={notification.id} 
                      onClick={() => handleNotificationClick(notification)}
                      className={`p-4 transition-all relative flex gap-3 cursor-pointer group/item ${!notification.read_at ? 'bg-blue-50/30' : 'hover:bg-gray-50/50'}`}
                    >
                      {!notification.read_at && (
                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                      )}
                      
                      <div className={`p-2 rounded-xl self-start ${!notification.read_at ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                        <Icon size={18} />
                      </div>

                      <div className="flex-1">
                        <p className={`text-sm font-bold leading-tight mb-0.5 ${!notification.read_at ? 'text-gray-900' : 'text-gray-500'}`}>
                          {notification.data.title}
                        </p>
                        <p className="text-sm text-gray-600 line-clamp-2 leading-snug">{notification.data.message}</p>
                        <span className="text-[10px] text-gray-400 font-medium mt-2 block lowercase">
                          {new Date(notification.created_at).toLocaleString()}
                        </span>
                      </div>

                      {!notification.read_at && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); markAsRead(notification.id); }}
                          className="text-blue-600 p-1.5 hover:bg-blue-100 rounded-lg self-center transition opacity-0 group-hover/item:opacity-100"
                          title="Marcar como leída"
                        >
                          <Check size={16} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
