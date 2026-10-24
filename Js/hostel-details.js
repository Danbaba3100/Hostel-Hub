'use strict';

document.addEventListener('DOMContentLoaded', async () => {
  const API_BASE = window.HOSTEL_HUB_API_BASE || 'http://localhost:4000/api';
  const params = new URLSearchParams(window.location.search);
  const hostelKey = params.get('id') || params.get('hostel');

  const hostelTitle = document.getElementById('hostelTitle');
  const hostelLocation = document.getElementById('hostelLocation');
  const hostelVideo = document.getElementById('hostelVideo');
  const hostelDescription = document.getElementById('hostelDescription');
  const hostelPrice = document.getElementById('hostelPrice');
  const hostelRoom = document.getElementById('hostelRoom');
  const hostelOccupancy = document.getElementById('hostelOccupancy');
  const hostelAvailability = document.getElementById('hostelAvailability');
  const bookingPrice = document.getElementById('bookingPrice');
  const facilitiesGrid = document.querySelector('.facilities-grid');
  const bookingButton = document.querySelector('.booking-button');
  const reportLink = document.querySelector('.report-link');

  const setText = (element, value) => {
    if (element) element.textContent = value;
  };

  const showNotFound = () => {
    document.title = 'Hostel Not Found | Hostel Hub';
    setText(hostelTitle, 'Hostel Not Found');
    setText(hostelLocation, 'This hostel could not be identified.');
    setText(hostelDescription, 'This listing may have been removed or is no longer available. Return to Find Hostels to choose an approved listing.');
    if (hostelVideo) {
      hostelVideo.pause();
      hostelVideo.removeAttribute('src');
      const source = hostelVideo.querySelector('source');
      if (source) source.removeAttribute('src');
      hostelVideo.load();
    }
    if (bookingButton) bookingButton.hidden = true;
    if (reportLink) reportLink.hidden = true;
  };

  if (!hostelKey) {
    showNotFound();
    return;
  }

  try {
    const response = await fetch(API_BASE + '/hostels/' + encodeURIComponent(hostelKey), {
      headers: { Accept: 'application/json' }
    });
    if (!response.ok) {
      showNotFound();
      return;
    }

    const payload = await response.json();
    const hostel = payload.hostel;
    if (!hostel) {
      showNotFound();
      return;
    }

    document.title = hostel.name + ' | Hostel Hub';
    setText(hostelTitle, hostel.name);
    setText(hostelLocation, '📍 ' + (hostel.location || hostel.address || 'Osogbo'));
    setText(hostelDescription, hostel.description || 'Contact the agent for more details.');
    setText(hostelPrice, new Intl.NumberFormat('en-NG', {
      style: 'currency', currency: 'NGN', maximumFractionDigits: 0
    }).format(Number(hostel.price) || 0) + ' / year');

    const roomType = String(hostel.type || 'Not specified').replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, letter => letter.toUpperCase());
    setText(hostelRoom, roomType);
    setText(hostelOccupancy, (Number(hostel.rooms) || 0) + ' units available');
    setText(hostelAvailability, hostel.availability || 'Availability to be confirmed');
    setText(bookingPrice, new Intl.NumberFormat('en-NG', {
      style: 'currency', currency: 'NGN', maximumFractionDigits: 0
    }).format(Number(hostel.price) || 0));

    if (hostelVideo) {
      hostelVideo.pause();
      const source = hostelVideo.querySelector('source');
      if (source) {
        source.src = hostel.videoUrl || '';
      } else if (hostel.videoUrl) {
        hostelVideo.src = hostel.videoUrl;
      }
      hostelVideo.load();
    }

    if (facilitiesGrid) {
      facilitiesGrid.replaceChildren();
      (Array.isArray(hostel.facilities) ? hostel.facilities : []).forEach(facility => {
        const item = document.createElement('div');
        item.className = 'facility';
        const icon = document.createElement('span');
        icon.textContent = '✓';
        icon.setAttribute('aria-hidden', 'true');
        const label = document.createElement('p');
        label.textContent = facility;
        item.append(icon, label);
        facilitiesGrid.appendChild(item);
      });
    }

    if (bookingButton) {
      bookingButton.href = 'book-inspection.html?hostel=' + encodeURIComponent(hostel.slug);
      bookingButton.hidden = false;
    }
    if (reportLink) {
      reportLink.href = 'report.html?hostel=' + encodeURIComponent(hostel.id);
      reportLink.hidden = false;
    }
  } catch (error) {
    console.error('Unable to load hostel details:', error);
    showNotFound();
    setText(hostelDescription, 'We could not connect to the Hostel Hub API. Please check that the API is running and refresh this page.');
  }
});
