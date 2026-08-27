import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  Image,
  Link,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';
import path from 'path';
import { padExpNo, formatTableDate, buildCourseTitleLine } from './documentSpec.js';

// Disable default hyphenation dictionary loading in Node ESM
Font.registerHyphenationCallback((word) => [word]);

export interface LabRecordDocExperiment {
  experimentNo: number;
  experimentName: string;
  experimentDate: Date | string;
  githubLink: string;
  qrImage?: string;
  qrShortId?: string;
  qrDataUrl?: string;
}

export interface LabRecordDocProps {
  subjectCode: string;
  subjectCodeAlt?: string;
  subjectName: string;
  studentName: string;
  registerNumber: string;
  experiments: LabRecordDocExperiment[];
  bannerDataUrl?: string;
  bannerUrl?: string;
  bannerPath?: string;
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 24,
    paddingBottom: 24,
    paddingLeft: 32,
    paddingRight: 32,
    fontFamily: 'Times-Roman',
    fontSize: 10,
    color: '#000000',
    backgroundColor: '#ffffff',
  },
  banner: {
    width: '100%',
    height: 80,
    objectFit: 'contain',
    marginBottom: 8,
  },
  courseTitle: {
    fontFamily: 'Times-Bold',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 4,
    lineHeight: 1.2,
  },
  subtitle: {
    fontFamily: 'Times-Bold',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 10,
  },
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#000000',
    marginBottom: 12,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    minHeight: 24,
    alignItems: 'stretch',
  },
  tableRowLast: {
    flexDirection: 'row',
    minHeight: 24,
    alignItems: 'stretch',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    minHeight: 24,
    alignItems: 'center',
  },
  colExp: {
    width: '9%',
    borderRightWidth: 1,
    borderRightColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 3,
  },
  colDate: {
    width: '15%',
    borderRightWidth: 1,
    borderRightColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 3,
  },
  colName: {
    width: '42%',
    borderRightWidth: 1,
    borderRightColor: '#000000',
    justifyContent: 'center',
    padding: 4,
  },
  colQr: {
    width: '16%',
    borderRightWidth: 1,
    borderRightColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 3,
  },
  colMark: {
    width: '9%',
    borderRightWidth: 1,
    borderRightColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 3,
  },
  colSig: {
    width: '9%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 3,
  },
  headerText: {
    fontFamily: 'Times-Bold',
    fontSize: 9.5,
    textAlign: 'center',
  },
  cellText: {
    fontSize: 9.5,
    textAlign: 'center',
  },
  expTitleText: {
    fontFamily: 'Times-Bold',
    fontSize: 9.5,
    marginBottom: 3,
  },
  linkText: {
    fontSize: 8,
    color: '#0563c1',
    textDecoration: 'underline',
    lineHeight: 1.15,
  },
  qrImage: {
    width: 48,
    height: 48,
    objectFit: 'contain',
  },
  qrPlaceholderText: {
    fontSize: 8,
    color: '#666666',
    textAlign: 'center',
  },
  footerDeclaration: {
    fontSize: 9.5,
    fontFamily: 'Times-Italic',
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 1.25,
  },
  footerGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  footerItemLeft: {
    width: '38%',
  },
  footerItemCenter: {
    width: '34%',
    textAlign: 'center',
  },
  footerItemRight: {
    width: '28%',
    textAlign: 'right',
  },
  footerText: {
    fontSize: 9.5,
    fontFamily: 'Times-Roman',
  },
  footerDateRow: {
    marginTop: 8,
  },
});

export const LabRecordDocument: React.FC<{ data: LabRecordDocProps }> = ({ data }) => {
  const courseTitle = buildCourseTitleLine(
    data.subjectCode,
    data.subjectName,
    data.subjectCodeAlt
  );

  const bannerSrc =
    data.bannerDataUrl ||
    data.bannerPath ||
    data.bannerUrl ||
    path.join(process.cwd(), 'assets', 'college-banner.png');

  return (
    <Document title={courseTitle} author={data.studentName || 'Student'} subject="Lab Record">
      <Page size="A4" style={styles.page}>
        {/* Banner */}
        <Image src={bannerSrc} style={styles.banner} />

        {/* Course Title & Subtitle */}
        <Text style={styles.courseTitle}>{courseTitle}</Text>
        <Text style={styles.subtitle}>Table of content</Text>

        {/* Table */}
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeaderRow}>
            <View style={styles.colExp}>
              <Text style={styles.headerText}>Exp</Text>
            </View>
            <View style={styles.colDate}>
              <Text style={styles.headerText}>Date</Text>
            </View>
            <View style={styles.colName}>
              <Text style={[styles.headerText, { textAlign: 'left', paddingLeft: 2 }]}>
                Name of The Experiment
              </Text>
            </View>
            <View style={styles.colQr}>
              <Text style={styles.headerText}>QR Code</Text>
            </View>
            <View style={styles.colMark}>
              <Text style={styles.headerText}>Mark</Text>
            </View>
            <View style={styles.colSig}>
              <Text style={styles.headerText}>Signature</Text>
            </View>
          </View>

          {/* Table Body */}
          {data.experiments.map((exp, idx) => {
            const isLast = idx === data.experiments.length - 1;
            const rowStyle = isLast ? styles.tableRowLast : styles.tableRow;
            const expDate =
              typeof exp.experimentDate === 'string'
                ? new Date(exp.experimentDate)
                : exp.experimentDate;

            const qrSrc = exp.qrDataUrl || exp.qrImage;

            return (
              <View key={exp.experimentNo || idx} style={rowStyle} wrap={false}>
                <View style={styles.colExp}>
                  <Text style={styles.cellText}>{padExpNo(exp.experimentNo)}</Text>
                </View>
                <View style={styles.colDate}>
                  <Text style={styles.cellText}>{formatTableDate(expDate)}</Text>
                </View>
                <View style={styles.colName}>
                  <Text style={styles.expTitleText}>{exp.experimentName}</Text>
                  {exp.githubLink ? (
                    <Link src={exp.githubLink}>
                      <Text style={styles.linkText}>{exp.githubLink}</Text>
                    </Link>
                  ) : null}
                </View>
                <View style={styles.colQr}>
                  {qrSrc ? (
                    <Image src={qrSrc} style={styles.qrImage} />
                  ) : (
                    <Text style={styles.qrPlaceholderText}>QR</Text>
                  )}
                </View>
                <View style={styles.colMark}>
                  <Text style={styles.cellText}></Text>
                </View>
                <View style={styles.colSig}>
                  <Text style={styles.cellText}></Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Footer Declaration */}
        <Text style={styles.footerDeclaration}>
          I confirm that the experiments and GitHub links provided are entirely my own work.
        </Text>

        {/* Footer Details */}
        <View style={styles.footerGrid}>
          <View style={styles.footerItemLeft}>
            <Text style={styles.footerText}>Name : {data.studentName || ''}</Text>
          </View>
          <View style={styles.footerItemCenter}>
            <Text style={styles.footerText}>Register Number : {data.registerNumber || ''}</Text>
          </View>
          <View style={styles.footerItemRight}>
            <Text style={styles.footerText}>Learner's Signature</Text>
          </View>
        </View>

        <View style={styles.footerDateRow}>
          <Text style={styles.footerText}>Date :</Text>
        </View>
      </Page>
    </Document>
  );
};

export default LabRecordDocument;
