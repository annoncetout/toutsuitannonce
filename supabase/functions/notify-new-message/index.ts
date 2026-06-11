import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const token = authHeader.replace('Bearer ', '')
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token)
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const senderId = claims.claims.sub as string

    const body = await req.json().catch(() => null)
    const messageId = body?.message_id as string | undefined
    const listingId = body?.listing_id as string | undefined
    const recipientId = body?.recipient_id as string | undefined
    const content = (body?.content as string | undefined) ?? ''

    if (!messageId || !listingId || !recipientId) {
      return new Response(JSON.stringify({ error: 'message_id, listing_id, recipient_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const admin = createClient(supabaseUrl, serviceKey)

    // Lookup recipient email + sender name + listing title in parallel
    const [recUser, senderProfile, listing] = await Promise.all([
      admin.auth.admin.getUserById(recipientId),
      admin.from('profiles').select('display_name').eq('id', senderId).maybeSingle(),
      admin.from('listings').select('title').eq('id', listingId).maybeSingle(),
    ])

    const recipientEmail = recUser.data?.user?.email
    if (!recipientEmail) {
      return new Response(JSON.stringify({ error: 'recipient has no email' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check recipient's notification preference
    const { data: prefs } = await admin
      .from('notification_preferences')
      .select('enabled')
      .eq('user_id', recipientId)
      .maybeSingle()
    if (prefs && prefs.enabled === false) {
      return new Response(JSON.stringify({ success: false, reason: 'opted_out' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const preview = content.length > 220 ? content.slice(0, 217) + '…' : content
    const { error: invokeErr } = await admin.functions.invoke('send-transactional-email', {
      body: {
        templateName: 'new-message',
        recipientEmail,
        idempotencyKey: `new-message-${messageId}`,
        templateData: {
          senderName: senderProfile.data?.display_name || 'Un acheteur',
          listingTitle: listing.data?.title || 'votre annonce',
          messagePreview: preview,
          threadUrl: 'https://www.toutsuiteannonces.com/dashboard?tab=messages',
          siteName: 'toutsuiteannonces',
        },
      },
    })

    if (invokeErr) {
      console.error('invoke send-transactional-email failed', invokeErr)
      return new Response(JSON.stringify({ error: invokeErr.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('notify-new-message error', e)
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
