import { corsHeaders } from '../_shared/cors.ts';
import { getServiceClient, getUserId } from '../_shared/supabase.ts';

const LIVEPEER_API_URL = 'https://livepeer.studio/api/v1';
const YOUTUBE_RTMP_URL = 'rtmp://a.rtmp.youtube.com/live2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const userId = await getUserId(req);
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { video_id, stream_key, loop_option } = body;

    if (!video_id || !stream_key || !loop_option) {
      return new Response(JSON.stringify({ error: 'Missing required fields: video_id, stream_key, loop_option' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!['1', '3', 'unlimited'].includes(loop_option)) {
      return new Response(JSON.stringify({ error: 'Invalid loop_option. Allowed: 1, 3, unlimited' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = getServiceClient();

    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('*')
      .eq('id', video_id)
      .eq('owner_id', userId)
      .maybeSingle();

    if (videoError || !video) {
      return new Response(JSON.stringify({ error: 'Video not found or access denied' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const livepeerApiKey = Deno.env.get('LIVEPEER_API_KEY');
    if (!livepeerApiKey) {
      return new Response(JSON.stringify({ error: 'Livepeer API key is not configured' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const targetRes = await fetch(`${LIVEPEER_API_URL}/multistream/target`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${livepeerApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `youtube-${userId.slice(0, 8)}`,
        url: `${YOUTUBE_RTMP_URL}/${stream_key}`,
      }),
    });

    if (!targetRes.ok) {
      const text = await targetRes.text();
      return new Response(JSON.stringify({ error: `Livepeer multistream target error: ${targetRes.status} ${text}` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const target = await targetRes.json();

    const streamRes = await fetch(`${LIVEPEER_API_URL}/stream`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${livepeerApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `24/7 stream - ${video.filename}`,
        record: false,
        multistream: {
          targets: [{ id: target.id, profile: 'source' }],
        },
      }),
    });

    if (!streamRes.ok) {
      const text = await streamRes.text();
      return new Response(JSON.stringify({ error: `Livepeer stream error: ${streamRes.status} ${text}` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stream = await streamRes.json();

    const { data: history, error: historyError } = await supabase
      .from('stream_history')
      .insert({
        owner_id: userId,
        video_id: video.id,
        youtube_stream_key: stream_key,
        loop_option: loop_option,
        status: 'active',
        livepeer_stream_id: stream.id,
        livepeer_multistream_target_id: target.id,
      })
      .select()
      .single();

    if (historyError || !history) {
      return new Response(JSON.stringify({ error: historyError?.message || 'Failed to record stream history' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        history_id: history.id,
        stream_id: stream.id,
        ingest_url: `rtmp://rtmp.livepeer.com/live/${stream.streamKey}`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
