import { jsPDF } from 'jspdf'
import { Document, Packer, Paragraph, Table, TableRow, TableCell, BorderStyle, WidthType, TextRun, AlignmentType, VerticalAlign, ImageRun, TabStopType, TableLayoutType } from 'docx'
import { saveAs } from 'file-saver'
import QRCode from 'qrcode'

interface Experiment {
  id: string
  title: string
  date: string
  githubLink: string
}

async function loadCollegeLogo(): Promise<Uint8Array | null> {
  try {
    const response = await fetch('/images/college-logo.png')
    if (!response.ok) return null
    const buffer = await response.arrayBuffer()
    return new Uint8Array(buffer)
  } catch (error) {
    console.error('[v0] DOCX logo loading error:', error)
    return null
  }
}

function createDeclarationBlock(studentName: string, registerNumber: string) {
  const columnTabs = [
    { type: TabStopType.LEFT, position: 0 },
    { type: TabStopType.LEFT, position: 7000 }
  ]

  return [
    new Paragraph({
      children: [
        new TextRun({ text: `Name : ${studentName}`, size: 24, font: 'Times New Roman' }),
        new TextRun({ text: '\t' }),
        new TextRun({ text: `Register Number : ${registerNumber}`, size: 24, font: 'Times New Roman' })
      ],
      tabStops: columnTabs
    }),
    new Paragraph({
      children: [new TextRun({ text: '' })]
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Date :', size: 24, font: 'Times New Roman' }),
        new TextRun({ text: '\t' }),
        new TextRun({ text: 'Learner\'s Signature', size: 24, font: 'Times New Roman' })
      ],
      tabStops: columnTabs
    })
  ]
}

interface DocumentData {
  courseTitle: string
  studentName: string
  registerNumber: string
  experiments: Experiment[]
}

function dataURLToUint8Array(dataURL: string): Uint8Array {
  const base64 = dataURL.split(',')[1]
  if (!base64) return new Uint8Array()
  if (typeof window === 'undefined') {
    return Uint8Array.from(Buffer.from(base64, 'base64'))
  }
  const binaryString = atob(base64)
  const len = binaryString.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes
}

function formatDateDisplay(dateString: string): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return dateString
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

async function generateQRCode(url: string): Promise<string> {
  try {
    return await QRCode.toDataURL(url, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 150,
      margin: 1,
      color: { dark: '#000000', light: '#FFFFFF' }
    })
  } catch (error) {
    console.error('[v0] QR Code generation error:', error)
    return ''
  }
}

export async function generatePDF(data: DocumentData, returnBlobOnly = false): Promise<Blob | void> {
  const { courseTitle, studentName, registerNumber, experiments } = data
  
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  pdf.setFont('times')
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const MARGINS = {
    top: 4,
    right: 10,
    bottom: 4,
    left: 10
  }

  try {
    const logoWidth = 190
    const logoHeight = 44
    pdf.addImage('/images/college-logo.png', 'PNG', (pageWidth - logoWidth) / 2, 8, logoWidth, logoHeight)
  } catch (error) {
    console.error('[v0] Logo loading error:', error)
  }
  
  const contentStartY = Math.max(MARGINS.top + 30, 64)
  let yPos = contentStartY

  pdf.setFontSize(18)
  pdf.setFont('times', 'bold')
  pdf.text(courseTitle, pdf.internal.pageSize.getWidth() / 2, yPos, { align: 'center' })
  yPos += 10

  pdf.setFontSize(16)
  pdf.text('Table of content', pdf.internal.pageSize.getWidth() / 2, yPos, { align: 'center' })
  yPos += 8

  const headerCellHeight = 10
  const BASE_ROW_HEIGHT = 25
  const colWidths = [17, 24, 78, 25, 17, 22]
  const cellPaddingX = 2
  const cellPaddingY = 3
  const LINK_SPACING = 2
  const usableWidth = pageWidth - MARGINS.left - MARGINS.right
  const totalTableWidth = colWidths.reduce((a, b) => a + b, 0)
  const tableStartX = MARGINS.left + Math.max(0, (usableWidth - totalTableWidth) / 2)
  const declarationLeftX = tableStartX
  const declarationRightX = tableStartX + 60
  
  pdf.setFont('times', 'bold')
  pdf.setFontSize(12)
  
  let xPos = tableStartX
  const headers = ['Exp', 'Date', 'Name of The Experiment', 'QR Code', 'Mark', 'Signature']
  
  headers.forEach((header, i) => {
    pdf.rect(xPos, yPos, colWidths[i], headerCellHeight)
    pdf.text(header, xPos + colWidths[i] / 2, yPos + headerCellHeight / 2 + 1, { 
      align: 'center',
      maxWidth: colWidths[i] - 2
    })
    xPos += colWidths[i]
  })
  
  yPos += headerCellHeight
  pdf.setFont('times', 'normal')
  const DEFAULT_FONT_SIZE = 12
  const LINK_FONT_SIZE = 12
  pdf.setFontSize(DEFAULT_FONT_SIZE)

  for (let index = 0; index < experiments.length; index++) {
    const exp = experiments[index]
    
    const textMaxWidth = colWidths[2] - cellPaddingX * 2
    pdf.setFontSize(DEFAULT_FONT_SIZE)
    pdf.setTextColor('#000000')
    const titleLines = pdf.splitTextToSize(exp.title, textMaxWidth)
    const linkLines = exp.githubLink ? pdf.splitTextToSize(exp.githubLink, textMaxWidth) : []
    const titleDimensions = pdf.getTextDimensions(titleLines, { maxWidth: textMaxWidth })
    const linkDimensions = linkLines.length ? pdf.getTextDimensions(linkLines, { maxWidth: textMaxWidth }) : null
    const blockHeight = titleDimensions.h + (linkDimensions ? LINK_SPACING + linkDimensions.h : 0)
    const formattedDate = formatDateDisplay(exp.date)
    const dateDimensions = formattedDate
      ? pdf.getTextDimensions(formattedDate, { maxWidth: colWidths[1] - cellPaddingX * 2 })
      : null
    const contentDrivenHeight = Math.max(
      dateDimensions ? dateDimensions.h + cellPaddingY * 2 : 0,
      blockHeight + cellPaddingY * 2,
      cellPaddingY * 2 + Math.min(colWidths[3] - cellPaddingX * 2, BASE_ROW_HEIGHT - cellPaddingY * 2)
    )
    const rowHeight = Math.max(BASE_ROW_HEIGHT, contentDrivenHeight)

    if (yPos + rowHeight > pageHeight - MARGINS.bottom) {
      pdf.addPage()
      yPos = MARGINS.top
      pdf.setFont('times', 'normal')
      pdf.setFontSize(DEFAULT_FONT_SIZE)
    }

    xPos = tableStartX
    
    // Exp No
    pdf.rect(xPos, yPos, colWidths[0], rowHeight)
    pdf.text(String(index + 1).padStart(2, '0'), xPos + colWidths[0] / 2, yPos + rowHeight / 2, { align: 'center', baseline: 'middle' })
    xPos += colWidths[0]

    // Date
    pdf.rect(xPos, yPos, colWidths[1], rowHeight)
    if (formattedDate) {
      pdf.text(formattedDate, xPos + cellPaddingX, yPos + rowHeight / 2, {
        maxWidth: colWidths[1] - cellPaddingX * 2,
        baseline: 'middle'
      })
    }
    xPos += colWidths[1]

    // Experiment title and GitHub link
    pdf.rect(xPos, yPos, colWidths[2], rowHeight)
    const blockTop = yPos + (rowHeight - blockHeight) / 2
    pdf.text(titleLines, xPos + cellPaddingX, blockTop, {
      maxWidth: textMaxWidth,
      baseline: 'top'
    })
    if (linkLines.length && linkDimensions) {
      const linkStartY = blockTop + titleDimensions.h + LINK_SPACING
      pdf.setFontSize(LINK_FONT_SIZE)
      pdf.setTextColor('#0563C1')
      pdf.text(linkLines, xPos + cellPaddingX, linkStartY, {
        maxWidth: textMaxWidth,
        baseline: 'top'
      })
      pdf.setTextColor('#000000')
      pdf.setFontSize(DEFAULT_FONT_SIZE)
    }
    xPos += colWidths[2]

    // QR Code
    pdf.rect(xPos, yPos, colWidths[3], rowHeight)
    const qrMaxWidth = colWidths[3] - cellPaddingX * 2
    const qrMaxHeight = rowHeight - cellPaddingY * 2
    const qrSize = Math.min(qrMaxWidth, qrMaxHeight)
    const qrStartX = xPos + cellPaddingX + (qrMaxWidth - qrSize) / 2
    const qrStartY = yPos + cellPaddingY + (qrMaxHeight - qrSize) / 2
    try {
      const qrDataUrl = await generateQRCode(exp.githubLink)
      if (qrDataUrl) {
        pdf.addImage(qrDataUrl, 'PNG', qrStartX, qrStartY, qrSize, qrSize)
      }
    } catch (error) {
      console.error('[v0] Error embedding QR code:', error)
      pdf.setFontSize(DEFAULT_FONT_SIZE)
      pdf.text('QR', xPos + colWidths[3] / 2, yPos + rowHeight / 2, { align: 'center', baseline: 'middle' })
    }
    xPos += colWidths[3]

    // Mark
    pdf.rect(xPos, yPos, colWidths[4], rowHeight)
    xPos += colWidths[4]

    // Signature
    pdf.rect(xPos, yPos, colWidths[5], rowHeight)
    
    yPos += rowHeight
  }

  // Declaration section
  yPos += 8
  if (yPos + 30 > pageHeight - MARGINS.bottom) {
    pdf.addPage()
    yPos = MARGINS.top
    pdf.setFont('times', 'normal')
    pdf.setFontSize(12)
  }

  pdf.setFont('times', 'bold')
  pdf.setFontSize(12)
  pdf.text('I confirm that the experiments and GitHub links provided are entirely my own work.', MARGINS.left + 3, yPos, { maxWidth: usableWidth })
  
  yPos += 15
  pdf.text(`Name : ${studentName}`, declarationLeftX, yPos)
  pdf.text(`Register Number : ${registerNumber}`, declarationRightX + 60, yPos)
  
  yPos += 10
  pdf.text('Date :', declarationLeftX, yPos)
  pdf.text('Learner\'s Signature', declarationRightX + 60, yPos)

  if (returnBlobOnly) {
    return pdf.output('blob')
  }
  pdf.save(`${courseTitle || 'document'}.pdf`)
}

export async function mergeWithBonafide(generatedPdfBlob: Blob): Promise<Blob> {
  try {
    const response = await fetch('/bonafid.pdf')
    if (!response.ok) {
      throw new Error('Failed to fetch bonafide.pdf')
    }
    const bonafideBuffer = await response.arrayBuffer()
    const generatedBuffer = await generatedPdfBlob.arrayBuffer()

    const { PDFDocument } = await import('pdf-lib')

    const generatedDoc = await PDFDocument.load(generatedBuffer)
    const bonafideDoc = await PDFDocument.load(bonafideBuffer)

    const mergedDoc = await PDFDocument.create()

    const bonafidePages = await mergedDoc.copyPages(bonafideDoc, bonafideDoc.getPageIndices())
    bonafidePages.forEach(page => mergedDoc.addPage(page))

    const generatedPages = await mergedDoc.copyPages(generatedDoc, generatedDoc.getPageIndices())
    generatedPages.forEach(page => mergedDoc.addPage(page))

    const mergedPdfBytes = await mergedDoc.save()
    return new Blob([mergedPdfBytes as any], { type: 'application/pdf' })
  } catch (error) {
    console.error('Error merging PDFs:', error)
    return generatedPdfBlob
  }
}

export async function generateDOCX(data: DocumentData) {
  const { courseTitle, studentName, registerNumber, experiments } = data
  const logoData = await loadCollegeLogo()

  const columnWidths = [800, 1400, 4300, 1400, 900, 1300]
  const cellPadding = {
    top: 160,
    bottom: 160,
    left: 160,
    right: 160
  }

  const tableRows: TableRow[] = [
    new TableRow({
      children: [
        new TableCell({
          margins: cellPadding,
          width: { size: columnWidths[0], type: WidthType.DXA },
          children: [new Paragraph({
            children: [new TextRun({ text: 'Exp', bold: true, font: 'Times New Roman', size: 24 })],
            alignment: AlignmentType.CENTER
          })],
          verticalAlign: VerticalAlign.CENTER,
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1 },
            bottom: { style: BorderStyle.SINGLE, size: 1 },
            left: { style: BorderStyle.SINGLE, size: 1 },
            right: { style: BorderStyle.SINGLE, size: 1 }
          }
        }),
        new TableCell({
          margins: cellPadding,
          width: { size: columnWidths[1], type: WidthType.DXA },
          children: [new Paragraph({
            children: [new TextRun({ text: 'Date', bold: true, font: 'Times New Roman', size: 24 })],
            alignment: AlignmentType.CENTER
          })],
          verticalAlign: VerticalAlign.CENTER,
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1 },
            bottom: { style: BorderStyle.SINGLE, size: 1 },
            left: { style: BorderStyle.SINGLE, size: 1 },
            right: { style: BorderStyle.SINGLE, size: 1 }
          }
        }),
        new TableCell({
          margins: cellPadding,
          width: { size: columnWidths[2], type: WidthType.DXA },
          children: [new Paragraph({
            children: [new TextRun({ text: 'Name of The Experiment', bold: true, font: 'Times New Roman', size: 24 })],
            alignment: AlignmentType.CENTER
          })],
          verticalAlign: VerticalAlign.CENTER,
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1 },
            bottom: { style: BorderStyle.SINGLE, size: 1 },
            left: { style: BorderStyle.SINGLE, size: 1 },
            right: { style: BorderStyle.SINGLE, size: 1 }
          }
        }),
        new TableCell({
          margins: cellPadding,
          width: { size: columnWidths[3], type: WidthType.DXA },
          children: [new Paragraph({
            children: [new TextRun({ text: 'QR Code', bold: true, font: 'Times New Roman', size: 24 })],
            alignment: AlignmentType.CENTER
          })],
          verticalAlign: VerticalAlign.CENTER,
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1 },
            bottom: { style: BorderStyle.SINGLE, size: 1 },
            left: { style: BorderStyle.SINGLE, size: 1 },
            right: { style: BorderStyle.SINGLE, size: 1 }
          }
        }),
        new TableCell({
          margins: cellPadding,
          width: { size: columnWidths[4], type: WidthType.DXA },
          children: [new Paragraph({
            children: [new TextRun({ text: 'Mark', bold: true, font: 'Times New Roman', size: 24 })],
            alignment: AlignmentType.CENTER
          })],
          verticalAlign: VerticalAlign.CENTER,
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1 },
            bottom: { style: BorderStyle.SINGLE, size: 1 },
            left: { style: BorderStyle.SINGLE, size: 1 },
            right: { style: BorderStyle.SINGLE, size: 1 }
          }
        }),
        new TableCell({
          margins: cellPadding,
          width: { size: columnWidths[5], type: WidthType.DXA },
          children: [new Paragraph({
            children: [new TextRun({ text: 'Signature', bold: true, font: 'Times New Roman', size: 24 })],
            alignment: AlignmentType.CENTER
          })],
          verticalAlign: VerticalAlign.CENTER,
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1 },
            bottom: { style: BorderStyle.SINGLE, size: 1 },
            left: { style: BorderStyle.SINGLE, size: 1 },
            right: { style: BorderStyle.SINGLE, size: 1 }
          }
        })
      ]
    })
  ]

  for (let i = 0; i < experiments.length; i++) {
    const exp = experiments[i]
    let qrParagraphChildren
    try {
      if (exp.githubLink) {
        const qrDataUrl = await generateQRCode(exp.githubLink)
        if (qrDataUrl) {
          qrParagraphChildren = [
            new ImageRun({
              type: 'png',
              data: dataURLToUint8Array(qrDataUrl),
              transformation: { width: 72, height: 72 }
            })
          ]
        }
      }
    } catch (error) {
      console.error('[v0] QR Code generation error for DOCX:', error)
    }

    if (!qrParagraphChildren) {
      qrParagraphChildren = [new TextRun({ text: 'QR', font: 'Times New Roman', size: 24 })]
    }
    tableRows.push(
      new TableRow({
        children: [
          new TableCell({
            margins: cellPadding,
            width: { size: columnWidths[0], type: WidthType.DXA },
            children: [new Paragraph({
              children: [new TextRun({ text: String(i + 1).padStart(2, '0'), font: 'Times New Roman', size: 24 })],
              alignment: AlignmentType.CENTER
            })],
            verticalAlign: VerticalAlign.CENTER,
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1 },
              bottom: { style: BorderStyle.SINGLE, size: 1 },
              left: { style: BorderStyle.SINGLE, size: 1 },
              right: { style: BorderStyle.SINGLE, size: 1 }
            }
          }),
          new TableCell({
            margins: cellPadding,
            width: { size: columnWidths[1], type: WidthType.DXA },
            children: [new Paragraph({
              children: [new TextRun({ text: formatDateDisplay(exp.date), font: 'Times New Roman', size: 24 })],
              alignment: AlignmentType.CENTER
            })],
            verticalAlign: VerticalAlign.CENTER,
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1 },
              bottom: { style: BorderStyle.SINGLE, size: 1 },
              left: { style: BorderStyle.SINGLE, size: 1 },
              right: { style: BorderStyle.SINGLE, size: 1 }
            }
          }),
          new TableCell({
            margins: cellPadding,
            width: { size: columnWidths[2], type: WidthType.DXA },
            children: [
              new Paragraph({
                children: [new TextRun({ text: exp.title, font: 'Times New Roman', size: 24 })],
                spacing: { line: 200 }
              }),
              new Paragraph({
                children: [new TextRun({ text: '' })]
              }),
              new Paragraph({
                children: [new TextRun({ text: exp.githubLink || '', font: 'Times New Roman', size: 22, color: '0563C1', underline: {} })],
                spacing: { line: 200 }
              })
            ],
            verticalAlign: VerticalAlign.CENTER,
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1 },
              bottom: { style: BorderStyle.SINGLE, size: 1 },
              left: { style: BorderStyle.SINGLE, size: 1 },
              right: { style: BorderStyle.SINGLE, size: 1 }
            }
          }),
          new TableCell({
            margins: cellPadding,
            width: { size: columnWidths[3], type: WidthType.DXA },
            children: [new Paragraph({
              children: qrParagraphChildren,
              alignment: AlignmentType.CENTER
            })],
            verticalAlign: VerticalAlign.CENTER,
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1 },
              bottom: { style: BorderStyle.SINGLE, size: 1 },
              left: { style: BorderStyle.SINGLE, size: 1 },
              right: { style: BorderStyle.SINGLE, size: 1 }
            }
          }),
          new TableCell({
            margins: cellPadding,
            width: { size: columnWidths[4], type: WidthType.DXA },
            children: [new Paragraph({
              children: [new TextRun({ text: '', font: 'Times New Roman', size: 24 })]
            })],
            verticalAlign: VerticalAlign.CENTER,
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1 },
              bottom: { style: BorderStyle.SINGLE, size: 1 },
              left: { style: BorderStyle.SINGLE, size: 1 },
              right: { style: BorderStyle.SINGLE, size: 1 }
            }
          }),
          new TableCell({
            margins: cellPadding,
            width: { size: columnWidths[5], type: WidthType.DXA },
            children: [new Paragraph({
              children: [new TextRun({ text: '', font: 'Times New Roman', size: 24 })]
            })],
            verticalAlign: VerticalAlign.CENTER,
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1 },
              bottom: { style: BorderStyle.SINGLE, size: 1 },
              left: { style: BorderStyle.SINGLE, size: 1 },
              right: { style: BorderStyle.SINGLE, size: 1 }
            }
          })
        ]
      })
    )
  }

  const doc = new Document({
    creator: 'Naveen',
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 440,
              bottom: 720,
              left: 720,
              right: 720
            }
          }
        },
        children: [
          ...(logoData
            ? [
                new Paragraph({
                  children: [
                    new ImageRun({
                      type: 'png',
                      data: logoData,
                      transformation: { width: 720, height: 175 }
                    })
                  ],
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 200 }
                })
              ]
            : []),
          new Paragraph({
            children: [new TextRun({ text: courseTitle, size: 36, bold: true, font: 'Times New Roman' })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [new TextRun({ text: 'Table of content', size: 32, bold: true, font: 'Times New Roman' })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            columnWidths,
            alignment: AlignmentType.CENTER,
            layout: TableLayoutType.FIXED,
            rows: tableRows
          }),
          new Paragraph({
            children: [new TextRun({ text: '' })],
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [new TextRun({ text: 'I confirm that the experiments and GitHub links provided are entirely my own work.', size: 24, bold: true, font: 'Times New Roman' })],
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [new TextRun({ text: '' })]
          }),
          ...createDeclarationBlock(studentName, registerNumber)
        ]
      }
    ]
  })

  const blob = await Packer.toBlob(doc)
  saveAs(blob, `${courseTitle || 'document'}.docx`)
}