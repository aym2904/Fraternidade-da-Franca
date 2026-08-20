import { jsPDF } from 'jspdf';
import { Member, Session, VisitorRecord } from '../types/masonic';

export function generateAttendanceCertificatePDF(
  member: Member | { fullName: string; cim: string; homeLodge?: string; potencia?: string; degree: string },
  session: Session,
  type: 'Atestado de Presença' | 'Placet de Frequência' = 'Atestado de Presença'
) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  // Border & Frame
  doc.setLineWidth(1.5);
  doc.setDrawColor(212, 175, 55); // Gold
  doc.rect(10, 10, 277, 190);

  doc.setLineWidth(0.5);
  doc.setDrawColor(30, 41, 59); // Slate dark
  doc.rect(13, 13, 271, 184);

  // Header
  doc.setFont('times', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text("A.R.L.S. FRATERNIDADE DA FRANCA Nº 3571", 148.5, 30, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont('times', 'normal');
  doc.text('ORIENTE DE FRANCA/SP — JURISDICIONADA AO GOSP', 148.5, 37, { align: 'center' });

  // Title
  doc.setFontSize(22);
  doc.setFont('times', 'bold');
  doc.setTextColor(180, 130, 20); // Gold-amber
  doc.text(type.toUpperCase(), 148.5, 55, { align: 'center' });

  // Body text
  doc.setFontSize(13);
  doc.setFont('times', 'normal');
  doc.setTextColor(30, 41, 59);

  const homeLodgeText = 'homeLodge' in member && member.homeLodge ? `da A.R.L.S. ${member.homeLodge} (${member.potencia || 'GOSP'})` : 'membro do quadro desta Oficina';

  const bodyParagraph = `Apresentamos para os devidos fins de direito e comprovação de frequência que o Ilustre e Querido Irmão ${member.fullName.toUpperCase()}, Cédula de Identidade Maçônica (CIM) nº ${member.cim}, Grau de ${member.degree}, ${homeLodgeText}, esteve presente e participou dos trabalhos da:`;

  const splitBody = doc.splitTextToSize(bodyParagraph, 230);
  doc.text(splitBody, 148.5, 75, { align: 'center' });

  // Session Highlight Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(40, 100, 217, 30, 3, 3, 'FD');

  doc.setFont('times', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(session.title, 148.5, 110, { align: 'center' });

  doc.setFont('times', 'italic');
  doc.setFontSize(11);
  doc.setTextColor(71, 85, 105);
  doc.text(`Realizada em ${session.date.split('-').reverse().join('/')} às ${session.time}h no Grau de ${session.degree}`, 148.5, 120, { align: 'center' });

  // Date and Oriente
  const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  doc.setFont('times', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(`Oriente de Franca/SP, ${today}.`, 148.5, 145, { align: 'center' });

  // Signatures
  doc.setLineWidth(0.5);
  doc.setDrawColor(71, 85, 105);

  // Ven. Mestre
  doc.line(45, 175, 125, 175);
  doc.setFont('times', 'bold');
  doc.setFontSize(10);
  doc.text('Venerável Mestre', 85, 180, { align: 'center' });

  // Chanceler
  doc.line(170, 175, 250, 175);
  doc.text('Chanceler da Loja', 210, 180, { align: 'center' });

  // Verification Hash Code
  const verificationHash = `AUTENTICAÇÃO DIGITAL: REG-MAC-${session.id.toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`;
  doc.setFontSize(8);
  doc.setFont('courier', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(verificationHash, 148.5, 192, { align: 'center' });

  // Download trigger
  const fileName = `${type.toLowerCase().replace(/\s+/g, '_')}_${member.cim}_${session.date}.pdf`;
  doc.save(fileName);
}

export function generateBalaustrePDF(
  balaustre: { title: string; number?: string; content: string; date: string; status?: string },
  session: Session,
  lodgeName: string = 'A.R.L.S. FRATERNIDADE DA FRANCA Nº 3571',
  oriente: string = 'ORIENTE DE FRANCA/SP'
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const marginX = 18;
  const contentWidth = pageWidth - marginX * 2;
  const bottomLimit = 255;
  let currentY = 22;

  const drawPageDecorations = (pageNum: number) => {
    // Elegant Double Borders
    doc.setLineWidth(1.2);
    doc.setDrawColor(212, 175, 55); // Gold
    doc.rect(10, 10, 190, 277);

    doc.setLineWidth(0.4);
    doc.setDrawColor(30, 41, 59); // Dark slate
    doc.rect(12, 12, 186, 273);

    // Header on top of each page
    doc.setFont('times', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text(lodgeName, pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont('times', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`${oriente} — JURISDICIONADA AO GOSP`, pageWidth / 2, 25, { align: 'center' });

    doc.setLineWidth(0.3);
    doc.setDrawColor(212, 175, 55);
    doc.line(20, 27, 190, 27);

    // Footer on bottom of each page
    doc.setFontSize(8);
    doc.setFont('times', 'italic');
    doc.setTextColor(100, 116, 139);
    doc.text(`Livro Oficial de Balaústres da Secretaria — Página ${pageNum}`, pageWidth / 2, 283, { align: 'center' });
  };

  let pageNumber = 1;
  drawPageDecorations(pageNumber);
  currentY = 34;

  // Title Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(marginX, currentY, contentWidth, 22, 2, 2, 'FD');

  doc.setFont('times', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(180, 130, 20); // Gold-amber
  const titleText = (balaustre.number ? `${balaustre.number.toUpperCase()} — ` : '') + (balaustre.title ? balaustre.title.toUpperCase() : `ATA DA SESSÃO`);
  doc.text(titleText, pageWidth / 2, currentY + 7, { align: 'center' });

  doc.setFont('times', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  const infoText = `Data: ${session.date.split('-').reverse().join('/')} às ${session.time}h  |  Grau: ${session.degree}  |  Situação: ${balaustre.status || 'Aprovado'}`;
  doc.text(infoText, pageWidth / 2, currentY + 14, { align: 'center' });

  currentY += 28;

  // Content Paragraphs
  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);

  const lines = balaustre.content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const isSectionHeader =
      rawLine.startsWith('---') ||
      rawLine.includes('QUADRO DA ADMINISTRAÇÃO') ||
      rawLine.includes('ESTATÍSTICA E PRESENÇA') ||
      rawLine.includes('RESUMO DOS TRABALHOS');

    if (isSectionHeader) {
      if (currentY > bottomLimit - 25) {
        doc.addPage();
        pageNumber++;
        drawPageDecorations(pageNumber);
        currentY = 34;
      }
      doc.setFont('times', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(140, 95, 10);
      currentY += 2;
    } else if (rawLine.startsWith("- Ir.'.") || rawLine.startsWith('- ')) {
      doc.setFont('times', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);
    } else {
      doc.setFont('times', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
    }

    const wrappedLines = doc.splitTextToSize(rawLine || ' ', contentWidth);

    for (const subLine of wrappedLines) {
      if (currentY > bottomLimit) {
        doc.addPage();
        pageNumber++;
        drawPageDecorations(pageNumber);
        currentY = 34;
      }
      doc.text(subLine, marginX, currentY);
      currentY += 5.2;
    }

    if (isSectionHeader) {
      currentY += 1;
    }
  }

  // Signatures
  if (currentY > bottomLimit - 35) {
    doc.addPage();
    pageNumber++;
    drawPageDecorations(pageNumber);
    currentY = 40;
  } else {
    currentY += 10;
  }

  doc.setLineWidth(0.4);
  doc.setDrawColor(100, 116, 139);

  // Ven. Mestre
  doc.line(22, currentY + 15, 72, currentY + 15);
  doc.setFont('times', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Venerável Mestre', 47, currentY + 19, { align: 'center' });

  // Orador
  doc.line(80, currentY + 15, 130, currentY + 15);
  doc.text('Orador da Loja', 105, currentY + 19, { align: 'center' });

  // Secretário
  doc.line(138, currentY + 15, 188, currentY + 15);
  doc.text('Secretário da Loja', 163, currentY + 19, { align: 'center' });

  // Digital Hash Stamp
  const verificationHash = `CHANCELA DIGITAL: BAL-3571-${session.id.toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`;
  doc.setFontSize(7.5);
  doc.setFont('courier', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(verificationHash, pageWidth / 2, currentY + 27, { align: 'center' });

  // Save trigger
  const safeTitle = session.title.replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `balaustre_${safeTitle}_${session.date}.pdf`;
  doc.save(fileName);
}
