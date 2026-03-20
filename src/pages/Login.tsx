import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { User, Lock } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';

import './Login.css';

const DEBOUNCE_MS = 350;

export default function Login() {
  const [cpf, setCpf] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);
  const [avatarNome, setAvatarNome] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const avatarUrlRef = useRef<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const maskCpf = (v: string) => {
    const nums = v.replace(/\D/g, '').slice(0, 11);
    return nums
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  useEffect(() => {
    const cpfNumeros = cpf.replace(/\D/g, '');
    if (cpfNumeros.length !== 11) {
      if (avatarUrlRef.current) { URL.revokeObjectURL(avatarUrlRef.current); avatarUrlRef.current = null; }
      setAvatarSrc(null);
      setAvatarNome(null);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/preview?cpf=${encodeURIComponent(cpfNumeros)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!data?.existe) {
          if (avatarUrlRef.current) { URL.revokeObjectURL(avatarUrlRef.current); avatarUrlRef.current = null; }
          setAvatarSrc(null);
          setAvatarNome(null);
          return;
        }
        setAvatarNome(data.nome || null);
        if (data.hasFoto) {
          const imgRes = await fetch(`${API_BASE_URL}/auth/avatar?cpf=${encodeURIComponent(cpfNumeros)}`);
          if (imgRes.ok) {
            const blob = await imgRes.blob();
            if (avatarUrlRef.current) URL.revokeObjectURL(avatarUrlRef.current);
            avatarUrlRef.current = URL.createObjectURL(blob);
            setAvatarSrc(avatarUrlRef.current);
          } else {
            if (avatarUrlRef.current) { URL.revokeObjectURL(avatarUrlRef.current); avatarUrlRef.current = null; }
            setAvatarSrc(null);
          }
        } else {
          if (avatarUrlRef.current) { URL.revokeObjectURL(avatarUrlRef.current); avatarUrlRef.current = null; }
          setAvatarSrc(null);
        }
      } catch {
        if (avatarUrlRef.current) { URL.revokeObjectURL(avatarUrlRef.current); avatarUrlRef.current = null; }
        setAvatarSrc(null);
        setAvatarNome(null);
      }
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [cpf]);

  useEffect(() => () => {
    if (avatarUrlRef.current) URL.revokeObjectURL(avatarUrlRef.current);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!cpf || !senha) {
      setError('Preencha todos os campos');
      toast.error('Preencha todos os campos');
      return;
    }

    setLoading(true);
    const ok = await login(cpf, senha);
    setLoading(false);

    if (ok) {
      toast.success('Login realizado com sucesso');
      navigate('/dashboard');
    } else {
      setError('CPF ou senha inválidos. Verifique suas credenciais.');
      toast.error('CPF ou senha inválidos');
    }
  };

  const hasError = !!error;

  return (
    <div className="login-page">
      {/* LADO ESQUERDO - BRANDING */}
      <div className="login-left">
        <div className="login-background" />
        <div className="login-shapes">
          <div className="login-shape-circle" />
          <div className="login-shape-circle" />
          <div className="login-shape-circle" />
        </div>
        <svg className="login-wave" viewBox="0 0 1440 200" preserveAspectRatio="none">
          <path
            fill="rgba(255,255,255,0.1)"
            d="M0,100 C360,180 720,20 1080,100 C1260,140 1380,120 1440,100 L1440,200 L0,200 Z"
          />
          <path
            fill="rgba(255,255,255,0.05)"
            d="M0,120 C240,180 480,60 720,120 C960,180 1200,80 1440,120 L1440,200 L0,200 Z"
          />
        </svg>
        <div className="login-logo-watermark">
          <span>SOMELI</span>
        </div>
        <div className="login-welcome-content">
          <h1 className="login-welcome-title">Bem-vindo</h1>
          <p className="login-welcome-subtitle">
            Gerencie sua contabilidade com inteligência
          </p>
        </div>
      </div>

      {/* LADO DIREITO - FORMULÁRIO */}
      <div className="login-right">
        <motion.div
          className="login-card-wrapper"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <div className="login-card">
            {(avatarSrc || avatarNome) && (
              <div className="login-avatar-wrapper">
                <div className="login-avatar-ring">
                  {avatarSrc ? (
                    <img src={avatarSrc} alt="" className="login-avatar-img" />
                  ) : (
                    <span className="login-avatar-fallback">{avatarNome?.charAt(0) || '?'}</span>
                  )}
                </div>
                {avatarNome && <p className="login-avatar-nome">{avatarNome}</p>}
              </div>
            )}

            <div className="login-card-header">
              <h2 className="login-card-title">SOMELI</h2>
              <p className="login-card-subtitle">Assessoria Contábil</p>
            </div>

            <form onSubmit={handleSubmit} className="login-form">
              <div className="login-field">
                <label htmlFor="cpf" className="login-label">
                  CPF
                </label>
                <div className="login-input-wrapper">
                  <User className="login-input-icon" size={18} strokeWidth={2} />
                  <input
                    id="cpf"
                    type="text"
                    value={cpf}
                    onChange={(e) => {
                      setCpf(maskCpf(e.target.value));
                      setError(null);
                    }}
                    placeholder="000.000.000-00"
                    className={`login-input ${hasError ? 'error' : ''}`}
                    autoComplete="username"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="login-field">
                <label htmlFor="senha" className="login-label">
                  Senha
                </label>
                <div className="login-input-wrapper">
                  <Lock className="login-input-icon" size={18} strokeWidth={2} />
                  <input
                    id="senha"
                    type="password"
                    value={senha}
                    onChange={(e) => {
                      setSenha(e.target.value);
                      setError(null);
                    }}
                    placeholder="••••••••"
                    className={`login-input ${hasError ? 'error' : ''}`}
                    autoComplete="current-password"
                    disabled={loading}
                  />
                </div>
              </div>

              {error && (
                <motion.div
                  className="login-error-message"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  {error}
                </motion.div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="login-button"
              >
                {loading ? (
                  <>
                    <span className="login-button-loader" />
                    Entrando...
                  </>
                ) : (
                  'Entrar'
                )}
              </button>
            </form>

            <p className="login-help-text">
              Use um usuário cadastrado no backend para acessar
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
