import { PastaSale, PastaFlavorItem, Member } from '../types/masonic';
import { jsPDF } from 'jspdf';

export const PASTA_UNIT_PRICE = 25.0; // R$ 25,00 valor padrão por massa

/**
 * Generate unique Sale Code (e.g., "MASSA-8F3A")
 */
export function generateSaleCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let randomPart = '';
  for (let i = 0; i < 4; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `MASSA-${randomPart}`;
}

/**
 * Generate Secure Token UUID for QR Code (e.g., "8F3A7D91-29D8-4A11-98F2")
 */
export function generateQrCodeToken(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().toUpperCase();
  }
  const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1).toUpperCase();
  return `${s4()}${s4()}-${s4()}-4${s4().substr(0, 3)}-${s4()}-${s4()}${s4()}${s4()}`;
}

/**
 * Format Pasta Items to human readable string
 */
export function formatFlavorSummary(items: PastaFlavorItem[]): string {
  if (!items || items.length === 0) return 'Nenhum sabor selecionado';
  return items
    .filter((i) => i.quantity > 0)
    .map((i) => `${i.flavor} (${i.quantity})`)
    .join(', ');
}

/**
 * Format currency to BRL
 */
export function formatCurrencyBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Format Phone to (XX) XXXXX-XXXX
 */
export function formatPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

/**
 * Create WhatsApp Message with custom greeting, sale details and QR Code instructions
 */
export function createWhatsAppMessage(sale: PastaSale, lodgeName = 'A∴R∴L∴S∴ Fraternidade da Franca Nº 3571'): string {
  const flavorDetails = sale.items && sale.items.length > 0
    ? sale.items.map((it) => `  🍝 *${it.flavor}:* ${it.quantity} un`).join('\n')
    : `  🍝 *Sabor:* ${sale.flavor}`;

  const valorFormatado = formatCurrencyBRL(sale.totalAmount || (sale.totalQuantity * (sale.unitPrice || PASTA_UNIT_PRICE)));

  return `🏛️ *${lodgeName}*\n` +
    `🍝 *Comprovante Digital - Venda de Massas Beneficente*\n\n` +
    `Olá, estimado(a) *${sale.customerName}*!\n\n` +
    `Recebemos com muita alegria a confirmação do seu pedido. Agradecemos imensamente pela sua colaboração com nossas ações e obras sociais!\n\n` +
    `📋 *DETALHES DO PEDIDO:*\n` +
    `• *Código da Venda:* \`${sale.saleCode}\`\n` +
    `• *Quantidade Total:* ${sale.totalQuantity} ${sale.totalQuantity === 1 ? 'massa' : 'massas'}\n` +
    `${flavorDetails}\n` +
    `• *Valor Total:* ${valorFormatado}\n` +
    `• *Irmão Responsável:* ${sale.sellerName}\n\n` +
    `🎟️ *CÓDIGO DE RETIRADA (QR CODE):*\n` +
    `Token: \`${sale.qrCodeToken}\`\n\n` +
    `📍 *INSTRUÇÕES PARA RETIRADA:*\n` +
    `Apresente este comprovante ou o *QR Code* exclusivo no momento da entrega das massas.\n\n` +
    `Muito obrigado pelo apoio e fraternidade! 🤝✨`;
}

/**
 * Generate Voucher PNG image blob with Lodge Header, Sale Details and QR Code
 */
export async function generateSaleVoucherBlob(
  sale: PastaSale,
  qrSvgElement?: SVGElement | null,
  lodgeName = 'A∴R∴L∴S∴ Fraternidade da Franca Nº 3571'
): Promise<Blob> {
  return new Promise(async (resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      const width = 720;
      const height = 980;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas context not available');
      }

      // Background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#0f172a'); // slate-900
      bgGrad.addColorStop(1, '#020617'); // slate-950
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Gold Outer Border
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 4;
      ctx.strokeRect(16, 16, width - 32, height - 32);

      // Inner subtle border
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(24, 24, width - 48, height - 48);

      // Header Ribbon
      ctx.fillStyle = '#b45309';
      ctx.fillRect(24, 24, width - 48, 80);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px serif';
      ctx.textAlign = 'center';
      ctx.fillText(lodgeName, width / 2, 60);

      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText('COMPROVANTE OFICIAL • VENDA DE MASSAS', width / 2, 85);

      // Customer Info Section
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(40, 125, width - 80, 160);
      ctx.strokeStyle = '#334155';
      ctx.strokeRect(40, 125, width - 80, 160);

      ctx.textAlign = 'left';
      ctx.fillStyle = '#94a3b8';
      ctx.font = '13px sans-serif';
      ctx.fillText('CLIENTE:', 60, 155);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 17px sans-serif';
      ctx.fillText(sale.customerName.toUpperCase(), 160, 155);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '13px sans-serif';
      ctx.fillText('TELEFONE:', 60, 185);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 15px monospace';
      ctx.fillText(formatPhoneNumber(sale.phone), 160, 185);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '13px sans-serif';
      ctx.fillText('MASSAS:', 60, 215);
      ctx.fillStyle = '#fde047';
      ctx.font = 'bold 14px sans-serif';
      const flavorTxt = sale.items && sale.items.length > 0
        ? sale.items.map((i) => `${i.flavor} (${i.quantity})`).join(', ')
        : sale.flavor;
      ctx.fillText(flavorTxt.substring(0, 48), 160, 215);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '13px sans-serif';
      ctx.fillText('TOTAL:', 60, 245);
      ctx.fillStyle = '#4ade80';
      ctx.font = 'bold 18px monospace';
      const valorStr = `${sale.totalQuantity} un  •  ${formatCurrencyBRL(sale.totalAmount || (sale.totalQuantity * (sale.unitPrice || PASTA_UNIT_PRICE)))}`;
      ctx.fillText(valorStr, 160, 245);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px sans-serif';
      ctx.fillText(`Irmão: ${sale.sellerName}`, 60, 272);

      // QR Code Box (White background)
      const qrBoxX = 170;
      const qrBoxY = 310;
      const qrBoxSize = 380;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 5;
      ctx.strokeRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize);

      // Load QR Code SVG onto image
      let svgStringToUse = '';
      if (qrSvgElement) {
        svgStringToUse = new XMLSerializer().serializeToString(qrSvgElement);
      } else {
        // Fallback or find any svg on document
        const foundSvg = document.querySelector('svg');
        if (foundSvg) {
          svgStringToUse = new XMLSerializer().serializeToString(foundSvg);
        }
      }

      const drawFooterAndResolve = () => {
        // Sale Code & Token Display
        ctx.fillStyle = '#fef08a';
        ctx.font = 'bold 28px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(sale.saleCode, width / 2, 735);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '13px monospace';
        ctx.fillText(`TOKEN: ${sale.qrCodeToken}`, width / 2, 765);

        // Instructions Footer
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(40, 790, width - 80, 120);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.strokeRect(40, 790, width - 80, 120);

        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 15px sans-serif';
        ctx.fillText('📍 INSTRUÇÕES PARA A RETIRADA', width / 2, 825);

        ctx.fillStyle = '#e2e8f0';
        ctx.font = '13px sans-serif';
        ctx.fillText('Apresente a imagem deste QR Code no momento da entrega das massas.', width / 2, 855);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px sans-serif';
        ctx.fillText(`Gerado em ${new Date(sale.createdAt || Date.now()).toLocaleString('pt-BR')}`, width / 2, 885);

        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to generate image blob'));
          }
        }, 'image/png', 0.95);
      };

      if (svgStringToUse) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, qrBoxX + 25, qrBoxY + 25, qrBoxSize - 50, qrBoxSize - 50);
          drawFooterAndResolve();
        };
        img.onerror = () => {
          drawFooterAndResolve();
        };
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgStringToUse)));
      } else {
        drawFooterAndResolve();
      }
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Helper to detect mobile browser vs desktop
 */
export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Share Sale Voucher with attached QR Code image and text via WhatsApp (or native Web Share)
 */
export async function shareSaleViaWhatsApp(
  sale: PastaSale,
  qrSvgElement?: SVGElement | null
): Promise<{ success: boolean; sharedViaNative: boolean; message: string }> {
  const message = createWhatsAppMessage(sale);
  let imageBlob: Blob | null = null;

  try {
    imageBlob = await generateSaleVoucherBlob(sale, qrSvgElement);
  } catch (e) {
    console.warn('[pastaUtils] Could not generate voucher blob:', e);
  }

  const cleanPhone = sale.phone.replace(/\D/g, '');
  const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : (cleanPhone ? `55${cleanPhone}` : '');
  const encoded = encodeURIComponent(message);
  const whatsappUrl = phoneWithCountry
    ? `https://api.whatsapp.com/send?phone=${phoneWithCountry}&text=${encoded}`
    : `https://api.whatsapp.com/send?text=${encoded}`;

  // 1. Mobile Web Share with Attached Image (Android / iOS native WhatsApp sheet)
  if (isMobileDevice() && imageBlob && typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
    const file = new File(
      [imageBlob],
      `comprovante_qrcode_${sale.saleCode}_${sale.customerName.replace(/\s+/g, '_')}.png`,
      { type: 'image/png' }
    );

    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: `Comprovante - ${sale.saleCode} (${sale.customerName})`,
          text: message,
          files: [file],
        });
        return {
          success: true,
          sharedViaNative: true,
          message: 'Comprovante com imagem do QR Code compartilhado com sucesso!',
        };
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('[pastaUtils] navigator.share error, falling back to direct URL:', err);
        } else {
          return {
            success: false,
            sharedViaNative: true,
            message: 'Compartilhamento cancelado pelo usuário.',
          };
        }
      }
    }
  }

  // 2. Desktop PC Behavior: Copy image to clipboard, download PNG image, and open WhatsApp Web directly
  if (imageBlob && typeof navigator !== 'undefined' && navigator.clipboard && (window as any).ClipboardItem) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': imageBlob }),
      ]);
    } catch (e) {
      console.warn('[pastaUtils] Clipboard image write not permitted:', e);
    }
  }

  // Download image voucher automatically on desktop
  if (imageBlob) {
    try {
      const downloadUrl = URL.createObjectURL(imageBlob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `comprovante_qrcode_${sale.saleCode}_${sale.customerName.replace(/\s+/g, '_')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 3000);
    } catch (e) {}
  }

  // Always open WhatsApp Web/API directly in a new tab on desktop/fallback
  if (typeof window !== 'undefined') {
    window.open(whatsappUrl, '_blank');
  }

  return {
    success: true,
    sharedViaNative: false,
    message: isMobileDevice()
      ? 'WhatsApp aberto com a mensagem formatada!'
      : 'WhatsApp Web aberto! A imagem do comprovante foi copiada para sua área de transferência (tecle Ctrl+V no chat para colar a imagem).',
  };
}

/**
 * Open WhatsApp Web/Mobile with prefilled message (direct link)
 */
export function sendSaleWhatsApp(sale: PastaSale, qrSvgElement?: SVGElement | null) {
  shareSaleViaWhatsApp(sale, qrSvgElement);
}

/**
 * Export Sales to CSV / Excel format
 */
export function exportSalesToCSV(sales: PastaSale[], filename = 'vendas_massas_relatorio.csv') {
  const headers = [
    'Codigo_Venda',
    'Token_QRCode',
    'Cliente_Nome',
    'Telefone',
    'Sabores',
    'Qtd_Total',
    'Valor_Total',
    'Status',
    'Data_Venda',
    'Vendedor_Nome',
    'Vendedor_CIM',
    'Data_Retirada',
    'Operador_Retirada',
  ];

  const rows = sales.map((s) => [
    s.saleCode,
    s.qrCodeToken,
    `"${s.customerName.replace(/"/g, '""')}"`,
    `"${s.phone}"`,
    `"${s.flavor.replace(/"/g, '""')}"`,
    s.totalQuantity,
    s.totalAmount.toFixed(2),
    s.status,
    new Date(s.createdAt).toLocaleString('pt-BR'),
    `"${s.sellerName.replace(/"/g, '""')}"`,
    s.sellerCim || '',
    s.pickupDate ? new Date(s.pickupDate).toLocaleString('pt-BR') : '',
    s.pickupOperatorName ? `"${s.pickupOperatorName.replace(/"/g, '""')}"` : '',
  ]);

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate structured PDF Report
 */
export function exportSalesToPDF(
  sales: PastaSale[],
  lodgeName = 'A∴R∴L∴S∴ Fraternidade da Franca Nº 3571',
  filteredSellerName?: string
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 18;

  // Header
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(251, 191, 36); // amber-400
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(lodgeName, pageWidth / 2, 12, { align: 'center' });

  doc.setTextColor(241, 245, 249);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Relatório Oficial de Vendas e Retiradas de Massas', pageWidth / 2, 19, { align: 'center' });

  y = 36;

  // Summary Metrics
  const totalSalesCount = sales.length;
  const totalUnits = sales.reduce((acc, s) => acc + s.totalQuantity, 0);
  const totalValue = sales.reduce((acc, s) => acc + s.totalAmount, 0);
  const totalDelivered = sales.filter((s) => s.status === 'Retirada Realizada').reduce((acc, s) => acc + s.totalQuantity, 0);
  const totalPending = sales.filter((s) => s.status === 'Aguardando Retirada').reduce((acc, s) => acc + s.totalQuantity, 0);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, y, pageWidth - 28, 24, 2, 2, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('RESUMO GERAL', 18, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Total de Pedidos: ${totalSalesCount}`, 18, y + 13);
  doc.text(`Total de Massas: ${totalUnits} un`, 70, y + 13);
  doc.text(`Faturamento Total: ${formatCurrencyBRL(totalValue)}`, 130, y + 13);

  doc.setTextColor(22, 101, 52); // green
  doc.text(`✓ Entregues: ${totalDelivered} un`, 18, y + 19);
  doc.setTextColor(180, 83, 9); // amber
  doc.text(`⏳ Aguardando Retirada: ${totalPending} un`, 70, y + 19);
  if (filteredSellerName) {
    doc.setTextColor(71, 85, 105);
    doc.text(`Filtro: ${filteredSellerName}`, 130, y + 19);
  }

  y += 32;

  // Table Headers
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, pageWidth - 28, 7, 'F');
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);

  doc.text('CÓDIGO', 16, y + 5);
  doc.text('CLIENTE / TEL', 40, y + 5);
  doc.text('SABORES', 90, y + 5);
  doc.text('QTD / VALOR', 135, y + 5);
  doc.text('STATUS / VENDEDOR', 165, y + 5);

  y += 9;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  sales.forEach((s, index) => {
    if (y > 275) {
      doc.addPage();
      y = 20;

      // Table Header on new page
      doc.setFillColor(241, 245, 249);
      doc.rect(14, y, pageWidth - 28, 7, 'F');
      doc.setTextColor(51, 65, 85);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('CÓDIGO', 16, y + 5);
      doc.text('CLIENTE / TEL', 40, y + 5);
      doc.text('SABORES', 90, y + 5);
      doc.text('QTD / VALOR', 135, y + 5);
      doc.text('STATUS / VENDEDOR', 165, y + 5);
      y += 9;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
    }

    if (index % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y - 4, pageWidth - 28, 8, 'F');
    }

    doc.setTextColor(15, 23, 42);
    doc.text(s.saleCode, 16, y);

    const clientStr = `${s.customerName.substring(0, 24)} (${s.phone})`;
    doc.text(clientStr, 40, y);

    const flavorStr = s.flavor.substring(0, 28);
    doc.text(flavorStr, 90, y);

    const valueStr = `${s.totalQuantity} un - ${formatCurrencyBRL(s.totalAmount)}`;
    doc.text(valueStr, 135, y);

    const statusStr = s.status === 'Retirada Realizada' ? '✓ Entregue' : '⏳ Pendente';
    doc.setTextColor(s.status === 'Retirada Realizada' ? 22 : 180, s.status === 'Retirada Realizada' ? 101 : 83, s.status === 'Retirada Realizada' ? 52 : 9);
    doc.text(`${statusStr} (${s.sellerName.split(' ')[0]})`, 165, y);

    y += 8;
  });

  // Footer with timestamp
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Gerado em ${new Date().toLocaleString('pt-BR')} • Página ${i} de ${totalPages}`,
      pageWidth / 2,
      290,
      { align: 'center' }
    );
  }

  doc.save(`relatorio_venda_massas_${new Date().toISOString().slice(0, 10)}.pdf`);
}
