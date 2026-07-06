import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LogOut, Play, Square, Video as VideoIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { useSupabaseUpload } from '@/hooks/use-supabase-upload';
import { Dropzone, DropzoneContent, DropzoneEmptyState, formatBytes } from '@/components/dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import PageMeta from '@/components/common/PageMeta';
import { toast } from 'sonner';
import { loopOptionLabels, type LoopOption, type StreamConfig, type StreamHistory, type Video } from '@/types/index';
import {
  fetchVideos,
  fetchStreamConfig,
  fetchStreamHistory,
  upsertStreamConfig,
  startStream,
  stopStream,
} from '@/services/streaming';

const streamFormSchema = z.object({
  videoId: z.string().min(1, 'Please select a video'),
  streamKey: z.string().min(1, 'YouTube stream key is required'),
  loopOption: z.enum(['1', '3', 'unlimited'] as const),
});

type StreamFormValues = z.infer<typeof streamFormSchema>;

const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500 MB

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function statusBadge(status: StreamHistory['status']) {
  const variants: Record<StreamHistory['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
    active: 'default',
    completed: 'secondary',
    stopped: 'outline',
    failed: 'destructive',
  };
  return (
    <Badge variant={variants[status]}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

export default function DashboardPage() {
  const { user, signOut } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [history, setHistory] = useState<StreamHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [stoppingId, setStoppingId] = useState<string | null>(null);
  const [config, setConfig] = useState<StreamConfig | null>(null);

  const upload = useSupabaseUpload({
    bucketName: 'videos',
    path: user?.id,
    supabase,
    allowedMimeTypes: ['video/*'],
    maxFileSize: MAX_VIDEO_SIZE,
    maxFiles: 1,
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<StreamFormValues>({
    resolver: zodResolver(streamFormSchema),
    defaultValues: {
      videoId: '',
      streamKey: '',
      loopOption: '1',
    },
  });

  const selectedVideoId = watch('videoId');
  const selectedVideo = useMemo(
    () => videos.find((v) => v.id === selectedVideoId),
    [videos, selectedVideoId]
  );

  const loadData = async () => {
    try {
      const [videoList, currentConfig, historyList] = await Promise.all([
        fetchVideos(),
        fetchStreamConfig(),
        fetchStreamHistory(),
      ]);
      setVideos(videoList);
      setConfig(currentConfig);
      setHistory(historyList);
      if (currentConfig) {
        setValue('streamKey', currentConfig.youtube_stream_key);
        setValue('loopOption', currentConfig.loop_option);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (upload.isSuccess && upload.files.length > 0 && user) {
      const file = upload.files[0];
      const storagePath = `${user.id}/${file.name}`;
      const { data: urlData } = supabase.storage.from('videos').getPublicUrl(storagePath);

      supabase
        .from('videos')
        .insert({
          owner_id: user.id,
          filename: file.name,
          storage_path: storagePath,
          public_url: urlData.publicUrl,
          size: file.size,
          duration_seconds: 0,
        })
        .then(({ error }) => {
          if (error) {
            toast.error('Failed to save video metadata');
          } else {
            toast.success('Video uploaded');
            loadData();
            upload.setFiles([]);
          }
        });
    }
  }, [upload.isSuccess, upload.files, user]);

  const onStart = async (values: StreamFormValues) => {
    if (!user) return;
    setStarting(true);
    try {
      await upsertStreamConfig(values.streamKey, values.loopOption);
      const result = await startStream(values.videoId, values.streamKey, values.loopOption);
      toast.success(`Stream started. Ingest URL: ${result.ingest_url}`);
      await loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start stream';
      toast.error(message);
    } finally {
      setStarting(false);
    }
  };

  const onStop = async (historyId: string) => {
    setStoppingId(historyId);
    try {
      await stopStream(historyId);
      toast.success('Stream stopped');
      await loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to stop stream';
      toast.error(message);
    } finally {
      setStoppingId(null);
    }
  };

  const handleLogout = async () => {
    await signOut();
    toast.success('Signed out');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    );
  }

  return (
    <>
      <PageMeta title="Dashboard" description="Manage your 24/7 live streams" />
      <div className="min-h-screen w-full bg-background">
        <header className="border-b border-border bg-card">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 md:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded bg-primary text-primary-foreground">
                <VideoIcon size={18} />
              </div>
              <h1 className="text-lg font-semibold tracking-tight md:text-xl">24/7 Stream Dashboard</h1>
            </div>
            <div className="flex items-center gap-4">
              <p className="hidden text-sm text-muted-foreground md:block">{user?.email}</p>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-12">
          <div className="grid gap-8 md:grid-cols-2">
            <section className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Upload video</CardTitle>
                  <CardDescription>Select the video you want to stream on loop.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Dropzone
                    {...upload}
                    className="cursor-pointer"
                  >
                    <DropzoneEmptyState />
                    <DropzoneContent />
                  </Dropzone>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Stream setup</CardTitle>
                  <CardDescription>Enter your YouTube stream key and choose the loop behaviour.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit(onStart)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="video">Video</Label>
                      <Select
                        value={selectedVideoId}
                        onValueChange={(value) => setValue('videoId', value)}
                      >
                        <SelectTrigger id="video" className="w-full">
                          <SelectValue placeholder="Select an uploaded video" />
                        </SelectTrigger>
                        <SelectContent>
                          {videos.map((video) => (
                            <SelectItem key={video.id} value={video.id}>
                              {video.filename}
                            </SelectItem>
                          ))}
                          {videos.length === 0 && (
                            <div className="px-2 py-3 text-sm text-muted-foreground">No videos uploaded yet</div>
                          )}
                        </SelectContent>
                      </Select>
                      {errors.videoId && <p className="text-sm text-destructive">{errors.videoId.message}</p>}
                      {selectedVideo && (
                        <p className="text-xs text-muted-foreground">
                          {selectedVideo.filename} · {formatBytes(selectedVideo.size)}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="streamKey">YouTube Stream Key</Label>
                      <Input
                        id="streamKey"
                        type="password"
                        placeholder="xxxx-xxxx-xxxx-xxxx"
                        {...register('streamKey')}
                      />
                      {errors.streamKey && <p className="text-sm text-destructive">{errors.streamKey.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="loopOption">Replay loop</Label>
                      <Select
                        value={watch('loopOption')}
                        onValueChange={(value: LoopOption) => setValue('loopOption', value)}
                      >
                        <SelectTrigger id="loopOption" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">{loopOptionLabels['1']}</SelectItem>
                          <SelectItem value="3">{loopOptionLabels['3']}</SelectItem>
                          <SelectItem value="unlimited">{loopOptionLabels.unlimited}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={starting || videos.length === 0}
                    >
                      {starting ? (
                        <span className="flex items-center gap-2">
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          Starting stream...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Play className="h-4 w-4" />
                          Start streaming
                        </span>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </section>

            <section>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Stream history</CardTitle>
                  <CardDescription>Recent streaming sessions and their status.</CardDescription>
                </CardHeader>
                <CardContent>
                  {history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded border border-dashed py-12 text-center">
                      <p className="text-sm text-muted-foreground">No streams started yet.</p>
                    </div>
                  ) : (
                    <div className="w-full max-w-full overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="whitespace-nowrap">Video</TableHead>
                            <TableHead className="whitespace-nowrap">Loop</TableHead>
                            <TableHead className="whitespace-nowrap">Started</TableHead>
                            <TableHead className="whitespace-nowrap">Status</TableHead>
                            <TableHead className="whitespace-nowrap text-right">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {history.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="whitespace-nowrap">
                                {item.videos?.filename ?? 'Deleted video'}
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                {loopOptionLabels[item.loop_option]}
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-muted-foreground">
                                {formatDate(item.started_at)}
                              </TableCell>
                              <TableCell className="whitespace-nowrap">{statusBadge(item.status)}</TableCell>
                              <TableCell className="whitespace-nowrap text-right">
                                {item.status === 'active' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onStop(item.id)}
                                    disabled={stoppingId === item.id}
                                  >
                                    {stoppingId === item.id ? (
                                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                    ) : (
                                      <>
                                        <Square className="mr-2 h-3 w-3" />
                                        Stop
                                      </>
                                    )}
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>
          </div>
        </main>
      </div>
    </>
  );
}
