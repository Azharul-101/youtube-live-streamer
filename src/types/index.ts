import type { ReactNode } from 'react';

export interface Option {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  withCount?: boolean;
}

export interface Profile {
  id: string;
  email: string | null;
  role: string;
  created_at: string;
}

export interface Video {
  id: string;
  owner_id: string;
  filename: string;
  storage_path: string;
  public_url: string;
  size: number;
  duration_seconds: number;
  created_at: string;
}

export interface StreamConfig {
  id: string;
  owner_id: string;
  youtube_stream_key: string;
  loop_option: '1' | '3' | 'unlimited';
  created_at: string;
  updated_at: string;
}

export interface StreamHistory {
  id: string;
  owner_id: string;
  video_id: string | null;
  youtube_stream_key: string;
  loop_option: '1' | '3' | 'unlimited';
  status: 'active' | 'completed' | 'stopped' | 'failed';
  livepeer_stream_id: string | null;
  livepeer_multistream_target_id: string | null;
  error_message: string | null;
  started_at: string;
  stopped_at: string | null;
  created_at: string;
  videos?: { filename: string } | null;
}

export type LoopOption = '1' | '3' | 'unlimited';

export const loopOptionLabels: Record<LoopOption, string> = {
  '1': '1 time',
  '3': '3 times',
  unlimited: 'Unlimited loop',
};
