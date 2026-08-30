import path from 'path';
import fs from 'fs/promises';
import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import QRCode from 'qrcode';
import {
  LabRecordDocument,
  type LabRecordDocProps,
  type LabRecordDocExperiment,
} from '../templates/LabRecordDocument.js';
import { buildLabRecordDocx } from './docxBuilder.js';
import { env } from '../config/env.js';
import { getStorageService } from './storage/index.js';

export interface ExportExperiment {
  experimentNo: number;
  experimentName: string;
  experimentDate: Date | string;
  githubLink: string;
  qrImage?: string;
  qrShortId?: string;
}

export interface ExportData {
  subjectCode: string;
  subjectCodeAlt?: string;
  subjectName: string;
  studentName: string;
  registerNumber: string;
  experiments: ExportExperiment[];
  bannerDataUrl?: string;
  bannerUrl?: string;
}

async function prepareDocProps(data: ExportData): Promise<LabRecordDocProps> {
  let bannerDataUrl = data.bannerDataUrl;
  if (!bannerDataUrl) {
    const bannerPath = path.join(process.cwd(), 'assets', 'college-banner.png');
    try {
      const bannerBuf = await fs.readFile(bannerPath);
      bannerDataUrl = `data:image/png;base64,${bannerBuf.toString('base64')}`;
    } catch {}
  }

  const enrichedExperiments: LabRecordDocExperiment[] = await Promise.all(
    data.experiments.map(async (exp) => {
      let qrDataUrl = '';
      if (exp.qrShortId) {
        const redirectUrl = `${env.appUrl}/r/${exp.qrShortId}`;
        qrDataUrl = await QRCode.toDataURL(redirectUrl, {
          width: 256,
          margin: 1,
          errorCorrectionLevel: 'H',
        });
      } else if (exp.qrImage && exp.qrImage.startsWith('data:image')) {
        qrDataUrl = exp.qrImage;
      } else if (exp.qrImage && exp.qrImage.startsWith('http')) {
        // If it's a remote URL, render QR dynamically from short code / link
        const target = exp.qrShortId ? `${env.appUrl}/r/${exp.qrShortId}` : exp.githubLink;
        if (target) {
          qrDataUrl = await QRCode.toDataURL(target, {
            width: 256,
            margin: 1,
            errorCorrectionLevel: 'H',
          });
        }
      } else if (exp.qrImage) {
        const localPath = path.join(process.cwd(), exp.qrImage.replace(/^\//, ''));
        try {
          const fileBuf = await fs.readFile(localPath);
          qrDataUrl = `data:image/png;base64,${fileBuf.toString('base64')}`;
        } catch {
          if (exp.githubLink) {
            qrDataUrl = await QRCode.toDataURL(exp.githubLink, {
              width: 256,
              margin: 1,
              errorCorrectionLevel: 'H',
            });
          }
        }
      } else if (exp.githubLink) {
        qrDataUrl = await QRCode.toDataURL(exp.githubLink, {
          width: 256,
          margin: 1,
          errorCorrectionLevel: 'H',
        });
      }

      return {
        experimentNo: exp.experimentNo,
        experimentName: exp.experimentName,
        experimentDate: exp.experimentDate,
        githubLink: exp.githubLink,
        qrShortId: exp.qrShortId,
        qrImage: exp.qrImage,
        qrDataUrl,
      };
    })
  );

  return {
    subjectCode: data.subjectCode,
    subjectCodeAlt: data.subjectCodeAlt,
    subjectName: data.subjectName,
    studentName: data.studentName,
    registerNumber: data.registerNumber,
    experiments: enrichedExperiments,
    bannerDataUrl,
    bannerUrl: data.bannerUrl,
  };
}

export async function generatePdfBuffer(data: ExportData): Promise<Buffer> {
  const docProps = await prepareDocProps(data);
  const element = React.createElement(LabRecordDocument, { data: docProps });
  const buffer = await renderToBuffer(element as any);
  return Buffer.from(buffer);
}

export async function exportPdf(data: ExportData, fileName: string): Promise<string> {
  const storageService = getStorageService();
  const buffer = await generatePdfBuffer(data);
  const key = `exports/${fileName}.pdf`;
  return await storageService.upload(key, buffer, 'application/pdf');
}

export async function exportDocx(data: ExportData, fileName: string): Promise<string> {
  const storageService = getStorageService();
  const buffer = await buildLabRecordDocx(data as any);
  const key = `exports/${fileName}.docx`;
  return await storageService.upload(
    key,
    buffer,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  );
}
