import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { format, differenceInMinutes, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Play, Square, MapPin, Clock, Calendar, Navigation, Gauge } from 'lucide-react';
import { toast } from 'sonner';

interface WorkDay {
    id: string;
    driver_id: string;
    start_time: string;
    end_time: string | null;
    start_km: number;
    end_km: number | null;
    total_km: number | null;
    total_minutes: number | null;
}

interface Schedule {
    id: string;
    hora: string;
    origem: string;
    destino: string;
    detalhes: string;
    obs: string;
    data: string;
    driver_name: string;
}

interface DriverProfile {
    id: string;
    name: string;
}

export function ServiceManager({ userId }: { userId: string }) {
    const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
    const [activeWorkDay, setActiveWorkDay] = useState<WorkDay | null>(null);
    const [nextService, setNextService] = useState<Schedule | null>(null);
    const [loading, setLoading] = useState(true);

    // Input states
    const [startKm, setStartKm] = useState<string>('');
    const [endKm, setEndKm] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (userId) fetchData();
    }, [userId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Driver Profile linked to this Auth User
            const { data: drivers, error: driverError } = await supabase
                .from('_teste_drivers')
                .select('id, name')
                .eq('user_id', userId)
                .limit(1);

            if (driverError) throw driverError;

            const profile = drivers?.[0] || null;
            setDriverProfile(profile);

            // 2. Check for active work day (open shift)
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

            // 3. Fetch next service for this driver
            const today = format(new Date(), 'yyyy-MM-dd');

            let scheduleQuery = supabase
                .from('_teste_driver_schedules')
                .select('*')
                .eq('data', today)
                .gte('hora', format(new Date(), 'HH:mm'))
                .order('hora', { ascending: true })
                .limit(1);

            // If we have a profile name, filter strictly by it
            if (profile) {
                scheduleQuery = scheduleQuery.eq('driver_name', profile.name);
            }

            const { data: schedules } = await scheduleQuery;
            if (schedules && schedules.length > 0) {
                setNextService(schedules[0]);
            }

        } catch (e: any) {
            console.error(e);
            toast.error('Erro ao carregar dados: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    const calculateDurationStr = (start: string) => {
        const mins = differenceInMinutes(new Date(), parseISO(start));
        const hours = Math.floor(mins / 60);
        const m = mins % 60;
        return `${hours}h ${m}m`;
    };

    const handleCheckIn = async () => {
        const km = parseInt(startKm);
        if (isNaN(km) || km <= 0) {
            toast.error('Informe o KM inicial válido');
            return;
        }

        setIsProcessing(true);
        try {
            if (!navigator.geolocation) throw new Error('GPS não disponível');

            navigator.geolocation.getCurrentPosition(async (position) => {
                const { data, error } = await supabase
                    .from('_teste_work_days')
                    .insert({
                        user_id: userId,
                        driver_id: driverProfile?.id,
                        start_time: new Date().toISOString(),
                        start_km: km,
                        date: format(new Date(), 'yyyy-MM-dd'),
                        source: 'Mobile App'
                    })
                    .select()
                    .single();

                if (error) throw error;
                setActiveWorkDay(data);
                setStartKm('');
                toast.success('Jornada iniciada! Boa sorte no serviço.');
                setIsProcessing(false);
            }, (err) => {
                toast.error('Erro de GPS: ' + err.message);
                setIsProcessing(false);
            });
        } catch (e: any) {
            toast.error('Erro ao iniciar: ' + e.message);
            setIsProcessing(false);
        }
    };

    const handleCheckOut = async () => {
        if (!activeWorkDay) return;

        const km = parseInt(endKm);
        if (isNaN(km) || km <= activeWorkDay.start_km) {
            toast.error(`Informe um KM final maior que ${activeWorkDay.start_km}`);
            return;
        }

        setIsProcessing(true);
        try {
            const endTime = new Date().toISOString();
            const totalKm = km - activeWorkDay.start_km;
            const totalMinutes = differenceInMinutes(parseISO(endTime), parseISO(activeWorkDay.start_time));

            const { error } = await supabase
                .from('_teste_work_days')
                .update({
                    end_time: endTime,
                    end_km: km,
                    total_km: totalKm,
                    total_minutes: totalMinutes,
                })
                .eq('id', activeWorkDay.id);

            if (error) throw error;

            setActiveWorkDay(null);
            setEndKm('');
            toast.success(`Jornada finalizada! Total: ${totalKm}km em ${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m.`);
        } catch (e: any) {
            toast.error('Erro ao finalizar: ' + e.message);
        } finally {
            setIsProcessing(false);
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
            <div className="h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 animate-pulse">Sincronizando dados...</p>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* PROFILE WELCOME */}
            <div className="px-2">
                <h1 className="text-2xl font-bold">Olá, {driverProfile?.name || 'Motorista'}</h1>
                <p className="text-slate-400 text-sm">Bem-vindo à sua central de serviço.</p>
            </div>

            {/* CHECK-IN / CHECK-OUT CARD */}
            <div className={`rounded-3xl p-6 shadow-2xl transition-all duration-500 border overflow-hidden relative ${activeWorkDay ? 'bg-slate-900 border-blue-500/30' : 'bg-slate-800 border-slate-700'}`}>

                {activeWorkDay && (
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Navigation className="h-20 w-20 text-blue-500 animate-pulse" />
                    </div>
                )}

                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    Status da Jornada
                </h2>

                {activeWorkDay ? (
                    <div className="space-y-6">
                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-xs text-slate-500 uppercase font-bold mb-1">Duração Atual</p>
                                <div className="text-4xl font-black text-white tracking-tight">
                                    {calculateDurationStr(activeWorkDay.start_time)}
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-slate-500 uppercase font-bold mb-1">Início</p>
                                <p className="text-xl font-bold text-slate-300">
                                    {format(parseISO(activeWorkDay.start_time), 'HH:mm')}
                                </p>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-800/50 rounded-2xl border border-white/5 space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-400">KM Inicial</span>
                                <span className="text-lg font-bold text-white">{activeWorkDay.start_km} km</span>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase">KM Final para Fechamento</label>
                                <div className="relative">
                                    <Gauge className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                                    <input
                                        type="number"
                                        value={endKm}
                                        onChange={(e) => setEndKm(e.target.value)}
                                        placeholder="Ex: 55420"
                                        className="w-full bg-slate-950 border border-white/10 rounded-xl py-4 pl-10 pr-4 text-xl font-bold text-white outline-none focus:border-blue-500 transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleCheckOut}
                            disabled={isProcessing}
                            className="w-full group relative overflow-hidden bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-black py-5 rounded-2xl text-lg shadow-xl shadow-red-900/40 transition-all active:scale-[0.98] disabled:opacity-50"
                        >
                            <div className="relative flex items-center justify-center gap-3">
                                <Square className="h-6 w-6 fill-white" />
                                FINALIZAR DIA
                            </div>
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2 px-1">
                                    <Gauge className="h-3 w-3" />
                                    Odômetro Inicial (KM)
                                </label>
                                <input
                                    type="number"
                                    value={startKm}
                                    onChange={(e) => setStartKm(e.target.value)}
                                    placeholder="Informe o KM atual..."
                                    className="w-full bg-slate-900/50 border border-white/10 rounded-2xl py-5 px-6 text-2xl font-black text-white outline-none focus:border-green-500 focus:bg-slate-900 transition-all placeholder:text-slate-700"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleCheckIn}
                            disabled={isProcessing}
                            className="w-full group relative overflow-hidden bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white font-black py-6 rounded-2xl text-xl shadow-xl shadow-green-900/30 transition-all active:scale-[0.98] disabled:opacity-50"
                        >
                            <div className="relative flex items-center justify-center gap-3">
                                <Play className="h-8 w-8 fill-white" />
                                INICIAR JORNADA
                            </div>
                        </button>
                    </div>
                )}
            </div>

            {/* NEXT SERVICE CARD */}
            <div className="space-y-4">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    Agenda do Próximo Serviço
                </h2>

                {nextService ? (
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-xl border border-slate-200 dark:border-white/5 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-2 h-full bg-blue-500" />

                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-3 text-blue-500">
                                <div className="p-2 bg-blue-500/10 rounded-xl">
                                    <Clock className="h-6 w-6" />
                                </div>
                                <span className="text-3xl font-black tracking-tighter">{nextService.hora}</span>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-slate-100 dark:bg-white/5 rounded-full text-slate-500">
                                Hoje
                            </span>
                        </div>

                        <div className="space-y-6 relative">
                            <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-slate-100 dark:bg-white/5" />

                            <div className="flex gap-4 relative">
                                <div className="h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-700 border-4 border-white dark:border-slate-800 z-10 flex items-center justify-center">
                                    <div className="h-2 w-2 rounded-full bg-slate-400" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Origem</p>
                                    <p className="text-lg font-bold text-slate-800 dark:text-white leading-tight">
                                        {nextService.origem}
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-4 relative">
                                <div className="h-6 w-6 rounded-full bg-red-100 dark:bg-red-500/20 border-4 border-white dark:border-slate-800 z-10 flex items-center justify-center">
                                    <MapPin className="h-3 w-3 text-red-500" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Destino</p>
                                    <p className="text-lg font-bold text-slate-800 dark:text-white leading-tight">
                                        {nextService.destino}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {nextService.detalhes && (
                            <div className="mt-8 p-4 bg-slate-50 dark:bg-white/5 rounded-2xl">
                                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 italic">
                                    "{nextService.detalhes}"
                                </p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="bg-slate-900/30 rounded-3xl p-10 border border-dashed border-white/5 text-center transition-all hover:bg-slate-900/50">
                        <Calendar className="h-12 w-12 text-slate-700 mx-auto mb-4" />
                        <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">
                            Nenhuma escala encontrada para hoje
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
