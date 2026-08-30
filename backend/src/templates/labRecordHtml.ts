import { env } from '../config/env.js';
import {
  BANNER,
  COLUMNS,
  COURSE_TITLE,
  FOOTER,
  PAGE,
  QR,
  SUBTITLE,
  TABLE,
  buildCourseTitleLine,
  formatTableDate,
  padExpNo,
} from './documentSpec.js';

export interface LabRecordExperiment {
  experimentNo: number;
  experimentName: string;
  experimentDate: Date | string;
  githubLink: string;
  qrImage?: string;
  qrShortId?: string;
}

export interface LabRecordData {
  subjectCode: string;
  subjectCodeAlt?: string;
  subjectName: string;
  studentName: string;
  registerNumber: string;
  experiments: LabRecordExperiment[];
  bannerDataUrl?: string;
  bannerUrl?: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getBannerSrc(data: LabRecordData): string {
  if (data.bannerDataUrl) return data.bannerDataUrl;
  if (data.bannerUrl) return data.bannerUrl;
  return `${env.appUrl}/assets/college-banner.png`;
}

export function getLabRecordStyles(): string {
  const colTotal =
    COLUMNS.exp +
    COLUMNS.date +
    COLUMNS.name +
    COLUMNS.qr +
    COLUMNS.mark +
    COLUMNS.signature;

  return `
    @page {
      size: A4 portrait;
      margin: ${PAGE.marginTopIn}in ${PAGE.marginRightIn}in ${PAGE.marginBottomIn}in ${PAGE.marginLeftIn}in;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      background: #fff;
      color: #000;
      font-family: 'Times New Roman', Times, serif;
    }
    .lab-doc {
      width: 100%;
      max-width: ${colTotal}in;
      margin: 0 auto;
      background: #fff;
    }
    .banner {
      display: block;
      width: ${BANNER.widthIn}in;
      height: ${BANNER.heightIn}in;
      object-fit: contain;
      margin: 0 auto ${BANNER.marginBottomIn}in;
    }
    .course-title {
      font-family: 'Times New Roman', Times, serif;
      font-size: ${COURSE_TITLE.sizePt}pt;
      font-weight: bold;
      text-align: center;
      margin-top: ${COURSE_TITLE.spacingTopIn}in;
      margin-bottom: ${COURSE_TITLE.spacingBottomIn}in;
      line-height: 1.2;
    }
    .subtitle {
      font-family: 'Times New Roman', Times, serif;
      font-size: ${SUBTITLE.sizePt}pt;
      font-weight: bold;
      text-align: center;
      margin-bottom: ${SUBTITLE.spacingBottomIn}in;
    }
    table.lab-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      margin: 0 auto;
      border: 1px solid #000;
    }
    table.lab-table th,
    table.lab-table td {
      border: 1px solid #000 !important;
      vertical-align: top;
      padding: ${TABLE.cellPaddingIn}in;
      word-wrap: break-word;
      overflow-wrap: anywhere;
    }
    table.lab-table th {
      font-size: ${TABLE.headerFontPt}pt;
      font-weight: bold;
      text-align: center;
      vertical-align: middle;
      height: ${TABLE.headerHeightIn}in;
    }
    table.lab-table tbody tr {
      min-height: ${TABLE.bodyMinHeightIn}in;
    }
    table.lab-table tbody td {
      font-size: ${TABLE.bodyFontPt}pt;
    }
    col.col-exp { width: ${COLUMNS.exp}in; }
    col.col-date { width: ${COLUMNS.date}in; }
    col.col-name { width: ${COLUMNS.name}in; }
    col.col-qr { width: ${COLUMNS.qr}in; }
    col.col-mark { width: ${COLUMNS.mark}in; }
    col.col-sig { width: ${COLUMNS.signature}in; }
    .cell-exp {
      text-align: center;
      vertical-align: middle;
    }
    .cell-date {
      vertical-align: top;
      font-size: ${TABLE.dateFontPt}pt !important;
      white-space: nowrap !important;
      text-align: center;
    }
    .cell-name .exp-title {
      margin-bottom: 0.08in;
      font-size: ${TABLE.bodyFontPt}pt;
      font-weight: normal;
    }
    .cell-name a {
      color: #0563c1;
      text-decoration: underline;
      font-size: ${TABLE.linkFontPt}pt;
      word-break: break-all;
      line-height: 1.25;
    }
    .cell-qr {
      text-align: center;
      vertical-align: middle;
    }
    .cell-qr img {
      width: ${QR.sizeIn}in;
      height: ${QR.sizeIn}in;
      display: block;
      margin: 0 auto;
    }
    .cell-mark, .cell-sig { min-height: ${TABLE.bodyMinHeightIn}in; }
    .footer-declaration {
      font-size: ${FOOTER.fontPt}pt;
      margin-top: ${FOOTER.spacingTopIn}in;
      line-height: 1.35;
    }
    .footer-details {
      margin-top: 0.28in;
      font-size: ${FOOTER.fontPt}pt;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.22in 0.2in;
    }
    .footer-details .reg, .footer-details .sig {
      text-align: right;
    }
  `;
}

export function buildLabRecordHtml(data: LabRecordData, options?: { embedStyles?: boolean }): string {
  const courseTitle = buildCourseTitleLine(
    data.subjectCode,
    data.subjectName,
    data.subjectCodeAlt
  );
  const bannerSrc = getBannerSrc(data);

  const rows = data.experiments
    .map((exp) => {
      const qrImg = exp.qrImage || (exp.qrShortId ? `/uploads/qr/${exp.qrShortId}.png` : '');
      const qrSrc = qrImg
        ? qrImg.startsWith('http') || qrImg.startsWith('data:')
          ? qrImg
          : `${env.appUrl}${qrImg}`
        : '';
      return `
      <tr>
        <td class="cell-exp">${padExpNo(exp.experimentNo)}</td>
        <td class="cell-date">${exp.experimentDate ? formatTableDate(exp.experimentDate) : ''}</td>
        <td class="cell-name">
          <div class="exp-title">${escapeHtml(exp.experimentName)}</div>
          <a href="${escapeHtml(exp.githubLink)}">${escapeHtml(exp.githubLink)}</a>
        </td>
        <td class="cell-qr">${qrSrc ? `<img src="${escapeHtml(qrSrc)}" alt="QR" />` : ''}</td>
        <td class="cell-mark"></td>
        <td class="cell-sig"></td>
      </tr>`;
    })
    .join('');

  const styles = options?.embedStyles !== false ? `<style>${getLabRecordStyles()}</style>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  ${styles}
</head>
<body>
  <div class="lab-doc">
    <img class="banner" src="${escapeHtml(bannerSrc)}" alt="College banner" />
    <p class="course-title">${escapeHtml(courseTitle)}</p>
    <p class="subtitle">${escapeHtml(SUBTITLE.text)}</p>
    <table class="lab-table">
      <colgroup>
        <col class="col-exp" />
        <col class="col-date" />
        <col class="col-name" />
        <col class="col-qr" />
        <col class="col-mark" />
        <col class="col-sig" />
      </colgroup>
      <thead>
        <tr>
          <th>Exp</th>
          <th>Date</th>
          <th>Name of The Experiment</th>
          <th>QR Code</th>
          <th>Mark</th>
          <th>Signature</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p class="footer-declaration">${escapeHtml(FOOTER.declaration)}</p>
    <div class="footer-details">
      <div class="name">Name : ${escapeHtml(data.studentName)}</div>
      <div class="reg">Register Number : ${escapeHtml(data.registerNumber)}</div>
      <div class="date">Date :</div>
      <div class="sig">Learner's Signature</div>
    </div>
  </div>
</body>
</html>`;
}