import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildClinicalSystemInstruction,
  buildConditionDistribution,
  buildReminderMessage,
  clampFloatingPosition,
  computeAverageLoad,
  computePaginationMeta,
  computeTrendPercent,
  extractMapsGroundingLinks,
  getInitials,
  resolveThemeMode,
  validateBookingInput,
  validateDoctorInput,
  validateLoginInput,
  validatePatientInput,
  validateTestReportInput,
} from './clinical';

test('validateLoginInput rejects empty and malformed inputs', () => {
  const empty = validateLoginInput('', '');
  assert.equal(empty.valid, false);
  assert.ok(empty.errors.email);
  assert.ok(empty.errors.password);

  const badEmail = validateLoginInput('not-an-email', '123456');
  assert.equal(badEmail.valid, false);
  assert.ok(badEmail.errors.email);

  const valid = validateLoginInput('admin@careguidebd.com', 'Admin@2026!');
  assert.equal(valid.valid, true);
  assert.deepEqual(valid.errors, {});
});

test('validateDoctorInput enforces required fields and phone/email formats', () => {
  const invalid = validateDoctorInput({
    name: 'Dr',
    specialization: '',
    hospital: '',
    phone: '123',
    email: 'invalid',
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.name);
  assert.ok(invalid.errors.specialization);
  assert.ok(invalid.errors.hospital);
  assert.ok(invalid.errors.phone);
  assert.ok(invalid.errors.email);

  const valid = validateDoctorInput({
    name: 'Dr. Anika Rahman',
    specialization: 'Cardiology',
    hospital: 'Care Guide Medical Center',
    phone: '+880 1711-234567',
    email: 'anika.rahman@careguidebd.com',
  });
  assert.equal(valid.valid, true);
});

test('validatePatientInput checks age boundaries, diseaseType, and clinical enums', () => {
  const invalid = validatePatientInput({
    name: 'A',
    age: 140,
    gender: 'Unknown',
    condition: 'Healthy',
    diseaseType: '',
    doctorId: null,
    contactNumber: 'bad',
    admissionDate: '',
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.name);
  assert.ok(invalid.errors.age);
  assert.ok(invalid.errors.gender);
  assert.ok(invalid.errors.condition);
  assert.ok(invalid.errors.diseaseType);
  assert.ok(invalid.errors.contactNumber);
  assert.ok(invalid.errors.admissionDate);

  const valid = validatePatientInput({
    name: 'Nusrat Jahan',
    age: 42,
    gender: 'Female',
    condition: 'Under Observation',
    diseaseType: 'Cardiovascular Disease',
    doctorId: 1,
    contactNumber: '+880 1819-445566',
    admissionDate: '2026-11-10',
  });
  assert.equal(valid.valid, true);
});

test('validateTestReportInput validates test type, findings, status, and timestamp', () => {
  const invalid = validateTestReportInput({
    testType: '',
    resultValue: '',
    status: 'Normal',
    notes: '',
    checkedAt: 'not-a-date',
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.testType);
  assert.ok(invalid.errors.resultValue);
  assert.ok(invalid.errors.checkedAt);

  const valid = validateTestReportInput({
    testType: 'CBC (Complete Blood Count)',
    resultValue: 'WBC 7.4 K/uL, Hb 13.8 g/dL',
    status: 'Normal',
    notes: 'Within reference range',
    checkedAt: '2026-11-16T10:30',
  });
  assert.equal(valid.valid, true);
});

test('validateBookingInput and buildReminderMessage support patient and doctor phone reminders', () => {
  const invalid = validateBookingInput({
    patientId: null,
    patientName: '',
    patientPhone: '12',
    doctorId: '',
    diseaseType: '',
    sessionType: '',
    scheduledAt: '',
    remindPatient: true,
    remindDoctor: true,
    notes: '',
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.patientName);
  assert.ok(invalid.errors.patientPhone);
  assert.ok(invalid.errors.doctorId);

  const valid = validateBookingInput({
    patientId: 1,
    patientName: 'Mahmudul Islam',
    patientPhone: '+880 1812-300101',
    doctorId: 1,
    diseaseType: 'Cardiovascular Disease',
    sessionType: 'Follow-up Check-in',
    scheduledAt: '2026-11-18T10:00',
    remindPatient: true,
    remindDoctor: true,
    notes: 'Bring ECG report',
  });
  assert.equal(valid.valid, true);

  const patMsg = buildReminderMessage({
    recipientType: 'patient',
    patientName: 'Mahmudul Islam',
    doctorName: 'Dr. Anika Rahman',
    diseaseType: 'Cardiovascular Disease',
    sessionType: 'Follow-up Check-in',
    scheduledAt: '2026-11-18T10:00',
  });
  const docMsg = buildReminderMessage({
    recipientType: 'doctor',
    patientName: 'Mahmudul Islam',
    doctorName: 'Dr. Anika Rahman',
    diseaseType: 'Cardiovascular Disease',
    sessionType: 'Follow-up Check-in',
    scheduledAt: '2026-11-18T10:00',
  });
  assert.match(patMsg, /Mahmudul Islam/);
  assert.match(patMsg, /Dr\. Anika Rahman/);
  assert.match(docMsg, /Dr\. Anika Rahman/);
  assert.match(docMsg, /Mahmudul Islam/);
});

test('clampFloatingPosition constrains draggable chat window inside viewport bounds', () => {
  const clampedNegative = clampFloatingPosition(
    { x: -120, y: -40 },
    { width: 400, height: 540 },
    { width: 1440, height: 900 }
  );
  assert.deepEqual(clampedNegative, { x: 12, y: 12 });

  const clampedOverflow = clampFloatingPosition(
    { x: 1300, y: 800 },
    { width: 400, height: 540 },
    { width: 1440, height: 900 }
  );
  assert.deepEqual(clampedOverflow, { x: 1028, y: 348 });

  const inBounds = clampFloatingPosition(
    { x: 300, y: 200 },
    { width: 400, height: 540 },
    { width: 1440, height: 900 }
  );
  assert.deepEqual(inBounds, { x: 300, y: 200 });
});

test('analytics helpers compute load, trend percentages, and pagination safely', () => {
  assert.equal(computeAverageLoad(0, 0), 0);
  assert.equal(computeAverageLoad(28, 12), 2.3);

  assert.equal(computeTrendPercent(12, 10), 20);
  assert.equal(computeTrendPercent(8, 10), -20);
  assert.equal(computeTrendPercent(5, 0), 100);
  assert.equal(computeTrendPercent(0, 0), 0);

  const meta = computePaginationMeta(28, 5, 10);
  assert.equal(meta.totalPages, 3);
  assert.equal(meta.page, 3);
  assert.equal(meta.offset, 20);
});

test('buildConditionDistribution preserves canonical condition order', () => {
  const dist = buildConditionDistribution({ Stable: 10, Critical: 4 });
  assert.equal(dist.length, 4);
  assert.deepEqual(
    dist.map((item) => [item.condition, item.count]),
    [
      ['Stable', 10],
      ['Critical', 4],
      ['Under Observation', 0],
      ['Discharged', 0],
    ]
  );
});

test('getInitials extracts clean two-letter monogram ignoring medical honorifics', () => {
  assert.equal(getInitials('Dr. Tariq Rahman'), 'TR');
  assert.equal(getInitials('Farhana Kabir'), 'FK');
});

test('extractMapsGroundingLinks extracts unique map URIs and review snippets', () => {
  const chunks = [
    {
      maps: {
        uri: 'https://maps.google.com/?cid=101',
        title: 'Care Guide Medical Center',
        placeAnswerSources: {
          reviewSnippets: [
            { text: 'Prompt emergency triage.', authorAttribution: { displayName: 'A. Karim' } },
          ],
        },
      },
    },
    {
      maps: {
        uri: 'https://maps.google.com/?cid=101',
        title: 'Duplicate entry',
      },
    },
    {
      maps: {
        uri: 'https://maps.google.com/?cid=202',
        title: 'Dhaka Central Pharmacy',
      },
    },
    { web: { uri: 'https://example.com' } },
  ];

  const links = extractMapsGroundingLinks(chunks);
  assert.equal(links.length, 2);
  assert.equal(links[0].title, 'Care Guide Medical Center');
  assert.equal(links[0].reviewSnippets[0].text, 'Prompt emergency triage.');
  assert.equal(links[1].title, 'Dhaka Central Pharmacy');
});

test('buildClinicalSystemInstruction embeds live metrics and role directive', () => {
  const prompt = buildClinicalSystemInstruction('advisor', {
    totalDoctors: 12,
    totalPatients: 28,
    avgPatientsPerDoctor: 2.3,
    criticalCount: 4,
    upcomingBookingsCount: 6,
    doctorsSummary: [
      { name: 'Dr. Anika Rahman', specialization: 'Cardiology', hospital: 'Care Guide', patientsCount: 4 },
    ],
    criticalPatients: [
      {
        name: 'Sharmin Nahar',
        age: 49,
        condition: 'Critical',
        diseaseType: 'Oncology / Tumor',
        lastCheckIn: '2026-11-16T09:15',
        doctorName: 'Dr. Samira Alam',
        admissionDate: '2026-11-16',
      },
    ],
  });

  assert.match(prompt, /Clinical Operations Advisor/);
  assert.match(prompt, /Total Doctors: 12/);
  assert.match(prompt, /Dr\. Anika Rahman/);
  assert.match(prompt, /Sharmin Nahar/);
  assert.match(prompt, /Oncology \/ Tumor/);
});

test('resolveThemeMode defaults safely to light and preserves dark', () => {
  assert.equal(resolveThemeMode('dark'), 'dark');
  assert.equal(resolveThemeMode('light'), 'light');
  assert.equal(resolveThemeMode(null), 'light');
  assert.equal(resolveThemeMode('invalid'), 'light');
});
