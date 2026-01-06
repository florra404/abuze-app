import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { getLevelInfo } from '../../utils/levelSystem';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, LogOut, Shield, Gamepad2, Send, 
  MessageSquare, User, Clock, Zap, CheckCircle2 
} from 'lucide-react';
import s from './Profile.module.scss';

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Социалка
  const [friends, setFriends] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const chatScrollRef = useRef(null);

  // Steam
  const [steamIdInput, setSteamIdInput] = useState('');

  useEffect(() => { init(); }, []);

  const init = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");
      setUser(user);

      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(profileData);

      // Загрузка друзей
      const { data: friendships } = await supabase
        .from('friend_requests')
        .select('*, sender:sender_id(*), receiver:receiver_id(*)')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .eq('status', 'accepted');

      if (friendships) {
        const formatted = friendships.map(f => f.sender_id === user.id ? f.receiver : f.sender);
        setFriends(formatted.filter(Boolean));
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  // ЧАТ - REALTIME (ИСПРАВЛЕННЫЙ)
  useEffect(() => {
    if (!activeChat || !user) return;
    
    const channel = supabase.channel(`chat:${activeChat.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        // ФИКС ДУБЛИКАТОВ: Если сообщение от меня — игнорируем, мы его уже добавили локально
        if (payload.new.sender_id === user.id) return;

        const isRelated = (payload.new.sender_id === activeChat.id && payload.new.receiver_id === user.id);
        
        if (isRelated) {
          setMessages(prev => [...prev, payload.new]);
          scrollToBottom();
        }
      }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeChat, user]);

  const scrollToBottom = () => setTimeout(() => chatScrollRef.current?.scrollIntoView({ behavior: "smooth" }), 100);

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

    // Оптимистичное добавление
    const tempMsg = { id: Date.now(), sender_id: user.id, receiver_id: activeChat.id, content: text };
    setMessages(prev => [...prev, tempMsg]);
    scrollToBottom();

    await supabase.from('messages').insert({ sender_id: user.id, receiver_id: activeChat.id, content: text });
  };

  const handleAvatarUpdate = async (e) => {
    const file = e.target.files[0];
    if (!file || !profile) return;
    try {
      // Имя файла только латиница
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}_${Date.now()}.${fileExt}`;
      
      const { error } = await supabase.storage.from('avatars').upload(fileName, file);
      if (error) throw error;
      
      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      
      await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', profile.id);
      setProfile({ ...profile, avatar_url: data.publicUrl });
    } catch (e) { alert("Upload error: " + e.message); }
  };

  const linkSteam = async () => {
    if (!steamIdInput) return;
    await supabase.from('profiles').update({ steam_id: steamIdInput }).eq('id', user.id);
    setProfile({ ...profile, steam_id: steamIdInput });
  };

  if (loading) return <div className={s.loading}>LOADING DOSSIER...</div>;

  const { level, progressPercent } = profile ? getLevelInfo(profile.xp || 0) : { level: 1, progressPercent: 0 };
  const isAdmin = profile?.role === 'admin';

  return (
    <div className={s.page}>
      <div className="entity-fog"><div className="fog-layer"></div></div>

      <motion.button whileHover={{ x: -5 }} className={s.backBtn} onClick={() => navigate('/')}>
        <ArrowLeft /> RETURN TO BASE
      </motion.button>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={s.content}>
        
        {/* ЛЕВАЯ ПАНЕЛЬ */}
        <div className={s.leftPanel}>
          <div className={`${s.idCard} ${level >= 100 ? 'frame-entity' : ''}`}>
            <div className={s.cardHeader}>
              <Shield size={14} className={s.accent}/> OPERATIVE ID: {profile.id.slice(0,8)}
            </div>
            
            <div className={s.avatarSection}>
              <motion.div whileHover={{ scale: 1.05 }} className={s.avatarWrapper}>
                <img src={profile.avatar_url || 'https://via.placeholder.com/150'} alt="" />
                <input type="file" onChange={handleAvatarUpdate} />
                {isAdmin && <div className={s.adminBadge}>ADMIN</div>}
              </motion.div>
            </div>

            <h2 className={`${s.username} ${isAdmin ? 'admin-glow' : ''}`}>
              {profile.username}
              {profile.is_verified && <CheckCircle2 size={16} className={s.accent} style={{marginLeft:5}}/>}
            </h2>
            
            <div className={s.statsGrid}>
              <div className={s.statBox}>
                <div className={s.statLabel}><Zap size={12}/> LEVEL</div>
                <div className={s.statVal}>{level}</div>
              </div>
              <div className={s.statBox}>
                <div className={s.statLabel}><Clock size={12}/> HOURS</div>
                <div className={s.statVal}>{profile.dbd_hours || 0}</div>
              </div>
            </div>

            <div className={s.xpSection}>
              <div className={s.xpHeader}><span>XP PROGRESS</span><span>{profile.xp} XP</span></div>
              <div className={s.xpTrack}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${progressPercent}%` }} className={s.xpFill} />
              </div>
            </div>

            <div className={s.steamBlock}>
              {profile.steam_id ? (
                <div className={s.steamActive}>
                  <Gamepad2 size={16} /> STEAM LINKED: <span className={s.sid}>{profile.steam_id}</span>
                </div>
              ) : (
                <div className={s.steamForm}>
                  <input placeholder="Steam ID64" value={steamIdInput} onChange={e => setSteamIdInput(e.target.value)} />
                  <button onClick={linkSteam}>LINK</button>
                </div>
              )}
            </div>

            <button className={s.logoutBtn} onClick={() => supabase.auth.signOut().then(() => navigate('/'))}>
              <LogOut size={16} /> LOGOUT
            </button>
          </div>
        </div>

        {/* ПРАВАЯ ПАНЕЛЬ (ЧАТ) */}
        <div className={s.rightPanel}>
          <div className={s.chatInterface}>
            <div className={s.friendsBar}>
              {friends.length === 0 && <span className={s.noFriends}>No connections.</span>}
              {friends.map(f => (
                <motion.div 
                  key={f.id} whileHover={{ scale: 1.1 }} onClick={() => openChat(f)}
                  className={`${s.friendBubble} ${activeChat?.id === f.id ? s.activeBubble : ''}`}
                >
                  <img src={f.avatar_url} alt="" />
                  <div className={s.statusDot} />
                </motion.div>
              ))}
            </div>

            <div className={s.chatArea}>
              {activeChat ? (
                <>
                  <div className={s.chatHeader}>
                     ENCRYPTED: <span className={s.accent}>{activeChat.username}</span>
                  </div>
                  <div className={s.messagesList}>
                    {messages.map((m, i) => (
                      <motion.div 
                        key={i} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                        className={`${s.msg} ${m.sender_id === user.id ? s.mine : s.theirs}`}
                      >
                        {m.content}
                      </motion.div>
                    ))}
                    <div ref={chatScrollRef} />
                  </div>
                  <div className={s.inputZone}>
                    <input 
                      value={newMessage} onChange={e => setNewMessage(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Message..." 
                    />
                    <button onClick={sendMessage}><Send size={18} /></button>
                  </div>
                </>
              ) : (
                <div className={s.emptyState}>
                  <MessageSquare size={48} opacity={0.2} />
                  <p>SELECT AGENT</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </motion.div>
    </div>
  );
};

export default Profile;