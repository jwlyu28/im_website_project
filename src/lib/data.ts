import { supabase } from './supabase'

export type SportStatus = 'active' | 'alert' | 'cancelled'
export type SportCategory = 'Outdoor' | 'Indoor' | 'Special Event'

export type SportProgram = {
  id: string
  name: string
  category: SportCategory
  status: SportStatus
  note: string
  updatedAt: string
  updatedBy: string
  facilityImpact: string
  archived: boolean
  displayOrder: number
}

export type GlobalBanner = {
  enabled: boolean
  title: string
  message: string
  updatedAt: string
  updatedBy: string
}

export type AuditLogEntry = {
  id: string
  entityType: 'sport' | 'banner'
  entityId: string
  action: string
  actorEmail: string
  summary: string
  createdAt: string
}

const SPORTS_STORAGE_KEY = 'purdue-im-sports'
const BANNER_STORAGE_KEY = 'purdue-im-banner'

export const defaultSports: SportProgram[] = [
  {
    id: 'flag-football',
    name: 'Flag Football',
    category: 'Outdoor',
    status: 'alert',
    note: 'Weather watch remains in effect. Evening games may shift start times.',
    updatedAt: 'Today, 6:40 PM',
    updatedBy: 'IM Supervisor',
    facilityImpact: 'Gold Fields 1-4 may be delayed or condensed.',
    archived: false,
    displayOrder: 1,
  },
  {
    id: 'soccer',
    name: 'Soccer',
    category: 'Outdoor',
    status: 'cancelled',
    note: 'Wet field conditions have cancelled tonight’s soccer program block.',
    updatedAt: 'Today, 6:22 PM',
    updatedBy: 'IM Supervisor',
    facilityImpact: 'TREC Outdoor and Gold Fields are unavailable for soccer.',
    archived: false,
    displayOrder: 2,
  },
  {
    id: 'basketball',
    name: 'Basketball',
    category: 'Indoor',
    status: 'active',
    note: 'Normal operations. All check-ins and court assignments are running on time.',
    updatedAt: 'Today, 5:55 PM',
    updatedBy: 'IM Supervisor',
    facilityImpact: 'No court impacts.',
    archived: false,
    displayOrder: 3,
  },
  {
    id: 'volleyball',
    name: 'Volleyball',
    category: 'Indoor',
    status: 'alert',
    note: 'One court is temporarily unavailable due to equipment reset. Match queue may be delayed.',
    updatedAt: 'Today, 6:05 PM',
    updatedBy: 'IM Supervisor',
    facilityImpact: 'CoRec Court 3 is offline, so match flow is compressed.',
    archived: false,
    displayOrder: 4,
  },
  {
    id: 'pickleball',
    name: 'Pickleball',
    category: 'Indoor',
    status: 'active',
    note: 'Normal evening ladder and open-play operations.',
    updatedAt: 'Today, 5:20 PM',
    updatedBy: 'IM Supervisor',
    facilityImpact: 'No facility impacts.',
    archived: true,
    displayOrder: 5,
  },
]

export const defaultBanner: GlobalBanner = {
  enabled: true,
  title: 'High Priority Update',
  message:
    'Outdoor sport decisions may change quickly this evening because of weather movement.',
  updatedAt: 'Today, 6:40 PM',
  updatedBy: 'IM Supervisor',
}

type SportRow = {
  id: string
  name: string
  category: SportCategory
  status: SportStatus
  note: string
  updated_at: string
  updated_by: string
  facility_impact: string
  archived: boolean
  display_order: number
}

type BannerRow = {
  enabled: boolean
  title: string
  message: string
  updated_at: string
  updated_by: string
}

type AuditLogRow = {
  id: string
  entity_type: 'sport' | 'banner'
  entity_id: string
  action: string
  actor_email: string
  summary: string
  created_at: string
}

function formatUpdatedAt(isoString: string | undefined) {
  if (!isoString) {
    return 'Recently updated'
  }

  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) {
    return 'Recently updated'
  }

  return `Today, ${new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)}`
}

function toSportRecord(row: Partial<SportRow>, index: number): SportProgram {
  const fallbackName = row.name?.trim() || `Sport ${index + 1}`
  return {
    id: row.id ?? `${fallbackName.toLowerCase().replaceAll(' ', '-')}-${index}`,
    name: fallbackName,
    category: row.category ?? 'Outdoor',
    status: row.status ?? 'active',
    note: row.note ?? 'No note yet.',
    updatedAt: formatUpdatedAt(row.updated_at),
    updatedBy: row.updated_by ?? 'IM Supervisor',
    facilityImpact: row.facility_impact ?? 'No facility impacts.',
    archived: row.archived ?? false,
    displayOrder: row.display_order ?? index + 1,
  }
}

function toSportRowInput(sport: SportProgram) {
  return {
    id: sport.id,
    name: sport.name,
    category: sport.category,
    status: sport.status,
    note: sport.note,
    updated_by: sport.updatedBy,
    facility_impact: sport.facilityImpact,
    archived: sport.archived,
    display_order: sport.displayOrder,
    updated_at: new Date().toISOString(),
  }
}

function toAuditLogEntry(row: Partial<AuditLogRow>): AuditLogEntry {
  return {
    id: row.id ?? crypto.randomUUID(),
    entityType: row.entity_type ?? 'sport',
    entityId: row.entity_id ?? '',
    action: row.action ?? 'updated',
    actorEmail: row.actor_email ?? 'Unknown admin',
    summary: row.summary ?? 'No summary available.',
    createdAt: formatUpdatedAt(row.created_at),
  }
}

function readLocalSports() {
  const saved = window.localStorage.getItem(SPORTS_STORAGE_KEY)
  if (!saved) {
    return defaultSports
  }

  try {
    const parsed = JSON.parse(saved) as unknown
    if (!Array.isArray(parsed)) {
      return defaultSports
    }
    return parsed.map((sport, index) =>
      toSportRecord(sport as Partial<SportRow>, index),
    )
  } catch {
    return defaultSports
  }
}

function readLocalBanner() {
  const saved = window.localStorage.getItem(BANNER_STORAGE_KEY)
  if (!saved) {
    return defaultBanner
  }

  try {
    const parsed = JSON.parse(saved) as Partial<BannerRow>
    return {
      enabled: parsed.enabled ?? defaultBanner.enabled,
      title: parsed.title ?? defaultBanner.title,
      message: parsed.message ?? defaultBanner.message,
      updatedAt: parsed.updated_at
        ? formatUpdatedAt(parsed.updated_at)
        : defaultBanner.updatedAt,
      updatedBy: parsed.updated_by ?? defaultBanner.updatedBy,
    }
  } catch {
    return defaultBanner
  }
}

function writeLocalSports(sports: SportProgram[]) {
  window.localStorage.setItem(SPORTS_STORAGE_KEY, JSON.stringify(sports))
}

function writeLocalBanner(banner: GlobalBanner) {
  window.localStorage.setItem(BANNER_STORAGE_KEY, JSON.stringify(banner))
}

async function insertAuditLog(
  entityType: 'sport' | 'banner',
  entityId: string,
  action: string,
  actorEmail: string,
  summary: string,
) {
  if (!supabase) {
    return
  }

  await supabase.from('audit_log').insert({
    entity_type: entityType,
    entity_id: entityId,
    action,
    actor_email: actorEmail,
    summary,
  })
}

export async function loadSports(): Promise<SportProgram[]> {
  if (!supabase) {
    return readLocalSports()
  }

  const { data, error } = await supabase
    .from('sports')
    .select('*')
    .order('display_order', { ascending: true })

  if (error || !data) {
    return readLocalSports()
  }

  const sports = data.map((row, index) => toSportRecord(row as SportRow, index))
  writeLocalSports(sports)
  return sports
}

export async function saveSport(sport: SportProgram) {
  if (!supabase) {
    const current = readLocalSports()
    const next = current.map((entry) => (entry.id === sport.id ? sport : entry))
    writeLocalSports(next)
    return
  }

  const { error } = await supabase.from('sports').upsert(toSportRowInput(sport))
  if (error) {
    throw error
  }
}

export async function saveSportWithAudit(
  sport: SportProgram,
  actorEmail: string,
  action: string,
  summary: string,
) {
  const nextSport = {
    ...sport,
    updatedBy: actorEmail,
  }

  await saveSport(nextSport)
  await insertAuditLog('sport', sport.id, action, actorEmail, summary)
}

export async function createSport(sport: SportProgram) {
  if (!supabase) {
    const current = readLocalSports()
    writeLocalSports([sport, ...current])
    return
  }

  const { error } = await supabase.from('sports').insert(toSportRowInput(sport))
  if (error) {
    throw error
  }
}

export async function createSportWithAudit(
  sport: SportProgram,
  actorEmail: string,
) {
  const nextSport = {
    ...sport,
    updatedBy: actorEmail,
  }

  await createSport(nextSport)
  await insertAuditLog(
    'sport',
    sport.id,
    'created',
    actorEmail,
    `Created ${sport.name}.`,
  )
}

export async function saveAllSports(sports: SportProgram[]) {
  if (!supabase) {
    writeLocalSports(sports)
    return
  }

  const rows = sports.map(toSportRowInput)
  const { error } = await supabase.from('sports').upsert(rows)
  if (error) {
    throw error
  }
}

export async function saveAllSportsWithAudit(
  sports: SportProgram[],
  actorEmail: string,
  action: string,
  summary: string,
) {
  const nextSports = sports.map((sport) =>
    sport.archived ? sport : { ...sport, updatedBy: actorEmail },
  )

  await saveAllSports(nextSports)
  await insertAuditLog('sport', 'all-live-sports', action, actorEmail, summary)
}

export async function loadBanner(): Promise<GlobalBanner> {
  if (!supabase) {
    return readLocalBanner()
  }

  const { data, error } = await supabase
    .from('global_banner')
    .select('enabled,title,message,updated_at,updated_by')
    .eq('id', 1)
    .maybeSingle()

  if (error || !data) {
    return readLocalBanner()
  }

  const banner = {
    enabled: data.enabled ?? defaultBanner.enabled,
    title: data.title ?? defaultBanner.title,
    message: data.message ?? defaultBanner.message,
    updatedAt: data.updated_at
      ? formatUpdatedAt(data.updated_at)
      : defaultBanner.updatedAt,
    updatedBy: data.updated_by ?? defaultBanner.updatedBy,
  }
  writeLocalBanner(banner)
  return banner
}

export async function saveBanner(banner: GlobalBanner) {
  if (!supabase) {
    writeLocalBanner(banner)
    return
  }

  const { error } = await supabase.from('global_banner').upsert({
    id: 1,
    enabled: banner.enabled,
    title: banner.title,
    message: banner.message,
    updated_at: new Date().toISOString(),
  })

  if (error) {
    throw error
  }
}

export async function saveBannerWithAudit(
  banner: GlobalBanner,
  actorEmail: string,
  action: string,
  summary: string,
) {
  const nextBanner = {
    ...banner,
    updatedBy: actorEmail,
  }

  if (!supabase) {
    writeLocalBanner(nextBanner)
    return
  }

  const { error } = await supabase.from('global_banner').upsert({
    id: 1,
    enabled: nextBanner.enabled,
    title: nextBanner.title,
    message: nextBanner.message,
    updated_at: new Date().toISOString(),
    updated_by: actorEmail,
  })

  if (error) {
    throw error
  }

  await insertAuditLog('banner', 'global-banner', action, actorEmail, summary)
}

export async function loadAuditLog(): Promise<AuditLogEntry[]> {
  if (!supabase) {
    return []
  }

  const { data, error } = await supabase
    .from('audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(12)

  if (error || !data) {
    return []
  }

  return data.map((row) => toAuditLogEntry(row as AuditLogRow))
}
