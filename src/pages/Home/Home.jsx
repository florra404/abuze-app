import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, MessageCircle, Trash2, Plus, Zap, Settings, Trophy,
  BadgeCheck, Image as ImageIcon, Search, UserPlus, Megaphone, Send, X
} from 'lucide-react';
import { getLevelInfo } from '../../utils/levelSystem';
import s from './Home.module.scss';

const Home = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('feed');
  
  const [posts, setPosts] = useState([]);
  const [news, setNews] = useState([]);
  const [usersSearch, setUsersSearch] = useState([]);
  
  // Для создания поста
  const [isCreating, setIsCreating] = useState(false);
  const [isNewsCreating, setIsNewsCreating] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newImage, setNewImage] = useState(null);
  const fileInputRef = useRef(null);

  // Для комментариев
  const [activeCommentsPost, setActiveCommentsPost] = useState(null); // ID поста, где открыты комменты
  const [commentsList, setCommentsList] = useState([]);
  const [newComment, setNewComment] = useState('');

  useEffect(() => { init(); initRealtime(); }, []);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    setProfile(data);
    fetchFeed();
    fetchNews();
  };

  const initRealtime = () => {
    supabase.channel('public_feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => fetchFeed())
      .subscribe();
  };

  const fetchFeed = async () => {
    const { data } = await supabase.from('posts')
      .select('*, author:profiles(*), likes(user_id), comments(count)')
      .order('created_at', { ascending: false });
    if (data) setPosts(data);
  };

  const fetchNews = async () => {
    const { data } = await supabase.from('news').select('*').order('created_at', { ascending: false });
    setNews(data || []);
  };

  // --- ACTIONS ---
  
  const handleLike = async (postId) => {
    const post = posts.find(p => p.id === postId);
    const isLiked = post.likes.some(l => l.user_id === user.id);

    // Оптимистичное обновление
    const updatedPosts = posts.map(p => {
      if (p.id === postId) {
        return {
           ...p,
           likes: isLiked ? p.likes.filter(l => l.user_id !== user.id) : [...p.likes, { user_id: user.id }]
        };
      }
      return p;
    });
    setPosts(updatedPosts);

    if (isLiked) {
      await supabase.from('likes').delete().match({ user_id: user.id, post_id: postId });
    } else {
      await supabase.rpc('increment_xp', { amount: 2, user_id: user.id }); // +2 XP
      await supabase.from('likes').insert({ user_id: user.id, post_id: postId });
    }
  };

  const createPost = async () => {
    if (!newContent && !newImage) return;
    
    let imageUrl = null;
    if (newImage) {
      // ИСПРАВЛЕНИЕ: Используем только латинские буквы и цифры в имени файла
      const fileExt = newImage.name.split('.').pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage.from('feed').upload(fileName, newImage);
      
      if (uploadError) {
        alert("Image Upload Failed: " + uploadError.message);
        return;
      }
      
      const { data } = supabase.storage.from('feed').getPublicUrl(fileName);
      imageUrl = data.publicUrl;
    }

    await supabase.from('posts').insert({
      user_id: user.id,
      content: newContent,
      image_url: imageUrl
    });

    await supabase.rpc('increment_xp', { amount: 50, user_id: user.id }); // +50 XP
    setIsCreating(false); setNewContent(''); setNewImage(null);
    fetchFeed();
  };

  const deletePost = async (id) => {
    if (!window.confirm("DELETE?")) return;
    await supabase.from('posts').delete().eq('id', id);
    setPosts(posts.filter(p => p.id !== id));
  };

  // --- COMMENTS LOGIC ---
  const openComments = async (postId) => {
    setActiveCommentsPost(postId);
    const { data } = await supabase.from('comments')
      .select('*, author:profiles(*)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    setCommentsList(data || []);
  };

  const sendComment = async () => {
    if (!newComment.trim()) return;
    const { data } = await supabase.from('comments')
      .insert({ user_id: user.id, post_id: activeCommentsPost, text: newComment })
      .select('*, author:profiles(*)')
      .single();
    
    setCommentsList([...commentsList, data]);
    setNewComment('');
  };

  const deleteComment = async (commentId) => {
    await supabase.from('comments').delete().eq('id', commentId);
    setCommentsList(commentsList.filter(c => c.id !== commentId));
  };

  return (
    <div className={s.page}>
      <div className="entity-fog"><div className="fog-layer"></div></div>

      <header className={s.header}>
        <div className={s.logo}>ABUZE<span className={s.accent}>.NET</span></div>
        <div className={s.miniNav}>
           <button className={s.iconBtn} onClick={() => navigate('/randomizer')}><Zap size={18} /></button>
           <button className={s.iconBtn} onClick={() => navigate('/settings')}><Settings size={18} /></button>
           <div className={s.profileLink} onClick={() => navigate('/profile')}>
             <img src={profile?.avatar_url || 'https://via.placeholder.com/30'} alt=""/>
           </div>
        </div>
      </header>

      <div className={s.tabs}>
        <button className={activeTab==='feed' ? s.activeTab : ''} onClick={()=>setActiveTab('feed')}>FEED</button>
        <button className={activeTab==='news' ? s.activeTab : ''} onClick={()=>setActiveTab('news')}>NEWS</button>
        <button className={activeTab==='search' ? s.activeTab : ''} onClick={()=>setActiveTab('search')}>SEARCH</button>
      </div>

      {activeTab === 'feed' && (
        <div className={s.feedContainer}>
          <div className={s.createBar} onClick={() => setIsCreating(true)}>
            <Plus size={20} className={s.accent}/> Share kill...
          </div>
          
          <div className={s.feedList}>
            {posts.map(post => {
              const isLiked = post.likes?.some(l => l.user_id === user?.id);
              return (
                <motion.div initial={{opacity:0}} animate={{opacity:1}} key={post.id} className={s.postCard}>
                  <div className={s.postHeader}>
                    <img src={post.author?.avatar_url} className={s.postAva} alt=""/>
                    <div className={s.postMeta}>
                      <span className={`${s.authorName} ${post.author?.role==='admin' ? 'admin-glow' : ''}`}>
                        {post.author?.username} {post.author?.is_verified && <BadgeCheck size={12} className={s.accent}/>}
                      </span>
                      <span className={s.time}>{new Date(post.created_at).toLocaleDateString()}</span>
                    </div>
                    {(profile?.role === 'admin' || post.user_id === user.id) && 
                      <button className={s.delBtn} onClick={()=>deletePost(post.id)}><Trash2 size={14}/></button>
                    }
                  </div>
                  <div className={s.content}>{post.content}</div>
                  {post.image_url && <img src={post.image_url} className={s.postImg} alt=""/>}
                  
                  <div className={s.actions}>
                    <button className={isLiked ? s.liked : ''} onClick={()=>handleLike(post.id)}>
                      <Heart size={18} fill={isLiked ? "#e11d48" : "none"}/> {post.likes?.length || 0}
                    </button>
                    <button onClick={()=>openComments(post.id)}>
                      <MessageCircle size={18}/> {post.comments?.[0]?.count || 0}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- COMMENTS MODAL --- */}
      <AnimatePresence>
        {activeCommentsPost && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className={s.modalOverlay}>
            <div className={s.modal}>
              <div className={s.modalHeader}>
                <h3>COMMENTS</h3>
                <button onClick={()=>setActiveCommentsPost(null)}><X size={20}/></button>
              </div>
              <div className={s.commentsList}>
                {commentsList.map(c => (
                  <div key={c.id} className={s.commentRow}>
                    <img src={c.author?.avatar_url} alt=""/>
                    <div className={s.cContent}>
                      <span className={c.author?.role==='admin' ? 'admin-glow' : ''}>{c.author?.username}</span>
                      <p>{c.text}</p>
                    </div>
                    {(profile?.role === 'admin' || c.user_id === user.id) &&
                      <button onClick={()=>deleteComment(c.id)} className={s.delBtn}><Trash2 size={12}/></button>
                    }
                  </div>
                ))}
              </div>
              <div className={s.commentInput}>
                <input value={newComment} onChange={e=>setNewComment(e.target.value)} placeholder="Write comment..." />
                <button onClick={sendComment}><Send size={16}/></button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* --- CREATE POST MODAL --- */}
      {isCreating && (
        <div className={s.modalOverlay}>
          <div className={s.modal}>
            <h3>NEW POST</h3>
            <textarea value={newContent} onChange={e=>setNewContent(e.target.value)} placeholder="Text..."/>
            {newImage && <img src={URL.createObjectURL(newImage)} className={s.previewImg} alt=""/>}
            <div className={s.modalActions}>
               <button onClick={()=>fileInputRef.current.click()}><ImageIcon/></button>
               <input type="file" ref={fileInputRef} hidden onChange={e=>setNewImage(e.target.files[0])}/>
               <div style={{flex:1}}></div>
               <button onClick={()=>setIsCreating(false)}>CANCEL</button>
               <button onClick={createPost} className={s.accentBtn}>POST</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Home;