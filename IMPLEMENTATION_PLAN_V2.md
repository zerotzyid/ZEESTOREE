# Implementation Plan V2: Simplified Panel Sales System

## Core Principles
1. **Unify with existing panel system** - Use existing panels from `/admin/panels` as "Tiers"
2. **Simple radio selections** for RAM/CPU/Disk (not custom inputs)
3. **Simplify Admin Panel Sales** - Only manage which panels are available for sale
4. **Unified configuration** - Single source of truth for panels

---

## 1. Data Model

### Settings (lib/settings-defaults.ts)
```typescript
// Panel Sales Config - Simple tier selection from existing panels
panelSales: {
  tiers: PanelSalesTier[];  // References to existing panels
  ramOptions: number[];     // [1024, 2048, 3072, 4096, 5120, 6144, 7168, 8192, 9216, 10240] // MB
  cpuOptions: number[];     // [50, 100, 150, 200, 250, 300, 400, 500] // percent
  diskOptions: number[];    // [10240, 20480, 30720, 40960, 51200, 61440, 71680, 81920, 92160, 102400] // MB
}
```

### PanelSalesTier (references existing panel)
```typescript
interface PanelSalesTier {
  panelId: string;      // Reference to existing panel
  name: string;         // Display name (e.g., "Panel Indonesia 1")
  description: string;
  active: boolean;
  sortOrder: number;
  priceMultiplier: number; // 1.0 = base price from RAM/CPU/Disk
  maxPurchasePerUser: number; // 0 = unlimited
}
```

---

## 2. User Flow (4 Steps)

```
/panel-beli                           → Step 1: Pilih Panel (Tier)
/panel-beli/[tierId]/configure        → Step 2: Pilih RAM, CPU, Disk (Radio groups)
/panel-beli/[tierId]/configure/egg    → Step 3: Pilih Egg dari Panel API
/checkout                             → Step 4: Bayar → Provisioning
```

---

## 3. Admin Panel Sales (`/admin/panel-sales`)

**Single Page with Two Sections:**

### A. Panel Tier Management
- List existing panels from `/admin/panels` (fetch via API)
- Toggle active/inactive for sales
- Set display name, description, sort order
- Set price multiplier (default 1.0)
- Set max purchase per user

### B. Global Options (RAM/CPU/Disk)
- Simple arrays of values (MB/percent/MB)
- Drag to reorder
- Add/remove values

---

## 4. User Configuration Page
**Single page with 3 radio groups:**
- **RAM**: 1GB, 2GB, 3GB, 4GB, 5GB, 6GB, 7GB, 8GB, 9GB, 10GB
- **CPU**: 50%, 100%, 150%, 200%, 250%, 300%, 400%, 500%
- **Disk**: 10GB, 20GB, 30GB, 40GB, 50GB, 60GB, 70GB, 80GB, 90GB, 100GB

Price calculated dynamically:
```
basePrice = (ramPrice + cpuPrice + diskPrice) * tierPriceMultiplier
```

---

## 5. Implementation Files

### Settings
- `lib/settings-defaults.ts` - Add `panelSales` config
- `lib/validators.ts` - Add validators

### Admin
- `app/admin/panel-sales/page.tsx` - Simplified admin page

### Frontend
- `app/(site)/panel-beli/page.tsx` - Select panel tier
- `app/(site)/panel-beli/[tierId]/configure/page.tsx` - RAM/CPU/Disk radios + Egg
- `app/api/user/purchase-count/route.ts` - Keep existing

### Landing/Katalog
- Update to show panel tiers from `panelSales.tiers`

---

## 6. API
- `GET /api/admin/panels` - Get existing panels (already exists)
- `GET /api/user/purchase-count` - Keep existing
- No new API needed for panel sales config (uses settings)