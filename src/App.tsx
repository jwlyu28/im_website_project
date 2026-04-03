import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  allowedAdminEmails,
  isAllowedAdmin,
  isSupabaseConfigured,
  supabase,
} from './lib/auth'

type FacilityStatus = 'open' | 'delayed' | 'closed'
type FacilityType = 'Indoor' | 'Outdoor'

type Facility = {
  id: string
  name: string
  area: string
  type: FacilityType
  sports: string[]
  status: FacilityStatus
  note: string
  updatedAt: string
  nextCheckpoint: string
}

const STORAGE_KEYS = {
  facilities: 'purdue-im-facilities',
}

const defaultFacilities: Facility[] = [
  {
    id: 'gold-1',
    name: 'Gold Field 1',
    area: 'Gold Complex',
    type: 'Outdoor',
    sports: ['Flag Football', 'Soccer'],
    status: 'open',
    note: 'Normal operations. Field lights active for evening league play.',
    updatedAt: 'Today, 6:45 PM',
    nextCheckpoint: 'Next weather check at 8:00 PM',
  },
  {
    id: 'gold-4',
    name: 'Gold Field 4',
    area: 'Gold Complex',
    type: 'Outdoor',
    sports: ['Flag Football'],
    status: 'closed',
    note: 'Closed because of standing water after heavy rain.',
    updatedAt: 'Today, 6:18 PM',
    nextCheckpoint: 'Reassess at 8:30 PM',
  },
  {
    id: 'trec-2',
    name: 'TREC Field 2',
    area: 'TREC',
    type: 'Indoor',
    sports: ['Soccer', 'Softball Training'],
    status: 'delayed',
    note: 'Maintenance crew is resetting divider curtains. Play should resume shortly.',
    updatedAt: 'Today, 6:30 PM',
    nextCheckpoint: 'Expected back at 8:15 PM',
  },
  {
    id: 'corec-1',
    name: 'CoRec Court 1',
    area: 'CoRec',
    type: 'Indoor',
    sports: ['Basketball', 'Volleyball'],
    status: 'open',
    note: 'Open for league play and warmups.',
    updatedAt: 'Today, 5:52 PM',
    nextCheckpoint: 'Building closes at 11:00 PM',
  },
  {
    id: 'corec-3',
    name: 'CoRec Court 3',
    area: 'CoRec',
    type: 'Indoor',
    sports: ['Basketball'],
    status: 'delayed',
    note: 'Delayed while a damaged rim is replaced.',
    updatedAt: 'Today, 6:05 PM',
    nextCheckpoint: 'Supervisor review at 7:30 PM',
  },
  {
    id: 'climbing-wall',
    name: 'Climbing Wall',
    area: 'CoRec',
    type: 'Indoor',
    sports: ['Climbing'],
    status: 'open',
    note: 'Belay checks completed. Open for normal evening hours.',
    updatedAt: 'Today, 4:40 PM',
    nextCheckpoint: 'Staff handoff at 8:00 PM',
  },
]

const statusMeta: Record<
  FacilityStatus,
  { label: string; tone: string; summary: string }
> = {
  open: {
    label: 'Open',
    tone: 'status-open',
    summary: 'Available for play',
  },
  delayed: {
    label: 'Delayed',
    tone: 'status-delayed',
    summary: 'Check updates soon',
  },
  closed: {
    label: 'Closed',
    tone: 'status-closed',
    summary: 'Unavailable right now',
  },
}

function readFacilities() {
  const saved = window.localStorage.getItem(STORAGE_KEYS.facilities)

  if (!saved) {
    return defaultFacilities
  }

  try {
    return JSON.parse(saved) as Facility[]
  } catch {
    return defaultFacilities
  }
}

function App() {
  const [mode, setMode] = useState<'public' | 'admin'>('public')
  const [activityFilter, setActivityFilter] = useState('All')
  const [typeFilter, setTypeFilter] = useState<'All' | FacilityType>('All')
  const [statusFilter, setStatusFilter] = useState<'All' | FacilityStatus>('All')
  const [facilities, setFacilities] = useState<Facility[]>(() => readFacilities())
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [authSession, setAuthSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured)
  const [authPending, setAuthPending] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [newFacility, setNewFacility] = useState({
    name: '',
    area: '',
    type: 'Outdoor' as FacilityType,
    sports: '',
    note: '',
  })

  useEffect(() => {
    if (facilities.length === 0) {
      return
    }

    window.localStorage.setItem(
      STORAGE_KEYS.facilities,
      JSON.stringify(facilities),
    )
  }, [facilities])

  useEffect(() => {
    if (!supabase) {
      return
    }

    const client = supabase
    let isActive = true

    const syncSession = async (session: Session | null) => {
      if (!isActive) {
        return
      }

      if (session && !isAllowedAdmin(session.user.email)) {
        setLoginError(
          'Your account signed in successfully, but it is not currently allowed to access the admin dashboard.',
        )
        await client.auth.signOut()
        return
      }

      setAuthSession(session)
      setAuthReady(true)
    }

    void client.auth.getSession().then(({ data }) => {
      void syncSession(data.session)
    })

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      void syncSession(session)
    })

    return () => {
      isActive = false
      subscription.unsubscribe()
    }
  }, [])

  const isAdminAuthenticated = Boolean(
    authSession && isAllowedAdmin(authSession.user.email),
  )

  const activityOptions = useMemo(() => {
    const values = new Set<string>()
    facilities.forEach((facility) => {
      facility.sports.forEach((sport) => values.add(sport))
    })
    return ['All', ...values]
  }, [facilities])

  const filteredFacilities = useMemo(() => {
    return facilities.filter((facility) => {
      const matchesActivity =
        activityFilter === 'All' || facility.sports.includes(activityFilter)
      const matchesType = typeFilter === 'All' || facility.type === typeFilter
      const matchesStatus =
        statusFilter === 'All' || facility.status === statusFilter

      return matchesActivity && matchesType && matchesStatus
    })
  }, [activityFilter, facilities, statusFilter, typeFilter])

  const summary = useMemo(() => {
    const open = facilities.filter((facility) => facility.status === 'open').length
    const delayed = facilities.filter((facility) => facility.status === 'delayed').length
    const closed = facilities.filter((facility) => facility.status === 'closed').length

    return {
      total: facilities.length,
      open,
      delayed,
      closed,
      restricted: delayed + closed,
    }
  }, [facilities])

  const alertFacilities = useMemo(() => {
    return facilities.filter((facility) => facility.status !== 'open')
  }, [facilities])

  const recentUpdate = useMemo(() => {
    return facilities[0]?.updatedAt ?? 'No updates yet'
  }, [facilities])

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!supabase) {
      setLoginError('Supabase is not configured yet for this workspace.')
      return
    }

    setAuthPending(true)
    setLoginError('')

    const { data, error } = await supabase.auth.signInWithPassword({
      email: adminEmail.trim(),
      password: adminPassword,
    })

    if (error) {
      setLoginError(error.message)
      setAuthPending(false)
      return
    }

    if (!isAllowedAdmin(data.user?.email)) {
      await supabase.auth.signOut()
      setLoginError(
        'You authenticated successfully, but this email is not on the admin allowlist.',
      )
      setAuthPending(false)
      return
    }

    setAuthPending(false)
  }

  async function handleLogout() {
    if (!supabase) {
      return
    }

    await supabase.auth.signOut()
    setMode('public')
  }

  function updateFacility(
    facilityId: string,
    updates: Partial<Pick<Facility, 'status' | 'note' | 'nextCheckpoint'>>,
  ) {
    setFacilities((currentFacilities) =>
      currentFacilities.map((facility) =>
        facility.id === facilityId
          ? { ...facility, ...updates, updatedAt: 'Just now' }
          : facility,
      ),
    )
  }

  function addFacility(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!newFacility.name.trim() || !newFacility.area.trim()) {
      return
    }

    const sports = newFacility.sports
      .split(',')
      .map((sport) => sport.trim())
      .filter(Boolean)

    const facility: Facility = {
      id: `${newFacility.name.toLowerCase().replaceAll(' ', '-')}-${Date.now()}`,
      name: newFacility.name.trim(),
      area: newFacility.area.trim(),
      type: newFacility.type,
      sports: sports.length > 0 ? sports : ['General Use'],
      status: 'open',
      note:
        newFacility.note.trim() ||
        'New facility added. Status is ready for supervisor review.',
      updatedAt: 'Just now',
      nextCheckpoint: 'Set next checkpoint',
    }

    setFacilities((currentFacilities) => [facility, ...currentFacilities])
    setNewFacility({
      name: '',
      area: '',
      type: 'Outdoor',
      sports: '',
      note: '',
    })
  }

  return (
    <div className="app-shell">
      <div className="hero-glow hero-glow-left" />
      <div className="hero-glow hero-glow-right" />

      <header className="topbar">
        <div>
          <p className="eyebrow">Purdue RecWell Intramurals</p>
          <h1 className="brand">Facility Tracker MVP</h1>
        </div>

        <div className="topbar-actions">
          <div className="view-switch" aria-label="App mode selector">
            <button
              className={mode === 'public' ? 'active' : ''}
              onClick={() => setMode('public')}
            >
              Public View
            </button>
            <button
              className={mode === 'admin' ? 'active' : ''}
              onClick={() => setMode('admin')}
            >
              Admin View
            </button>
          </div>

          {isAdminAuthenticated ? (
            <button className="ghost-button" onClick={() => void handleLogout()}>
              Sign out
            </button>
          ) : (
            <button className="primary-button" onClick={() => setMode('admin')}>
              Supervisor sign in
            </button>
          )}
        </div>
      </header>

      {mode === 'public' ? (
        <main className="page-grid">
          <section className="hero-card">
            <p className="eyebrow">Live Public Board</p>
            <h2>
              Clear, fast updates for every intramural facility when weather or
              operations shift.
            </h2>
            <p className="hero-copy">
              This first version focuses on the high-friction problem you
              mentioned: letting participants and staff quickly see whether a
              field or court is open, delayed, or closed.
            </p>

            <div className="hero-metrics">
              <article>
                <span>{summary.total}</span>
                <p>Total facilities</p>
              </article>
              <article>
                <span>{summary.open}</span>
                <p>Open now</p>
              </article>
              <article>
                <span>{summary.restricted}</span>
                <p>Need attention</p>
              </article>
            </div>
          </section>

          <section className="panel filters-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Filter Facilities</p>
                <h3>Find what players need quickly</h3>
              </div>
              <p className="microcopy">Last update: {recentUpdate}</p>
            </div>

            <div className="filter-group">
              <span className="filter-label">Activity</span>
              <div className="chip-row">
                {activityOptions.map((activity) => (
                  <button
                    key={activity}
                    className={activityFilter === activity ? 'chip active' : 'chip'}
                    onClick={() => setActivityFilter(activity)}
                  >
                    {activity}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-grid">
              <label>
                <span className="filter-label">Facility type</span>
                <select
                  value={typeFilter}
                  onChange={(event) =>
                    setTypeFilter(event.target.value as 'All' | FacilityType)
                  }
                >
                  <option value="All">All facilities</option>
                  <option value="Indoor">Indoor</option>
                  <option value="Outdoor">Outdoor</option>
                </select>
              </label>

              <label>
                <span className="filter-label">Status</span>
                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as 'All' | FacilityStatus)
                  }
                >
                  <option value="All">All statuses</option>
                  <option value="open">Open</option>
                  <option value="delayed">Delayed</option>
                  <option value="closed">Closed</option>
                </select>
              </label>
            </div>
          </section>

          <section className="panel facilities-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Facility Statuses</p>
                <h3>Built for quick patron scanning</h3>
              </div>
              <div className="legend">
                <span className="legend-pill open">Open</span>
                <span className="legend-pill delayed">Delayed</span>
                <span className="legend-pill closed">Closed</span>
              </div>
            </div>

            <div className="facility-grid">
              {filteredFacilities.map((facility) => (
                <article className="facility-card" key={facility.id}>
                  <div className="facility-card-top">
                    <div>
                      <p className="facility-area">
                        {facility.area} • {facility.type}
                      </p>
                      <h4>{facility.name}</h4>
                    </div>
                    <span className={`status-pill ${statusMeta[facility.status].tone}`}>
                      {statusMeta[facility.status].label}
                    </span>
                  </div>

                  <p className="sports-list">{facility.sports.join(' • ')}</p>
                  <p className="facility-note">{facility.note}</p>

                  <div className="facility-meta">
                    <span>{statusMeta[facility.status].summary}</span>
                    <span>{facility.nextCheckpoint}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </main>
      ) : (
        <main className="page-grid">
          {!isSupabaseConfigured ? (
            <section className="panel auth-panel">
              <p className="eyebrow">Admin Setup Required</p>
              <h2>Supabase credentials are missing for this workspace.</h2>
              <p className="hero-copy">
                The admin flow now expects real Supabase authentication. Add the
                required environment variables, restart the dev server, and then
                sign in with a real admin account.
              </p>

              <div className="setup-box">
                <p>
                  Required vars: <code>VITE_SUPABASE_URL</code>,{' '}
                  <code>VITE_SUPABASE_ANON_KEY</code>
                </p>
                <p>
                  Optional allowlist: <code>VITE_ADMIN_EMAILS</code>
                </p>
              </div>
            </section>
          ) : !authReady ? (
            <section className="panel auth-panel">
              <p className="eyebrow">Checking Session</p>
              <h2>Loading admin authentication status...</h2>
            </section>
          ) : !isAdminAuthenticated ? (
            <section className="panel auth-panel">
              <p className="eyebrow">Supervisor Access</p>
              <h2>Admin sign in for RecWell staff</h2>
              <p className="hero-copy">
                This admin flow now uses Supabase email/password auth. If you
                set an allowlist, only approved staff emails can enter the
                dashboard after signing in.
              </p>

              <form className="auth-form" onSubmit={(event) => void handleLogin(event)}>
                <label>
                  <span>Email</span>
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={(event) => setAdminEmail(event.target.value)}
                  />
                </label>

                <label>
                  <span>Password</span>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(event) => setAdminPassword(event.target.value)}
                  />
                </label>

                <button className="primary-button" disabled={authPending} type="submit">
                  {authPending ? 'Signing in...' : 'Sign in to dashboard'}
                </button>
              </form>

              {loginError ? <p className="error-text">{loginError}</p> : null}

              {allowedAdminEmails.length > 0 ? (
                <div className="demo-credentials">
                  <p>Allowed admin emails:</p>
                  <p>{allowedAdminEmails.join(', ')}</p>
                </div>
              ) : (
                <div className="demo-credentials">
                  <p>No admin allowlist is set yet.</p>
                  <p>Any valid Supabase user can access admin until you add one.</p>
                </div>
              )}
            </section>
          ) : (
            <>
              <section className="hero-card admin-hero">
                <p className="eyebrow">Supervisor Control Panel</p>
                <h2>Update conditions once and reflect them across the public board.</h2>
                <p className="hero-copy">
                  The admin workflow here is centered around what supervisors
                  need during a shift: flip statuses quickly, leave context, and
                  make re-check times obvious.
                </p>

                <div className="hero-metrics">
                  <article>
                    <span>{summary.total}</span>
                    <p>Managed facilities</p>
                  </article>
                  <article>
                    <span>{alertFacilities.length}</span>
                    <p>Active alerts</p>
                  </article>
                  <article>
                    <span>{summary.open}</span>
                    <p>Currently open</p>
                  </article>
                </div>
              </section>

              <section className="panel add-facility-panel">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Add Facility</p>
                    <h3>Support new spaces or temporary locations</h3>
                  </div>
                </div>

                <form className="add-facility-form" onSubmit={addFacility}>
                  <label>
                    <span>Facility name</span>
                    <input
                      value={newFacility.name}
                      onChange={(event) =>
                        setNewFacility((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <label>
                    <span>Area</span>
                    <input
                      value={newFacility.area}
                      onChange={(event) =>
                        setNewFacility((current) => ({
                          ...current,
                          area: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <label>
                    <span>Type</span>
                    <select
                      value={newFacility.type}
                      onChange={(event) =>
                        setNewFacility((current) => ({
                          ...current,
                          type: event.target.value as FacilityType,
                        }))
                      }
                    >
                      <option value="Outdoor">Outdoor</option>
                      <option value="Indoor">Indoor</option>
                    </select>
                  </label>

                  <label>
                    <span>Sports</span>
                    <input
                      placeholder="Flag Football, Soccer"
                      value={newFacility.sports}
                      onChange={(event) =>
                        setNewFacility((current) => ({
                          ...current,
                          sports: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <label className="full-span">
                    <span>Starting note</span>
                    <textarea
                      rows={3}
                      value={newFacility.note}
                      onChange={(event) =>
                        setNewFacility((current) => ({
                          ...current,
                          note: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <button className="primary-button" type="submit">
                    Add facility
                  </button>
                </form>
              </section>

              <section className="panel facilities-panel admin-panel">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Live Admin Controls</p>
                    <h3>Edit statuses and notes</h3>
                  </div>
                </div>

                <div className="admin-list">
                  {facilities.map((facility) => (
                    <article className="admin-card" key={facility.id}>
                      <div className="admin-card-heading">
                        <div>
                          <p className="facility-area">
                            {facility.area} • {facility.type}
                          </p>
                          <h4>{facility.name}</h4>
                          <p className="sports-list">{facility.sports.join(' • ')}</p>
                        </div>
                        <span className={`status-pill ${statusMeta[facility.status].tone}`}>
                          {statusMeta[facility.status].label}
                        </span>
                      </div>

                      <div className="status-toggle">
                        {(['open', 'delayed', 'closed'] as FacilityStatus[]).map(
                          (status) => (
                            <button
                              key={status}
                              className={
                                facility.status === status
                                  ? 'status-toggle-button active'
                                  : 'status-toggle-button'
                              }
                              onClick={() =>
                                updateFacility(facility.id, { status })
                              }
                              type="button"
                            >
                              {statusMeta[status].label}
                            </button>
                          ),
                        )}
                      </div>

                      <label>
                        <span>Supervisor note</span>
                        <textarea
                          rows={3}
                          value={facility.note}
                          onChange={(event) =>
                            updateFacility(facility.id, {
                              note: event.target.value,
                            })
                          }
                        />
                      </label>

                      <label>
                        <span>Next checkpoint</span>
                        <input
                          value={facility.nextCheckpoint}
                          onChange={(event) =>
                            updateFacility(facility.id, {
                              nextCheckpoint: event.target.value,
                            })
                          }
                        />
                      </label>

                      <p className="microcopy">Updated: {facility.updatedAt}</p>
                    </article>
                  ))}
                </div>
              </section>
            </>
          )}
        </main>
      )}
    </div>
  )
}

export default App
