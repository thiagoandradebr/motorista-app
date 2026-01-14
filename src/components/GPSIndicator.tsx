import { useGPS } from '../hooks/useGPS';

interface GPSIndicatorProps {
    userId?: string;
}

export function GPSIndicator({ userId }: GPSIndicatorProps) {
    const { location, error } = useGPS(userId);

    return (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-full bg-slate-900/80 px-3 py-1.5 text-xs text-white backdrop-blur border border-slate-700 shadow-lg">
            <div className={`h-2 w-2 rounded-full ${error ? 'bg-red-500' : location ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
            <span className="font-medium">
                {error ? 'GPS Erro' : location ? 'GPS Ativo' : 'Buscando...'}
            </span>
            {location && (
                <span className="opacity-50 text-[10px] hidden sm:inline-block">
                    {location.coords.speed ? `${(location.coords.speed * 3.6).toFixed(0)} km/h` : ''}
                </span>
            )}
        </div>
    );
}
