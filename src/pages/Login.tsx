import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { User, Lock } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';
import BrandLogo from '@/components/BrandLogo';
import TypewriterText from '@/components/shared/TypewriterText';
import { useIsMobile } from '@/hooks/useMediaQuery';
import {
  formatarMensagemLogin,
  indiceMensagemLogin,
  mensagemLoginPorIndice,
} from '@/lib/mensagens-login';

import './Login.css';

const DEBOUNCE_MS = 350;
/** Troca a mensagem do painel após digitar + pausa. */
const ROTATE_AFTER_MS = 14_000;

export default function Login() {
  const isMobile = useIsMobile();
  const [cpf, setCpf] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);
  const [avatarNome, setAvatarNome] = useState<string | null>(null);
  const [msgIndex, setMsgIndex] = useState(() => indiceMensagemLogin());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const avatarUrlRef = useRef<string | null>(null);
  const rotateRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const mensagemAtual = mensagemLoginPorIndice(msgIndex);
  const mensagemTexto = formatarMensagemLogin(mensagemAtual);

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
    if (rotateRef.current) clearTimeout(rotateRef.current);
  }, []);

  const agendarProximaMensagem = () => {
    if (rotateRef.current) clearTimeout(rotateRef.current);
    rotateRef.current = setTimeout(() => {
      setMsgIndex((i) => i + 1);
    }, ROTATE_AFTER_MS);
  };

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

  const blocoMensagem = (
    <div className="login-message-block" aria-live="polite">
      <AnimatePresence mode="wait">
        <motion.p
          key={msgIndex}
          className="login-welcome-message"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.35 }}
        >
          <TypewriterText
            text={mensagemTexto}
            speedMs={32}
            onDone={agendarProximaMensagem}
          />
        </motion.p>
      </AnimatePresence>
    </div>
  );

  return (
    <div className="login-page">
      {/* LADO ESQUERDO / TOPO MOBILE — branding */}
      <div className="login-left">
        <div className="login-background" />
        <div className="login-shapes">
          <div className="login-shape-circle" />
          <div className="login-shape-circle" />
          <div className="login-shape-circle" />
        </div>
        <svg className="login-wave" viewBox="0 0 1440 200" preserveAspectRatio="none" aria-hidden>
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
          <p className="login-welcome-eyebrow">SOMELI Assessoria Contábil</p>
          <h1 className="login-welcome-title">Bem-vindo</h1>
          {!isMobile ? <div className="login-message-desktop">{blocoMensagem}</div> : null}
        </div>
      </div>

      {/* LADO DIREITO — formulário */}
      <div className="login-right">
        <motion.div
          className="login-card-wrapper"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
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
              <BrandLogo variant="color" className="mx-auto justify-center" imgClassName="w-[180px] max-w-[75vw] h-auto" />
              <p className="login-card-subtitle">Acesse sua conta</p>
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
          </div>
        </motion.div>

        {/* Sempre no DOM no mobile; CSS controla visibilidade — evita sumir por ordem de estilo */}
        <footer className="login-verse-footer" hidden={!isMobile}>
          {isMobile ? blocoMensagem : null}
        </footer>
      </div>
    </div>
  );
}
