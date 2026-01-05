import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import s from './Auth.module.scss'; // Стили сделаем общие ниже

const AccessGate = () => {
  const [key, setKey] = useState('');
  const [error, setError] = useState(false);
  const navigate = useNavigate();

  const handleAccess = () => {
    // Сравниваем введенный ключ с тем, что в .env
    const validKey = import.meta.env.VITE_APP_ACCESS_KEY;
    
    if (key === validKey) {
      // Если верно - сохраняем "пропуск" в памяти браузера
      localStorage.setItem('abuze_access_granted', 'true');
      window.location.reload(); // Перезагружаем, чтобы App.jsx увидел пропуск
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000); // Убираем ошибку через 2 сек
    }
  };

  return (
    <div className={s.authWrapper}>
      <div className={s.glassPanel}>
        <h1>SECURITY <span className={s.red}>GATE</span></h1>
        <p>ENTER PRODUCT KEY TO INITIALIZE SYSTEM</p>
        
        <input 
          type="text" 
          placeholder="XXXX-XXXX-XXXX-XXXX" 
          value={key}
          onChange={(e) => setKey(e.target.value.toUpperCase())}
          className={`${s.input} ${error ? s.inputError : ''}`}
        />
        
        {error && <div className={s.errorMsg}>ACCESS DENIED: INVALID KEY</div>}

        <button onClick={handleAccess} className={s.btn}>
          VERIFY ACCESS
        </button>
      </div>
    </div>
  );
};

export default AccessGate;