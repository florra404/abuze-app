import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { getLevelInfo, getFrameClass } from '../../utils/levelSystem';
import s from './Profile.module.scss';

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Социалка
  const [friends, setFriends] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Чат
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const chatScrollRef = useRef(null);

  // Steam
  const [steamIdInput, setSteamIdInput] = useState('');

  useEffect(() => { init(); }, []);

  // --- ЛОГИКА ЗАГРУЗКИ ---
  const init = async () => {
    try {
      setLoading(true);
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Auth error");
      setUser(user);

      // Профиль
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(profileData);

      // Друзья (Accepted)
      const { data: friendships } = await supabase
        .from('friend_requests')
        .select('*, sender:sender_id(*), receiver:receiver_id(*)')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .eq('status', 'accepted');

      if (friendships) {
        const formattedFriends = friendships.map(f => f.sender_id === user.id ? f.receiver : f.sender);
        setFriends(formattedFriends.filter(f => f !== null));
      }

    } catch (error) {
      console.error("INIT ERROR:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- ЧАТ (REALTIME) ---
  useEffect(() => {
    if (!activeChat || !user) return;
    
    const channel = supabase
      .channel('chat_room')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const isRelated = (payload.new.sender_id === activeChat.id && payload.new.receiver_id === user.id) ||
                          (payload.new.sender_id === user.id && payload.new.receiver_id === activeChat.id);
        
        if (isRelated) {
          setMessages(prev => {
             // Защита от дублей (если сообщение уже добавлено оптимистично)
             if (prev.find(m => m.id === payload.new.id)) return prev;
             // Если это мое сообщение, которое пришло с сервера - заменяем временное (по timestamp или контенту)
             // Для простоты просто добавляем, React ключи разберет
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

  // --- ДЕЙСТВИЯ ---
  const openChat = async (friend) => {
    setActiveChat(friend);
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
    setNewMessage(''); 

    // Оптимистичное обновление
    setMessages(prev => [...prev, {
      id: Date.now(), sender_id: user.id, receiver_id: activeChat.id, content: text, created_at: new Date().toISOString()
    }]);
    scrollToBottom();

    await supabase.from('messages').insert({
      sender_id: user.id, receiver_id: activeChat.id, content: text
    });
  };

  const handleAvatarUpdate = async (e) => {
    const file = e.target.files[0];
    if (!file || !profile) return;
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}-${Date.now()}.${fileExt}`;
      await supabase.storage.from('avatars').upload(fileName, file);
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', profile.id);
      setProfile({ ...profile, avatar_url: publicUrl });
    } catch (error) { alert("Upload failed"); }
  };

  const linkSteam = async () => {
    if (!steamIdInput) return;
    // Просто сохраняем ID, так как функцию мы еще не деплоили или она сложная
    // Если функция get-steam-stats работает - раскомментируй вызов функции
    await supabase.from('profiles').update({ steam_id: steamIdInput }).eq('id', user.id);
    setProfile({ ...profile, steam_id: steamIdInput });
    alert("STEAM ID LINKED");
  };

  // --- РЕНДЕРИНГ ---
  const { level, progressPercent } = profile ? getLevelInfo(profile.xp || 0) : { level: 1, progressPercent: 0 };
  const frameClass = getFrameClass(level);

  if (loading) return <div className={s.loading}><div className={s.loader}></div>INITIALIZING...</div>;
  if (!profile) return <div className={s.loading}>DATA CORRUPTED. RESTART APP.</div>;

  return (
    <div className={s.container}>
      <button className={s.backBtn} onClick={() => navigate('/')}>← MAIN MENU</button>

      <div className={s.content}>
        
        {/* ЛЕВАЯ ПАНЕЛЬ: ID CARD */}
        <div className={s.leftPanel}>
          <div className={`${s.idCard} ${s[frameClass]}`}>
            <div className={s.cardHeader}>OPERATIVE ID // {profile.id.slice(0,8)}</div>
            
            <div className={s.avatarSection}>
              <div className={s.avatarContainer}>
                 <img src={profile.avatar_url || 'https://via.placeholder.com/150'} className={s.avatarImg} alt=""/>
                 {/* Скрытый инпут поверх картинки */}
                 <input type="file" className={s.hiddenInput} onChange={handleAvatarUpdate} title="Change Avatar" />
                 <div className={s.uploadOverlay}>UPLOAD</div>
              </div>
              <div className={s.lvlCircle}>{level}</div>
            </div>

            <h2 className={s.userName}>{profile.username}</h2>
            
            <div className={s.statsGrid}>
              <div className={s.statBox}>
                <label>XP</label> <span>{profile.xp || 0}</span>
              </div>
              <div className={s.statBox}>
                <label>HOURS</label> <span>{profile.dbd_hours || 0}</span>
              </div>
            </div>

            <div className={s.xpTrack}>
              <div className={s.xpFill} style={{width: `${progressPercent}%`}}></div>
            </div>

            {/* Steam Link */}
            <div className={s.steamSection}>
              {profile.steam_id ? (
                <div className={s.steamActive}>STEAM LINKED: {profile.steam_id}</div>
              ) : (
                <div className={s.steamForm}>
                  <input placeholder="STEAM ID64..." value={steamIdInput} onChange={e => setSteamIdInput(e.target.value)} />
                  <button onClick={linkSteam}>LINK</button>
                </div>
              )}
            </div>

            <button className={s.logoutBtn} onClick={() => supabase.auth.signOut().then(() => navigate('/'))}>TERMINATE SESSION</button>
          </div>
        </div>

        {/* ПРАВАЯ ПАНЕЛЬ: КОММУНИКАТОР */}
        <div className={s.rightPanel}>
          
          {/* СПИСОК ДРУЗЕЙ (СВЕРХУ) */}
          <div className={s.friendsBar}>
            <div className={s.searchWrap}>
              <span style={{opacity:0.5}}>🔍</span>
              {/* Логику поиска друзей можно добавить сюда позже, пока просто заглушка */}
              <input placeholder="SEARCH AGENT..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            
            <div className={s.friendsScroll}>
               {friends.length === 0 && <div style={{fontSize:'10px', color:'#666', padding:'10px'}}>NO CONNECTIONS</div>}
               {friends.map(f => (
                 <div key={f.id} className={`${s.friendBubble} ${activeChat?.id === f.id ? s.active : ''}`} onClick={() => openChat(f)} title={f.username}>
                   <img src={f.avatar_url || 'https://via.placeholder.com/50'} alt=""/>
                   <div className={s.statusDot}></div>
                 </div>
               ))}
            </div>
          </div>

          {/* ОКНО ЧАТА */}
          <div className={s.chatContainer}>
            {activeChat ? (
              <>
                 <div className={s.chatHeader}>
                    SECURE CONNECTION: <span className={s.red}>{activeChat.username}</span>
                 </div>
                 <div className={s.msgList}>
                    {messages.map((m, i) => (
                      <div key={i} className={`${s.msg} ${m.sender_id === user.id ? s.mine : s.theirs}`}>
                        {m.content}
                      </div>
                    ))}
                    <div ref={chatScrollRef} />
                 </div>
                 <div className={s.inputArea}>
                    <input 
                      value={newMessage} 
                      onChange={e => setNewMessage(e.target.value)} 
                      onKeyDown={e => e.key === 'Enter' && sendMessage()}
                      placeholder="TRANSMIT MESSAGE..." 
                    />
                    <button onClick={sendMessage}>SEND</button>
                 </div>
              </>
            ) : (
              <div className={s.emptyState}>
                <div className={s.emptyIcon}>📡</div>
                <div>SELECT FREQUENCY TO BEGIN TRANSMISSION</div>
              </div>
            )}
          </div>
          
        </div>

      </div>
    </div>
  );
};

export default Profile;