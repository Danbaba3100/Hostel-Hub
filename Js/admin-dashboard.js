'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = 'http://localhost:4000/api';
  const TOKEN_KEY = 'hostelHubAccessToken';
  const USER_KEY = 'hostelHubUser';
  const $ = (id) => document.getElementById(id);

  const tableBody = $('hostelTableBody');
  const hostelSearch = $('hostelSearch');
  const statusFilter = $('statusFilter');
  const tableEmpty = $('tableEmpty');
  const tableCount = $('tableCount');
  const globalSearch = $('globalSearch');
  const toast = $('toast');
  let hostels = [];
  let bookings = [];
  let toastTimer;

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
  }

  function formatPrice(price) {
    return '₦' + Number(price || 0).toLocaleString('en-NG') + '/year';
  }

  function formatDate(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function timeAgo(value) {
    const date = formatDate(value);
    if (!date) return 'Date unavailable';
    const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
    if (minutes < 60) return minutes <= 1 ? 'Just now' : minutes + 'm ago';
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + 'h ago';
    const days = Math.floor(hours / 24);
    return days < 7 ? days + 'd ago' : date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
  }

  async function apiRequest(path) {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) {
      window.location.replace('admin-login.html');
      throw new Error('Please sign in as an administrator.');
    }

    let response;
    try {
      response = await fetch(API_BASE + path, {
        headers: { Authorization: 'Bearer ' + token }
      });
    } catch {
      throw new Error('Cannot reach the Hostel Hub API. Make sure the backend is running on port 4000.');
    }

    if (response.status === 401) {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
      window.location.replace('admin-login.html');
      throw new Error('Your session expired. Please sign in again.');
    }

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 403) throw new Error('Administrator access is required.');
      throw new Error(payload?.error?.message || 'Could not load dashboard data.');
    }
    return payload;
  }

  function updateDateTime() {
    const now = new Date();
    if ($('currentDate')) $('currentDate').textContent = now.toLocaleDateString('en-NG', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    if ($('currentTime')) $('currentTime').textContent = now.toLocaleTimeString('en-NG', {
      hour: '2-digit', minute: '2-digit'
    });
    if ($('currentYear')) $('currentYear').textContent = now.getFullYear();
  }

  function statusClass(status) {
    if (status === 'Approved') return 'status-available';
    if (status === 'Under Review') return 'status-under-review';
    return 'status-rejected';
  }

  function renderHostels() {
    const query = hostelSearch.value.trim().toLowerCase();
    const selectedStatus = statusFilter.value;
    const filtered = hostels.filter((hostel) => {
      const matchesSearch = [hostel.name, hostel.location, hostel.agent, hostel.agentEmail]
        .join(' ').toLowerCase().includes(query);
      return matchesSearch && (selectedStatus === 'all' || hostel.status === selectedStatus);
    });

    tableBody.replaceChildren();
    filtered.slice(0, 8).forEach((hostel) => {
      const row = document.createElement('tr');
      const nameCell = document.createElement('td');
      const nameWrap = document.createElement('div');
      const avatar = document.createElement('span');
      const name = document.createElement('span');
      nameWrap.className = 'hostel-name';
      avatar.className = 'hostel-avatar';
      avatar.innerHTML = '<i data-lucide="house"></i>';
      name.textContent = hostel.name || 'Unnamed hostel';
      nameWrap.append(avatar, name);
      nameCell.appendChild(nameWrap);

      const locationCell = document.createElement('td');
      locationCell.className = 'location-cell';
      locationCell.textContent = hostel.location || 'Location not provided';

      const priceCell = document.createElement('td');
      priceCell.textContent = formatPrice(hostel.price);

      const statusCell = document.createElement('td');
      const badge = document.createElement('span');
      badge.className = 'status-badge ' + statusClass(hostel.status);
      badge.textContent = hostel.status || 'Under Review';
      statusCell.appendChild(badge);

      const actionsCell = document.createElement('td');
      const actions = document.createElement('div');
      actions.className = 'row-actions';
      const view = document.createElement('button');
      view.type = 'button';
      view.className = 'view-button';
      view.textContent = 'View';
      view.addEventListener('click', () => {
        window.location.href = 'admin-hostels.html?hostel=' + encodeURIComponent(hostel.id);
      });
      const more = document.createElement('button');
      more.type = 'button';
      more.className = 'more-button';
      more.setAttribute('aria-label', 'Manage ' + (hostel.name || 'hostel'));
      more.innerHTML = '<i data-lucide="more-vertical"></i>';
      more.addEventListener('click', () => {
        window.location.href = 'admin-hostels.html?hostel=' + encodeURIComponent(hostel.id);
      });
      actions.append(view, more);
      actionsCell.appendChild(actions);
      row.append(nameCell, locationCell, priceCell, statusCell, actionsCell);
      tableBody.appendChild(row);
    });

    if (tableEmpty) tableEmpty.hidden = filtered.length !== 0;
    if (tableCount) tableCount.textContent = 'Showing ' + Math.min(filtered.length, 8) + ' of ' + filtered.length + ' matching listings (' + hostels.length + ' total)';
    if (window.lucide) window.lucide.createIcons();
  }

  function setStat(id, value, note) {
    const element = $(id);
    if (element) element.textContent = value;
    const card = element?.closest('.stat-card');
    const noteElement = card?.querySelector('.stat-note');
    if (noteElement && note !== undefined) noteElement.textContent = note;
  }

  function updateStats(stats) {
    setStat('totalHostels', hostels.length, 'Live database count');
    setStat('totalAgents', Number.isInteger(stats?.totalAgents) ? stats.totalAgents : '—',
      Number.isInteger(stats?.totalAgents) ? 'Registered agent accounts' : 'Agent total unavailable');
    setStat('totalBookings', bookings.length, 'Live inspection requests');
    setStat('totalReports', '—', 'Reports data not connected');
  }

  function renderActivity() {
    const list = $('activityList');
    if (!list) return;
    list.replaceChildren();
    const events = [
      ...hostels.map((h) => ({
        date: formatDate(h.submitted),
        icon: h.status === 'Approved' ? 'check-circle' : h.status === 'Rejected' ? 'x-circle' : 'building-2',
        tone: h.status === 'Approved' ? 'green' : h.status === 'Rejected' ? 'red' : 'blue',
        title: 'Hostel listing ' + (h.status || 'submitted').toLowerCase(),
        detail: (h.name || 'Unnamed hostel') + ' · ' + (h.location || 'Location not provided'),
        time: h.submitted
      })),
      ...bookings.map((b) => ({
        date: formatDate(b.createdAt),
        icon: 'calendar-check',
        tone: 'green',
        title: 'Inspection request received',
        detail: (b.hostel || 'Hostel') + ' · ' + (b.student || 'Student'),
        time: b.createdAt
      }))
    ].filter((event) => event.date).sort((a, b) => b.date - a.date).slice(0, 5);

    if (!events.length) {
      const empty = document.createElement('p');
      empty.className = 'activity-empty';
      empty.textContent = 'No recent activity is available yet.';
      list.appendChild(empty);
      return;
    }

    events.forEach((event) => {
      const item = document.createElement('div');
      item.className = 'activity-item';
      const icon = document.createElement('span');
      icon.className = 'activity-icon ' + event.tone;
      icon.innerHTML = '<i data-lucide="' + event.icon + '"></i>';
      const copy = document.createElement('div');
      copy.className = 'activity-copy';
      const title = document.createElement('strong');
      title.textContent = event.title;
      const detail = document.createElement('p');
      detail.textContent = event.detail;
      copy.append(title, detail);
      const time = document.createElement('time');
      time.textContent = timeAgo(event.time);
      item.append(icon, copy, time);
      list.appendChild(item);
    });
    if (window.lucide) window.lucide.createIcons();
  }

  function renderChart(period = '7') {
    const svg = $('activityChart');
    const labelsContainer = $('chartLabels');
    if (!svg || !labelsContainer) return;

    const days = period === '30' ? 30 : 7;
    const buckets = [];
    for (let i = days - 1; i >= 0; i--) {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - i);
      buckets.push({ start, label: days === 7
        ? start.toLocaleDateString('en-NG', { weekday: 'short' })
        : start.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }),
        bookings: 0, listings: 0 });
    }

    const countIntoBuckets = (items, key, dateKey) => {
      items.forEach((item) => {
        const date = formatDate(item[dateKey]);
        if (!date) return;
        const dayIndex = buckets.findIndex((bucket, index) => {
          const end = new Date(bucket.start);
          end.setDate(end.getDate() + (days === 30 ? 1 : 1));
          return date >= bucket.start && date < end;
        });
        if (dayIndex >= 0) buckets[dayIndex][key]++;
      });
    };
    countIntoBuckets(hostels, 'listings', 'submitted');
    countIntoBuckets(bookings, 'bookings', 'createdAt');

    labelsContainer.replaceChildren();
    const shownBuckets = days === 30 ? buckets.filter((_, i) => i % 6 === 0 || i === buckets.length - 1) : buckets;
    shownBuckets.forEach((bucket) => {
      const span = document.createElement('span');
      span.textContent = bucket.label;
      labelsContainer.appendChild(span);
    });

    const top = 20, bottom = 270, width = 700, height = bottom - top;
    const maxValue = Math.max(5, ...buckets.flatMap((bucket) => [bucket.bookings, bucket.listings]));
    const pointsGroup = $('chartPoints');
    if (pointsGroup) pointsGroup.replaceChildren();
    const config = [
      { key: 'bookings', id: 'bookingsLine', color: '#0b9b59' },
      { key: 'listings', id: 'listingsLine', color: '#2479e8' }
    ];
    config.forEach((series) => {
      const points = buckets.map((bucket, index) => ({
        x: buckets.length === 1 ? 0 : index / (buckets.length - 1) * width,
        y: bottom - bucket[series.key] / maxValue * height,
        value: bucket[series.key]
      }));
      const line = $(series.id);
      if (line) line.setAttribute('points', points.map((p) => p.x + ',' + p.y).join(' '));
      if (pointsGroup) {
        points.forEach((point) => {
          const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          circle.setAttribute('cx', point.x);
          circle.setAttribute('cy', point.y);
          circle.setAttribute('r', '4');
          circle.setAttribute('fill', series.color);
          const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
          title.textContent = series.key + ': ' + point.value;
          circle.appendChild(title);
          pointsGroup.appendChild(circle);
        });
      }
      if (series.key === 'bookings') {
        const area = $('bookingsArea');
        if (area && points.length) {
          area.setAttribute('d', 'M' + points.map((p) => p.x + ' ' + p.y).join(' L') +
            ' L' + width + ' ' + bottom + ' L0 ' + bottom + ' Z');
        }
      }
    });
    const reportsLine = $('reportsLine');
    if (reportsLine) reportsLine.style.display = 'none';
    svg.setAttribute('aria-label', 'Live database counts of inspection requests and hostel submissions over the selected period');
    const yLabels = document.querySelector('.chart-y-labels');
    if (yLabels) {
      const spans = yLabels.querySelectorAll('span');
      spans.forEach((span, index) => span.textContent = String(Math.round(maxValue * (5 - index) / 5)));
    }
  }

  function updateChartSafely() {
    const period = $('chartPeriod')?.value || '7';
    renderChart(period);
  }

  async function start() {
    updateDateTime();
    const user = JSON.parse(sessionStorage.getItem(USER_KEY) || 'null');
    if (user?.fullName) {
      const heading = document.querySelector('.welcome-section h1');
      if (heading) {
        heading.replaceChildren(document.createTextNode('Welcome back, ' + user.fullName + ' '));
        const wave = document.createElement('span');
        wave.textContent = '👋';
        heading.appendChild(wave);
      }
    }

    try {
      const me = await apiRequest('/auth/me');
      if (!me.user || me.user.role !== 'admin') {
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(USER_KEY);
        window.location.replace('admin-login.html');
        return;
      }
      const [hostelResult, bookingResult, statsResult] = await Promise.all([
        apiRequest('/admin/hostels'),
        apiRequest('/admin/inspections'),
        apiRequest('/admin/stats')
      ]);
      hostels = Array.isArray(hostelResult.hostels) ? hostelResult.hostels : [];
      bookings = Array.isArray(bookingResult.bookings) ? bookingResult.bookings : [];
      updateStats(statsResult.stats);
      renderHostels();
      renderActivity();
      updateChartSafely();
    } catch (error) {
      showToast(error.message);
      if (tableBody) tableBody.replaceChildren();
      if (tableCount) tableCount.textContent = 'Dashboard data could not be loaded.';
      setStat('totalHostels', '—', 'Could not load data');
      setStat('totalBookings', '—', 'Could not load data');
      setStat('totalAgents', '—', 'Not connected');
      setStat('totalReports', '—', 'Not connected');
      if (tableEmpty) tableEmpty.hidden = false;
    }
  }

  hostelSearch?.addEventListener('input', renderHostels);
  statusFilter?.addEventListener('change', renderHostels);
  $('resetTable')?.addEventListener('click', () => {
    hostelSearch.value = '';
    statusFilter.value = 'all';
    renderHostels();
  });
  $('globalSearchForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const query = globalSearch.value.trim();
    if (!query) return showToast('Enter a hostel or location to search.');
    hostelSearch.value = query;
    renderHostels();
    document.querySelector('.hostels-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  $('chartPeriod')?.addEventListener('change', updateChartSafely);

  const sidebar = $('sidebar');
  const menuToggle = $('menuToggle');
  const overlay = $('sidebarOverlay');
  function closeSidebar() {
    sidebar?.classList.remove('open');
    overlay?.classList.remove('show');
    menuToggle?.setAttribute('aria-expanded', 'false');
  }
  menuToggle?.addEventListener('click', () => {
    const open = sidebar?.classList.toggle('open');
    overlay?.classList.toggle('show', Boolean(open));
    menuToggle.setAttribute('aria-expanded', String(Boolean(open)));
  });
  overlay?.addEventListener('click', closeSidebar);
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeSidebar(); });

  $('notificationButton')?.addEventListener('click', () => showToast('Live notifications are not connected yet.'));
  $('profileButton')?.addEventListener('click', () => showToast('Profile settings are not connected yet.'));
  document.querySelectorAll('[data-page="Activity Log"]').forEach((button) => {
    button.addEventListener('click', () => showToast('The activity log page is not available yet.'));
  });

  if (window.lucide) window.lucide.createIcons();
  start();
});
