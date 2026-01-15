import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { GPSIndicator } from '../components/GPSIndicator';
import { EmergencyAlert } from '../components/EmergencyAlert';
import { ServiceManager } from '../components/ServiceManager';
import { LogOut } from 'lucide-react';

export default function Home() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [session, setSession] = useState<any>(null);

    useEffect(() => {
        checkUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (!session) navigate('/login');
        });

        return () => subscription.unsubscribe();
    }, []);

    async function checkUser() {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            navigate('/login');
            return;
        }

        // Check if this is first login (password not changed yet)
        const user = session.user;
        const passwordChanged = user.user_metadata?.password_changed;

        if (!passwordChanged) {
            // First login - redirect to change password
            navigate('/change-password');
            return;
        }

        setSession(session);
        setLoading(false);
    }

    if (loading) return (
        <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-slate-950 text-white">
            <div className="h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 animate-pulse">Sincronizando...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 pb-20">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur border-b border-slate-800 px-4 py-4 flex justify-between items-center">
                <div>
                    <h1 className="text-xl font-bold tracking-tight">Motorista<span className="text-blue-500">App</span></h1>
                    <p className="text-xs text-slate-500">{session?.user?.email}</p>
                </div>
                <button
                    onClick={async () => {
                        await supabase.auth.signOut();
                        navigate('/login');
                    }}
                    className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                    <LogOut className="h-5 w-5" />
                </button>
            </header>

            {/* Main Content */}
            <main className="p-4 max-w-lg mx-auto">
                <ServiceManager userId={session?.user?.id} />
            </main>

            {/* Overlays & Fixed Elements */}
            <GPSIndicator userId={session?.user?.id} />
            <EmergencyAlert />
        </div>
    );
}
