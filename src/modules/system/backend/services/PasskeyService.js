import crypto from 'node:crypto';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { mfaRepo } from '../repositories/MFARepository.js';
import { SettingsService } from '../../../../core/settings.js';
import { AppError } from '../../../../core/errors.js';

const RP_ID = process.env.WEBAUTHN_RP_ID || 'localhost';
const RP_NAME = process.env.WEBAUTHN_RP_NAME || 'IBSHI QAQC';
const ORIGIN = process.env.WEBAUTHN_ORIGIN || `http://localhost:${process.env.PORT || 3000}`;

// In-memory challenge store (TTL 5 min)
const challengeStore = new Map();

function encryptConfig(obj) {
  return SettingsService._encrypt(JSON.stringify(obj));
}

function decryptConfig(text) {
  return JSON.parse(SettingsService._decrypt(text));
}

function storeChallenge(key, challenge) {
  challengeStore.set(key, { challenge, expires: Date.now() + 5 * 60 * 1000 });
  // Prune expired
  for (const [k, v] of challengeStore) {
    if (v.expires < Date.now()) challengeStore.delete(k);
  }
}

function popChallenge(key) {
  const entry = challengeStore.get(key);
  if (!entry) return null;
  challengeStore.delete(key);
  return Date.now() <= entry.expires ? entry.challenge : null;
}

export class PasskeyService {
  // ── Enrollment ───────────────────────────────────────────────────

  static async registrationOptions(userId, userName) {
    const existingFactors = await mfaRepo.getActiveFactors(userId);
    const excludeCredentials = existingFactors
      .filter(f => f.factor_type === 'passkey')
      .map(f => {
        try {
          const cfg = decryptConfig(f.config);
          return { id: cfg.credentialID, type: 'public-key', transports: cfg.transports ?? [] };
        } catch { return null; }
      })
      .filter(Boolean);

    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: RP_ID,
      userID: new TextEncoder().encode(String(userId)),
      userName,
      attestationType: 'none',
      excludeCredentials,
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });

    storeChallenge(`reg-${userId}`, options.challenge);
    return options;
  }

  static async verifyRegistration(userId, factorName, response) {
    const expectedChallenge = popChallenge(`reg-${userId}`);
    if (!expectedChallenge) throw new AppError(400, 'Challenge đã hết hạn, vui lòng thử lại');

    const { verified, registrationInfo } = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
    });

    if (!verified) throw new AppError(400, 'Passkey không hợp lệ');

    const { credential } = registrationInfo;
    const config = encryptConfig({
      credentialID: credential.id,
      credentialPublicKey: Buffer.from(credential.publicKey).toString('base64'),
      counter: credential.counter,
      transports: response.response?.transports ?? [],
    });

    const factor = await mfaRepo.createFactor({
      userId,
      factorType: 'passkey',
      factorName,
      config,
      useAsLogin: true,
    });

    await mfaRepo.activateFactor(factor.id, userId);
    return { factorId: factor.id };
  }

  // ── Login ────────────────────────────────────────────────────────

  static async authenticationOptions() {
    const challengeKey = crypto.randomUUID();
    const options = await generateAuthenticationOptions({
      rpID: RP_ID,
      userVerification: 'preferred',
      // No allowCredentials → discoverable / resident-key flow
    });

    storeChallenge(`auth-${challengeKey}`, options.challenge);
    return { options, challengeKey };
  }

  static async verifyAuthentication(response, challengeKey) {
    const expectedChallenge = popChallenge(`auth-${challengeKey}`);
    if (!expectedChallenge) throw new AppError(400, 'Challenge đã hết hạn, vui lòng thử lại');

    const credentialID = response.id;
    const allPasskeyFactors = await mfaRepo.getActivePasskeyFactors();

    let matchedFactor = null;
    let cfg = null;

    for (const factor of allPasskeyFactors) {
      try {
        const decoded = decryptConfig(factor.config);
        if (decoded.credentialID === credentialID) {
          matchedFactor = factor;
          cfg = decoded;
          break;
        }
      } catch { /* skip corrupted config */ }
    }

    if (!matchedFactor) throw new AppError(401, 'Passkey không được nhận dạng');

    const credentialPublicKey = Buffer.from(cfg.credentialPublicKey, 'base64');

    const { verified, authenticationInfo } = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      credential: {
        id: cfg.credentialID,
        publicKey: credentialPublicKey,
        counter: cfg.counter,
        transports: cfg.transports,
      },
    });

    if (!verified) throw new AppError(401, 'Passkey xác thực thất bại');

    cfg.counter = authenticationInfo.newCounter;
    await mfaRepo.updateFactorConfig(matchedFactor.id, matchedFactor.user_id, encryptConfig(cfg));
    await mfaRepo.updateLastUsed(matchedFactor.id);

    return { userId: matchedFactor.user_id };
  }
}
