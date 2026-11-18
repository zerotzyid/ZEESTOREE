# Implementation Plan: Panel Purchase Flow & Direct Pterodactyl Access

## Overview
Redesign panel purchase flow: Category → RAM Tier (Panel Type) → Egg Selection → Checkout
Add direct Pterodactyl panel access button in dashboard.

---

## 1. Database/Settings Changes

### `lib/settings-defaults.ts`
Add `category` field to `PanelType`:
```typescript
export type PanelType = {
  id: string;
  name: string;
  description: string;
  price: number;
  durationDays: number;
  category: 'pterodactyl' | 'custom';  // NEW
  provision: { ... } | null;
  active: boolean;
  sortOrder: number;
};
```

Update `DEFAULT_SETTINGS.panelTypes`:
- Elite/Standard/Lite → `category: 'pterodactyl'`
- Add example custom panel category

### `lib/validators.ts`
Update `provisionSchema` and `panelTypeSchema` to include `category` validation.

---

## 2. Panel Selection Flow (New Multi-step)

### Step 1: `/panel-beli` - Category Selection
- Show categories: "Pterodactyl Panel", "Custom Panel", etc.
- Each category card shows description
- Click → navigate to `/panel-beli/[category]`

### Step 2: `/panel-beli/[category]` - RAM Tier Selection (Panel Types)
- Show panel types filtered by category
- Display as cards: Elite (4GB), Standard (2GB), Lite (1GB)
- Show specs: RAM, Disk, CPU, Databases, Backups
- Click → navigate to `/panel-beli/[category]/[panelId]/configure`

### Step 3: `/panel-beli/[category]/[panelId]/configure` - Egg Selection
- Fetch eggs from Pterodactyl API (nests/eggs)
- Display egg selector grouped by nest
- Show selected panel summary (RAM, Disk, CPU, Price)
- "Lanjut ke Pembayaran" button → checkout

---

## 3. Direct Pterodactyl Access in Dashboard

### `app/dashboard/panels/[id]/page.tsx`
Add "Buka Panel Pterodactyl" button in:
- Overview tab → Quick Actions section
- Server Info card → alongside Panel URL
- Direct link to `order.panelUrl` with `target="_blank"`

---

## 4. Files to Create/Modify

### New Files:
1. `app/(site)/panel-beli/[category]/page.tsx` - RAM tier selection
2. `app/(site)/panel-beli/[category]/[panelId]/configure/page.tsx` - Egg selection
3. `lib/pterodactyl-eggs.ts` - Helper to fetch nests/eggs from Pterodactyl

### Modified Files:
1. `lib/settings-defaults.ts` - Add category field
2. `lib/validators.ts` - Add category validation
3. `app/(site)/panel-beli/page.tsx` - Category selection (was panel list)
4. `app/(site)/produk/panel-[panelId]/page.tsx` - Remove product image, simplify
5. `app/dashboard/panels/[id]/page.tsx` - Add direct access button

---

## 5. API Integration

### `lib/pterodactyl-eggs.ts`
```typescript
// Fetch nests with eggs from Pterodactyl
export async function getNestsWithEggs(panel: PteroPanel): Promise<NestWithEggs[]>
// Transform to UI-friendly format
export function formatEggsForUI(nests: NestWithEggs[]): EggOption[]
```

### Egg Selection UI
- Group by Nest (e.g., "Game Servers", "Voice Servers", "Web Servers")
- Each egg shows: name, description, docker image, startup
- Select one egg → store in checkout session

---

## 6. Checkout Integration

### Session Storage
- Store selected panel config: `panelId`, `eggId`, `customEnv`
- Pass to checkout API

### `app/api/user/checkout/route.ts`
- Accept `eggId` in request body
- Pass to provisioning

---

## 7. Implementation Priority

### Phase 1: Settings & Types (Foundation)
1. Update `settings-defaults.ts` - add category
2. Update `validators.ts` - validate category
3. Create `lib/pterodactyl-eggs.ts` - API helper

### Phase 2: New Flow Pages
4. `app/(site)/panel-beli/page.tsx` - Category selection
5. `app/(site)/panel-beli/[category]/page.tsx` - RAM tier selection
6. `app/(site)/panel-beli/[category]/[panelId]/configure/page.tsx` - Egg selection

### Phase 3: Dashboard & Cleanup
7. `app/dashboard/panels/[id]/page.tsx` - Direct access button
8. `app/(site)/produk/panel-[panelId]/page.tsx` - Simplify (redirect to new flow)

### Phase 4: Checkout Integration
9. Update checkout API to accept eggId
10. Test full flow: Category → RAM → Egg → Pay → Panel Access

---

## 8. UI/UX Notes

### Category Selection Page
- Grid of category cards
- Icon + name + description
- "Pterodactyl Panel" → Game/Voice server hosting
- "Custom Panel" → Other panel types

### RAM Tier Selection (Panel Types)
- Card layout: Elite/Standard/Lite
- Highlight: RAM, Disk, CPU, Price/bulan
- Hover/select state

### Egg Selection
- Accordion by Nest
- Radio buttons for eggs
- Show docker image + startup command
- "Lanjut ke Pembayaran" CTA

### Dashboard Direct Access
- Green "Buka Panel" button with ExternalLink icon
- Opens in new tab
- Shows panel URL preview on hover