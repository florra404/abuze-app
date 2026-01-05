import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import s from './Auth.module.scss';

const Login = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Состояние для окна "Проверь почту"
  const [showEmailAlert, setShowEmailAlert] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isRegistering) {
        // --- РЕГИСТРАЦИЯ ---
        const { data: authData, error: authError } = await supabase.auth.signUp({ 
          email, 
          password,
          options: { data: { username: username } }
        });

        if (authError) throw authError;

        // Если есть аватарка, грузим (код тот же)
        if (avatarFile && authData.user) {
          const fileExt = avatarFile.name.split('.').pop();
          const fileName = `${authData.user.id}.${fileExt}`;
          const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, avatarFile);
          if (!uploadError) {
             const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
             await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', authData.user.id);
          }
        }
        
        // ВМЕСТО ПЕРЕХОДА ПОКАЗЫВАЕМ СООБЩЕНИЕ
        setShowEmailAlert(true);

      } else {
        // --- ВХОД ---
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // Если вход успешен, App.jsx сам перекинет на Home
      }

    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  // МОДАЛЬНОЕ ОКНО ПОДТВЕРЖДЕНИЯ
  if (showEmailAlert) {
    return (
      <div className={s.authWrapper}>
        <div className={s.glassPanel} style={{borderColor: '#00ff00'}}>
          <h1 style={{color: '#00ff00'}}>CHECK YOUR COMMS</h1>
          <p style={{margin: '20px 0', lineHeight: '1.5', color: '#ccc'}}>
            A confirmation link has been sent to <b>{email}</b>.
            <br/><br/>
            You must activate your ID link before accessing the system.
          </p>
          <button className={s.btn} onClick={() => setShowEmailAlert(false)}>
            UNDERSTOOD
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={s.authWrapper}>
      <div className={s.glassPanel}>
        <h1>{isRegistering ? 'NEW OPERATIVE' : 'SYSTEM LOGIN'}</h1>
        
        <form onSubmit={handleAuth}>
          {isRegistering && (
            <>
               <div style={{marginBottom: 20}}>
                <label htmlFor="file-upload" style={{display: 'block', padding: '10px', border: '1px dashed #444', color: avatarFile ? '#00ff00' : '#666', cursor: 'pointer', fontSize: '12px'}}>
                  {avatarFile ? `FILE: ${avatarFile.name}` : '+ UPLOAD AVATAR (OPTIONAL)'}
                </label>
                <input id="file-upload" type="file" accept="image/*" onChange={(e) => setAvatarFile(e.target.files[0])} style={{display: 'none'}} />
              </div>
              <input className={s.input} type="text" placeholder="USERNAME" value={username} onChange={(e) => setUsername(e.target.value)} required />
            </>
          )}

          <input className={s.input} type="email" placeholder="EMAIL" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className={s.input} type="password" placeholder="PASSWORD" value={password} onChange={(e) => setPassword(e.target.value)} required />
          
          <button className={s.btn} disabled={loading}>
            {loading ? 'PROCESSING...' : (isRegistering ? 'INITIALIZE ID' : 'AUTHENTICATE')}
          </button>
        </form>

        <p className={s.switchMode} onClick={() => setIsRegistering(!isRegistering)}>
          {isRegistering ? 'ALREADY HAVE AN ID? LOGIN' : 'CREATE NEW ID'}
        </p>
      </div>
    </div>
  );
};

export default Login;