import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  createSportWithAudit,
  loadAuditLog,
  defaultBanner,
  defaultSports,
  loadBanner,
  loadSports,
  saveAllSportsWithAudit,
  saveBannerWithAudit,
  saveSportWithAudit,
  type AuditLogEntry,
  type GlobalBanner,
  type SportCategory,
  type SportProgram,
  type SportStatus,
} from './lib/data'
import { isSupabaseConfigured, supabase } from './lib/supabase'

const statusMeta: Record<
  SportStatus,
  { label: string; tone: string; summary: string; adminLabel: string }
> = {
  active: {
    label: 'Active',
    tone: 'status-open',
    summary: 'Program is running as scheduled',
    adminLabel: 'Running normally',
  },
  alert: {
    label: 'Alert',
    tone: 'status-delayed',
    summary: 'Conditions changed, check details',
    adminLabel: 'Needs attention',
  },
  cancelled: {
    label: 'Cancelled',
    tone: 'status-closed',
    summary: 'Program block is not running',
    adminLabel: 'Fully stopped',
  },
}

function App() {
  const [mode, setMode] = useState<'public' | 'admin'>('public')
  const [categoryFilter, setCategoryFilter] = useState<'All' | SportCategory>('All')
  const [statusFilter, setStatusFilter] = useState<'All' | SportStatus>('All')
  const [sports, setSports] = useState<SportProgram[]>(defaultSports)
  const [banner, setBanner] = useState<GlobalBanner>(defaultBanner)
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured)
  const [dataReady, setDataReady] = useState(false)
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([])
  const [adminEmail, setAdminEmail] = useState('imsports@purdue.edu')
  const [adminPassword, setAdminPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [isAddSportOpen, setIsAddSportOpen] = useState(false)
  const [bulkFeedback, setBulkFeedback] = useState('')
  const [bannerSaveFeedback, setBannerSaveFeedback] = useState('')
  const [newSport, setNewSport] = useState({
    name: '',
    category: 'Outdoor' as SportCategory,
    facilityImpact: '',
    note: '',
  })

  useEffect(() => {
    let isActive = true

    void Promise.all([loadSports(), loadBanner(), loadAuditLog()]).then(
      ([loadedSports, loadedBanner, loadedAuditLog]) => {
        if (!isActive) {
          return
        }

        setSports(loadedSports)
        setBanner(loadedBanner)
        setAuditLog(loadedAuditLog)
        setDataReady(true)
      },
    )

    return () => {
      isActive = false
    }
  }, [])

  useEffect(() => {
    if (!supabase) {
      return
    }

    let isActive = true

    void supabase.auth.getSession().then(({ data }) => {
      if (!isActive) {
        return
      }
      setSession(data.session)
      setAuthReady(true)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setAuthReady(true)
    })

    return () => {
      isActive = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!bulkFeedback) {
      return
    }

    const timer = window.setTimeout(() => setBulkFeedback(''), 2500)
    return () => window.clearTimeout(timer)
  }, [bulkFeedback])

  useEffect(() => {
    if (!bannerSaveFeedback) {
      return
    }

    const timer = window.setTimeout(() => setBannerSaveFeedback(''), 2000)
    return () => window.clearTimeout(timer)
  }, [bannerSaveFeedback])

  const isAdminAuthenticated = Boolean(session)
  const actorEmail = session?.user.email ?? 'IM Supervisor'

  const activeBanner = useMemo(() => {
    return banner.enabled ? banner : null
  }, [banner])

  const liveSports = useMemo(() => sports.filter((sport) => !sport.archived), [sports])
  const archivedSports = useMemo(
    () => sports.filter((sport) => sport.archived),
    [sports],
  )

  const filteredSports = useMemo(() => {
    return [...liveSports]
      .sort((left, right) => left.displayOrder - right.displayOrder)
      .filter((sport) => {
        const matchesCategory =
          categoryFilter === 'All' || sport.category === categoryFilter
        const matchesStatus = statusFilter === 'All' || sport.status === statusFilter
        return matchesCategory && matchesStatus
      })
  }, [categoryFilter, liveSports, statusFilter])

  const summary = useMemo(() => {
    const active = liveSports.filter((sport) => sport.status === 'active').length
    const alert = liveSports.filter((sport) => sport.status === 'alert').length
    const cancelled = liveSports.filter((sport) => sport.status === 'cancelled').length

    return {
      total: liveSports.length,
      active,
      alert,
      cancelled,
    }
  }, [liveSports])

  const recentUpdate = useMemo(
    () => liveSports[0]?.updatedAt ?? 'No updates yet',
    [liveSports],
  )

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoginError('')

    if (!supabase) {
      setLoginError('Supabase is not configured yet for this workspace.')
      return
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: adminEmail.trim(),
      password: adminPassword,
    })

    if (error) {
      setLoginError(error.message)
    }
  }

  async function handleLogout() {
    if (!supabase) {
      return
    }

    await supabase.auth.signOut()
    setMode('public')
    setAdminPassword('')
  }

  async function persistSport(updated: SportProgram) {
    setSaveError('')
    setSports((currentSports) =>
      currentSports.map((sport) => (sport.id === updated.id ? updated : sport)),
    )

    try {
      await saveSportWithAudit(
        updated,
        actorEmail,
        'updated',
        `Updated ${updated.name} to ${updated.status}.`,
      )
      const nextAuditLog = await loadAuditLog()
      setAuditLog(nextAuditLog)
    } catch {
      setSaveError('A shared save failed. Refresh and try again.')
    }
  }

  function updateSport(sportId: string, updates: Partial<SportProgram>) {
    const current = sports.find((sport) => sport.id === sportId)
    if (!current) {
      return
    }

    void persistSport({
      ...current,
      ...updates,
      updatedAt: 'Just now',
    })
  }

  function updateAllLiveSports(
    status: SportStatus,
    note: string,
    feedback: string,
  ) {
    const nextSports = sports.map((sport) =>
      sport.archived
        ? sport
        : {
            ...sport,
            status,
            note: note || sport.note,
            updatedAt: 'Just now',
          },
    )

    setSports(nextSports)
    setBulkFeedback(feedback)
    setSaveError('')

    void saveAllSportsWithAudit(
      nextSports,
      actorEmail,
      'bulk-update',
      feedback,
    )
      .then(async () => {
        const nextAuditLog = await loadAuditLog()
        setAuditLog(nextAuditLog)
      })
      .catch(() => {
        setSaveError('A shared save failed. Refresh and try again.')
      })
  }

  async function handleBannerSave(field: keyof GlobalBanner, value: string | boolean) {
    const nextBanner = { ...banner, [field]: value }
    setBanner(nextBanner)
    setSaveError('')

    try {
      await saveBannerWithAudit(
        nextBanner,
        actorEmail,
        'banner-updated',
        `Updated banner ${field}.`,
      )
      setBannerSaveFeedback('Banner saved.')
      const nextAuditLog = await loadAuditLog()
      setAuditLog(nextAuditLog)
    } catch {
      setSaveError('Banner save failed. Refresh and try again.')
    }
  }

  async function addSport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!newSport.name.trim()) {
      return
    }

    const sport: SportProgram = {
      id: crypto.randomUUID(),
      name: newSport.name.trim(),
      category: newSport.category,
      status: 'active',
      note:
        newSport.note.trim() ||
        'Program is active and ready for the next supervisor update.',
      updatedAt: 'Just now',
      facilityImpact: newSport.facilityImpact.trim() || 'No facility impacts.',
      archived: false,
      displayOrder: sports.length + 1,
      updatedBy: actorEmail,
    }

    setSports((currentSports) => [sport, ...currentSports])
    setSaveError('')

    try {
      await createSportWithAudit(sport, actorEmail)
      const nextAuditLog = await loadAuditLog()
      setAuditLog(nextAuditLog)
      setNewSport({
        name: '',
        category: 'Outdoor',
        facilityImpact: '',
        note: '',
      })
      setIsAddSportOpen(false)
    } catch {
      setSaveError('Sport creation failed. Refresh and try again.')
    }
  }

  return (
    <div className="app-shell">
      <div className="hero-glow hero-glow-left" />
      <div className="hero-glow hero-glow-right" />

      <header className="topbar">
        <div>
          <p className="eyebrow">Purdue RecWell Intramurals</p>
          <h1 className="brand">Sports Status MVP</h1>
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

      {!dataReady ? (
        <main className="page-grid">
          <section className="panel auth-panel">
            <p className="eyebrow">Loading</p>
            <h2>Preparing shared sports data...</h2>
          </section>
        </main>
      ) : mode === 'public' ? (
        <main className="page-grid">
          <section className="panel filters-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Filter Sports</p>
                <h3>Find the right program quickly</h3>
              </div>
              <p className="microcopy">Last update: {recentUpdate}</p>
            </div>

            <div className="chip-row">
              {(['All', 'Outdoor', 'Indoor', 'Special Event'] as const).map((category) => (
                <button
                  key={category}
                  className={categoryFilter === category ? 'chip active' : 'chip'}
                  onClick={() => setCategoryFilter(category)}
                >
                  {category}
                </button>
              ))}
            </div>

            <div className="filter-grid">
              <label>
                <span className="filter-label">Status</span>
                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as 'All' | SportStatus)
                  }
                >
                  <option value="All">All statuses</option>
                  <option value="active">Active</option>
                  <option value="alert">Alert</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </label>

              <div className="setup-box">
                <p>Priority framing:</p>
                <p>Sport status first, details second.</p>
              </div>
            </div>
          </section>

          <section className="panel facilities-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Sport Statuses</p>
                <h3>Built for quick participant scanning</h3>
              </div>
              <div className="legend">
                <span className="legend-pill open">Active</span>
                <span className="legend-pill delayed">Alert</span>
                <span className="legend-pill closed">Cancelled</span>
              </div>
            </div>

            {activeBanner ? (
              <section className="banner-panel banner-inline">
                <p className="eyebrow banner-eyebrow">Global Notice</p>
                <h3>{activeBanner.title}</h3>
                <p>{activeBanner.message}</p>
              </section>
            ) : null}

            <div className="facility-grid">
              {filteredSports.map((sport) => (
                <article className="facility-card" key={sport.id}>
                  <div className="facility-card-top">
                    <div>
                      <p className="facility-area">{sport.category}</p>
                      <h4>{sport.name}</h4>
                    </div>
                    <span className={`status-pill ${statusMeta[sport.status].tone}`}>
                      {statusMeta[sport.status].label}
                    </span>
                  </div>

                  <p className="sports-list">{statusMeta[sport.status].summary}</p>
                  <p className="facility-note">{sport.note}</p>

                  <div className="facility-meta">
                    <span>{sport.facilityImpact}</span>
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
              <p className="eyebrow">Backend Setup Required</p>
              <h2>Supabase is not configured for this workspace yet.</h2>
              <p className="hero-copy">
                Public deployment and shared admin updates need Supabase data and auth
                configured. Until then, the app stays in local-only demo mode.
              </p>
            </section>
          ) : !authReady ? (
            <section className="panel auth-panel">
              <p className="eyebrow">Checking Session</p>
              <h2>Loading admin authentication status...</h2>
            </section>
          ) : !isAdminAuthenticated ? (
            <section className="panel auth-panel">
              <p className="eyebrow">Supervisor Access</p>
              <h2>Sign in with the shared supervisor account</h2>
              <p className="hero-copy">
                For production use, keep the shared IM supervisor account inside
                Supabase Auth instead of exposing its password in the frontend.
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

                <button className="primary-button" type="submit">
                  Sign in to dashboard
                </button>
              </form>

              {loginError ? <p className="error-text">{loginError}</p> : null}
            </section>
          ) : (
            <>
              <section className="hero-card admin-hero">
                <div className="admin-hero-top">
                  <div>
                    <p className="eyebrow">Supervisor Dashboard</p>
                    <h2>Manage tonight’s sports board with shared live data.</h2>
                    <p className="hero-copy">
                      This admin flow is now aligned with a real public deployment:
                      data is ready to be shared across devices, and admin login can
                      live in a real auth system.
                    </p>
                  </div>

                  <div className="admin-toolbar">
                    <button
                      className="primary-button"
                      onClick={() => setIsAddSportOpen(true)}
                      type="button"
                    >
                      Add sport
                    </button>
                  </div>
                </div>

                <div className="hero-metrics">
                  <article>
                    <span>{summary.total}</span>
                    <p>Live sports tracked</p>
                  </article>
                  <article>
                    <span>{summary.alert}</span>
                    <p>Sports on alert</p>
                  </article>
                  <article>
                    <span>{archivedSports.length}</span>
                    <p>Archived sports</p>
                  </article>
                </div>
              </section>

              <section className="panel admin-dashboard-grid">
                <article className="dashboard-card dashboard-banner-card">
                  <div className="section-heading">
                    <div>
                      <p className="eyebrow">Patron Banner</p>
                      <h3>High-priority notice</h3>
                    </div>
                  </div>

                  {bannerSaveFeedback ? (
                    <div className="action-feedback" role="status">
                      {bannerSaveFeedback}
                    </div>
                  ) : null}

                  <div className="banner-preview-card">
                    <p className="eyebrow banner-eyebrow">Preview</p>
                    <h4>{banner.title || 'High Priority Update'}</h4>
                    <p>{banner.message || 'No message set yet.'}</p>
                  </div>

                  <label>
                    <span>Banner visibility</span>
                    <select
                      value={banner.enabled ? 'enabled' : 'disabled'}
                      onChange={(event) =>
                        void handleBannerSave(
                          'enabled',
                          event.target.value === 'enabled',
                        )
                      }
                    >
                      <option value="enabled">Enabled</option>
                      <option value="disabled">Disabled</option>
                    </select>
                  </label>

                  <label>
                    <span>Banner title</span>
                    <input
                      value={banner.title}
                      onChange={(event) =>
                        void handleBannerSave('title', event.target.value)
                      }
                    />
                  </label>

                  <label>
                    <span>Banner message</span>
                    <textarea
                      rows={3}
                      value={banner.message}
                      onChange={(event) =>
                        void handleBannerSave('message', event.target.value)
                      }
                    />
                  </label>
                </article>

                <article className="dashboard-card">
                  <div className="section-heading">
                    <div>
                      <p className="eyebrow">All-Sport Actions</p>
                      <h3>Update everything at once</h3>
                    </div>
                  </div>

                  {bulkFeedback ? (
                    <div className="action-feedback" role="status">
                      {bulkFeedback}
                    </div>
                  ) : null}

                  <div className="bulk-action-grid">
                    <button
                      className="bulk-action-card bulk-alert"
                      onClick={() =>
                        updateAllLiveSports(
                          'alert',
                          'All live sports are on alert. Check the banner and individual notes for tonight’s operating details.',
                          'All live sports moved to Alert.',
                        )
                      }
                      type="button"
                    >
                      <strong>Alert All Live Sports</strong>
                      <span>Useful for weather delays, staffing issues, or system problems.</span>
                    </button>

                    <button
                      className="bulk-action-card bulk-cancel"
                      onClick={() =>
                        updateAllLiveSports(
                          'cancelled',
                          'All live sports are cancelled. See the high-priority banner for tonight’s global update.',
                          'All live sports moved to Cancelled.',
                        )
                      }
                      type="button"
                    >
                      <strong>Cancel All Live Sports</strong>
                      <span>Best for major weather, building shutdowns, or campus-wide issues.</span>
                    </button>

                    <button
                      className="bulk-action-card bulk-active"
                      onClick={() =>
                        updateAllLiveSports(
                          'active',
                          'Normal operations have resumed for tonight’s live sports.',
                          'All live sports moved to Active.',
                        )
                      }
                      type="button"
                    >
                      <strong>Reactivate All Live Sports</strong>
                      <span>Fast reset once conditions normalize.</span>
                    </button>
                  </div>
                </article>
              </section>

              <section className="panel facilities-panel admin-panel">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Live Sport Controls</p>
                    <h3>Quick status editing for tonight’s board</h3>
                  </div>
                </div>

                {saveError ? <div className="error-text">{saveError}</div> : null}

                <div className="admin-list">
                  {sports
                    .filter((sport) => !sport.archived)
                    .sort((left, right) => left.displayOrder - right.displayOrder)
                    .map((sport) => (
                      <article className="admin-card" key={sport.id}>
                        <div className="admin-card-heading">
                          <div>
                            <p className="facility-area">{sport.category}</p>
                            <h4>{sport.name}</h4>
                            <p className="sports-list">{sport.facilityImpact}</p>
                          </div>
                          <span className={`status-pill ${statusMeta[sport.status].tone}`}>
                            {statusMeta[sport.status].label}
                          </span>
                        </div>

                        <div className="status-toggle">
                          {(['active', 'alert', 'cancelled'] as SportStatus[]).map((status) => (
                            <button
                              key={status}
                              className={
                                sport.status === status
                                  ? 'status-toggle-button active'
                                  : 'status-toggle-button'
                              }
                              onClick={() => updateSport(sport.id, { status })}
                              type="button"
                            >
                              {statusMeta[status].label}
                            </button>
                          ))}
                        </div>

                        <label>
                          <span>Notes</span>
                          <textarea
                            rows={3}
                            value={sport.note}
                            onChange={(event) =>
                              updateSport(sport.id, { note: event.target.value })
                            }
                          />
                        </label>

                        <label>
                          <span>Facility impact</span>
                          <input
                            value={sport.facilityImpact}
                            onChange={(event) =>
                              updateSport(sport.id, {
                                facilityImpact: event.target.value,
                              })
                            }
                          />
                        </label>

                        <div className="admin-actions">
                          <button
                            className="ghost-button"
                            onClick={() => updateSport(sport.id, { archived: true })}
                            type="button"
                          >
                            Archive sport
                          </button>
                        </div>

                        <p className="microcopy">
                          Updated: {sport.updatedAt} by {sport.updatedBy} •{' '}
                          {statusMeta[sport.status].adminLabel}
                        </p>
                      </article>
                    ))}
                </div>
              </section>

              <section className="panel">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Recent Activity</p>
                    <h3>Audit trail for recent changes</h3>
                  </div>
                </div>

                <div className="admin-list">
                  {auditLog.length > 0 ? (
                    auditLog.map((entry) => (
                      <article className="admin-card" key={entry.id}>
                        <div className="admin-card-heading">
                          <div>
                            <p className="facility-area">
                              {entry.entityType === 'banner' ? 'Global Banner' : 'Sport Update'}
                            </p>
                            <h4>{entry.summary}</h4>
                          </div>
                          <span className="status-pill status-open">{entry.action}</span>
                        </div>

                        <p className="facility-note">
                          {entry.actorEmail} made this change.
                        </p>

                        <p className="microcopy">Logged: {entry.createdAt}</p>
                      </article>
                    ))
                  ) : (
                    <article className="admin-card">
                      <h4>No audit entries yet</h4>
                      <p className="facility-note">
                        Recent admin changes will appear here once updates are made.
                      </p>
                    </article>
                  )}
                </div>
              </section>

              {archivedSports.length > 0 ? (
                <section className="panel">
                  <div className="section-heading">
                    <div>
                      <p className="eyebrow">Archived Sports</p>
                      <h3>Seasonal offerings stored out of the live board</h3>
                    </div>
                  </div>

                  <div className="admin-list">
                    {archivedSports
                      .sort((left, right) => left.displayOrder - right.displayOrder)
                      .map((sport) => (
                        <article className="admin-card" key={sport.id}>
                          <div className="admin-card-heading">
                            <div>
                              <p className="facility-area">{sport.category}</p>
                              <h4>{sport.name}</h4>
                            </div>
                            <span className="status-pill status-delayed">Archived</span>
                          </div>

                          <p className="facility-note">{sport.note}</p>

                          <div className="admin-actions">
                            <button
                              className="ghost-button"
                              onClick={() => updateSport(sport.id, { archived: false })}
                              type="button"
                            >
                              Restore sport
                            </button>
                          </div>
                        </article>
                      ))}
                  </div>
                </section>
              ) : null}
            </>
          )}
        </main>
      )}

      {isAddSportOpen ? (
        <div className="modal-shell" role="dialog" aria-modal="true">
          <div className="modal-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Add Sport</p>
                <h3>Create a new seasonal or special-event sport</h3>
              </div>
              <button
                className="ghost-button"
                onClick={() => setIsAddSportOpen(false)}
                type="button"
              >
                Close
              </button>
            </div>

            <form className="add-facility-form" onSubmit={(event) => void addSport(event)}>
              <label>
                <span>Sport name</span>
                <input
                  value={newSport.name}
                  onChange={(event) =>
                    setNewSport((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                <span>Category</span>
                <select
                  value={newSport.category}
                  onChange={(event) =>
                    setNewSport((current) => ({
                      ...current,
                      category: event.target.value as SportCategory,
                    }))
                  }
                >
                  <option value="Outdoor">Outdoor</option>
                  <option value="Indoor">Indoor</option>
                  <option value="Special Event">Special Event</option>
                </select>
              </label>

              <label>
                <span>Facility impact</span>
                <input
                  value={newSport.facilityImpact}
                  onChange={(event) =>
                    setNewSport((current) => ({
                      ...current,
                      facilityImpact: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="full-span">
                <span>Notes</span>
                <textarea
                  rows={3}
                  value={newSport.note}
                  onChange={(event) =>
                    setNewSport((current) => ({
                      ...current,
                      note: event.target.value,
                    }))
                  }
                />
              </label>

              <button className="primary-button" type="submit">
                Add sport
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default App
