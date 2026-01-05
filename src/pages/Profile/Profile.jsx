import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import MagicButton from '../../components/UI/MagicButton/MagicButton';
import killersData from '../../data/killers.json';

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('card');
  const navigate = useNavigate();

  // Состояния для друзей
  const [friends, setFriends] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);

  useEffect(() => { getProfileData(); }, []);

  const getProfileData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return navigate('/login');

    // 1. Грузим мой профиль
    const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (error) console.error("Error fetching profile:", error);
    setProfile(data);

    // 2. Грузим список друзей
    const { data: friendLinks } = await supabase.from('friendships').select('friend_id').eq('user_id', user.id);
    
    if (friendLinks && friendLinks.length > 0) {
      const friendIds = friendLinks.map(link => link.friend_id);
      const { data: friendsProfiles } = await supabase.from('profiles').select('*').in('id', friendIds);
      setFriends(friendsProfiles || []);
    }
    
    setLoading(false);
  };

  // --- ИСПРАВЛЕННАЯ ЗАГРУЗКА АВАТАРКИ ---
  const handleAvatarUpdate = async (e) => {
    const file = e.target.files[0];
    if (!file || !profile) return;

    try {
      // Показываем, что процесс пошел (можно добавить спиннер, но пока просто alert если долго)
      console.log("Starting upload...");

      const fileExt = file.name.split('.').pop();
      // Используем случайное число, чтобы обновить кэш браузера
      const fileName = `${profile.id}-${Date.now()}.${fileExt}`;

      // 1. Загружаем файл в Storage 'avatars'
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // 2. Получаем публичную ссылку
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // 3. Обновляем ссылку в таблице profiles
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      // 4. Обновляем состояние на экране мгновенно
      setProfile({ ...profile, avatar_url: publicUrl });
      alert("AVATAR UPDATED SUCCESSFULLY");

    } catch (error) {
      console.error("Upload error:", error);
      alert("UPLOAD FAILED: " + error.message);
    }
  };

  const searchUser = async () => {
    if (!searchQuery) return;
    const { data, error } = await supabase.from('profiles').select('*').ilike('username', searchQuery).single();
    if (error || !data) {
      alert("USER NOT FOUND");
      setSearchResult(null);
    } else {
      setSearchResult(data);
    }
  };

  const addFriend = async () => {
    if (!searchResult || !profile) return;
    if (searchResult.id === profile.id) return alert("CANNOT ADD YOURSELF");

    const { error } = await supabase.from('friendships').insert({
      user_id: profile.id,
      friend_id: searchResult.id
    });

    if (error) {
      alert("ALREADY IN FRIENDS LIST");
    } else {
      alert(`ADDED ${searchResult.username}`);
      setFriends([...friends, searchResult]);
      setSearchResult(null);
      setSearchQuery('');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (loading) return <div style={{background:'#050505', height:'100vh', display:'flex', justifyContent:'center', alignItems:'center', color:'#fff'}}>LOADING DATA...</div>;

  const favKillersObjects = killersData.filter(k => profile?.favorite_killers?.includes(k.id));

  return (
    <div style={{ minHeight: '100vh', background: '#050505', padding: '40px', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      
      <button onClick={() => navigate('/')} style={{position:'absolute', top:30, left:30, background:'transparent', border:'none', color:'#666', cursor:'pointer', fontSize:'14px', textTransform:'uppercase'}}>← Main Menu</button>

      {/* ТАБЫ */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '30px', marginTop: '40px' }}>
        <button onClick={() => setActiveTab('card')} style={{ background: 'transparent', border: 'none', color: activeTab === 'card' ? '#a70a0a' : '#555', fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase', cursor: 'pointer', borderBottom: activeTab === 'card' ? '2px solid #a70a0a' : '2px solid transparent', paddingBottom: '5px' }}>Operative Card</button>
        <button onClick={() => setActiveTab('friends')} style={{ background: 'transparent', border: 'none', color: activeTab === 'friends' ? '#a70a0a' : '#555', fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase', cursor: 'pointer', borderBottom: activeTab === 'friends' ? '2px solid #a70a0a' : '2px solid transparent', paddingBottom: '5px' }}>Network</button>
      </div>

      <div style={{ width: '100%', maxWidth: '800px' }}>
        
        {/* === ВКЛАДКА 1: ПРОФИЛЬ === */}
        {activeTab === 'card' && (
          <>
            <div style={{ 
              background: 'linear-gradient(180deg, rgba(20,20,20,0.9) 0%, rgba(10,10,10,0.95) 100%)', 
              border: '1px solid #333', borderRadius: '16px', padding: '40px', position: 'relative', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
            }}>
              {profile?.role === 'admin' && <div style={{position: 'absolute', top: '-50%', left: '-50%', width: '200%', height: '200%', background: 'radial-gradient(circle, rgba(167,10,10,0.1) 0%, transparent 70%)', pointerEvents: 'none'}}/>}

              <div style={{ display: 'flex', gap: '40px', position: 'relative', zIndex: 1, alignItems: 'center' }}>
                
                {/* --- АВАТАРКА (СДЕЛАНА КЛИКАБЕЛЬНОЙ) --- */}
                <div style={{ position: 'relative' }}>
                  <label 
                    htmlFor="avatar-upload" 
                    title="Click to change avatar"
                    style={{ 
                      display: 'block',
                      width: '150px', height: '150px', borderRadius: '50%', overflow: 'hidden',
                      border: profile?.role === 'admin' ? '4px solid #a70a0a' : '3px solid #444', 
                      background: '#000', cursor: 'pointer', position: 'relative'
                    }}
                  >
                    {/* Если есть аватарка - показываем картинку */}
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} style={{width:'100%', height:'100%', objectFit:'cover'}} alt="Ava" />
                    ) : (
                      // Если нет - показываем заглушку
                      <div style={{width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', color:'#333'}}>
                        <span style={{fontSize:'40px'}}>?</span>
                        <span style={{fontSize:'10px', marginTop:'5px'}}>UPLOAD</span>
                      </div>
                    )}
                    
                    {/* Эффект при наведении (полупрозрачный слой) */}
                    <div className="avatar-overlay" style={{
                      position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      opacity: 0, transition: '0.2s', color: 'white', fontSize: '24px'
                    }}>
                      📷
                    </div>
                  </label>
                  
                  {/* Скрытый инпут файла */}
                  <input 
                    id="avatar-upload" 
                    type="file" 
                    accept="image/*" 
                    onChange={handleAvatarUpdate} 
                    style={{display:'none'}} 
                  />
                </div>

                {/* ИНФО */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <h1 style={{ margin: 0, fontSize: '42px', textTransform: 'uppercase' }}>{profile?.username}</h1>
                    {profile?.role === 'admin' && <div style={{background: '#a70a0a', color: '#fff', fontSize: '10px', padding: '4px 8px', borderRadius: '4px'}}>ADMIN</div>}
                  </div>
                  <p style={{ color: '#666', margin: '5px 0 20px 0', fontFamily: 'monospace' }}>ID: {profile?.id.substring(0, 8)}...</p>
                  <div style={{ display: 'flex', gap: '30px' }}>
                    <div><span style={{ fontSize:'10px', color:'#555' }}>STATUS</span> <span style={{ color:'#00ff00' }}>● ONLINE</span></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Блок любимых маньяков */}
            <div style={{ marginTop: '30px' }}>
              <h3 style={{ textTransform:'uppercase', letterSpacing:'2px', color:'#888' }}>Main Killers</h3>
              <div style={{ display: 'flex', gap: '20px', minHeight: '120px' }}>
                {favKillersObjects.length > 0 ? favKillersObjects.map(k => (
                  <div key={k.id}><img src={k.img} alt={k.name} style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '10px', border: '2px solid #333' }} /></div>
                )) : <span style={{color: '#444'}}>No killers selected</span>}
              </div>
            </div>
            
            <div style={{ marginTop: '50px', textAlign: 'center' }}>
              <MagicButton onClick={handleLogout} text="TERMINATE SESSION" />
            </div>
          </>
        )}

        {/* === ВКЛАДКА 2: ДРУЗЬЯ (Без изменений) === */}
        {activeTab === 'friends' && (
          <div style={{ background: '#111', padding: '30px', borderRadius: '10px', border: '1px solid #333' }}>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', borderBottom: '1px solid #333', paddingBottom: '20px' }}>
              <input type="text" placeholder="ENTER USERNAME..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ flex: 1, padding: '15px', background: '#000', border: '1px solid #444', color: '#fff', outline: 'none' }} />
              <button onClick={searchUser} style={{ background: '#333', color: '#fff', border: 'none', padding: '0 20px', cursor: 'pointer' }}>SEARCH</button>
            </div>
            {searchResult && (
              <div style={{ background: '#1a1a1a', padding: '15px', marginBottom: '30px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #00ff00' }}>
                <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                   <img src={searchResult.avatar_url || ''} style={{width:'40px', height:'40px', borderRadius:'50%', background:'#000'}} alt=""/>
                   <span style={{fontWeight:'bold'}}>{searchResult.username}</span>
                </div>
                <button onClick={addFriend} style={{background:'#00ff00', border:'none', padding:'10px 20px', cursor:'pointer', fontWeight:'bold'}}>ADD +</button>
              </div>
            )}
            <h3 style={{color: '#666', fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase'}}>YOUR NETWORK ({friends.length})</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px', marginTop: '20px' }}>
              {friends.map(friend => (
                <div key={friend.id} style={{ background: '#0a0a0a', padding: '15px', borderRadius: '8px', border: '1px solid #333', display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', background: '#000' }}>
                     {friend.avatar_url ? <img src={friend.avatar_url} style={{width:'100%', height:'100%', objectFit:'cover'}} alt=""/> : <div style={{height:'100%', display:'flex', alignItems:'center', justifyContent:'center'}}>?</div>}
                  </div>
                  <div><div style={{fontWeight:'bold', color: '#e6e6e6'}}>{friend.username}</div><div style={{fontSize:'10px', color: '#00ff00'}}>● ONLINE</div></div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
      
      {/* Стили для ховера на аватарку */}
      <style>{`
        label:hover .avatar-overlay {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );
};

export default Profile;