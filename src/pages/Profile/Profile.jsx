import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import MagicButton from '../../components/UI/MagicButton/MagicButton';
import { getLevelInfo, getFrameClass } from '../../utils/levelSystem';
import s from './Profile.module.scss';

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Социалка
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);

  // Чат
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const chatScrollRef = useRef(null);

  // Steam
  const [steamIdInput, setSteamIdInput] = useState('');

  useEffect(() => { init(); }, []);

  // --- 1. БЕЗОПАСНАЯ ЗАГРУЗКА (FIX) ---
  const init = async () => {
    try {
      setLoading(true);
      
      // А. Проверяем авторизацию
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Auth error");
      setUser(user);

      // Б. Грузим мой профиль
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profileError) throw new Error("Profile not found");
      setProfile(profileData);

      // В. Грузим Друзей (Уже принятые заявки)
      // Ищем записи, где мы (sender ИЛИ receiver) и статус accepted
      const { data: friendships, error: friendError } = await supabase
        .from('friend_requests')
        .select('*, sender:sender_id(*), receiver:receiver_id(*)')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .eq('status', 'accepted');

      if (!friendError && friendships) {
        // Если мы отправитель -> друг это receiver. Если мы получатель -> друг это sender.
        const formattedFriends = friendships.map(f => f.sender_id === user.id ? f.receiver : f.sender);
        // Фильтруем null (на всякий случай)
        setFriends(formattedFriends.filter(f => f !== null));
      }

      // Г. Грузим Входящие заявки
      const { data: incoming, error: reqError } = await supabase
        .from('friend_requests')
        .select('*, sender:sender_id(*)')
        .eq('receiver_id', user.id)
        .eq('status', 'pending');

      if (!reqError) setRequests(incoming || []);

    } catch (error) {
      console.error("INIT ERROR:", error);
      // Не алерт, чтобы не бесить, просто пишем в консоль
    } finally {
      // САМОЕ ВАЖНОЕ: Убираем загрузку в любом случае
      setLoading(false);
    }
  };

  // --- ЧАТ: Подписка на сообщения ---
  useEffect(() => {
    if (!activeChat || !user) return;
    
    // Подписываемся на новые сообщения в БД
    const channel = supabase
      .channel('chat_room')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        // Если сообщение относится к нашему чату (от меня или от него)
        const isRelated = (payload.new.sender_id === activeChat.id && payload.new.receiver_id === user.id) ||
                          (payload.new.sender_id === user.id && payload.new.receiver_id === activeChat.id);
        
        if (isRelated) {
          // Добавляем в список, если его там еще нет (защита от дублей)
          setMessages(prev => {
             if (prev.find(m => m.id === payload.new.id)) return prev;
             return [...prev, payload.new];
          });
          scrollToBottom();
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeChat, user]);

  const scrollToBottom = () => {
    setTimeout(() => {
      chatScrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  // --- ЛОГИКА ДРУЗЕЙ ---
  const sendRequest = async () => {
    if (!searchResult || searchResult.id === user.id) return;
    
    // Проверяем дубликаты
    const { data: existing } = await supabase.from('friend_requests')
       .select('*')
       .or(`and(sender_id.eq.${user.id},receiver_id.eq.${searchResult.id}),and(sender_id.eq.${searchResult.id},receiver_id.eq.${user.id})`)
       .single();

    if (existing) return alert("Request already sent or exist.");

    const { error } = await supabase.from('friend_requests').insert({ sender_id: user.id, receiver_id: searchResult.id });
    if (error) alert("Error sending request");
    else {
      alert("REQUEST SENT");
      setSearchResult(null);
    }
  };

  const acceptRequest = async (reqId, senderProfile) => {
    await supabase.from('friend_requests').update({ status: 'accepted' }).eq('id', reqId);
    setRequests(requests.filter(r => r.id !== reqId));
    setFriends(prev => [...prev, senderProfile]);
  };

  const declineRequest = async (reqId) => {
    await supabase.from('friend_requests').delete().eq('id', reqId);
    setRequests(requests.filter(r => r.id !== reqId));
  };

  // --- ЧАТ: Функции ---
  const openChat = async (friend) => {
    setActiveChat(friend);
    // Грузим историю переписки
    const { data } = await supabase.from('messages')
      .select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${friend.id}),and(sender_id.eq.${friend.id},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true });
    setMessages(data || []);
    scrollToBottom();
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeChat) return;
    
    const text = newMessage;
    setNewMessage(''); // Сразу очищаем поле

    // ОПТИМИСТИЧНОЕ ОБНОВЛЕНИЕ: 
    // Сразу показываем сообщение в чате, не дожидаясь сервера
    const tempMessage = {
      id: Date.now(), // Временный ID
      sender_id: user.id,
      receiver_id: activeChat.id,
      content: text,
      created_at: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, tempMessage]);
    scrollToBottom();

    // Отправляем в базу
    const { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: activeChat.id,
      content: text
    });

    if (error) {
      console.error("Failed to send:", error);
      alert("Message failed to send");
      // Тут можно было бы удалить временное сообщение, но пока оставим так
    }
  };

  // --- STEAM & AVATAR ---
  const handleAvatarUpdate = async (e) => {
    const file = e.target.files[0];
    if (!file || !profile) return;
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', profile.id);
      setProfile({ ...profile, avatar_url: publicUrl });
    } catch (error) {
      alert("Upload failed: " + error.message);
    }
  };

  const linkSteam = async () => {
    if (!steamIdInput) return;
    setLoading(true);
    try {
      // Вызываем нашу Edge Function
      const { data, error } = await supabase.functions.invoke('get-steam-stats', {
        body: { steamId: steamIdInput }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const realHours = data.hours || 0;
      await supabase.from('profiles').update({ 
        steam_id: steamIdInput,
        dbd_hours: realHours 
      }).eq('id', user.id);

      setProfile({ ...profile, steam_id: steamIdInput, dbd_hours: realHours });
      alert(`STEAM LINKED! HOURS: ${realHours}`);
    } catch (err) {
      alert("Steam Link Error: " + err.message);
      // Фолбек: сохраняем хотя бы ID, если функция упала
      await supabase.from('profiles').update({ steam_id: steamIdInput }).eq('id', user.id);
      setProfile({ ...profile, steam_id: steamIdInput });
    } finally {
      setLoading(false);
    }
  };

  // --- RENDERING ---
  const { level, progressPercent } = profile ? getLevelInfo(profile.xp || 0) : { level: 1, progressPercent: 0 };
  const frameClass = getFrameClass(level);

  if (loading) return <div className={s.loading}>LOADING SYSTEM...</div>;
  if (!profile) return <div className={s.loading}>PROFILE ERROR. RESTART APP.</div>;

  return (
    <div className={s.container}>
      
      {/* ЛЕВАЯ КОЛОНКА: ПРОФИЛЬ */}
      <div className={s.profileColumn}>
        <div className={`${s.card} ${s[frameClass]}`}>
           {/* АВАТАРКА */}
           <div className={s.avatarWrapper}>
             <label htmlFor="ava-up" style={{cursor:'pointer'}}>
                <div className={s.frameEffect}></div>
                <img src={profile.avatar_url || 'https://via.placeholder.com/150'} alt="Ava" className={s.avatar} />
                <div className={s.levelBadge}>{level}</div>
             </label>
             <input id="ava-up" type="file" style={{display:'none'}} onChange={handleAvatarUpdate} />
           </div>

           <h1 className={s.username}>{profile.username}</h1>
           <div className={s.xpBar}><div style={{width: `${progressPercent}%`}}></div></div>
           
           {/* STEAM */}
           <div className={s.steamBlock}>
             {profile.steam_id ? (
               <div className={s.steamConnected}>
                 <span className={s.steamIcon}>🎮</span>
                 <div>
                   <div className={s.steamLabel}>STEAM LINKED</div>
                   <div className={s.steamId}>{profile.steam_id}</div>
                   <div className={s.dbdHours}>{profile.dbd_hours || 0} HOURS IN FOG</div> 
                 </div>
               </div>
             ) : (
               <div className={s.steamConnect}>
                 <input placeholder="STEAM ID64" value={steamIdInput} onChange={e => setSteamIdInput(e.target.value)} />
                 <button onClick={linkSteam}>LINK</button>
               </div>
             )}
           </div>

           <div className={s.actions}>
             <button onClick={() => navigate('/')}>BACK TO MENU</button>
             <button className={s.danger} onClick={() => supabase.auth.signOut().then(() => navigate('/'))}>LOGOUT</button>
           </div>
        </div>
      </div>

      {/* ПРАВАЯ КОЛОНКА: СОЦИАЛКА */}
      <div className={s.socialColumn}>
        
        {/* ВЕРХ: ПОИСК */}
        <div className={s.searchBlock}>
           <div className={s.inputGroup}>
             <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="FIND OPERATIVE..." />
             <button onClick={async () => {
                const { data } = await supabase.from('profiles').select('*').ilike('username', searchQuery).single();
                setSearchResult(data || null);
                if(!data) alert('NOT FOUND');
             }}>SEARCH</button>
           </div>
           
           {searchResult && (
             <div className={s.foundUser}>
               <span>{searchResult.username}</span>
               <button onClick={sendRequest}>SEND REQUEST</button>
             </div>
           )}

           {requests.length > 0 && (
             <div className={s.requestsList}>
               <h3>INCOMING ({requests.length})</h3>
               {requests.map(req => (
                 <div key={req.id} className={s.requestItem}>
                   <span>{req.sender?.username || 'Unknown'}</span>
                   <div className={s.reqBtns}>
                     <button className={s.acc} onClick={() => acceptRequest(req.id, req.sender)}>✓</button>
                     <button className={s.dec} onClick={() => declineRequest(req.id)}>✕</button>
                   </div>
                 </div>
               ))}
             </div>
           )}
        </div>

        {/* НИЗ: ДРУЗЬЯ И ЧАТ */}
        <div className={s.networkBlock}>
          <div className={s.friendsList}>
            <h3>NETWORK ({friends.length})</h3>
            {friends.map(f => (
              <div key={f.id} className={`${s.friendItem} ${activeChat?.id === f.id ? s.active : ''}`} onClick={() => openChat(f)}>
                <div className={s.friendStatus}>●</div>
                <img src={f.avatar_url || 'https://via.placeholder.com/50'} alt="" />
                <span>{f.username}</span>
              </div>
            ))}
          </div>

          <div className={s.chatWindow}>
            {activeChat ? (
              <>
                <div className={s.chatHeader}>
                  CHAT WITH <span style={{color:'#a70a0a'}}>{activeChat.username}</span>
                </div>
                <div className={s.messagesArea}>
                  {messages.map((msg, i) => (
                    <div key={i} className={`${s.message} ${msg.sender_id === user.id ? s.myMsg : s.theirMsg}`}>
                      {msg.content}
                    </div>
                  ))}
                  <div ref={chatScrollRef} />
                </div>
                <div className={s.chatInput}>
                  <input 
                    value={newMessage} 
                    onChange={e => setNewMessage(e.target.value)} 
                    onKeyDown={e => e.key === 'Enter' && sendMessage()}
                    placeholder="TYPE MESSAGE..." 
                  />
                  <button onClick={sendMessage}>SEND</button>
                </div>
              </>
            ) : (
              <div className={s.emptyChat}>SELECT AN OPERATIVE</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Profile;