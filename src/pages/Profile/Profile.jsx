import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import MagicButton from '../../components/UI/MagicButton/MagicButton';
import { getLevelInfo, getFrameClass } from '../../utils/levelSystem';
import s from './Profile.module.scss'; // Сейчас создадим стили

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Социалка
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]); // Входящие заявки
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);

  // Чат
  const [activeChat, setActiveChat] = useState(null); // С кем болтаем
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const chatScrollRef = useRef(null);

  // Steam
  const [steamIdInput, setSteamIdInput] = useState('');

  useEffect(() => { init(); }, []);

  // Подписка на новые сообщения в реальном времени
  useEffect(() => {
    if (!activeChat) return;
    
    const channel = supabase
      .channel('chat_room')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        if (payload.new.sender_id === activeChat.id || payload.new.sender_id === user.id) {
          setMessages(prev => [...prev, payload.new]);
          scrollToBottom();
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeChat]);

  const scrollToBottom = () => {
    setTimeout(() => {
      chatScrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const init = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return navigate('/login');
    setUser(user);

    // 1. Мой профиль
    const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    setProfile(profileData);

    // 2. Друзья (из таблицы friend_requests со статусом 'accepted')
    // Это сложный запрос, упростим: ищем где мы sender или receiver и статус accepted
    const { data: friendships } = await supabase.from('friend_requests')
      .select('*, sender:sender_id(*), receiver:receiver_id(*)')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .eq('status', 'accepted');

    const formattedFriends = friendships.map(f => f.sender_id === user.id ? f.receiver : f.sender);
    setFriends(formattedFriends);

    // 3. Входящие заявки (где мы receiver и статус pending)
    const { data: incoming } = await supabase.from('friend_requests')
      .select('*, sender:sender_id(*)')
      .eq('receiver_id', user.id)
      .eq('status', 'pending');
    setRequests(incoming || []);

    setLoading(false);
  };

  // --- ЛОГИКА ДРУЗЕЙ ---
  const sendRequest = async () => {
    if (!searchResult || searchResult.id === user.id) return;
    
    // Проверяем, нет ли уже связи
    const { data: existing } = await supabase.from('friend_requests')
       .select('*')
       .or(`and(sender_id.eq.${user.id},receiver_id.eq.${searchResult.id}),and(sender_id.eq.${searchResult.id},receiver_id.eq.${user.id})`)
       .single();

    if (existing) return alert("Request already sent or you are already friends.");

    await supabase.from('friend_requests').insert({ sender_id: user.id, receiver_id: searchResult.id });
    alert("REQUEST SENT");
    setSearchResult(null);
  };

  const acceptRequest = async (reqId, senderProfile) => {
    await supabase.from('friend_requests').update({ status: 'accepted' }).eq('id', reqId);
    setRequests(requests.filter(r => r.id !== reqId));
    setFriends([...friends, senderProfile]);
  };

  const declineRequest = async (reqId) => {
    await supabase.from('friend_requests').delete().eq('id', reqId);
    setRequests(requests.filter(r => r.id !== reqId));
  };

  // --- ЧАТ ---
  const openChat = async (friend) => {
    setActiveChat(friend);
    // Грузим историю
    const { data } = await supabase.from('messages')
      .select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${friend.id}),and(sender_id.eq.${friend.id},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true });
    setMessages(data || []);
    scrollToBottom();
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: activeChat.id,
      content: newMessage
    });
    setNewMessage('');
  };

  // --- STEAM ---
 const linkSteam = async () => {
    if (!steamIdInput) return;
    
    // 1. Сначала сохраняем ID как черновик
    setLoading(true);

    try {
      // 2. Вызываем нашу облачную функцию
      const { data, error } = await supabase.functions.invoke('get-steam-stats', {
        body: { steamId: steamIdInput }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      // 3. Если всё ок - получаем реальные часы
      const realHours = data.hours;
      alert(`STEAM CONNECTED! DBD HOURS FOUND: ${realHours}`);

      // 4. Сохраняем в базу профиля ID и Часы
      // (Убедись, что в базе есть колонка dbd_hours, если нет - создай в SQL: alter table profiles add column dbd_hours integer default 0;)
      
      const { error: dbError } = await supabase.from('profiles').update({ 
        steam_id: steamIdInput,
        dbd_hours: realHours 
      }).eq('id', user.id);

      if (dbError) throw dbError;

      // Обновляем локально
      setProfile({ ...profile, steam_id: steamIdInput, dbd_hours: realHours });

    } catch (err) {
      alert("FAILED TO LINK STEAM: " + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // --- УРОВЕНЬ ---
  const { level, progressPercent } = profile ? getLevelInfo(profile.xp || 0) : { level: 1, progressPercent: 0 };
  const frameClass = getFrameClass(level);

  if (loading) return <div className={s.loading}>LOADING SYSTEM...</div>;

  return (
    <div className={s.container}>
      
      {/* ЛЕВАЯ КОЛОНКА: ПРОФИЛЬ */}
      <div className={s.profileColumn}>
        <div className={`${s.card} ${s[frameClass]}`}>
           {/* АВАТАРКА + РАМКА */}
           <div className={s.avatarWrapper}>
             <div className={s.frameEffect}></div> {/* Визуальная рамка */}
             <img src={profile.avatar_url || 'https://via.placeholder.com/150'} alt="Ava" className={s.avatar} />
             <div className={s.levelBadge}>{level}</div>
           </div>

           <h1 className={s.username}>{profile.username}</h1>
           <div className={s.xpBar}><div style={{width: `${progressPercent}%`}}></div></div>
           
           {/* STEAM BLOCK */}
           <div className={s.steamBlock}>
             {profile.steam_id ? (
               <div className={s.steamConnected}>
                 <span className={s.steamIcon}>🎮</span>
                 <div>
                   <div className={s.steamLabel}>STEAM LINKED</div>
                   <div className={s.steamId}>{profile.steam_id}</div>
                   {/* Фейковая стата пока нет API */}
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
        
        {/* ВЕРХ: ПОИСК И ЗАЯВКИ */}
        <div className={s.searchBlock}>
           <div className={s.inputGroup}>
             <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="FIND OPERATIVE..." />
             <button onClick={async () => {
                const { data } = await supabase.from('profiles').select('*').ilike('username', searchQuery).single();
                setSearchResult(data || null);
                if(!data) alert('NOT FOUND');
             }}>SEARCH</button>
           </div>
           
           {/* Найденный юзер */}
           {searchResult && (
             <div className={s.foundUser}>
               <span>{searchResult.username}</span>
               <button onClick={sendRequest}>SEND REQUEST</button>
             </div>
           )}

           {/* Входящие заявки */}
           {requests.length > 0 && (
             <div className={s.requestsList}>
               <h3>INCOMING TRANSMISSIONS ({requests.length})</h3>
               {requests.map(req => (
                 <div key={req.id} className={s.requestItem}>
                   <span>{req.sender.username}</span>
                   <div className={s.reqBtns}>
                     <button className={s.acc} onClick={() => acceptRequest(req.id, req.sender)}>✓</button>
                     <button className={s.dec} onClick={() => declineRequest(req.id)}>✕</button>
                   </div>
                 </div>
               ))}
             </div>
           )}
        </div>

        {/* НИЗ: СПИСОК ДРУЗЕЙ И ЧАТ */}
        <div className={s.networkBlock}>
          <div className={s.friendsList}>
            <h3>NETWORK ({friends.length})</h3>
            {friends.map(f => (
              <div key={f.id} className={`${s.friendItem} ${activeChat?.id === f.id ? s.active : ''}`} onClick={() => openChat(f)}>
                <div className={s.friendStatus}>●</div>
                <img src={f.avatar_url} alt="" />
                <span>{f.username}</span>
              </div>
            ))}
          </div>

          {/* ОКНО ЧАТА */}
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
              <div className={s.emptyChat}>SELECT AN OPERATIVE TO ESTABLISH CONNECTION</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Profile;