import { pool } from '../src/core/db.js';

const standards = [
  {
    code: 'AS/NZS 3678', name: 'AS/NZS 3678 (Structural Plates - Australian)',
    grades: {
      '200': { chemistry: { C: '≤0.20%', Mn: '≤1.20%', P: '≤0.040%', S: '≤0.040%', Si: '≤0.55%' }, mechanical: { Yield: '200 MPa (all)', Tensile: '300-430 MPa', Elongation: '25%' } },
      '250': { chemistry: { C: '≤0.22%', Mn: '≤1.60%', P: '≤0.040%', S: '≤0.040%', Si: '≤0.55%', CEV: '≤0.44' }, mechanical: { Yield: '280/260/250/240/230 MPa (≤8/8-12/12-50/50-80/80-150mm)', Tensile: '410 MPa min', Elongation: '22%' } },
      '300': { chemistry: { C: '≤0.22%', Mn: '≤1.60%', P: '≤0.040%', S: '≤0.040%', Si: '≤0.55%', CEV: '≤0.44' }, mechanical: { Yield: '300/280/280/270 MPa (≤8/8-12/12-20/20-32mm)', Tensile: '430-550 MPa', Elongation: '22%' } },
      '350': { chemistry: { C: '≤0.22%', Mn: '≤1.70%', P: '≤0.040%', S: '≤0.040%', Si: '≤0.55%', CEV: '≤0.48' }, mechanical: { Yield: '360/340/340/330/320 MPa (≤8/8-12/12-20/20-50/50-80mm)', Tensile: '450-620 MPa', Elongation: '20%' } },
      '400': { chemistry: { C: '≤0.22%', Mn: '≤1.70%', P: '≤0.040%', S: '≤0.040%', Si: '≤0.55%', CEV: '≤0.48' }, mechanical: { Yield: '400/380/360/360 MPa (≤8/8-12/12-20/20-32mm)', Tensile: '480-620 MPa', Elongation: '20%' } },
      '450': { chemistry: { C: '≤0.20%', Mn: '≤1.70%', P: '≤0.040%', S: '≤0.030%', Si: '≤0.55%', CEV: '≤0.53' }, mechanical: { Yield: '450/420/400 MPa (≤8/8-20/20-50mm)', Tensile: '520-680 MPa', Elongation: '16%' } },
    }
  },
  {
    code: 'ASTM A36', name: 'ASTM A36/A36M (Carbon Structural Steel)',
    grades: { 'A36': { chemistry: { C: '≤0.26%', P: '≤0.04%', S: '≤0.05%', Si: '0.15-0.40%' }, mechanical: { Yield: '250 MPa', Tensile: '400-550 MPa', Elongation: '23% (50mm GL)' } } }
  },
  {
    code: 'ASTM A572', name: 'ASTM A572/A572M (HSLA Structural)',
    grades: {
      '42': { chemistry: { C: '≤0.21%', Mn: '≤1.35%', P: '≤0.04%', S: '≤0.05%', Si: '0.15-0.40%', Nb: '≤0.05%' }, mechanical: { Yield: '290 MPa', Tensile: '415 MPa min', Elongation: '24% (50mm)' } },
      '50': { chemistry: { C: '≤0.23%', Mn: '≤1.35%', P: '≤0.04%', S: '≤0.05%', Si: '0.15-0.40%', Nb: '0.005-0.05%', V: '0.01-0.15%' }, mechanical: { Yield: '345 MPa', Tensile: '450 MPa min', Elongation: '21% (50mm)' } },
      '55': { chemistry: { C: '≤0.23%', Mn: '≤1.35%', P: '≤0.04%', S: '≤0.05%', Si: '0.15-0.40%', V: '0.01-0.15%' }, mechanical: { Yield: '380 MPa', Tensile: '485 MPa min', Elongation: '21% (50mm)' } },
      '60': { chemistry: { C: '≤0.26%', Mn: '≤1.35%', P: '≤0.04%', S: '≤0.05%', Si: '0.15-0.40%', V: '0.01-0.15%' }, mechanical: { Yield: '415 MPa', Tensile: '520 MPa min', Elongation: '18% (50mm)' } },
      '65': { chemistry: { C: '≤0.23%', Mn: '≤1.65%', P: '≤0.04%', S: '≤0.05%', Si: '0.15-0.40%', V: '0.02-0.15%' }, mechanical: { Yield: '450 MPa', Tensile: '550 MPa min', Elongation: '17% (50mm)' } },
    }
  },
  {
    code: 'EN 10025-2', name: 'EN 10025-2 (European Structural Steel)',
    grades: {
      'S235JR': { chemistry: { C: '≤0.17%', Mn: '≤1.40%', P: '≤0.035%', S: '≤0.035%', N: '≤0.012%' }, mechanical: { Yield: '235/225/215 MPa (≤16/16-40/40-63mm)', Tensile: '360-510 MPa', Elongation: '26%', Impact: '27J at +20°C' } },
      'S275JR': { chemistry: { C: '≤0.18%', Mn: '≤1.50%', P: '≤0.035%', S: '≤0.035%', N: '≤0.012%' }, mechanical: { Yield: '275/265/255 MPa (≤16/16-40/40-63mm)', Tensile: '410-560 MPa', Elongation: '23%', Impact: '27J at +20°C' } },
      'S355JR': { chemistry: { C: '≤0.24%', Mn: '≤1.60%', P: '≤0.035%', S: '≤0.035%', Si: '≤0.55%', CEV: '≤0.47' }, mechanical: { Yield: '355/345/335 MPa (≤16/16-40/40-63mm)', Tensile: '470-630 MPa', Elongation: '22%', Impact: '27J at +20°C' } },
      'S355J0': { chemistry: { C: '≤0.20%', Mn: '≤1.60%', P: '≤0.030%', S: '≤0.030%', Si: '≤0.55%', N: '≤0.012%' }, mechanical: { Yield: '355/345/335 MPa (≤16/16-40/40-63mm)', Tensile: '470-630 MPa', Elongation: '22%', Impact: '27J at 0°C' } },
      'S355J2': { chemistry: { C: '≤0.20%', Mn: '≤1.60%', P: '≤0.025%', S: '≤0.025%', Si: '≤0.55%', N: '≤0.012%' }, mechanical: { Yield: '355/345/335 MPa (≤16/16-40/40-63mm)', Tensile: '470-630 MPa', Elongation: '22%', Impact: '27J at -20°C' } },
      'S450J0': { chemistry: { C: '≤0.20%', Mn: '≤1.70%', P: '≤0.030%', S: '≤0.030%', Si: '≤0.55%', N: '≤0.025%' }, mechanical: { Yield: '450/430/410 MPa (≤16/16-40/40-63mm)', Tensile: '550-720 MPa', Elongation: '17%', Impact: '27J at 0°C' } },
    }
  },
  {
    code: 'JIS G 3101', name: 'JIS G 3101 (Japanese Structural Steel)',
    grades: {
      'SS330': { chemistry: { P: 'No specific limits', S: 'No specific limits' }, mechanical: { Yield: '205/195 MPa (≤16/16-40mm)', Tensile: '330-430 MPa', Elongation: '26%' } },
      'SS400': { chemistry: { P: '≤0.050%', S: '≤0.050%' }, mechanical: { Yield: '245/235/215 MPa (≤16/16-40/40-100mm)', Tensile: '400-510 MPa', Elongation: '21%' } },
      'SS490': { chemistry: { P: '≤0.040%', S: '≤0.040%' }, mechanical: { Yield: '285/275/255 MPa (≤16/16-40/40-63mm)', Tensile: '490-610 MPa', Elongation: '19%' } },
      'SS540': { chemistry: { C: '≤0.30%', Mn: '≤1.60%', P: '≤0.040%', S: '≤0.040%', Si: '≤0.55%' }, mechanical: { Yield: '390/380 MPa (≤16/16-40mm)', Tensile: '540 MPa min', Elongation: '17%' } },
    }
  },
  {
    code: 'ASTM A53', name: 'ASTM A53/A53M (Pipe)',
    grades: {
      'Type E Grade A': { chemistry: { C: '≤0.25%', Mn: '≤0.95%', P: '≤0.05%', S: '≤0.045%' }, mechanical: { Yield: '205 MPa', Tensile: '330 MPa' } },
      'Type E Grade B': { chemistry: { C: '≤0.30%', Mn: '≤1.20%', P: '≤0.05%', S: '≤0.045%' }, mechanical: { Yield: '240 MPa', Tensile: '415 MPa' } },
      'Type S Grade A': { chemistry: { C: '≤0.25%', Mn: '≤0.95%', P: '≤0.05%', S: '≤0.045%' }, mechanical: { Yield: '205 MPa', Tensile: '330 MPa' } },
      'Type S Grade B': { chemistry: { C: '≤0.30%', Mn: '≤1.20%', P: '≤0.05%', S: '≤0.045%' }, mechanical: { Yield: '240 MPa', Tensile: '415 MPa' } },
    }
  },
  {
    code: 'ASTM A106', name: 'ASTM A106/A106M (Seamless Pipe)',
    grades: {
      'Grade A': { chemistry: { C: '≤0.25%', Mn: '0.27-0.93%', P: '≤0.035%', S: '≤0.035%', Si: '≥0.10%' }, mechanical: { Yield: '205 MPa', Tensile: '330 MPa', Elongation: '35%' } },
      'Grade B': { chemistry: { C: '≤0.30%', Mn: '0.29-1.06%', P: '≤0.035%', S: '≤0.035%', Si: '≥0.10%' }, mechanical: { Yield: '240 MPa', Tensile: '415 MPa', Elongation: '30%' } },
      'Grade C': { chemistry: { C: '≤0.35%', Mn: '0.29-1.06%', P: '≤0.035%', S: '≤0.035%', Si: '≥0.10%' }, mechanical: { Yield: '275 MPa', Tensile: '485 MPa', Elongation: '20%' } },
    }
  },
  {
    code: 'AS 1163', name: 'AS 1163 (Hollow Sections)',
    grades: {
      'C250': { chemistry: { C: '≤0.22%', Mn: '≤1.60%', P: '≤0.040%', S: '≤0.040%', Si: '≤0.55%', CEV: '≤0.43' }, mechanical: { Yield: '250 MPa', Tensile: '320 MPa', Elongation: '22%' } },
      'C350': { chemistry: { C: '≤0.22%', Mn: '≤1.60%', P: '≤0.040%', S: '≤0.040%', Si: '≤0.55%', CEV: '≤0.45' }, mechanical: { Yield: '350 MPa', Tensile: '430 MPa', Elongation: '18%' } },
      'C450': { chemistry: { C: '≤0.22%', Mn: '≤1.60%', P: '≤0.040%', S: '≤0.040%', Si: '≤0.55%', CEV: '≤0.47' }, mechanical: { Yield: '450 MPa', Tensile: '500 MPa', Elongation: '12%' } },
    }
  },
  {
    code: 'AWS A5.1', name: 'AWS A5.1/A5.1M (SMAW Electrodes)',
    grades: {
      'E6010': { chemistry: { C: '≤0.20%', Mn: '≤0.60%', Si: '≤0.40%', P: '≤0.03%', S: '≤0.03%' }, mechanical: { Yield: '330 MPa', Tensile: '415 MPa', Elongation: '22%', Impact: '27J at -29°C' } },
      'E6013': { chemistry: { C: '≤0.20%', Mn: '≤0.60%', Si: '≤0.40%', P: '≤0.03%', S: '≤0.03%' }, mechanical: { Yield: '330 MPa', Tensile: '415 MPa', Elongation: '17%' } },
      'E7016': { chemistry: { C: '≤0.15%', Mn: '≤1.25%', Si: '≤0.60%', P: '≤0.03%', S: '≤0.03%' }, mechanical: { Yield: '400 MPa', Tensile: '485 MPa', Elongation: '22%', Impact: '27J at -29°C' } },
      'E7018': { chemistry: { C: '≤0.15%', Mn: '≤1.60%', Si: '≤0.75%', P: '≤0.03%', S: '≤0.03%' }, mechanical: { Yield: '400 MPa', Tensile: '485 MPa', Elongation: '22%', Impact: '27J at -29°C' } },
    }
  },
  {
    code: 'AWS A5.18', name: 'AWS A5.18/A5.18M (GMAW Wire)',
    grades: {
      'ER70S-2': { chemistry: { C: '≤0.07%', Mn: '0.90-1.40%', Si: '0.40-0.70%', P: '≤0.025%', S: '≤0.035%' }, mechanical: { Yield: '400 MPa', Tensile: '485 MPa', Elongation: '22%', Impact: '27J at -29°C' } },
      'ER70S-3': { chemistry: { C: '0.06-0.15%', Mn: '0.90-1.40%', Si: '0.45-0.75%', P: '≤0.025%', S: '≤0.035%' }, mechanical: { Yield: '400 MPa', Tensile: '485 MPa', Elongation: '22%' } },
      'ER70S-6': { chemistry: { C: '0.06-0.15%', Mn: '1.40-1.85%', Si: '0.80-1.15%', P: '≤0.025%', S: '≤0.035%' }, mechanical: { Yield: '400 MPa', Tensile: '485 MPa', Elongation: '22%' } },
    }
  },
];

const equivalents = [
  { grade_key: 'A36',              equivalent_grade: 'SS400',           note: 'Based on mechanical & chemical similarity' },
  { grade_key: 'A36',              equivalent_grade: 'S275JR',          note: 'Based on mechanical & chemical similarity' },
  { grade_key: 'SS400',            equivalent_grade: 'A36',             note: 'Based on mechanical & chemical similarity' },
  { grade_key: 'SS400',            equivalent_grade: 'S275JR',          note: 'Based on mechanical & chemical similarity' },
  { grade_key: 'S275JR',           equivalent_grade: 'A36',             note: 'Based on mechanical & chemical similarity' },
  { grade_key: 'S275JR',           equivalent_grade: 'SS400',           note: 'Based on mechanical & chemical similarity' },
  { grade_key: 'Gr.50',            equivalent_grade: 'S355JR',          note: 'Based on mechanical & chemical similarity' },
  { grade_key: 'Gr.50',            equivalent_grade: 'AS/NZS 3678-350', note: 'Based on mechanical & chemical similarity' },
  { grade_key: 'Gr.50',            equivalent_grade: 'SS490',           note: 'Based on mechanical & chemical similarity' },
  { grade_key: 'S355JR',           equivalent_grade: 'Gr.50',           note: 'Based on mechanical & chemical similarity' },
  { grade_key: 'S355JR',           equivalent_grade: 'AS/NZS 3678-350', note: 'Based on mechanical & chemical similarity' },
  { grade_key: 'S355JR',           equivalent_grade: 'SS490',           note: 'Based on mechanical & chemical similarity' },
  { grade_key: 'AS/NZS 3678-350',  equivalent_grade: 'Gr.50',           note: 'Based on mechanical & chemical similarity' },
  { grade_key: 'AS/NZS 3678-350',  equivalent_grade: 'S355JR',          note: 'Based on mechanical & chemical similarity' },
  { grade_key: 'AS/NZS 3678-350',  equivalent_grade: 'SS490',           note: 'Based on mechanical & chemical similarity' },
  { grade_key: 'SS490',            equivalent_grade: 'Gr.50',           note: 'Based on mechanical & chemical similarity' },
  { grade_key: 'SS490',            equivalent_grade: 'S355JR',          note: 'Based on mechanical & chemical similarity' },
  { grade_key: 'SS490',            equivalent_grade: 'AS/NZS 3678-350', note: 'Based on mechanical & chemical similarity' },
  { grade_key: 'S235JR',           equivalent_grade: 'AS/NZS 3678-250', note: 'Based on mechanical & chemical similarity' },
  { grade_key: 'AS/NZS 3678-250',  equivalent_grade: 'S235JR',          note: 'Based on mechanical & chemical similarity' },
  { grade_key: 'S450J0',           equivalent_grade: 'AS/NZS 3678-450', note: 'Based on mechanical & chemical similarity' },
  { grade_key: 'AS/NZS 3678-450',  equivalent_grade: 'S450J0',          note: 'Based on mechanical & chemical similarity' },
  { grade_key: 'Type S Gr.B',      equivalent_grade: 'A106 Gr.B',       note: 'ASTM A53 pipe - equivalent to A106 Grade B' },
  { grade_key: 'A106 Gr.B',        equivalent_grade: 'Type S Gr.B',     note: 'ASTM A53 pipe - equivalent to A106 Grade B' },
  { grade_key: 'E7018',            equivalent_grade: 'ER70S-6',         note: 'SMAW electrode - functional equivalent to ER70S-6' },
  { grade_key: 'ER70S-6',          equivalent_grade: 'E7018',           note: 'GMAW wire - functional equivalent to E7018' },
];

async function main() {
  console.log('Clearing existing data...');
  await pool.query('DELETE FROM qaqc_std_equivalents');
  await pool.query('DELETE FROM qaqc_std_lookup');
  console.log('Existing data cleared.');

  let gradeCount = 0;
  for (const std of standards) {
    for (const [grade, data] of Object.entries(std.grades)) {
      await pool.query(
        `INSERT INTO qaqc_std_lookup (standard_code, standard_name, grade, chemistry, mechanical)
         VALUES ($1, $2, $3, $4, $5)`,
        [std.code, std.name, grade, JSON.stringify(data.chemistry), JSON.stringify(data.mechanical)]
      );
      gradeCount++;
    }
    console.log(`Inserted standard: ${std.code} (${Object.keys(std.grades).length} grades)`);
  }
  console.log(`Total grades inserted: ${gradeCount}`);

  for (const eq of equivalents) {
    await pool.query(
      `INSERT INTO qaqc_std_equivalents (grade_key, equivalent_grade, note)
       VALUES ($1, $2, $3)`,
      [eq.grade_key, eq.equivalent_grade, eq.note]
    );
  }
  console.log(`Equivalents inserted: ${equivalents.length}`);

  console.log('Import complete.');
  await pool.end();
}

main().catch((err) => {
  console.error('Import failed:', err);
  pool.end();
  process.exit(1);
});
