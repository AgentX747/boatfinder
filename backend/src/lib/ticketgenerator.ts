 import crypto from 'crypto';

export function generateTicketCode() {
  let digits = '';
  for (let i = 0; i < 12; i++) {
    digits += crypto.randomInt(0, 10);
  }
  return 'BF' + digits;
}
