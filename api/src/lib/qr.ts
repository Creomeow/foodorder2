import QRCode from 'qrcode';
import { env } from '../config/env.js';

/** The customer-facing ordering URL encoded in a table's QR code. */
export function tableUrl(qrToken: string): string {
  return `${env.customerUrl}/table/${qrToken}`;
}

export function qrDataUrl(qrToken: string): Promise<string> {
  return QRCode.toDataURL(tableUrl(qrToken), { width: 512, margin: 1 });
}

export function qrSvg(qrToken: string): Promise<string> {
  return QRCode.toString(tableUrl(qrToken), { type: 'svg', width: 512, margin: 1 });
}
