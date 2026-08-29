'use client';

/**
 * Darshan slot booking. The form logic and PDF ticket live in
 * public/assets/darshan-booking.js, which drives this markup by id.
 */

import { Suspense } from 'react';
import { PageScripts } from '@/components/portal/PortalScripts';
import { LangToggle } from '@/components/LangToggle';
import { LangProvider } from '@/lib/i18n/context';

const PAGE_SCRIPTS = ['/assets/jspdf.umd.min.js', '/assets/darshan-booking.js'];

function DarshanBody() {
  return (
    <div className="vm-darshan">
      <PageScripts sources={PAGE_SCRIPTS} />
<div className="db-top">
  <a className="db-back" id="dbBack" href="/"><i className="fa-solid fa-arrow-left"></i> Back to Portal</a>
  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
    <div className="db-brand"><i className="fa-solid fa-compass"></i> VariMitra</div>
    <LangToggle />
  </div>
</div>

<div className="db-body">

  
  <div className="db-ticket-wrap" id="ticketWrap">
    <div className="db-success-msg">
      <div className="ic"><i className="fa-solid fa-check"></i></div>
      <h2>Booking Confirmed!</h2>
      <p>Your darshan ticket has been generated. Show this QR code at the temple entry gate.</p>
    </div>

    <div className="db-ticket-stack" id="ticketStack">
      <div className="db-ticket" id="printTicket">
        <div className="db-ticket-route">
          <div className="db-route-row">
            <span className="db-route-icon from"><i className="fa-solid fa-circle"></i></span>
            <div className="db-route-text">
              <span className="db-route-label">Temple</span>
              <span className="db-route-value" id="ticketTemple">—</span>
            </div>
          </div>
          <div className="db-route-row">
            <span className="db-route-icon to"><i className="fa-solid fa-location-dot"></i></span>
            <div className="db-route-text">
              <span className="db-route-label">Darshan Slot</span>
              <span className="db-route-value" id="ticketSlotLine">—</span>
            </div>
          </div>
        </div>

        <div className="db-ticket-qr-section">
          <p className="db-scan-hint">Scan this QR at Temple Entry Gate</p>
          <div className="db-qr-frame">
            <canvas id="ticketQr" width="220" height="220"></canvas>
            <img id="ticketQrImg" alt="Darshan ticket QR code" hidden />
          </div>
          <div className="db-passengers" id="ticketPassengers"></div>
        </div>

        <div className="db-ticket-validity">
          <p id="ticketValidity">Ticket is valid for entry on: —</p>
        </div>

        <div className="db-ticket-meta">
          <div className="db-meta-row"><span>Booking ID</span><span id="ticketId">—</span></div>
          <div className="db-meta-row"><span>Darshan Type</span><span id="ticketDarshan">—</span></div>
          <div className="db-meta-row"><span>Booked By</span><span id="ticketContact">—</span></div>
          <div className="db-meta-row"><span>Total Pilgrims</span><span id="ticketPeople">—</span></div>
          <div className="db-meta-row"><span>Total Fee</span><span id="ticketFee">—</span></div>
        </div>

        <div className="db-ticket-notes">
          <p>Please carry a valid photo ID matching your booking details.</p>
          <p>Arrive at least 15 minutes before your darshan slot. Note: Scratched phone screens may cause QR scanning issues.</p>
        </div>
      </div>
    </div>

    <div className="db-actions db-ticket-actions">
      <button className="db-btn db-btn-ghost" id="btnNewBooking"><i className="fa-solid fa-plus"></i> New Booking</button>
      <button className="db-btn db-btn-ghost" id="btnPrint"><i className="fa-solid fa-print"></i> Print Ticket</button>
      <button className="db-btn db-btn-primary" id="btnSavePdf"><i className="fa-solid fa-file-pdf"></i> Save as PDF</button>
    </div>
  </div>

  
  <form id="bookingForm" onsubmit="return false;" className="space-y-6">
    
    <div className="db-step active" data-step="1">
      <div className="db-panel">
        <h2><i className="fa-solid fa-landmark"></i> Select Temple & Darshan Slot</h2>
        <p className="sub">Choose the temple, darshan type, date and preferred time slot for your Vari darshan.</p>

        <div className="db-field">
          <label htmlFor="dbTemple">Temple <span className="req">*</span></label>
          <select id="dbTemple" required></select>
          <div className="err-msg" id="dbTempleErr"></div>
        </div>

        <div className="db-field">
          <label htmlFor="dbDarshanType">Darshan Type <span className="req">*</span></label>
          <select id="dbDarshanType" required></select>
          <div className="hint">Mukh Darshan is free. Paid & special darshan slots have limited availability.</div>
          <div className="err-msg" id="dbDarshanTypeErr"></div>
        </div>

        <div className="db-row">
          <div className="db-field">
            <label htmlFor="dbDate">Date of Darshan <span className="req">*</span></label>
            <input type="date" id="dbDate" required />
            <div className="err-msg" id="dbDateErr"></div>
          </div>
          <div className="db-field">
            <label htmlFor="dbNumPeople">Number of People <span className="req">*</span></label>
            <input type="number" id="dbNumPeople" value="1" min="1" max="10" required />
            <div className="hint">Maximum 10 pilgrims per booking</div>
          </div>
        </div>

        <div className="db-field">
          <label>Time Slot <span className="req">*</span></label>
          <div className="db-slot-grid" id="dbSlotGrid"></div>
        </div>
      </div>
    </div>

    
    <div className="db-step active" data-step="2">
      <div className="db-panel">
        <h2><i className="fa-solid fa-address-card"></i> Contact & ID Details</h2>
        <p className="sub">Primary contact information for booking confirmation and temple entry verification.</p>

        <div className="db-row">
          <div className="db-field">
            <label htmlFor="dbContactName">Full Name (Primary Contact) <span className="req">*</span></label>
            <input type="text" id="dbContactName" placeholder="Enter your full name" required />
            <div className="err-msg" id="dbContactNameErr"></div>
          </div>
          <div className="db-field">
            <label htmlFor="dbMobile">Mobile Number <span className="req">*</span></label>
            <input type="tel" id="dbMobile" placeholder="10-digit mobile number" maxLength="10" required />
            <div className="err-msg" id="dbMobileErr"></div>
          </div>
        </div>

        <div className="db-field">
          <label htmlFor="dbEmail">Email Address</label>
          <input type="email" id="dbEmail" placeholder="your@email.com (optional)" />
        </div>

        <div className="db-row">
          <div className="db-field">
            <label htmlFor="dbIdProof">ID Proof Type <span className="req">*</span></label>
            <select id="dbIdProof" required>
              <option value="">Select ID type</option>
              <option value="Aadhaar">Aadhaar Card</option>
              <option value="PAN">PAN Card</option>
              <option value="Voter ID">Voter ID</option>
              <option value="Driving License">Driving License</option>
              <option value="Passport">Passport</option>
            </select>
            <div className="err-msg" id="dbIdProofErr"></div>
          </div>
          <div className="db-field">
            <label htmlFor="dbIdNumber">ID Number <span className="req">*</span></label>
            <input type="text" id="dbIdNumber" placeholder="Enter ID number" required />
            <div className="hint">Carry the original ID to the temple for verification</div>
            <div className="err-msg" id="dbIdNumberErr"></div>
          </div>
        </div>
      </div>
    </div>

    
    <div className="db-step active" data-step="3">
      <div className="db-panel">
        <h2><i className="fa-solid fa-users"></i> Pilgrim Details</h2>
        <p className="sub">Enter the full name and details of each person attending the darshan.</p>

        <div id="dbPilgrimFields"></div>

        <div className="db-field">
          <label htmlFor="dbSpecialNeeds">Special Requirements</label>
          <textarea id="dbSpecialNeeds" rows="3" placeholder="Wheelchair access, elderly assistance, infant care, etc. (optional)"></textarea>
        </div>
      </div>
    </div>

    <div className="db-actions">
      <button type="button" className="db-btn db-btn-primary w-full justify-center" id="btnConfirmSingle">
        <i className="fa-solid fa-ticket"></i> Confirm & Generate Ticket
      </button>
    </div>
  </form>

</div>
    </div>
  );
}

export default function DarshanBookingPage() {
  return (
    <LangProvider>
      <Suspense fallback={null}>
        <DarshanBody />
      </Suspense>
    </LangProvider>
  );
}
