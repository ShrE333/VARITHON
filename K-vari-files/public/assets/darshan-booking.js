(function () {
  var TEMPLES = [
  { id: 'vitthal', name: 'Vitthal Rukmini Temple, Pandharpur', type: 'Main Temple' },
  { id: 'pundalik', name: 'Pundalik Temple, Pandharpur', type: 'Heritage Temple' },
  { id: 'iskcon', name: 'ISKCON Temple, Pandharpur', type: 'Partner Temple' },
  { id: 'chandrabhaga', name: 'Chandrabhaga Ghat Darshan', type: 'Ghat Darshan' }
  ];

  var DARSHAN_TYPES = [
  { id: 'mukh', name: 'Mukh Darshan (Free)', fee: 0 },
  { id: 'paid', name: 'Paid Darshan', fee: 50 },
  { id: 'abhishek', name: 'Special Abhishek', fee: 200 },
  { id: 'wari', name: 'Wari Special Darshan', fee: 100 }
  ];

  var SLOTS = [
  { id: 's1', time: '06:00 AM – 08:00 AM', label: 'Morning Slot 1' },
  { id: 's2', time: '08:00 AM – 10:00 AM', label: 'Morning Slot 2' },
  { id: 's3', time: '10:00 AM – 12:00 PM', label: 'Midday Slot' },
  { id: 's4', time: '04:00 PM – 06:00 PM', label: 'Evening Slot 1' },
  { id: 's5', time: '06:00 PM – 08:00 PM', label: 'Evening Slot 2' }
  ];

  var state = {
    step: 1,
    currentBookingId: '',
    temple: '',
    darshanType: '',
    date: '',
    slot: '',
    contactName: '',
    mobile: '',
    email: '',
    idProof: '',
    idNumber: '',
    numPeople: 1,
    pilgrims: [],
    specialNeeds: '',
    lastBooking: null,
    lastBookingQrData: ''
  };

  var savedUser = null;
  try {
    var raw = localStorage.getItem('varimitra_user');
    if (raw) savedUser = JSON.parse(raw);
  } catch (e) {}

  function qs(name) {
    var m = new RegExp('[?&]' + name + '=([^&]*)').exec(location.search);
    return m ? decodeURIComponent(m[1]) : null;
  }

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function formatDate(iso) {
    if (!iso) return '';
    var p = iso.split('-');
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return pad(+p[2]) + ' ' + months[+p[1] - 1] + ' ' + p[0];
  }

  function generateBookingId() {
    var d = new Date();
    var rand = Math.floor(1000 + Math.random() * 9000);
    return 'VM-DR-' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + rand;
  }

  function templeName(id) {
    var t = TEMPLES.find(function (x) { return x.id === id; });
    return t ? t.name : id;
  }

  function darshanName(id) {
    var d = DARSHAN_TYPES.find(function (x) { return x.id === id; });
    return d ? d.name : id;
  }

  function slotTime(id) {
    var s = SLOTS.find(function (x) { return x.id === id; });
    return s ? s.time : id;
  }

  function slotLabel(id) {
    var s = SLOTS.find(function (x) { return x.id === id; });
    return s ? s.label : '';
  }

  function feeForType(id) {
    var d = DARSHAN_TYPES.find(function (x) { return x.id === id; });
    return d ? d.fee : 0;
  }

  function setMinDate() {
    var input = document.getElementById('dbDate');
    if (!input) return;
    var today = new Date();
    var max = new Date(today);
    max.setDate(max.getDate() + 30);
    input.min = today.toISOString().split('T')[0];
    input.max = max.toISOString().split('T')[0];
  }

  function populateTemples() {
    var sel = document.getElementById('dbTemple');
    if (!sel) return;
    sel.innerHTML = '<option value="">Select temple</option>' +
      TEMPLES.map(function (t) {
        return '<option value="' + t.id + '">' + t.name + ' (' + t.type + ')</option>';
      }).join('');
  }

  function populateDarshanTypes() {
    var sel = document.getElementById('dbDarshanType');
    if (!sel) return;
    sel.innerHTML = '<option value="">Select darshan type</option>' +
      DARSHAN_TYPES.map(function (d) {
        var fee = d.fee ? ' — ₹' + d.fee + '/person' : ' — Free';
        return '<option value="' + d.id + '">' + d.name + fee + '</option>';
      }).join('');
  }

  function renderSlots() {
    var wrap = document.getElementById('dbSlotGrid');
    if (!wrap) return;
    wrap.innerHTML = SLOTS.map(function (s) {
      var avail = Math.floor(20 + Math.random() * 80);
      var sel = state.slot === s.id ? ' selected' : '';
      return '<div class="db-slot' + sel + '" data-slot="' + s.id + '">' +
        '<b>' + s.label + '</b>' +
        '<span>' + s.time + '</span>' +
        '<div class="avail">' + avail + ' slots left</div>' +
        '</div>';
    }).join('');

    wrap.querySelectorAll('.db-slot').forEach(function (el) {
      el.addEventListener('click', function () {
        state.slot = el.getAttribute('data-slot');
        wrap.querySelectorAll('.db-slot').forEach(function (s) { s.classList.remove('selected'); });
        el.classList.add('selected');
      });
    });
  }

  function renderPilgrimFields() {
    var wrap = document.getElementById('dbPilgrimFields');
    var count = parseInt(document.getElementById('dbNumPeople').value, 10) || 1;
    if (count < 1) count = 1;
    if (count > 10) count = 10;
    document.getElementById('dbNumPeople').value = count;
    state.numPeople = count;

    var html = '';
    for (var i = 0; i < count; i++) {
      var existing = state.pilgrims[i] || {};
      html += '<div class="db-pilgrim-card">' +
        '<h4><i class="fa-solid fa-user"></i> Pilgrim ' + (i + 1) + (i === 0 ? ' (Primary)' : '') + '</h4>' +
        '<div class="db-row">' +
          '<div class="db-field">' +
            '<label>Full Name <span class="req">*</span></label>' +
            '<input type="text" class="pilgrim-name" data-idx="' + i + '" value="' + (existing.name || '') + '" placeholder="Enter full name" required>' +
          '</div>' +
          '<div class="db-field">' +
            '<label>Age <span class="req">*</span></label>' +
            '<input type="number" class="pilgrim-age" data-idx="' + i + '" value="' + (existing.age || '') + '" placeholder="Age" min="1" max="120" required>' +
          '</div>' +
        '</div>' +
        '<div class="db-row">' +
          '<div class="db-field">' +
            '<label>Gender</label>' +
            '<select class="pilgrim-gender" data-idx="' + i + '">' +
              '<option value="">Select</option>' +
              '<option value="Male"' + (existing.gender === 'Male' ? ' selected' : '') + '>Male</option>' +
              '<option value="Female"' + (existing.gender === 'Female' ? ' selected' : '') + '>Female</option>' +
              '<option value="Other"' + (existing.gender === 'Other' ? ' selected' : '') + '>Other</option>' +
            '</select>' +
          '</div>' +
          '<div class="db-field">' +
            '<label>Relation to Primary</label>' +
            '<select class="pilgrim-relation" data-idx="' + i + '">' +
              '<option value="Self"' + (existing.relation === 'Self' || i === 0 ? ' selected' : '') + '>Self</option>' +
              '<option value="Spouse"' + (existing.relation === 'Spouse' ? ' selected' : '') + '>Spouse</option>' +
              '<option value="Child"' + (existing.relation === 'Child' ? ' selected' : '') + '>Child</option>' +
              '<option value="Parent"' + (existing.relation === 'Parent' ? ' selected' : '') + '>Parent</option>' +
              '<option value="Sibling"' + (existing.relation === 'Sibling' ? ' selected' : '') + '>Sibling</option>' +
              '<option value="Friend"' + (existing.relation === 'Friend' ? ' selected' : '') + '>Friend</option>' +
              '<option value="Other"' + (existing.relation === 'Other' ? ' selected' : '') + '>Other</option>' +
            '</select>' +
          '</div>' +
        '</div>' +
        '</div>';
    }
    wrap.innerHTML = html;
  }

  function collectPilgrims() {
    state.pilgrims = [];
    document.querySelectorAll('.pilgrim-name').forEach(function (el) {
      var idx = +el.getAttribute('data-idx');
      state.pilgrims[idx] = state.pilgrims[idx] || {};
      state.pilgrims[idx].name = el.value.trim();
    });
    document.querySelectorAll('.pilgrim-age').forEach(function (el) {
      var idx = +el.getAttribute('data-idx');
      state.pilgrims[idx] = state.pilgrims[idx] || {};
      state.pilgrims[idx].age = el.value.trim();
    });
    document.querySelectorAll('.pilgrim-gender').forEach(function (el) {
      var idx = +el.getAttribute('data-idx');
      state.pilgrims[idx] = state.pilgrims[idx] || {};
      state.pilgrims[idx].gender = el.value;
    });
    document.querySelectorAll('.pilgrim-relation').forEach(function (el) {
      var idx = +el.getAttribute('data-idx');
      state.pilgrims[idx] = state.pilgrims[idx] || {};
      state.pilgrims[idx].relation = el.value;
    });
  }

  function showError(id, msg) {
    var field = document.getElementById(id);
    var err = document.getElementById(id + 'Err');
    if (field) field.classList.add('error');
    if (err) { err.textContent = msg; err.classList.add('show'); }
  }

  function clearErrors() {
    document.querySelectorAll('.error').forEach(function (el) { el.classList.remove('error'); });
    document.querySelectorAll('.err-msg').forEach(function (el) { el.classList.remove('show'); });
  }

  function validateStep(step) {
    clearErrors();
    var ok = true;

    if (step === 1) {
      state.temple = document.getElementById('dbTemple').value;
      state.darshanType = document.getElementById('dbDarshanType').value;
      state.date = document.getElementById('dbDate').value;
      if (!state.temple) { showError('dbTemple', 'Please select a temple'); ok = false; }
      if (!state.darshanType) { showError('dbDarshanType', 'Please select darshan type'); ok = false; }
      if (!state.date) { showError('dbDate', 'Please select darshan date'); ok = false; }
      if (!state.slot) { alert('Please select a time slot'); ok = false; }
    }

    if (step === 2) {
      state.contactName = document.getElementById('dbContactName').value.trim();
      state.mobile = document.getElementById('dbMobile').value.trim();
      state.email = document.getElementById('dbEmail').value.trim();
      state.idProof = document.getElementById('dbIdProof').value;
      state.idNumber = document.getElementById('dbIdNumber').value.trim();
      if (!state.contactName) { showError('dbContactName', 'Name is required'); ok = false; }
      if (!/^\d{10}$/.test(state.mobile)) { showError('dbMobile', 'Enter a valid 10-digit mobile number'); ok = false; }
      if (!state.idProof) { showError('dbIdProof', 'Select ID proof type'); ok = false; }
      if (!state.idNumber || state.idNumber.length < 4) { showError('dbIdNumber', 'Enter ID number (last 4 digits minimum)'); ok = false; }
    }

    if (step === 3) {
      collectPilgrims();
      for (var i = 0; i < state.pilgrims.length; i++) {
        var p = state.pilgrims[i];
        if (!p || !p.name) { alert('Please enter name for Pilgrim ' + (i + 1)); ok = false; break; }
        if (!p.age || +p.age < 1) { alert('Please enter valid age for Pilgrim ' + (i + 1)); ok = false; break; }
      }
      state.specialNeeds = document.getElementById('dbSpecialNeeds').value.trim();
    }

    return ok;
  }

  function updateStepUI() {
    document.querySelectorAll('.db-step').forEach(function (el) {
      el.classList.toggle('active', +el.getAttribute('data-step') === state.step);
    });
    document.querySelectorAll('.db-step-pill').forEach(function (el) {
      var s = +el.getAttribute('data-step');
      el.classList.remove('active', 'done');
      if (s === state.step) el.classList.add('active');
      else if (s < state.step) el.classList.add('done');
    });
    document.getElementById('btnPrev').style.display = state.step > 1 ? 'inline-flex' : 'none';
    document.getElementById('btnNext').style.display = state.step < 4 ? 'inline-flex' : 'none';
    document.getElementById('btnConfirm').style.display = state.step === 4 ? 'inline-flex' : 'none';

    if (state.step === 4) renderReview();
  }

  function renderReview() {
    var fee = feeForType(state.darshanType) * state.numPeople;
    var html = '';
    html += row('Temple', templeName(state.temple));
    html += row('Darshan Type', darshanName(state.darshanType));
    html += row('Date', formatDate(state.date));
    html += row('Time Slot', slotTime(state.slot));
    html += row('Contact', state.contactName + ' (+91 ' + state.mobile + ')');
    if (state.email) html += row('Email', state.email);
    html += row('ID Proof', state.idProof + ' — ' + state.idNumber);
    html += row('Total Pilgrims', state.numPeople);
    html += row('Total Fee', fee ? '₹' + fee : 'Free');

    var pHtml = state.pilgrims.map(function (p, i) {
      return '<div class="db-pilgrim-line">' + (i + 1) + '. ' + p.name +
        ' · Age ' + p.age +
        (p.gender ? ' · ' + p.gender : '') +
        ' · ' + (p.relation || 'Self') + '</div>';
    }).join('');
    html += '<div class="db-ticket-pilgrims"><h5>Pilgrim Details</h5>' + pHtml + '</div>';
    if (state.specialNeeds) html += row('Special Requirements', state.specialNeeds);

    document.getElementById('dbReview').innerHTML = html;
  }

  function row(label, val) {
    return '<div class="db-ticket-row"><span>' + label + '</span><span>' + val + '</span></div>';
  }

  function formatValidity(dateIso, slotId) {
    var slot = SLOTS.find(function (x) { return x.id === slotId; });
    var endTime = '';
    if (slot && slot.time) {
      var parts = slot.time.split(/\s*[–\-]\s*/);
      if (parts[1]) endTime = parts[1].trim();
    }
    return formatDate(dateIso) + (endTime ? ', ' + endTime : '');
  }

  function cacheQrDataUrl(dataUrl) {
    if (dataUrl && dataUrl.indexOf('data:') === 0) {
      state.lastBookingQrData = dataUrl;
    }
  }

  function renderQrCode(data) {
    var canvas = document.getElementById('ticketQr');
    var img = document.getElementById('ticketQrImg');
    if (!canvas) return;

    canvas.hidden = false;
    if (img) img.hidden = true;
    state.lastBookingQrData = '';

    var opts = { width: 220, margin: 1, color: { dark: '#000000', light: '#FFFFFF' } };

    function useImageFallback() {
      if (!img) return;
      var encoded = encodeURIComponent(data);
      img.src = 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=' + encoded;
      img.hidden = false;
      canvas.hidden = true;
      img.onload = function () {
        try {
          var tmp = document.createElement('canvas');
          tmp.width = 220;
          tmp.height = 220;
          tmp.getContext('2d').drawImage(img, 0, 0, 220, 220);
          cacheQrDataUrl(tmp.toDataURL('image/png'));
        } catch (e) { /* CORS may block — PDF will regenerate QR */ }
      };
    }

    if (window.QRCode && typeof QRCode.toCanvas === 'function') {
      QRCode.toCanvas(canvas, data, opts, function (err) {
        if (err) {
          useImageFallback();
          return;
        }
        canvas.style.margin = '0 auto';
        canvas.style.display = 'block';
        try {
          cacheQrDataUrl(canvas.toDataURL('image/png'));
        } catch (e) { /* ignore */ }
      });
    } else {
      useImageFallback();
    }
  }

  function getQrPayload(booking) {
    return booking.id + '|' + booking.mobile + '|' + booking.date + '|' + booking.slot;
  }

  function fetchQrFromApi(payload) {
    var apiUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=1&data=' + encodeURIComponent(payload);
    return fetch(apiUrl).then(function (response) {
      if (!response.ok) throw new Error('QR API failed');
      return response.blob();
    }).then(function (blob) {
      return new Promise(function (resolve, reject) {
        var reader = new FileReader();
        reader.onloadend = function () { resolve(reader.result); };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    });
  }

  function getQrDataUrl(booking) {
    if (state.lastBookingQrData) {
      return Promise.resolve(state.lastBookingQrData);
    }

    var canvas = document.getElementById('ticketQr');
    if (canvas && !canvas.hidden) {
      try {
        var cached = canvas.toDataURL('image/png');
        cacheQrDataUrl(cached);
        return Promise.resolve(cached);
      } catch (e) { /* continue to fallbacks */ }
    }

    var payload = getQrPayload(booking);

    function tryQrCanvas() {
      return new Promise(function (resolve, reject) {
        if (!window.QRCode || typeof QRCode.toCanvas !== 'function') {
          reject(new Error('QRCode lib missing'));
          return;
        }
        var tmpCanvas = document.createElement('canvas');
        QRCode.toCanvas(tmpCanvas, payload, {
          width: 220,
          margin: 1,
          color: { dark: '#000000', light: '#FFFFFF' }
        }, function (err) {
          if (err) { reject(err); return; }
          try {
            resolve(tmpCanvas.toDataURL('image/png'));
          } catch (e) {
            reject(e);
          }
        });
      });
    }

    return tryQrCanvas()
      .catch(function () { return fetchQrFromApi(payload); })
      .then(function (url) {
        cacheQrDataUrl(url);
        return url;
      });
  }

  function getJsPDF() {
    if (window.jspdf && window.jspdf.jsPDF) return window.jspdf.jsPDF;
    if (window.jsPDF) return window.jsPDF;
    return null;
  }

  function buildTicketPdf(booking, qrDataUrl) {
    var JsPDF = getJsPDF();
    if (!JsPDF) throw new Error('PDF library not loaded');

    var pdf = new JsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    var pageW = pdf.internal.pageSize.getWidth();
    var cardW = 100;
    var cardX = (pageW - cardW) / 2;
    var pad = 8;
    var innerW = cardW - pad * 2;
    var cardStartY = 22;
    var textX = cardX + pad + 5;
    var qrSize = 46;
    var notes = [
      'Please carry a valid photo ID matching your booking details.',
      'Arrive at least 15 minutes before your darshan slot. Note: Scratched phone screens may cause QR scanning issues.'
    ];
    var validity = 'Ticket is valid for entry till: ' + formatValidity(booking.date, booking.slot);
    var imgFormat = qrDataUrl && qrDataUrl.indexOf('image/jpeg') >= 0 ? 'JPEG' : 'PNG';

    var measureY = pad;
    function measureRoute(value) {
      pdf.setFontSize(10);
      var lines = pdf.splitTextToSize(value, innerW - 5);
      measureY += 7.5 + lines.length * 4.2 + 5;
    }
    function measureMeta(value) {
      pdf.setFontSize(9);
      var valLines = pdf.splitTextToSize(String(value), innerW * 0.52);
      measureY += Math.max(5.5, valLines.length * 4.2);
    }

    measureRoute(booking.templeName.toUpperCase());
    measureRoute((booking.dateFormatted + ' \u00B7 ' + booking.slotTime).toUpperCase());
    measureY += 7 + 8 + qrSize + 6 + booking.pilgrims.length * 5.5 + 3 + 7;
    pdf.setFontSize(9);
    measureY += pdf.splitTextToSize(validity, innerW).length * 4.5 + 5 + 7;
    measureMeta(booking.id);
    measureMeta(booking.darshanName);
    measureMeta(booking.contactName + ' (+91 ' + booking.mobile + ')');
    measureMeta(booking.numPeople);
    measureMeta(booking.fee ? ('Rs. ' + booking.fee) : 'Free');
    measureY += 3;
    pdf.setFontSize(8);
    notes.forEach(function (note) {
      measureY += pdf.splitTextToSize(note, innerW).length * 3.6 + 2;
    });
    var cardH = measureY + pad;

    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(232, 232, 232);
    pdf.setLineWidth(0.35);
    if (typeof pdf.roundedRect === 'function') {
      pdf.roundedRect(cardX, cardStartY, cardW, cardH, 4, 4, 'FD');
    } else {
      pdf.rect(cardX, cardStartY, cardW, cardH, 'FD');
    }

    var y = cardStartY + pad;

    function divider() {
      pdf.setDrawColor(239, 239, 239);
      pdf.setLineWidth(0.2);
      pdf.line(cardX + pad, y, cardX + cardW - pad, y);
      y += 7;
    }

    function routeRow(dotColor, label, value) {
      pdf.setFillColor(dotColor[0], dotColor[1], dotColor[2]);
      pdf.circle(cardX + pad + 2, y + 1.5, 1.4, 'F');
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(156, 163, 175);
      pdf.text(label, textX, y + 2);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(17, 24, 39);
      var lines = pdf.splitTextToSize(value, innerW - 5);
      pdf.text(lines, textX, y + 7.5);
      y += 7.5 + lines.length * 4.2 + 5;
    }

    function metaRow(label, value) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(156, 163, 175);
      pdf.text(label, cardX + pad, y);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(55, 65, 81);
      var valLines = pdf.splitTextToSize(String(value), innerW * 0.52);
      pdf.text(valLines, cardX + cardW - pad, y, { align: 'right' });
      y += Math.max(5.5, valLines.length * 4.2);
    }

    routeRow([34, 197, 94], 'Temple', booking.templeName.toUpperCase());
    routeRow([239, 68, 68], 'Darshan Slot', (booking.dateFormatted + ' \u00B7 ' + booking.slotTime).toUpperCase());
    divider();

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(107, 114, 128);
    pdf.text('Scan this QR at Temple Entry Gate', pageW / 2, y, { align: 'center' });
    y += 8;

    if (qrDataUrl) {
      pdf.addImage(qrDataUrl, imgFormat, (pageW - qrSize) / 2, y, qrSize, qrSize);
      y += qrSize + 6;
    } else {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.setTextColor(17, 24, 39);
      pdf.text('Booking Ref: ' + booking.id, pageW / 2, y + 10, { align: 'center' });
      y += 20;
    }

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(17, 24, 39);
    booking.pilgrims.forEach(function (p, i) {
      pdf.text('Passenger ' + (i + 1) + ': ' + p.name, pageW / 2, y, { align: 'center' });
      y += 5.5;
    });
    y += 3;
    divider();

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(220, 38, 38);
    var valLines = pdf.splitTextToSize(validity, innerW);
    valLines.forEach(function (line, i) {
      pdf.text(line, pageW / 2, y + i * 4.5, { align: 'center' });
    });
    y += valLines.length * 4.5 + 5;
    divider();

    metaRow('Booking ID', booking.id);
    metaRow('Darshan Type', booking.darshanName);
    metaRow('Booked By', booking.contactName + ' (+91 ' + booking.mobile + ')');
    metaRow('Total Pilgrims', booking.numPeople);
    metaRow('Total Fee', booking.fee ? ('Rs. ' + booking.fee) : 'Free');
    y += 3;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(107, 114, 128);
    notes.forEach(function (note) {
      var noteLines = pdf.splitTextToSize(note, innerW);
      pdf.text(noteLines, cardX + pad, y);
      y += noteLines.length * 3.6 + 2;
    });

    return pdf;
  }

  function saveTicketAsPdf() {
    var btn = document.getElementById('btnSavePdf');
    var booking = state.lastBooking;
    var defaultLabel = '<i class="fa-solid fa-file-pdf"></i> Save as PDF';

    if (!booking) {
      alert('No ticket found. Please complete a booking first.');
      return;
    }
    if (!getJsPDF()) {
      alert('PDF library not loaded. Please refresh the page and try again.');
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating PDF…';

    getQrDataUrl(booking).then(function (qrDataUrl) {
      try {
        var pdf = buildTicketPdf(booking, qrDataUrl);
        pdf.save('VariMitra-Darshan-' + booking.id + '.pdf');
        btn.disabled = false;
        btn.innerHTML = defaultLabel;
      } catch (err) {
        console.error('PDF build error:', err);
        btn.disabled = false;
        btn.innerHTML = defaultLabel;
        alert('Could not generate PDF. Please try again.');
      }
    }).catch(function (err) {
      console.error('QR error, generating PDF without QR:', err);
      try {
        var pdf = buildTicketPdf(booking, null);
        pdf.save('VariMitra-Darshan-' + booking.id + '.pdf');
        btn.disabled = false;
        btn.innerHTML = defaultLabel;
      } catch (pdfErr) {
        console.error('PDF build error:', pdfErr);
        btn.disabled = false;
        btn.innerHTML = defaultLabel;
        alert('Could not generate PDF. Please check your internet connection and try again.');
      }
    });
  }

  function saveBooking(booking) {
    var list = [];
    try {
      list = JSON.parse(localStorage.getItem('varimitra_bookings') || '[]');
    } catch (e) {}
    list.unshift(booking);
    localStorage.setItem('varimitra_bookings', JSON.stringify(list.slice(0, 20)));
  }

  function generateTicket() {
    var bookingId = generateBookingId();
    state.currentBookingId = bookingId;
    var fee = feeForType(state.darshanType) * state.numPeople;
    var booking = {
      id: bookingId,
      temple: state.temple,
      templeName: templeName(state.temple),
      darshanType: state.darshanType,
      darshanName: darshanName(state.darshanType),
      date: state.date,
      dateFormatted: formatDate(state.date),
      slot: state.slot,
      slotTime: slotTime(state.slot),
      slotLabel: slotLabel(state.slot),
      contactName: state.contactName,
      mobile: state.mobile,
      email: state.email,
      idProof: state.idProof,
      idNumber: state.idNumber,
      numPeople: state.numPeople,
      pilgrims: state.pilgrims.slice(),
      specialNeeds: state.specialNeeds,
      fee: fee,
      bookedAt: new Date().toISOString()
    };

    state.lastBooking = booking;
    saveBooking(booking);

    document.getElementById('bookingForm').style.display = 'none';
    document.querySelector('.db-steps').style.display = 'none';
    var ticketWrap = document.getElementById('ticketWrap');
    ticketWrap.classList.add('show');

    document.getElementById('ticketId').textContent = bookingId;
    document.getElementById('ticketTemple').textContent = booking.templeName.toUpperCase();
    document.getElementById('ticketSlotLine').textContent =
      (booking.dateFormatted + ' · ' + booking.slotTime).toUpperCase();
    document.getElementById('ticketDarshan').textContent = booking.darshanName;
    document.getElementById('ticketContact').textContent = booking.contactName + ' (+91 ' + booking.mobile + ')';
    document.getElementById('ticketPeople').textContent = booking.numPeople;
    document.getElementById('ticketFee').textContent = fee ? '₹' + fee : 'Free';
    document.getElementById('ticketValidity').textContent =
      'Ticket is valid for entry till: ' + formatValidity(booking.date, booking.slot);

    var passengerHtml = booking.pilgrims.map(function (p, i) {
      return '<div class="db-passenger-name">Passenger ' + (i + 1) + ': ' + p.name + '</div>';
    }).join('');
    document.getElementById('ticketPassengers').innerHTML = passengerHtml;

    renderQrCode(getQrPayload(booking));
  }

  function prefillUser() {
    if (!savedUser) return;
    var nameEl = document.getElementById('dbContactName');
    var mobileEl = document.getElementById('dbMobile');
    if (nameEl && savedUser.name) nameEl.value = savedUser.name;
    if (mobileEl && savedUser.phone) mobileEl.value = savedUser.phone;
    if (savedUser.name) {
      state.pilgrims[0] = { name: savedUser.name, age: savedUser.age || '', relation: 'Self' };
    }
  }

  function init() {
    var back = qs('back') || '/varimitra';
    var backEl = document.getElementById('dbBack');
    if (backEl) backEl.href = back;

    populateTemples();
    populateDarshanTypes();
    renderSlots();
    setMinDate();
    prefillUser();
    renderPilgrimFields();
    updateStepUI();

    document.getElementById('dbNumPeople').addEventListener('change', renderPilgrimFields);
    document.getElementById('dbNumPeople').addEventListener('input', renderPilgrimFields);

    document.getElementById('btnNext').addEventListener('click', function () {
      if (!validateStep(state.step)) return;
      state.step++;
      if (state.step === 3) renderPilgrimFields();
      updateStepUI();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    document.getElementById('btnPrev').addEventListener('click', function () {
      if (state.step > 1) {
        state.step--;
        updateStepUI();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });

    document.getElementById('btnConfirm').addEventListener('click', function () {
      generateTicket();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    document.getElementById('btnPrint').addEventListener('click', function () {
      window.print();
    });

    document.getElementById('btnSavePdf').addEventListener('click', saveTicketAsPdf);

    document.getElementById('btnNewBooking').addEventListener('click', function () {
      location.reload();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
