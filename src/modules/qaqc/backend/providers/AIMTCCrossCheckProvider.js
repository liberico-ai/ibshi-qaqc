import { GoogleGenerativeAI } from '@google/generative-ai';
import { MIRCrossCheckService } from '../services/MIRCrossCheckService.js';
import { materialCertRepo } from '../repositories/MaterialCertRepository.js';
import { pool } from '../../../../core/db.js';
import { AppError } from '../../../../core/errors.js';
import { createLogger } from '../../../../core/logger.js';

const log = createLogger('ai-mtc-crosscheck');

export class AIMTCCrossCheckProvider {
  constructor(config = {}) {
    this.mode   = config.mode ?? 'rule-based';
    // Ưu tiên key từ config, fallback biến môi trường GEMINI_API_KEY.
    this.apiKey = config.api_key ?? process.env.GEMINI_API_KEY ?? null;
    this.model  = config.model ?? process.env.GEMINI_MODEL ?? 'gemini-1.5-flash';
  }

  /**
   * Đối chiếu MTC với yêu cầu tiêu chuẩn.
   * - mode !== 'gemini' (mặc định) HOẶC thiếu API key → đi đường rule-based.
   * - mode === 'gemini' → gọi Gemini; mọi lỗi/thiếu key đều fallback rule-based.
   * Trả về cấu trúc { verdict, mismatches[], confidence, citations } khi dùng Gemini,
   * hoặc cấu trúc rule-based (results/summary/ok) khi fallback.
   */
  async crossCheck(mtcId, standardId) {
    if (this.mode !== 'gemini' || !this.apiKey) {
      return MIRCrossCheckService.crossCheck(mtcId, standardId);
    }

    try {
      return await this._geminiCrossCheck(mtcId, standardId);
    } catch (err) {
      log.warn({ err: err.message, mtcId }, 'Gemini cross-check failed — fallback rule-based');
      return MIRCrossCheckService.crossCheck(mtcId, standardId);
    }
  }

  async _geminiCrossCheck(mtcId, standardId) {
    const cert = await materialCertRepo.findById(mtcId);
    if (!cert) throw new AppError(404, 'MTC not found');

    const stdId = standardId ?? cert.standard_id;
    if (!stdId) throw new AppError(400, 'No standard_id associated with this MTC');

    const [chemSpecs, mechSpecs, std] = await Promise.all([
      pool.query('SELECT element, min_val, max_val, unit FROM qaqc_chemical_specs WHERE standard_id=$1', [stdId]),
      pool.query('SELECT property, min_val, max_val, unit FROM qaqc_mechanical_specs WHERE standard_id=$1', [stdId]),
      pool.query('SELECT * FROM qaqc_standards WHERE id=$1', [stdId]),
    ]);

    const requirements = {
      standard: std.rows[0] ? (std.rows[0].code ?? std.rows[0].name ?? String(stdId)) : String(stdId),
      grade: cert.grade ?? null,
      chemical: chemSpecs.rows,
      mechanical: mechSpecs.rows,
    };
    const mtcValues = cert.ocr_extracted ?? {};

    const prompt = [
      'Bạn là kỹ sư QA/QC vật liệu. Hãy đối chiếu các giá trị đo trên Material Test Certificate (MTC)',
      'với yêu cầu của tiêu chuẩn và xác định sự phù hợp (conformance).',
      'Chỉ trả về JSON hợp lệ, KHÔNG kèm giải thích, KHÔNG markdown, theo đúng schema:',
      '{ "verdict": "PASS" | "FAIL" | "REVIEW", "mismatches": [ { "category": string, "property": string, "actual": number|string|null, "required": string, "severity": "FAIL"|"WARN"|"MISSING" } ], "confidence": number (0..1), "citations": [ string ] }',
      '',
      'YÊU CẦU TIÊU CHUẨN (JSON):',
      JSON.stringify(requirements),
      '',
      'GIÁ TRỊ TRÊN MTC (JSON):',
      JSON.stringify(mtcValues),
    ].join('\n');

    const genAI = new GoogleGenerativeAI(this.apiKey);
    const model = genAI.getGenerativeModel({
      model: this.model,
      generationConfig: { responseMimeType: 'application/json', temperature: 0 },
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = this._parseJson(text);

    // Chuẩn hoá kết quả về schema hợp đồng.
    const verdict = ['PASS', 'FAIL', 'REVIEW'].includes(parsed.verdict) ? parsed.verdict : 'REVIEW';
    const mismatches = Array.isArray(parsed.mismatches) ? parsed.mismatches : [];
    let confidence = Number(parsed.confidence);
    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) confidence = 0.5;
    const citations = Array.isArray(parsed.citations) ? parsed.citations : [];

    return {
      mode: 'gemini',
      verdict,
      mismatches,
      confidence,
      citations,
      ok: verdict === 'PASS',
    };
  }

  _parseJson(text) {
    if (!text) throw new Error('Empty Gemini response');
    try {
      return JSON.parse(text);
    } catch {
      // Cố gắng trích khối JSON đầu tiên nếu mô hình bọc thêm ký tự thừa.
      const match = text.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]);
      throw new Error('Gemini response is not valid JSON');
    }
  }

  async healthCheck() {
    const keyState = this.apiKey ? 'key set' : 'no key';
    return { message: `AI-2 MTC Cross-Check [${this.mode}] (${keyState}) OK` };
  }
}
