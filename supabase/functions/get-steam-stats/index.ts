import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Обработка CORS (чтобы браузер не ругался)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { steamId } = await req.json()
    const STEAM_KEY = Deno.env.get('STEAM_API_KEY') // Достаем ключ из сейфа

    if (!steamId) throw new Error('No Steam ID provided')

    // 1. Запрашиваем список игр, чтобы найти часы в DBD (ID 381210)
    const gamesRes = await fetch(
      `http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${STEAM_KEY}&steamid=${steamId}&format=json`
    )
    const gamesData = await gamesRes.json()
    
    // Ищем Dead by Daylight
    const dbdGame = gamesData.response?.games?.find((g: any) => g.appid === 381210)
    const hours = dbdGame ? Math.round(dbdGame.playtime_forever / 60) : 0

    // 2. Запрашиваем данные профиля (ник, аватарка) - опционально, если хочешь обновлять их с стима
    // Но нам пока важны часы.

    return new Response(
      JSON.stringify({ hours, steamId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})