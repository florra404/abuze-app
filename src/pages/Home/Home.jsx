import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, MessageCircle, Trash2, Plus, Zap, Settings, Trophy,
  BadgeCheck, Image as ImageIcon, Search, UserPlus, Megaphone
} from 'lucide-react';
import { getLevelInfo } from '../../utils/levelSystem'; // Импорт уровней
import s from './Home.module.scss';

const Home = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null); // Мой профиль отдельно
  const [activeTab, setActiveTab] = useState('feed'); // 'feed' | 'news' | 'search'
  
  // Данные
  const [posts, setPosts] = useState([]);
  const [news, setNews] = useState([]);
  const [usersSearch, setUsersSearch] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Создание
  const [isCreating, setIsCreating] = useState(false); // Пост
  const [isNewsCreating, setIsNewsCreating] = useState(false); // Новость
  const [newContent, setNewContent] = useState('');
  const [newTitle, setNewTitle] = useState(''); // Заголовок новости
  const [newImage, setNewImage] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    init();
    
    // REALTIME FEED
    const channel = supabase.channel('feed_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload) => {
        if (payload.new.user_id !== user?.id) fetchSinglePost(payload.new.id);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'posts' }, (payload) => {
        setPosts(prev => prev.filter(p => p.id !== payload.old.id));
      })
      .subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]); // Зависимость от ID, чтобы не дублировать

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    
    // Грузим МОЙ профиль для шапки
    const { data: myProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    setProfile(myProfile);

    // Грузим контент
    fetchFeed();
    fetchNews();
  };

  const fetchFeed = async () => {
    const { data } = await supabase.from('posts')
      .select('*, author:profiles(*), likes(user_id), comments(count)')
      .order('created_at', { ascending: false });
    if (data) setPosts(data);
    setLoading(false);
  };

  const fetchNews = async () => {
    const { data } = await supabase.from('news').select('*').order('created_at', { ascending: false });
    setNews(data || []);
  };

  const fetchSinglePost = async (id) => {
    const { data } = await supabase.from('posts').select('*, author:profiles(*), likes(user_id), comments(count)').eq('id', id).single();
    if(data) setPosts(prev => [data, ...prev]);
  };

  const handleSearch = async (query) => {
    if (!query) return;
    const { data } = await supabase.from('profiles').select('*').ilike('username', `%${query}%`).limit(10);
    setUsersSearch(data || []);
  };

  // --- ACTIONS ---
  
  const handleLike = async (postId) => {
    const postIndex = posts.findIndex(p => p.id === postId);
    const post = posts[postIndex];
    const isLiked = post.likes.some(l => l.user_id === user.id);

    const updatedPosts = [...posts];
    if (isLiked) {
      updatedPosts[postIndex].likes = post.likes.filter(l => l.user_id !== user.id);
      await supabase.from('likes').delete().match({ user_id: user.id, post_id: postId });
    } else {
      updatedPosts[postIndex].likes.push({ user_id: user.id });
      // XP Logic handled by SQL trigger usually, but manual here:
      await supabase.rpc('increment_xp', { amount: 2, user_id: user.id }).catch(()=>{}); 
      await supabase.from('likes').insert({ user_id: user.id, post_id: postId });
    }
    setPosts(updatedPosts);
  };

  const createPost = async () => {
    if (!newContent && !newImage) return;
    let imageUrl = null;
    if (newImage) {
      const fileName = `${user.id}-${Date.now()}`;
      await supabase.storage.from('feed').upload(fileName, newImage);
      const { data } = supabase.storage.from('feed').getPublicUrl(fileName);
      imageUrl = data.publicUrl;
    }
    // Создаем пост (Optimistic update не нужен, так как realtime сработает для нас самих)
    // НО, чтобы не ждать, добавим сами, а realtime проигнорирует наш ID
    const { data, error } = await supabase.from('posts').insert({
      user_id: user.id,
      content: newContent,
      image_url: imageUrl
    }).select('*, author:profiles(*), likes(user_id), comments(count)').single();

    if (data) setPosts(prev => [data, ...prev]); // Добавляем сразу

    // XP +50
    if (profile) {
      await supabase.from('profiles').update({ xp: (profile.xp || 0) + 50 }).eq('id', user.id);
    }

    setIsCreating(false); setNewContent(''); setNewImage(null);
  };

  const createNews = async () => {
    if (!newContent || !newTitle) return;
    await supabase.from('news').insert({ title: newTitle, content: newContent });
    setIsNewsCreating(false); setNewContent(''); setNewTitle('');
    fetchNews();
  };

  const deletePost = async (id) => {
    if (!window.confirm("DELETE TRANSMISSION?")) return;
    await supabase.from('posts').delete().eq('id', id);
    // Realtime удалит из списка
  };

  const sendFriendRequest = async (targetId) => {
    await supabase.from('friend_requests').insert({ sender_id: user.id, receiver_id: targetId });
    alert("REQUEST SENT");
  };

  return (
    <div className={s.page}>
      <div className="entity-fog"><div className="fog-layer"></div></div>

      {/* HEADER */}
      <header className={s.header}>
        <div className={s.logo}>ABUZE<span className={s.accent}>.NET</span></div>
        
        {/* Кнопки-иконки (Рандомайзер, Настройки, Лидеры) */}
        <div className={s.miniNav}>
           <NavIcon icon={<Zap size={18} />} onClick={() => navigate('/randomizer')} title="Randomizer" />
           <NavIcon icon={<Trophy size={18} />} onClick={() => alert('Leaderboard coming to header soon')} title="Leaderboard" />
           <NavIcon icon={<Settings size={18} />} onClick={() => navigate('/settings')} title="Settings" />
           
           <motion.div whileHover={{scale:1.1}} className={s.profileLink} onClick={() => navigate('/profile')}>
             <img src={profile?.avatar_url || 'https://via.placeholder.com/30'} alt=""/>
           </motion.div>
        </div>
      </header>

      {/* TABS (Вкладки) */}
      <div className={s.tabs}>
        <Tab label="FEED" active={activeTab==='feed'} onClick={()=>setActiveTab('feed')} />
        <Tab label="NEWS" active={activeTab==='news'} onClick={()=>setActiveTab('news')} />
        <Tab label="SEARCH" active={activeTab==='search'} onClick={()=>setActiveTab('search')} />
      </div>

      {/* === FEED TAB === */}
      {activeTab === 'feed' && (
        <>
          <div className={s.createBar} onClick={() => setIsCreating(true)}>
            <Plus size={20} className={s.accent}/>
            <span>New Transmission...</span>
          </div>

          <div className={s.feedList}>
            {posts.map(post => {
              const isMe = post.user_id === user?.id;
              const isAdmin = profile?.role === 'admin';
              const isLiked = post.likes?.some(l => l.user_id === user?.id);

              return (
                <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} key={post.id} className={s.postCard}>
                  <div className={s.postHeader}>
                    <img src={post.author?.avatar_url} className={s.postAva} alt=""/>
                    <div className={s.postMeta}>
                      <div className={`${s.authorName} ${post.author?.role === 'admin' ? s.adminGlow : ''}`}>
                        {post.author?.username}
                        {post.author?.is_verified && <BadgeCheck size={14} className={s.verifyBadge} />}
                      </div>
                      <div className={s.postTime}>{new Date(post.created_at).toLocaleDateString()}</div>
                    </div>
                    {(isMe || isAdmin) && (
                      <button className={s.deleteBtn} onClick={() => deletePost(post.id)}><Trash2 size={16}/></button>
                    )}
                  </div>
                  <div className={s.postContent}>{post.content}</div>
                  {post.image_url && <img src={post.image_url} className={s.postImage} alt=""/>}
                  <div className={s.postActions}>
                    <button className={`${s.actBtn} ${isLiked ? s.liked : ''}`} onClick={() => handleLike(post.id)}>
                      <Heart size={20} fill={isLiked ? "#e11d48" : "none"} /> <span>{post.likes?.length || 0}</span>
                    </button>
                    <button className={s.actBtn}><MessageCircle size={20} /> <span>{post.comments?.[0]?.count || 0}</span></button>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </>
      )}

      {/* === NEWS TAB === */}
      {activeTab === 'news' && (
        <div className={s.feedList}>
          {profile?.role === 'admin' && (
            <button className={s.createNewsBtn} onClick={() => setIsNewsCreating(true)}>PUBLISH NEWS</button>
          )}
          {news.map(n => (
            <motion.div key={n.id} initial={{opacity:0}} animate={{opacity:1}} className={s.newsCard}>
              <div className={s.newsHeader}>
                <Megaphone size={16} className={s.accent} /> SYSTEM MESSAGE
                <span className={s.date}>{new Date(n.created_at).toLocaleDateString()}</span>
              </div>
              <h3>{n.title}</h3>
              <p>{n.content}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* === SEARCH TAB === */}
      {activeTab === 'search' && (
        <div className={s.searchPage}>
          <div className={s.searchBar}>
            <Search size={18} />
            <input placeholder="Find operative..." onChange={(e) => handleSearch(e.target.value)} />
          </div>
          <div className={s.usersList}>
            {usersSearch.map(u => (
               <div key={u.id} className={s.userRow}>
                 <img src={u.avatar_url} alt=""/>
                 <div className={s.uInfo}>
                    <span className={u.role === 'admin' ? s.adminGlow : ''}>{u.username}</span>
                    <span className={s.lvl}>LVL {getLevelInfo(u.xp).level}</span>
                 </div>
                 <button onClick={() => sendFriendRequest(u.id)}><UserPlus size={18}/></button>
               </div>
            ))}
          </div>
        </div>
      )}

      {/* MODALS */}
      <AnimatePresence>
        {(isCreating || isNewsCreating) && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className={s.modalOverlay}>
            <div className={s.modal}>
              <h3>{isNewsCreating ? 'GLOBAL BROADCAST' : 'NEW TRANSMISSION'}</h3>
              
              {isNewsCreating && <input placeholder="TITLE" className={s.titleInput} value={newTitle} onChange={e=>setNewTitle(e.target.value)} />}
              
              <textarea placeholder="Content..." value={newContent} onChange={e=>setNewContent(e.target.value)}/>
              
              {!isNewsCreating && newImage && <img src={URL.createObjectURL(newImage)} className={s.previewImg} alt=""/>}
              
              <div className={s.modalActions}>
                {!isNewsCreating && (
                  <>
                    <button onClick={() => fileInputRef.current.click()}><ImageIcon size={20}/></button>
                    <input type="file" ref={fileInputRef} hidden onChange={e=>setNewImage(e.target.files[0])}/>
                  </>
                )}
                <div style={{flex:1}}></div>
                <button onClick={()=>{setIsCreating(false); setIsNewsCreating(false)}} className={s.cancel}>CANCEL</button>
                <button onClick={isNewsCreating ? createNews : createPost} className={s.postBtn}>PUBLISH</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const NavIcon = ({icon, onClick, title}) => (
  <motion.button whileHover={{scale:1.1, backgroundColor:'#e11d48', color:'white'}} className={s.iconBtn} onClick={onClick} title={title}>
    {icon}
  </motion.button>
);

const Tab = ({label, active, onClick}) => (
  <button className={`${s.tab} ${active ? s.activeTab : ''}`} onClick={onClick}>{label}</button>
);

export default Home;