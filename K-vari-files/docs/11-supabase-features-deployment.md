# VariMitra Features Integration Guide - Supabase Deployment

## Overview

This guide provides step-by-step instructions to integrate all the newly created features with Supabase for production deployment on Vercel.

---

## Table of Contents

1. [Features Created](#features-created)
2. [Supabase Setup](#supabase-setup)
3. [Environment Variables](#environment-variables)
4. [API Integration](#api-integration)
5. [Deployment on Vercel](#deployment-on-vercel)
6. [Testing](#testing)

---

## Features Created

### ✅ Completed Features

1. **Group Yatra** (`/group-yatra`)
   - Create groups with unique codes
   - Join existing groups
   - View group members
   - Real-time location sharing on map
   - Leave groups

2. **Darshan Slot Booking** (`/darshan-booking`)
   - Browse available temples
   - Select date and time slots
   - Generate QR tickets
   - View booking history

3. **Crowd Status & Safety** (`/crowd-status`)
   - Real-time crowd density percentages
   - Wait time estimates
   - Status indicators
   - Recommendations

4. **Route & Weather Updates** (`/route-weather`)
   - Stage-by-stage route information
   - Distance and time estimates
   - Weather forecasts
   - Facility information

5. **Lost & Found Services** (`/lost-found`)
   - Browse lost/found items
   - Report new items
   - Contact information
   - Location tracking

6. **Medical Help & Emergency** (`/medical-help`)
   - Emergency 112 button
   - Nearest facility finder
   - Symptom reporting
   - Quick medical response

---

## Supabase Setup

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign in or create account
3. Create new project
4. Note your:
   - **Project URL** (e.g., `https://xxxx.supabase.co`)
   - **Public Anon Key**
   - **Service Role Key**

### Step 2: Run Database Schema

1. Go to Supabase SQL Editor
2. Create new query
3. Copy entire contents of `db/supabase-features-schema.sql`
4. Paste and run
5. Wait for all queries to complete

### Step 3: Set Up Authentication

```javascript
// Enable auth methods in Supabase dashboard:
// 1. Authentication > Providers > Phone (SMS)
// 2. Authentication > Providers > Email/Password
// 3. Configure email templates
```

### Step 4: Configure Storage (for images in Lost & Found)

```javascript
// In Supabase dashboard:
// 1. Storage > Create new bucket named 'yatra-images'
// 2. Set as public bucket
// 3. Add policies for upload/download
```

---

## Environment Variables

Create `.env.local` in your K-vari-files directory:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_public_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Feature Flags
NEXT_PUBLIC_ENABLE_GROUP_YATRA=true
NEXT_PUBLIC_ENABLE_CROWD_STATUS=true
NEXT_PUBLIC_ENABLE_MEDICAL=true
NEXT_PUBLIC_ENABLE_LOST_FOUND=true

# API Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

For **Vercel production**, add these same variables to:
- Vercel Dashboard > Project Settings > Environment Variables

---

## API Integration

### Create API Routes for Features

Create these files to handle Supabase operations:

#### 1. `/app/api/v1/groups/create.ts`

```typescript
import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get: (name) => request.cookies.get(name)?.value,
        set: (name, value, options) => {},
        remove: (name, options) => {},
      },
    }
  );

  try {
    const { name, description, code, created_by } = await request.json();

    const { data, error } = await supabase
      .from('yatra_groups')
      .insert([{
        name,
        description,
        code: code.toUpperCase(),
        created_by,
      }])
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, data: data[0] });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }
}
```

#### 2. `/app/api/v1/groups/join.ts`

```typescript
import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { get: (name) => request.cookies.get(name)?.value } }
  );

  try {
    const { group_id, phone_number, member_name } = await request.json();

    const { data, error } = await supabase
      .from('group_members')
      .insert([{
        group_id,
        phone_number,
        member_name,
        role: 'member',
      }])
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, data: data[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
```

#### 3. `/app/api/v1/locations/update.ts`

```typescript
import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { get: (name) => request.cookies.get(name)?.value } }
  );

  try {
    const { group_id, phone, latitude, longitude } = await request.json();

    // Call the RLS function
    const { error } = await supabase.rpc('update_member_location', {
      group_id_param: group_id,
      phone_param: phone,
      lat: latitude,
      lng: longitude,
    });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
```

#### 4. `/app/api/v1/lost-found/report.ts`

```typescript
import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { get: (name) => request.cookies.get(name)?.value } }
  );

  try {
    const {
      item_type,
      item_name,
      item_description,
      location,
      reported_by_phone,
      reported_by_name,
      contact_number,
    } = await request.json();

    const { data, error } = await supabase
      .from('lost_found_items')
      .insert([{
        item_type,
        item_name,
        item_description,
        location,
        reported_by_phone,
        reported_by_name,
        contact_number,
        status: 'open',
      }])
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, data: data[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
```

---

## Deployment on Vercel

### Step 1: Connect GitHub Repository

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository (VARITHON-INTEGRATE)
4. Select K-vari-files as the root directory

### Step 2: Add Environment Variables

1. In Vercel Dashboard > Settings > Environment Variables
2. Add all variables from `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

### Step 3: Configure Build

```bash
# Build command
npm run build

# Output directory
.next

# Install command
npm install
```

### Step 4: Deploy

1. Click "Deploy"
2. Wait for build to complete
3. Get production URL

### Step 5: Update Supabase Redirect URLs

In Supabase Dashboard > Authentication > URL Configuration:

```
Authorized redirect URLs:
- http://localhost:3000
- https://your-vercel-url.vercel.app
```

---

## Testing

### Local Testing

```bash
# Install dependencies
npm install

# Set environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase keys

# Run development server
npm run dev

# Visit http://localhost:3000
```

### Test Scenarios

1. **Group Yatra**
   - ✅ Create group → receive code
   - ✅ Join group with code
   - ✅ View members on map
   - ✅ Leave group

2. **Darshan Booking**
   - ✅ Browse temples
   - ✅ Select date/time
   - ✅ Receive QR code

3. **Crowd Status**
   - ✅ View real-time density
   - ✅ See wait times
   - ✅ Get recommendations

4. **Medical Help**
   - ✅ Emergency call button works
   - ✅ Find nearest facility
   - ✅ Report symptoms

5. **Lost & Found**
   - ✅ Browse items
   - ✅ Submit report
   - ✅ Contact info displays

---

## Database Backup

### Automated Backups

In Supabase Dashboard > Database > Backups:
- Enable Point-in-Time Recovery
- Set backup frequency (daily recommended)

### Manual Export

```bash
# Export data before major updates
pg_dump postgresql://[credentials]@db.[region].supabase.co/postgres > backup.sql
```

---

## Monitoring & Logs

### Supabase Logs

- Supabase Dashboard > Logs > Database Logs
- Monitor for errors and performance

### Vercel Analytics

- Vercel Dashboard > Analytics
- Track response times and error rates

### Error Tracking

```typescript
// Add error logging to API routes
import * as Sentry from "@sentry/nextjs";

try {
  // your code
} catch (error) {
  Sentry.captureException(error);
}
```

---

## Production Checklist

- [ ] All environment variables configured
- [ ] Database schema deployed to Supabase
- [ ] API routes created and tested
- [ ] Authentication configured
- [ ] Storage bucket created for images
- [ ] Redirect URLs configured
- [ ] Backups enabled
- [ ] Error tracking set up
- [ ] SSL certificate active
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Performance monitoring active
- [ ] Database indexes created
- [ ] Automated tests passing
- [ ] Load testing completed

---

## Troubleshooting

### Common Issues

1. **"Unauthorized" errors**
   - Check NEXT_PUBLIC_SUPABASE_ANON_KEY
   - Verify RLS policies

2. **"Group not found"**
   - Verify group_id format
   - Check database connection

3. **Location updates not saving**
   - Verify location_updates table exists
   - Check update_member_location function

4. **Slow queries**
   - Check indexes are created
   - Monitor database logs in Supabase

---

## Support

For issues or questions:
1. Check Supabase documentation: https://supabase.com/docs
2. Review error logs in Supabase Dashboard
3. Check Vercel deployment logs
4. Open issue in your repository

---

## Next Steps

1. Deploy schema to Supabase
2. Create API routes
3. Update feature pages to use API routes
4. Test thoroughly
5. Deploy to Vercel
6. Monitor in production

Good luck with your deployment! 🚀
