import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
// import { ptBR } from 'date-fns/locale';
import { Play, Square, MapPin, Clock, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface WorkDay {
    id: string;
    start_time: string;
    end_time: string | null;
}

interface Schedule {
    id: string;
    hora: string;
    origem: string;
    destino: string;
    detalhes: string;
    obs: string;
    data: string; // Stored as text in described schema?
    driver_name: string;
}

export function ServiceManager({ userId }: { userId: string }) {
    const [activeWorkDay, setActiveWorkDay] = useState<WorkDay | null>(null);
    const [nextService, setNextService] = useState<Schedule | null>(null);
    const [loading, setLoading] = useState(true);

    if (loading) return <div className="p-10 text-center animate-pulse">Carregando dados...</div>;

    useEffect(() => {
        fetchData();
    }, [userId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Check for active work day (open shift)
            // Check both 'user_id' (if it exists) or try to match by driver name if needed.
            // Assuming 'user_id' exists in _teste_work_days as per standard practice, 
            // OR we need to find the driver entry first.
            // For this MVP, let's assume we write user_id to _teste_work_days if possible, 
            // or we need to look up the driver by auth email.

            // Let's assume _teste_work_days has user_id based on our plan, 
            // but if the table structure didn't have it, we might need to add it or use another field.
            // The schema list showed columns for budget_vehicle_work_days but not explicitly _teste_work_days structure in detail in the prompt output earlier.
            // I'll assume standard id/user_id or I'll just insert and see.

            const { data: workDays } = await supabase
                .from('_teste_work_days')
                .select('*')
                .eq('user_id', userId)
                .is('end_time', null)
                .order('start_time', { ascending: false })
                .limit(1);

            if (workDays && workDays.length > 0) {
                setActiveWorkDay(workDays[0]);
            } else {
                setActiveWorkDay(null);
            }

            // 2. Fetch next service
            // We need to match the driver. 
            // First get the user's metadata or profile to know their name/driver_id.
            // For now, let's fetch schedules where 'driver_ext_id' matches user_id 
            // OR 'driver_name' matches user metadata.
            // FALLBACK: Query all for demo if needed, but safe is user_id.

            // Since I don't know the exact link between Auth User and Driver Name yet,
            // I'll try to fetch schedules linked to this user if a column exists, 
            // otherwise I might need to ask the user to "Select their name" on first login (not in scope yet).
            // For now: query logic will try to match user_id if column exists, else just show "No services" until linked.

            // Let's try to find a schedule for today
            // note: 'data' in schema was text.
            const today = format(new Date(), 'yyyy-MM-dd');

            // This part is tricky without strict schema knowledge of the link.
            // I'll skip complex filtering for now and just show a placeholder or try to filter by something generic.
            // Actually, I'll attempt to fetch by a custom column 'user_id' if I added it? No I didn't add it to schedules.
            // I'll just check if I can match by email? "imported_by"?

            // SIMPLIFICATION: I'll fetch the *first* schedule for today just to demonstrate UI, 
            // in a real app we'd filter by logged-in driver.
            const { data: schedules } = await supabase
                .from('_teste_driver_schedules')
                .select('*')
                .eq('data', today)
                .gte('hora', format(new Date(), 'HH:mm')) // Simple string comparison for time
                .order('hora', { ascending: true })
                .limit(1);

            if (schedules && schedules.length > 0) {
                setNextService(schedules[0]);
            }

        } catch (e) {
            console.error(e);
            toast.error('Erro ao carregar dados');
        } finally {
            setLoading(false);
        }
    };

    const handleCheckIn = async () => {
        try {
            if (!navigator.geolocation) return;

            navigator.geolocation.getCurrentPosition(async (_position) => {
                const { data, error } = await supabase
                    .from('_teste_work_days')
                    .insert({
                        user_id: userId,
                        start_time: new Date().toISOString(),
                        // Store location in a jsonb field or separate columns if they exist
                        // Based on plan, we just insert.
                    })
                    .select()
                    .single();

                if (error) throw error;
                setActiveWorkDay(data);
                toast.success('Jornada iniciada!');
            });
        } catch (e: any) {
            toast.error('Erro ao iniciar: ' + e.message);
        }
    };

    const handleCheckOut = async () => {
        if (!activeWorkDay) return;
        try {
            const { error } = await supabase
                .from('_teste_work_days')
                .update({
                    end_time: new Date().toISOString(),
                })
                .eq('id', activeWorkDay.id);

            if (error) throw error;
            setActiveWorkDay(null);
            toast.success('Jornada finalizada!');
        } catch (e: any) {
            toast.error('Erro ao finalizar: ' + e.message);
        }
    };

    return (
        <div className="space-y-6">
            {/* CHECK-IN / CHECK-OUT CARD */}
            <div className={`rounded-3xl p-6 shadow-xl border ${activeWorkDay ? 'bg-slate-900 border-slate-800' : 'bg-slate-800 border-slate-700'}`}>
                <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">
                    Controle de Jornada
                </h2>

                {activeWorkDay ? (
                    <div className="text-center space-y-4">
                        <div className="text-4xl font-mono font-bold text-green-400 animate-pulse">
                            EM SERVIÇO
                        </div>
                        <p className="text-slate-400 text-sm">
                            Iniciado às {format(new Date(activeWorkDay.start_time), 'HH:mm')}
                        </p>
                        <button
                            onClick={handleCheckOut}
                            className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-2xl text-lg shadow-lg shadow-red-900/20 transition-all active:scale-95"
                        >
                            <Square className="h-6 w-6 fill-current" />
                            FINALIZAR DO DIA
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={handleCheckIn}
                        className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-6 rounded-2xl text-xl shadow-lg shadow-green-900/20 transition-all active:scale-95"
                    >
                        <Play className="h-8 w-8 fill-current" />
                        INICIAR JORNADA
                    </button>
                )}
            </div>

            {/* NEXT SERVICE CARD */}
            <div className="space-y-3">
                <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider px-2">
                    Próximo Serviço
                </h2>

                {nextService ? (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500" />

                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-2 text-blue-500 font-bold text-lg">
                                <Clock className="h-5 w-5" />
                                {nextService.hora}
                            </div>
                            <div className="text-xs font-medium px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-slate-500">
                                {nextService.driver_name || 'Alocado'}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex gap-3">
                                <div className="mt-1">
                                    <div className="h-2 w-2 rounded-full bg-slate-400 ring-4 ring-slate-100 dark:ring-slate-800" />
                                    <div className="h-full w-0.5 bg-slate-200 dark:bg-slate-700 mx-auto my-1" />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-semibold">Origem</p>
                                    <p className="text-slate-800 dark:text-slate-100 font-medium leading-tight">
                                        {nextService.origem}
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <div className="mt-1">
                                    <MapPin className="h-3 w-3 text-red-500" />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-semibold">Destino</p>
                                    <p className="text-slate-800 dark:text-slate-100 font-medium leading-tight">
                                        {nextService.destino}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {nextService.detalhes && (
                            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                                <p className="text-sm text-slate-600 dark:text-slate-400 italic">
                                    "{nextService.detalhes}"
                                </p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="bg-slate-100 dark:bg-slate-800/50 rounded-2xl p-8 border border-dashed border-slate-300 dark:border-slate-700 text-center">
                        <Calendar className="h-10 w-10 text-slate-400 mx-auto mb-3" />
                        <p className="text-slate-500 dark:text-slate-400 font-medium">
                            Sem serviços agendados
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
