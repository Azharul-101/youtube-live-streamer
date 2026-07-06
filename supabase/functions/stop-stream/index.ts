import { corsHeaders } from '../_shared/cors.ts';
import { getServiceClient, getUserId } from '../_shared/supabase.ts';

const LIVEPEER_API_URL = 'https://livepeer.studio/api/v1';

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
    const { history_id } = body;
    if (!history_id) {
      return new Response(JSON.stringify({ error: 'Missing required field: history_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = getServiceClient();

    const { data: history, error: historyError } = await supabase
      .from('stream_history')
      .select('*')
      .eq('id', history_id)
      .eq('owner_id', userId)
      .maybeSingle();

    if (historyError || !history) {
      return new Response(JSON.stringify({ error: 'Stream history not found or access denied' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const livepeerApiKey = Deno.env.get('LIVEPEER_API_KEY');
    if (history.livepeer_stream_id && livepeerApiKey) {
      await fetch(`${LIVEPEER_API_URL}/stream/${history.livepeer_stream_id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${livepeerApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ suspended: true }),
      });
    }

    const { error: updateError } = await supabase
      .from('stream_history')
      .update({ status: 'stopped', stopped_at: new Date().toISOString() })
      .eq('id', history_id);

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
