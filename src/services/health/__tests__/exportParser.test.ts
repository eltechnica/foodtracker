import { parseHealthExport } from '../exportParser';

const SAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<HealthData locale="en_US">
 <Record type="HKQuantityTypeIdentifierHeight" sourceName="Health" unit="cm" startDate="2026-06-01 08:00:00 +0000" value="180"/>
 <Record type="HKQuantityTypeIdentifierBodyMass" sourceName="RENPHO" unit="kg" startDate="2026-06-01 07:15:03 +0000" value="85.2"/>
 <Record type="HKQuantityTypeIdentifierBodyMass" sourceName="Renpho Health" unit="lb" startDate="2026-06-08 07:20:00 +0000" value="186.4"/>
 <Record type="HKQuantityTypeIdentifierBodyMass" sourceName="Health" unit="kg" startDate="2026-06-15 07:05:00 -0400" value="83.9">
   <MetadataEntry key="HKWasUserEntered" value="1"/>
 </Record>
 <Record type="HKQuantityTypeIdentifierStepCount" sourceName="iPhone" unit="count" startDate="2026-06-15 09:00:00 +0000" value="1200"/>
</HealthData>`;

describe('parseHealthExport', () => {
  it('extracts only body-mass records', () => {
    const entries = parseHealthExport(SAMPLE_XML);
    expect(entries).toHaveLength(3);
  });

  it('classifies Renpho vs Apple Health by source name', () => {
    const entries = parseHealthExport(SAMPLE_XML);
    expect(entries[0].source).toBe('renpho');
    expect(entries[1].source).toBe('renpho');
    expect(entries[2].source).toBe('apple-health');
  });

  it('converts pounds to kilograms', () => {
    const entries = parseHealthExport(SAMPLE_XML);
    // 186.4 lb * 0.453592 = ~84.5 kg
    expect(entries[1].kg).toBeCloseTo(84.5, 1);
  });

  it('handles both self-closing and wrapped Record elements', () => {
    const entries = parseHealthExport(SAMPLE_XML);
    // The 2026-06-15 record is wrapped (has a child MetadataEntry).
    const wrapped = entries.find((e) => e.at.startsWith('2026-06-15'));
    expect(wrapped).toBeDefined();
    expect(wrapped!.kg).toBe(83.9);
  });

  it('parses Apple date format into ISO-8601 with timezone', () => {
    const entries = parseHealthExport(SAMPLE_XML);
    expect(entries[0].at).toBe('2026-06-01T07:15:03+00:00');
    expect(entries[2].at).toBe('2026-06-15T07:05:00-04:00');
  });

  it('returns an empty array when there are no records', () => {
    expect(parseHealthExport('<HealthData></HealthData>')).toEqual([]);
  });
});
