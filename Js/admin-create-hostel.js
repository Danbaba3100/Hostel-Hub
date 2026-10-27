'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = 'https://hostel-hub-api-a4ie.onrender.com/api';
  const TOKEN_KEY = 'hostelHubAccessToken';
  const $ = (id) => document.getElementById(id);
  const modal = $('createHostelModal');
  const form = $('createHostelForm');
  const openButton = $('addHostelForAgentButton');
  const saveButton = $('saveCreateHostel');
  const agentSelect = $('createAgentId');
  const videoFileInput = $('createHostelVideoFile');
  const videoUrlInput = $('createHostelVideoUrl');
  const toast = $('toast');
  let agentsLoaded = false;
  let saving = false;

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 4500);
  }

  async function apiRequest(path, options = {}) {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) {
      window.location.replace('admin-login.html');
      throw new Error('Please sign in as an administrator.');
    }
    const headers = { Authorization: 'Bearer ' + token, ...(options.headers || {}) };
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';
    let response;
    try {
      response = await fetch(API_BASE + path, { ...options, headers });
    } catch {
      throw new Error('Cannot reach the Hostel Hub service. Please try again.');
    }
    if (response.status === 401) {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem('hostelHubUser');
      window.location.replace('admin-login.html');
      throw new Error('Your session expired. Please sign in again.');
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error?.message || 'The request could not be completed.');
    return payload;
  }

  async function loadAgents() {
    agentSelect.innerHTML = '<option value="">Loading active agents...</option>';
    try {
      const payload = await apiRequest('/admin/agents');
      const agents = (payload.agents || []).filter((agent) => agent.status === 'Active');
      agentSelect.replaceChildren(new Option('Choose an active agent', ''));
      agents.forEach((agent) => {
        const option = new Option(agent.name + ' — ' + agent.email, agent.id);
        agentSelect.add(option);
      });
      if (!agents.length) {
        agentSelect.replaceChildren(new Option('No active agents available', ''));
        showToast('There are no active agent accounts to assign a hostel to.');
      }
      agentsLoaded = true;
    } catch (error) {
      agentSelect.replaceChildren(new Option('Could not load agents — reopen to retry', ''));
      showToast(error.message);
    }
  }

  function openModal() {
    modal.hidden = false;
    if (!agentsLoaded) loadAgents();
    $('createHostelName').focus();
  }

  function closeModal() {
    if (saving) return;
    modal.hidden = true;
    form.reset();
    $('createCautionFee').value = '0';
    $('createAgencyFee').value = '0';
    $('createAgreementFee').value = '0';
    $('createServiceCharge').value = '0';
  }

  async function uploadVideoFile(file) {
    if (!file || !file.type || !file.type.startsWith('video/')) {
      throw new Error('Choose a valid hostel video file.');
    }
    if (file.size > 200 * 1024 * 1024) {
      throw new Error('Choose a video smaller than 200 MB.');
    }
    const signatureData = await apiRequest('/uploads/video-signature', {
      method: 'POST',
      body: JSON.stringify({})
    });
    const uploadData = new FormData();
    uploadData.append('file', file);
    uploadData.append('api_key', signatureData.apiKey);
    uploadData.append('timestamp', String(signatureData.timestamp));
    uploadData.append('folder', signatureData.folder);
    uploadData.append('signature', signatureData.signature);
    const response = await fetch(
      'https://api.cloudinary.com/v1_1/' + encodeURIComponent(signatureData.cloudName) + '/video/upload',
      { method: 'POST', body: uploadData }
    );
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.secure_url) {
      throw new Error(payload?.error?.message || 'The video upload failed. Try another video.');
    }
    return payload.secure_url;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (saving || !form.reportValidity()) return;

    const file = videoFileInput.files && videoFileInput.files[0];
    let videoUrl = videoUrlInput.value.trim();
    if (!file && !videoUrl) {
      showToast('Upload a hostel video or enter an existing video URL.');
      return;
    }

    const numberValue = (id) => Number($(id).value);
    const payload = {
      agentId: agentSelect.value,
      name: $('createHostelName').value.trim(),
      description: $('createHostelDescription').value.trim(),
      location: $('createHostelLocation').value.trim(),
      address: $('createHostelAddress').value.trim(),
      priceNgn: numberValue('createHostelPrice'),
      roomType: $('createHostelType').value.trim(),
      unitsAvailable: numberValue('createHostelRooms'),
      distanceFromCampus: $('createHostelDistance').value.trim(),
      cautionFeeNgn: numberValue('createCautionFee'),
      agencyFeeNgn: numberValue('createAgencyFee'),
      agreementFeeNgn: numberValue('createAgreementFee'),
      serviceChargeNgn: numberValue('createServiceCharge'),
      facilities: $('createHostelFacilities').value.split(',').map((item) => item.trim()).filter(Boolean),
      availabilityStatus: $('createHostelAvailability').value
    };
    if (!payload.agentId) {
      showToast('Choose the agent who owns this hostel.');
      agentSelect.focus();
      return;
    }
    const feeIds = ['createHostelPrice', 'createCautionFee', 'createAgencyFee', 'createAgreementFee', 'createServiceCharge'];
    if (feeIds.some((id) => !Number.isSafeInteger(numberValue(id)) || numberValue(id) < 0)) {
      showToast('Rent and fees must be valid non-negative whole amounts.');
      return;
    }

    saving = true;
    saveButton.disabled = true;
    saveButton.textContent = file ? 'Uploading video...' : 'Creating listing...';
    try {
      if (file) videoUrl = await uploadVideoFile(file);
      payload.videoUrl = videoUrl;
      saveButton.textContent = 'Creating and publishing...';
      const result = await apiRequest('/admin/hostels', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      modal.hidden = true;
      form.reset();
      $('createCautionFee').value = '0';
      $('createAgencyFee').value = '0';
      $('createAgreementFee').value = '0';
      $('createServiceCharge').value = '0';
      showToast(result.message || 'Hostel created and published under the selected agent.');
      if (typeof window.refreshAdminHostels === 'function') {
        await window.refreshAdminHostels();
      }
    } catch (error) {
      showToast(error.message || 'Could not create the hostel listing.');
    } finally {
      saving = false;
      saveButton.disabled = false;
      saveButton.textContent = 'Create & Publish Hostel';
    }
  });

  openButton?.addEventListener('click', openModal);
  $('closeCreateHostel')?.addEventListener('click', closeModal);
  $('cancelCreateHostel')?.addEventListener('click', closeModal);
  modal?.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal && !modal.hidden) closeModal();
  });
  videoFileInput?.addEventListener('change', () => {
    const file = videoFileInput.files && videoFileInput.files[0];
    if (file) videoUrlInput.value = '';
  });
  videoUrlInput?.addEventListener('input', () => {
    if (videoUrlInput.value.trim()) videoFileInput.value = '';
  });
});
