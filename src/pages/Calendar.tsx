import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePageLayout } from "@/hooks/usePageLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Event {
  id: string;
  date: Date;
  title: string;
  type: 'deadline' | 'delivery' | 'meeting';
  count?: number;
}

export default function Calendar() {
  const { user } = useAuth();
  const { mainContainerClass } = usePageLayout();
  const { userRole, loading: roleLoading } = useUserRole();
  const [userName, setUserName] = useState<string>("");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();

        if (data && !error) {
          setUserName(data.full_name);
        }
      }
    };

    fetchUserProfile();
  }, [user]);

  useEffect(() => {
    fetchEvents();
  }, [currentDate]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);

      // Fetch orders with deadlines
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, deadline, order_number, document_count, delivered_at')
        .gte('deadline', start.toISOString())
        .lte('deadline', end.toISOString());

      if (ordersError) throw ordersError;

      const calendarEvents: Event[] = [];

      // Add deadline events
      ordersData?.forEach(order => {
        if (order.deadline) {
          calendarEvents.push({
            id: `deadline-${order.id}`,
            date: new Date(order.deadline),
            title: `Prazo: ${order.order_number}`,
            type: 'deadline',
            count: order.document_count
          });
        }

        // Add delivery events
        if (order.delivered_at) {
          const deliveryDate = new Date(order.delivered_at);
          if (deliveryDate >= start && deliveryDate <= end) {
            calendarEvents.push({
              id: `delivery-${order.id}`,
              date: deliveryDate,
              title: `Entregue: ${order.order_number}`,
              type: 'delivery',
              count: order.document_count
            });
          }
        }
      });

      setEvents(calendarEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get the first day of the week for the month
  const startDay = monthStart.getDay();
  const emptyDays = Array.from({ length: startDay }, (_, i) => i);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
  };

  const getEventsForDay = (day: Date) => {
    return events.filter(event => isSameDay(event.date, day));
  };

  const getEventColor = (type: Event['type']) => {
    switch (type) {
      case 'deadline':
        return 'bg-red-500';
      case 'delivery':
        return 'bg-green-500';
      case 'meeting':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar userRole={userRole} />
      
      <div className={mainContainerClass}>
        <Header userName={userName} userRole={userRole} />
        
        <main className="p-4 md:p-6 lg:p-8">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3">
              <CalendarIcon className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-black text-foreground">
                  Calendário
                </h1>
                <p className="text-muted-foreground mt-1">
                  Visualize prazos e entregas
                </p>
              </div>
            </div>
          </div>

          {/* Calendar Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">
                  {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => navigateMonth('prev')}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentDate(new Date())}
                  >
                    Hoje
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => navigateMonth('next')}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardDescription>
                Acompanhe os prazos e entregas do mês
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Carregando calendário...
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-1">
                  {/* Week days header */}
                  {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                    <div
                      key={day}
                      className="text-center font-semibold text-sm text-muted-foreground p-2"
                    >
                      {day}
                    </div>
                  ))}

                  {/* Empty days at the start */}
                  {emptyDays.map(day => (
                    <div key={`empty-${day}`} className="min-h-[100px] p-2" />
                  ))}

                  {/* Month days */}
                  {monthDays.map(day => {
                    const dayEvents = getEventsForDay(day);
                    const isToday = isSameDay(day, new Date());

                    return (
                      <div
                        key={day.toISOString()}
                        className={cn(
                          "min-h-[100px] p-2 border rounded-lg",
                          isToday && "bg-primary/5 border-primary",
                          !isSameMonth(day, currentDate) && "opacity-50"
                        )}
                      >
                        <div className={cn(
                          "text-sm font-medium mb-1",
                          isToday && "text-primary"
                        )}>
                          {format(day, 'd')}
                        </div>
                        
                        {/* Events */}
                        <div className="space-y-1">
                          {dayEvents.slice(0, 3).map(event => (
                            <div
                              key={event.id}
                              className={cn(
                                "text-xs p-1 rounded text-white truncate",
                                getEventColor(event.type)
                              )}
                              title={`${event.title} - ${event.count} documentos`}
                            >
                              {event.title}
                            </div>
                          ))}
                          {dayEvents.length > 3 && (
                            <div className="text-xs text-muted-foreground">
                              +{dayEvents.length - 3} mais
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Legend */}
              <div className="mt-6 flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded" />
                  <span>Prazo</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded" />
                  <span>Entrega</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}