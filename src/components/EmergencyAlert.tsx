import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AlertTriangle, X } from 'lucide-react';

interface Alert {
    id: string;
    title: string;
    message: string;
    level: 'info' | 'warning' | 'error';
}

export function EmergencyAlert() {
    const [alert, setAlert] = useState<Alert | null>(null);

    useEffect(() => {
        // Listen for new alerts
        const channel = supabase
            .channel('emergency_alerts')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'emergency_alerts',
                    filter: 'active=eq.true', // Only listen for active alerts
                },
                (payload) => {
                    setAlert(payload.new as Alert);
                    // Play sound or vibrate potentially
                    if (navigator.vibrate) navigator.vibrate([500, 200, 500]);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    if (!alert) return null;

    const bgColor = {
        info: 'bg-blue-600',
        warning: 'bg-yellow-600',
        error: 'bg-red-600 animate-pulse', // Flash for error
    }[alert.level];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
            <div className={`w-full max-w-md rounded-2xl ${bgColor} p-6 text-white shadow-2xl border-4 border-white/20`}>
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="h-8 w-8" />
                        <h2 className="text-2xl font-bold uppercase tracking-wider">{alert.title}</h2>
                    </div>
                    <button
                        onClick={() => setAlert(null)}
                        className="rounded-full bg-white/20 p-2 hover:bg-white/30"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>
                <p className="mt-4 text-lg font-medium leading-relaxed">
                    {alert.message}
                </p>
                <button
                    onClick={() => setAlert(null)}
                    className="mt-6 w-full rounded-xl bg-white py-3 text-lg font-bold text-black shadow-lg hover:bg-slate-100 active:scale-95"
                >
                    CIENTE
                </button>
            </div>
        </div>
    );
}
