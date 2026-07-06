import { supabase } from '@/db/supabase';
import type { LoopOption, StreamConfig, StreamHistory, Video } from '@/types/index';

export async function fetchVideos(): Promise<Video[]> {
  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('fetchVideos error:', error);
    throw new Error(error.message);
  }
  return Array.isArray(data) ? data : [];
}

export async function fetchStreamConfig(): Promise<StreamConfig | null> {
  const { data, error } = await supabase.from('stream_configs').select('*').maybeSingle();
  if (error) {
    console.error('fetchStreamConfig error:', error);
    throw new Error(error.message);
  }
  return data;
}

export async function upsertStreamConfig(
  streamKey: string,
  loopOption: LoopOption
): Promise<StreamConfig> {
  const { data: existing } = await supabase
    .from('stream_configs')
    .select('id')
    .maybeSingle();

  const payload = {
    youtube_stream_key: streamKey,
    loop_option: loopOption,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    const { data, error } = await supabase
      .from('stream_configs')
      .update(payload)
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  const { data, error } = await supabase
    .from('stream_configs')
    .insert({ ...payload, youtube_stream_key: streamKey, loop_option: loopOption })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchStreamHistory(): Promise<StreamHistory[]> {
  const { data, error } = await supabase
    .from('stream_history')
    .select('*, videos(filename)')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('fetchStreamHistory error:', error);
    throw new Error(error.message);
  }
  return Array.isArray(data) ? data : [];
}

export async function startStream(
  videoId: string,
  streamKey: string,
  loopOption: LoopOption
): Promise<{ history_id: string; stream_id: string; ingest_url: string }> {
  const { data, error } = await supabase.functions.invoke('start-stream', {
    method: 'POST',
    body: { video_id: videoId, stream_key: streamKey, loop_option: loopOption },
  });

  if (error) {
    const message = await error.context?.text().catch(() => error.message);
    console.error('startStream error:', message);
    throw new Error(message || 'Failed to start stream');
  }

  return data as { history_id: string; stream_id: string; ingest_url: string };
}

export async function stopStream(historyId: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('stop-stream', {
    method: 'POST',
    body: { history_id: historyId },
  });

  if (error) {
    const message = await error.context?.text().catch(() => error.message);
    console.error('stopStream error:', message);
    throw new Error(message || 'Failed to stop stream');
  }

  if (!data?.success) {
    throw new Error('Failed to stop stream');
  }
}
