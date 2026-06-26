export type Altitude = 0 | 1 | 2;

export type AutomationLevel =
  | 'ai-prepared'
  | 'ai-prefilled'
  | 'ai-filled-editable'
  | 'ai-assisted'
  | 'user-controlled';

export const ALTITUDE_META: Record<Altitude, { name: string; sub: string; aiRole: string }> = {
  0: { name: 'Surface',  sub: 'Glide',   aiRole: 'integrated' },
  1: { name: 'Working',  sub: 'Cruise',  aiRole: 'parallel'   },
  2: { name: 'Deep',     sub: 'Cockpit', aiRole: 'advisor'    },
};

export const DEFAULT_ALTITUDE: Altitude = 1;
