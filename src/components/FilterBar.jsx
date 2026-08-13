export function FilterBar({ users, config, filters, setFilters, view, setView, sort, setSort }) {
  function update(field, value) {
    setFilters((f) => ({ ...f, [field]: value }));
  }

  return (
    <div className="filter-bar">
      <div className="filter-group">
        <select value={filters.designerId} onChange={(e) => update('designerId', e.target.value)}>
          <option value="all">All designers</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>

        <select value={filters.projectType} onChange={(e) => update('projectType', e.target.value)}>
          <option value="all">All project types</option>
          {config.projectTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <select value={filters.account} onChange={(e) => update('account', e.target.value)}>
          <option value="all">All accounts</option>
          {config.accounts.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>

        <input
          type="search"
          placeholder="Search project name…"
          value={filters.search}
          onChange={(e) => update('search', e.target.value)}
        />
      </div>

      <div className="filter-group">
        {view === 'table' && (
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="startDate">Sort: Start date</option>
            <option value="endDate">Sort: End date</option>
            <option value="name">Sort: Job name</option>
            <option value="designer">Sort: Designer</option>
            <option value="priority">Sort: Priority</option>
          </select>
        )}

        <div className="view-toggle">
          <button className={view === 'board' ? 'active' : ''} onClick={() => setView('board')}>
            Board
          </button>
          <button className={view === 'table' ? 'active' : ''} onClick={() => setView('table')}>
            Table
          </button>
        </div>
      </div>
    </div>
  );
}
