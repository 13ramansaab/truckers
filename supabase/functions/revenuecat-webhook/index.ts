import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RevenueCatEvent {
  api_version: string
  event: {
    id: string
    type: string
    event_timestamp_ms: number
    app_user_id: string
    original_app_user_id?: string
    product_id: string
    period_type: string
    purchased_at_ms: number
    expiration_at_ms?: number
    environment: string
    entitlement_id?: string
    entitlement_ids?: string[]
    presented_offering_id?: string
    transaction_id: string
    original_transaction_id: string
    is_family_share: boolean
    country_code: string
    app_id: string
    offer_code?: string
    currency: string
    price: number
    price_in_purchased_currency: number
    subscriber_attributes: Record<string, any>
    store: string
    takehome_percentage: number
    commission_percentage: number
  }
}

interface SubscriptionData {
  user_id: string
  platform: string
  product_id: string
  entitlement_id: string
  status: 'active' | 'paused' | 'cancelled' | 'expired'
  will_renew: boolean
  latest_purchase_at: string
  expires_at: string
  rc_app_user_id: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse RevenueCat webhook payload
    const rcEvent: RevenueCatEvent = await req.json()
    console.log('RevenueCat webhook received:', rcEvent.event.type, 'for user:', rcEvent.event.app_user_id)

    // Map RevenueCat event types to subscription statuses
    const eventTypeMap: Record<string, SubscriptionData['status']> = {
      'INITIAL_PURCHASE': 'active',
      'RENEWAL': 'active',
      'UNCANCELLATION': 'active',
      'CANCELLATION': 'cancelled',
      'EXPIRATION': 'expired',
      'BILLING_ISSUE': 'paused'
    }

    const status = eventTypeMap[rcEvent.event.type]
    if (!status) {
      console.log('Unhandled event type:', rcEvent.event.type)
      return new Response(JSON.stringify({ message: 'Event type not handled' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    // Determine platform from store
    const platform = rcEvent.event.store === 'app_store' ? 'ios' : 'android'
    
    // Get entitlement ID (use first one if multiple)
    const entitlementId = rcEvent.event.entitlement_id || 
                         (rcEvent.event.entitlement_ids && rcEvent.event.entitlement_ids[0]) || 
                         'premium'

    // Calculate expiration date
    const expiresAt = rcEvent.event.expiration_at_ms 
      ? new Date(rcEvent.event.expiration_at_ms).toISOString()
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // Default 30 days

    // Find user by RC app_user_id
    const { data: userData, error: userError } = await supabaseClient
      .from('subscriptions')
      .select('user_id')
      .eq('rc_app_user_id', rcEvent.event.app_user_id)
      .limit(1)
      .single()

    if (userError && userError.code !== 'PGRST116') {
      console.error('Error finding user:', userError)
      throw userError
    }

    if (!userData) {
      console.log('No user found for RC app_user_id:', rcEvent.event.app_user_id)
      return new Response(JSON.stringify({ message: 'User not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    // Upsert subscription record
    const subscriptionData = {
      user_id: userData.user_id,
      platform,
      product_id: rcEvent.event.product_id,
      entitlement_id: entitlementId,
      status,
      will_renew: status === 'active' && rcEvent.event.type !== 'CANCELLATION',
      latest_purchase_at: new Date(rcEvent.event.purchased_at_ms).toISOString(),
      expires_at: expiresAt,
      rc_app_user_id: rcEvent.event.app_user_id
    }

    const { error: upsertError } = await supabaseClient
      .from('subscriptions')
      .upsert(subscriptionData, {
        onConflict: 'user_id,platform,status',
        ignoreDuplicates: false
      })

    if (upsertError) {
      console.error('Error upserting subscription:', upsertError)
      throw upsertError
    }

    console.log('Successfully processed webhook:', {
      userId: userData.user_id,
      eventType: rcEvent.event.type,
      status,
      platform,
      productId: rcEvent.event.product_id
    })

    return new Response(JSON.stringify({ 
      message: 'Webhook processed successfully',
      userId: userData.user_id,
      status 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('Webhook processing error:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
