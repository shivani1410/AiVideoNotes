import { Injectable } from '@angular/core';
import * as CryptoJS from 'crypto-js';
 
@Injectable({
  providedIn: 'root'
})
export class EncryptionService {
 
  encryptString(plainText: string, keyStr: string): string {
    const blockSize = 16;
 
    // --- Pad key to 16 bytes manually like Java validateEncryptionKey ---
    let keyUtf8 = CryptoJS.enc.Utf8.parse(keyStr);
    if (keyUtf8.sigBytes < blockSize) {
      const zeroPadding = CryptoJS.lib.WordArray.create(new Uint8Array(blockSize - keyUtf8.sigBytes).fill(0));
      keyUtf8 = keyUtf8.concat(zeroPadding);
    }
 
    // --- Plaintext zero padding to 16 bytes blocks ---
    const textBytes = CryptoJS.enc.Utf8.parse(plainText);
    const padLength = blockSize - (textBytes.sigBytes % blockSize);
    const zeroTextPadding = CryptoJS.lib.WordArray.create(new Uint8Array(padLength).fill(0));
    const paddedText = textBytes.clone().concat(zeroTextPadding);
 
    // --- AES/ECB/NoPadding encryption ---
    const encrypted = CryptoJS.AES.encrypt(paddedText, keyUtf8, {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.NoPadding
    });
 
    // --- Return Base64 string compatible with Java ---
    return CryptoJS.enc.Base64.stringify(encrypted.ciphertext);
  }

  decryptString(encryptedBase64: string, keyStr: string): string {
  const blockSize = 16;

  // --- Pad key manually to 16 bytes (same as Java validateEncryptionKey) ---
  let keyUtf8 = CryptoJS.enc.Utf8.parse(keyStr);
  if (keyUtf8.sigBytes < blockSize) {
    const zeroPadding = CryptoJS.lib.WordArray.create(new Uint8Array(blockSize - keyUtf8.sigBytes).fill(0));
    keyUtf8 = keyUtf8.concat(zeroPadding);
  }

  // --- Decode Base64 cipher text ---
  const cipherBytes = CryptoJS.enc.Base64.parse(encryptedBase64);

  // --- Construct CipherParams properly (fixes TypeScript error) ---
  const cipherParams = CryptoJS.lib.CipherParams.create({
    ciphertext: cipherBytes
  });

  // --- AES Decrypt (ECB, NoPadding) ---
  const decrypted = CryptoJS.AES.decrypt(cipherParams, keyUtf8, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.NoPadding
  });

  // --- Convert decrypted bytes to UTF-8 text ---
  let decryptedText = CryptoJS.enc.Utf8.stringify(decrypted);

  // --- Remove zero padding manually (Java-like logic) ---
  decryptedText = decryptedText.replace(/\0+$/g, '');

  return decryptedText;
}

}