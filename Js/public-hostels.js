'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = window.HOSTEL_HUB_API_BASE || 'http://localhost:4000/api';
  const grid = document.getElementById('hostelGrid');
  const count = document.getElementById('resultsCount');
  const emptyState = document.getElementById('emptyState');
  const search = document.getElementById('hostelSearch');
  const locationFilter = document.getElementById('locationFilter');
  const priceFilter = document.getElementById('priceFilter');
  const roomFilter = document.getElementById('roomFilter');
  const clearButton = document.getElementById('clearFilters');
  const emptyClearButton = document.getElementById('emptyClearButton');

  if (!grid || !count || !emptyState) return;

  let hostels = [];

  const slugify = (value) => String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const displayRoomType = (value) => {
    const text = String(value || 'Room type not specified').replace(/[_-]+/g, ' ').trim();
    return text.replace(/\b\w/g, (letter) => letter.toUpperCase());
  };

  const money = (value) => new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0
  }).format(Number(value) || 0);

  const makeElement = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };

  function createCard(hostel) {
    const card = makeElement('article', 'hostel-card');
    const videoWrapper = makeElement('div', 'video-wrapper');
    const video = document.createElement('video');
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.controls = true;

    if (hostel.videoUrl) {
      video.src = hostel.videoUrl;
    } else {
      videoWrapper.appendChild(makeElement('p', 'video-unavailable', 'Video not available'));
    }

    const overlay = makeElement('div', 'video-overlay');
    const playButton = makeElement('button', 'video-play', '▶');
    playButton.type = 'button';
    playButton.setAttribute('aria-label', 'Play ' + (hostel.name || 'hostel') + ' video');
    playButton.addEventListener('click', async () => {
      if (video.paused) {
        document.querySelectorAll('.hostel-card video').forEach((otherVideo) => {
          if (otherVideo !== video) otherVideo.pause();
        });
        try {
          await video.play();
          overlay.hidden = true;
        } catch {
          video.controls = true;
        }
      } else {
        video.pause();
        overlay.hidden = false;
      }
    });
    video.addEventListener('pause', () => { overlay.hidden = false; });
    video.addEventListener('play', () => { overlay.hidden = true; });
    overlay.appendChild(playButton);
    videoWrapper.append(video, overlay);
    videoWrapper.appendChild(makeElement('span', 'verified-badge', '✓ Approved'));

    const content = makeElement('div', 'hostel-card-content');
    content.appendChild(makeElement('span', 'hostel-location', hostel.location || 'Location not specified'));
    content.appendChild(makeElement('h3', '', hostel.name || 'Unnamed hostel'));
    content.appendChild(makeElement('p', 'hostel-description', hostel.description || 'Contact the agent for more details.'));

    const meta = makeElement('div', 'hostel-meta');
    meta.appendChild(makeElement('span', '', displayRoomType(hostel.type)));
    meta.appendChild(makeElement('span', '', (Number(hostel.rooms) || 0) + ' units available'));
    meta.appendChild(makeElement('span', '', hostel.availability || 'Availability to be confirmed'));
    content.appendChild(meta);

    const bottom = makeElement('div', 'hostel-card-bottom');
    const price = makeElement('div', 'hostel-price', money(hostel.price));
    price.appendChild(makeElement('small', '', '/ year'));
    const actions = makeElement('div', 'hostel-card-actions');
    const link = makeElement('a', 'hostel-link', 'View Hostel →');
    link.href = 'hostel-details.html?id=' + encodeURIComponent(hostel.slug || hostel.id);
    const reportLink = makeElement('a', 'hostel-report-link', 'Report listing');
    reportLink.href = 'report.html?hostel=' + encodeURIComponent(hostel.slug || hostel.id);
    reportLink.setAttribute('aria-label', 'Report ' + (hostel.name || 'this hostel listing'));
    actions.append(link, reportLink);
    bottom.append(price, actions);
    content.appendChild(bottom);

    card.append(videoWrapper, content);
    return card;
  }

  function matchesFilters(hostel) {
    const query = (search?.value || '').trim().toLowerCase();
    const location = slugify(hostel.location);
    const room = slugify(hostel.type);
    const nameAndLocation = (hostel.name || '') + ' ' + (hostel.location || '') + ' ' + (hostel.address || '');

    if (query && !nameAndLocation.toLowerCase().includes(query)) return false;

    // Filter controls are optional because some pages only display the hostel grid.
    if (locationFilter && locationFilter.value !== 'all' &&
        location !== locationFilter.value && !location.includes(locationFilter.value)) return false;

    const price = Number(hostel.price) || 0;
    switch (priceFilter?.value) {
      case 'under-150': if (price >= 150000) return false; break;
      case '150-180': if (price < 150000 || price > 180000) return false; break;
      case '180-200': if (price < 180000 || price > 200000) return false; break;
      case 'above-200': if (price <= 200000) return false; break;
      default: break;
    }

    if (roomFilter?.value === 'self-contained' && !room.includes('self-contained')) return false;
    if (roomFilter?.value === 'room-parlour' &&
        !(room.includes('room-parlour') || (room.includes('room') && room.includes('parlour')))) return false;
    return true;
  }

  function render() {
    const filtered = hostels.filter(matchesFilters);
    grid.replaceChildren(...filtered.map(createCard));
    count.textContent = 'Showing ' + filtered.length + ' ' + (filtered.length === 1 ? 'hostel' : 'hostels');
    emptyState.style.display = filtered.length ? 'none' : 'block';
  }

  function applyUrlFilters() {
    const params = new URLSearchParams(window.location.search);
    if (search && params.has('search')) search.value = params.get('search') || '';
    if (locationFilter && params.has('location')) locationFilter.value = slugify(params.get('location'));
    if (roomFilter && params.has('room')) roomFilter.value = params.get('room');
    if (priceFilter && params.has('price')) {
      const price = params.get('price');
      priceFilter.value = price === 'under150' ? 'under-150' : price === '150-200' ? '150-180' : price;
    }
  }

  function clearFilters() {
    if (search) search.value = '';
    if (locationFilter) locationFilter.value = 'all';
    if (priceFilter) priceFilter.value = 'all';
    if (roomFilter) roomFilter.value = 'all';
    render();
  }

  [search, locationFilter, priceFilter, roomFilter].forEach((control) => {
    if (!control) return;
    control.addEventListener(control === search ? 'input' : 'change', render);
  });
  clearButton?.addEventListener('click', clearFilters);
  emptyClearButton?.addEventListener('click', clearFilters);

  async function loadHostels() {
    count.textContent = 'Loading approved hostels…';
    emptyState.style.display = 'none';
    try {
      const response = await fetch(API_BASE + '/hostels', {
        headers: { Accept: 'application/json' }
      });
      if (!response.ok) throw new Error('Could not load hostel listings.');
      const payload = await response.json();
      hostels = Array.isArray(payload.hostels) ? payload.hostels : [];
      applyUrlFilters();
      render();
      if (!hostels.length) {
        const title = emptyState.querySelector('h3');
        const message = emptyState.querySelector('p');
        if (title) title.textContent = 'No approved hostels yet';
        if (message) message.textContent = 'Approved hostel listings will appear here once they are available.';
      }
    } catch (error) {
      console.error('Unable to load public hostel listings:', error);
      grid.replaceChildren();
      count.textContent = 'Hostels unavailable';
      emptyState.style.display = 'block';
      const title = emptyState.querySelector('h3');
      const message = emptyState.querySelector('p');
      if (title) title.textContent = 'Could not load hostels';
      if (message) message.textContent = 'Please make sure the Hostel Hub API is running, then refresh this page.';
    }
  }

  loadHostels();
});
