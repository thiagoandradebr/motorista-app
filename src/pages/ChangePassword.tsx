import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { Lock, ShieldCheck, Eye, EyeOff } from 'lucide-react';

export default function ChangePassword() {
    const navigate = useNavigate();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword.length < 6) {
            toast.error('A senha deve ter pelo menos 6 caracteres');
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error('As senhas não coincidem');
            return;
        }

        if (newPassword === '123456') {
            toast.error('Escolha uma senha diferente da padrão');
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword,
            });

            if (error) throw error;

            // Mark that password was changed in user metadata
            await supabase.auth.updateUser({
                data: { password_changed: true }
            });

            toast.success('Senha alterada com sucesso!');
            navigate('/');
        } catch (error: any) {
            toast.error(error.message || 'Erro ao alterar senha');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
            {/* Background orbs */}
            <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-amber-600/20 blur-3xl" />
            <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-orange-600/20 blur-3xl" />

            <div className="relative w-full max-w-md">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
                    {/* Header */}
                    <div className="mb-8 text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/50">
                            <ShieldCheck className="h-8 w-8 text-white" />
                        </div>
                        <h1 className="mb-2 text-2xl font-bold text-white">Crie sua senha</h1>
                        <p className="text-sm text-slate-400">Por segurança, defina uma nova senha pessoal</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleChangePassword} className="space-y-4">
                        <div className="space-y-3">
                            <div>
                                <label className="mb-1.5 block text-xs font-medium text-slate-400">Nova Senha</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Mínimo 6 caracteres"
                                        className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-12 text-white placeholder-slate-500 outline-none transition-all focus:border-amber-500/50 focus:bg-white/10 focus:ring-2 focus:ring-amber-500/20"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                                    >
                                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-xs font-medium text-slate-400">Confirmar Senha</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Digite novamente"
                                        className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-white placeholder-slate-500 outline-none transition-all focus:border-amber-500/50 focus:bg-white/10 focus:ring-2 focus:ring-amber-500/20"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative mt-6 w-full overflow-hidden rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-4 py-3.5 font-semibold text-white shadow-lg shadow-amber-500/25 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-amber-500/40 focus:outline-none focus:ring-2 focus:ring-amber-500/50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Salvando...
                                </span>
                            ) : (
                                'Salvar Nova Senha'
                            )}
                        </button>
                    </form>

                    <p className="mt-6 text-center text-xs text-slate-500">
                        Você só precisa fazer isso uma vez
                    </p>
                </div>
            </div>
        </div>
    );
}
