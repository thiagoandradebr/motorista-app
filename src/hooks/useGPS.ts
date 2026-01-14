import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

export function useGPS(userId: string | undefined) {
    const [location, setLocation] = useState<GeolocationPosition | null>(null);
    const [error, setError] = useState<string | null>(null);
    const watchId = useRef<number | null>(null);
    const lastSyncTime = useRef<number>(0);

    useEffect(() => {
        if (!navigator.geolocation) {
            setError('Geolocalização não suportada');
            return;
        }

        watchId.current = navigator.geolocation.watchPosition(
            (position) => {
                setLocation(position);
                syncToSupabase(position);
            },
            (err) => {
                console.error('GPS Error:', err);
                setError(err.message);
                toast.error('Erro de GPS: ' + err.message);
            },
            {
                enableHighAccuracy: true,
                timeout: 20000,
                maximumAge: 5000, // Reuse last cached position if recent
            }
        );

        return () => {
            if (watchId.current !== null) {
                navigator.geolocation.clearWatch(watchId.current);
            }
        };
    }, [userId]);

    const syncToSupabase = async (position: GeolocationPosition) => {
        if (!userId) return;

        const now = Date.now();
        // Sync at most every 30 seconds to save battery/data
        if (now - lastSyncTime.current < 30000) {
            return;
        }

        try {
            const { error } = await supabase.from('gps_logs').insert({
                user_id: userId,
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                speed: position.coords.speed,
                heading: position.coords.heading,
                timestamp: new Date(position.timestamp).toISOString(),
            });

            if (error) throw error;
            lastSyncTime.current = now;
            // console.log('GPS synced');
        } catch (err) {
            console.error('Failed to sync GPS', err);
        }
    };

    return { location, error };
}
