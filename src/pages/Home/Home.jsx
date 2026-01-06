import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, MessageCircle, Share2, Plus, Zap, 
  BadgeCheck, Image as ImageIcon, Send 
} from 'lucide-react';
import s from './Home.module.scss';

const VERSION = "v3.0.0 // SOCIAL";

const Home = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Создание поста
  const [isCreating, setIsCreating] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newImage, setNewImage] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchFeed();
    // Realtime подписка на новые посты
    const channel = supabase.channel('feed_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload) => {
        // Подгружаем полный пост с автором
        fetchSinglePost(payload.new.id);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchFeed = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);

    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        author:profiles(*),
        likes(user_id),
        comments(count)
      `)
      .order('created_at', { ascending: false });

    if (data) setPosts(data);
    setLoading(false);
  };

  const fetchSinglePost = async (id) => {
    const { data } = await supabase.from('posts').select('*, author:profiles(*), likes(user_id), comments(count)').eq('id', id).single();
    if(data) setPosts(prev => [data, ...prev]);
  };

  // --- ЛОГИКА ---
  const handleLike = async (postId) => {
    const postIndex = posts.findIndex(p => p.id === postId);
    const post = posts[postIndex];
    const isLiked = post.likes.some(l => l.user_id === user.id);

    // Оптимистичное обновление UI
    const updatedPosts = [...posts];
    if (isLiked) {
      updatedPosts[postIndex].likes = post.likes.filter(l => l.user_id !== user.id);
      await supabase.from('likes').delete().match({ user_id: user.id, post_id: postId });
    } else {
      updatedPosts[postIndex].likes.push({ user_id: user.id });
      // Даем XP за лайк
      await supabase.rpc('increment_xp', { amount: 2, user_id: user.id }); // Если функции нет, пропустит
      await supabase.from('likes').insert({ user_id: user.id, post_id: postId });
    }
    setPosts(updatedPosts);
  };

  const createPost = async () => {
    if (!newContent && !newImage) return;
    setLoading(true);

    let imageUrl = null;
    if (newImage) {
      const fileName = `${user.id}-${Date.now()}`;
      await supabase.storage.from('feed').upload(fileName, newImage);
      const { data } = supabase.storage.from('feed').getPublicUrl(fileName);
      imageUrl = data.publicUrl;
    }

    await supabase.from('posts').insert({
      user_id: user.id,
      content: newContent,
      image_url: imageUrl
    });

    // Начисляем XP за пост (+50)
    // В идеале делать через RPC, но сделаем через апдейт для простоты
    const { data: profile } = await supabase.from('profiles').select('xp').eq('id', user.id).single();
    await supabase.from('profiles').update({ xp: (profile.xp || 0) + 50 }).eq('id', user.id);

    setIsCreating(false);
    setNewContent('');
    setNewImage(null);
    setLoading(false);
  };

  return (
    <div className={s.page}>
      <div className="entity-fog"><div className="fog-layer"></div></div>

      {/* HEADER */}
      <header className={s.header}>
        <div className={s.logo}>ABUZE<span className={s.accent}>.NET</span></div>
        
        {/* Кнопка Рандомайзера (Спрятана) */}
        <div className={s.miniNav}>
           <motion.button whileHover={{scale:1.1}} className={s.iconBtn} onClick={() => navigate('/randomizer')} title="Randomizer">
             <Zap size={20} />
           </motion.button>
           <motion.button whileHover={{scale:1.1}} className={s.iconBtn} onClick={() => navigate('/profile')} title="Profile">
             <img src={posts.find(p=>p.user_id===user?.id)?.author?.avatar_url || 'https://via.placeholder.com/30'} className={s.miniAva} alt=""/>
           </motion.button>
        </div>
      </header>

      {/* CREATE POST BAR */}
      <div className={s.createBar} onClick={() => setIsCreating(true)}>
        <Plus size={20} className={s.accent}/>
        <span>Share your latest kill...</span>
      </div>

      {/* MODAL CREATE */}
      <AnimatePresence>
        {isCreating && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className={s.modalOverlay}>
            <div className={s.modal}>
              <h3>NEW TRANSMISSION</h3>
              <textarea placeholder="Write caption..." value={newContent} onChange={e=>setNewContent(e.target.value)}/>
              
              {newImage && <img src={URL.createObjectURL(newImage)} className={s.previewImg} alt=""/>}
              
              <div className={s.modalActions}>
                <button onClick={() => fileInputRef.current.click()}><ImageIcon size={20}/></button>
                <input type="file" ref={fileInputRef} hidden onChange={e=>setNewImage(e.target.files[0])}/>
                
                <div style={{flex:1}}></div>
                <button onClick={()=>setIsCreating(false)} className={s.cancel}>CANCEL</button>
                <button onClick={createPost} className={s.postBtn}>PUBLISH (+50 XP)</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FEED */}
      <div className={s.feed}>
        {posts.map(post => {
           const isLiked = post.likes?.some(l => l.user_id === user?.id);
           return (
             <motion.div 
               initial={{y:20, opacity:0}} animate={{y:0, opacity:1}} 
               key={post.id} className={s.postCard}
             >
               {/* Author Header */}
               <div className={s.postHeader}>
                 <img src={post.author?.avatar_url} className={s.postAva} alt=""/>
                 <div className={s.postMeta}>
                   <div className={s.authorName}>
                     {post.author?.username}
                     {post.author?.is_verified && <BadgeCheck size={14} className={s.verifyBadge} />}
                   </div>
                   <div className={s.postTime}>{new Date(post.created_at).toLocaleDateString()}</div>
                 </div>
               </div>

               {/* Content */}
               <div className={s.postContent}>{post.content}</div>
               {post.image_url && <img src={post.image_url} className={s.postImage} alt=""/>}

               {/* Actions */}
               <div className={s.postActions}>
                 <button className={`${s.actBtn} ${isLiked ? s.liked : ''}`} onClick={() => handleLike(post.id)}>
                   <Heart size={20} fill={isLiked ? "#e11d48" : "none"} /> 
                   <span>{post.likes?.length || 0}</span>
                 </button>
                 <button className={s.actBtn}>
                   <MessageCircle size={20} />
                   <span>{post.comments?.[0]?.count || 0}</span>
                 </button>
                 <button className={s.actBtn} style={{marginLeft:'auto'}}>
                   <Share2 size={20} />
                 </button>
               </div>
             </motion.div>
           );
        })}
        {posts.length === 0 && <div className={s.empty}>NO TRANSMISSIONS YET</div>}
      </div>
    </div>
  );
};

export default Home;