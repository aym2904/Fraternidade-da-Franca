import {
  Member,
  Session,
  CustomEvent,
  ComputedCalendarItem,
  CalendarEventCategory,
  MessageTemplate
} from '../types/masonic';

// Tabelas de Bodas de Casamento tradicionais
export const WEDDING_ANNIVERSARIES: Record<number, string> = {
  1: 'Bodas de Papel',
  2: 'Bodas de Algodão',
  3: 'Bodas de Couro ou Trigo',
  4: 'Bodas de Flores e Frutas',
  5: 'Bodas de Madeira ou Ferro',
  6: 'Bodas de Açúcar ou Perfume',
  7: 'Bodas de Latão ou Lã',
  8: 'Bodas de Barro ou Papoula',
  9: 'Bodas de Cerâmica ou Vime',
  10: 'Bodas de Estanho ou Zinco',
  11: 'Bodas de Aço',
  12: 'Bodas de Seda ou Ônix',
  13: 'Bodas de Linho ou Renda',
  14: 'Bodas de Marfim',
  15: 'Bodas de Cristal',
  16: 'Bodas de Turmalina',
  17: 'Bodas de Rosa',
  18: 'Bodas de Turquesa',
  19: 'Bodas de Cretone ou Água-Marinha',
  20: 'Bodas de Porcelana',
  21: 'Bodas de Zircão',
  22: 'Bodas de Louça',
  23: 'Bodas de Palha',
  24: 'Bodas de Opala',
  25: 'Bodas de Prata',
  26: 'Bodas de Alexandrita',
  27: 'Bodas de Crisoprásio',
  28: 'Bodas de Hematita',
  29: 'Bodas de Erva',
  30: 'Bodas de Pérola',
  35: 'Bodas de Coral',
  40: 'Bodas de Esmeralda ou Rubi',
  45: 'Bodas de Platina',
  50: 'Bodas de Ouro',
  55: 'Bodas de Ametista',
  60: 'Bodas de Diamante',
  65: 'Bodas de Ferro',
  70: 'Bodas de Vinho',
  75: 'Bodas de Brilhante',
};

export function getWeddingBodaName(years: number): string {
  if (years <= 0) return 'Recém-Casados';
  if (WEDDING_ANNIVERSARIES[years]) {
    return WEDDING_ANNIVERSARIES[years];
  }
  // Encontrar a mais próxima inferior
  const sorted = Object.keys(WEDDING_ANNIVERSARIES)
    .map(Number)
    .sort((a, b) => b - a);
  for (const step of sorted) {
    if (years >= step) {
      return `${years} anos de Casamento (${WEDDING_ANNIVERSARIES[step]})`;
    }
  }
  return `${years} anos de Casamento`;
}

// Datas históricas maçônicas fixas
export const HISTORICAL_MASONIC_EVENTS: Array<{
  id: string;
  title: string;
  dateMonthDay: string; // MM-DD
  originalYear: number;
  category: CalendarEventCategory;
  description: string;
  icon: string;
  badgeColor: string;
}> = [
  {
    id: 'hist-dia-macom',
    title: 'Dia do Maçom Brasileiro',
    dateMonthDay: '08-20',
    originalYear: 1822,
    category: 'data_historica',
    description: 'Data Magna do Maçom Brasileiro, alusiva à sessão histórica em que Gonçalves Ledo proferiu discurso em favor da Independência do Brasil.',
    icon: '⚜️',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },
  {
    id: 'hist-aniversario-loja',
    title: 'Aniversário da A∴R∴L∴S∴ Fraternidade da Franca Nº 3571',
    dateMonthDay: '12-02',
    originalYear: 2003,
    category: 'aniversario_loja',
    description: 'Fundação e sagração da nossa Augusta e Respeitável Loja Simbólica Fraternidade da Franca Nº 3571.',
    icon: '🏛️',
    badgeColor: 'bg-amber-600/30 text-amber-200 border-amber-500/60 font-semibold',
  },
  {
    id: 'hist-aniversario-gosp',
    title: 'Aniversário do GOSP (Grande Oriente de São Paulo)',
    dateMonthDay: '07-29',
    originalYear: 1921,
    category: 'aniversario_potencia',
    description: 'Fundação solene do Grande Oriente de São Paulo (GOSP), potência maçônica de tradição e luz.',
    icon: '📜',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  },
  {
    id: 'hist-dia-maconaria-especulativa',
    title: 'Dia de São João Batista e Nascimento da Maçonaria Especulativa',
    dateMonthDay: '06-24',
    originalYear: 1717,
    category: 'data_historica',
    description: 'Fundação da Grande Loja de Londres em 1717 na Taberna O Ganso e a Grelha, marco inicial da Maçonaria Especulativa Moderna.',
    icon: '☀️',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
  },
  {
    id: 'hist-fundacao-reaa',
    title: 'Dia do Rito Escocês Antigo e Aceito (R.E.A.A.)',
    dateMonthDay: '05-31',
    originalYear: 1801,
    category: 'data_historica',
    description: 'Fundação do Primeiro Supremo Conselho do R.E.A.A. em Charleston (Carolina do Sul, 1801).',
    icon: '🦅',
    badgeColor: 'bg-red-500/20 text-red-300 border-red-500/40',
  },
  {
    id: 'hist-dia-sao-joao-evangelista',
    title: 'Dia de São João Evangelista (Solstício de Inverno / Verão)',
    dateMonthDay: '12-27',
    originalYear: 1720,
    category: 'data_historica',
    description: 'Celebração solsticial de São João Evangelista, patrono dos maçons e das Lojas de São João.',
    icon: '✨',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  },
  {
    id: 'hist-independencia-brasil',
    title: 'Participação Maçônica na Independência do Brasil',
    dateMonthDay: '09-07',
    originalYear: 1822,
    category: 'data_historica',
    description: 'Proclamação da Independência do Brasil, com decisiva articulação dos Irmãos José Bonifácio, Gonçalves Ledo e D. Pedro I.',
    icon: '🇧🇷',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },
];

// Modelos Padrão de Mensagens do WhatsApp
export const DEFAULT_MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    id: 'tpl-aniv-irmao',
    category: 'aniversario_irmao',
    title: 'Aniversário do Irmão',
    template:
      '🎂 *Parabéns, meu querido Irmão {nome}!* 🎂\n\nA A∴R∴L∴S∴ Fraternidade da Franca Nº 3571 e todos os Obreiros do Quadro têm a imensa alegria de parabenizá-lo pela passagem do seu aniversário, completando hoje *{idade} anos* de vida!\n\nQue o Grande Arquiteto do Universo continue iluminando seus passos com muita saúde, sabedoria, paz e prosperidade junto à sua família.\n\n_Fraterno e afetuoso abraço de toda a Oficina!_ 🤝📐🏛️',
  },
  {
    id: 'tpl-aniv-cunhada',
    category: 'aniversario_cunhada',
    title: 'Aniversário da Cunhada',
    template:
      '🌸 *Parabéns, querida Cunhada {nome}!* 🌸\n\nA Família da A∴R∴L∴S∴ Fraternidade da Franca Nº 3571 parabeniza você com muito carinho pelo seu aniversário de *{idade} anos*!\n\nDesejamos muitas bênçãos, saúde, alegrias e momentos felizes ao lado do nosso estimado Irmão {irmao} e de toda a família.\n\n_Com os respeitosos e fraternos cumprimentos da Loja!_ 💐✨',
  },
  {
    id: 'tpl-aniv-sobrinho',
    category: 'aniversario_sobrinho',
    title: 'Aniversário do Sobrinho(a)',
    template:
      '🎉 *Feliz Aniversário, estimado(a) sobrinho(a) {nome}!* 🎈\n\nA família da Loja Fraternidade da Franca Nº 3571 deseja a você um dia repleto de alegrias e celebração pelos seus *{idade} anos*!\n\nQue sua jornada seja repleta de luz, sabedoria e conquistas, enchendo de orgulho seus pais, o Ir∴ {pai} e Cunhada {mae}.\n\n_Parabéns e muito sucesso!_ 🎂🥳',
  },
  {
    id: 'tpl-casamento',
    category: 'casamento',
    title: 'Aniversário de Casamento',
    template:
      '💍 *Feliz Aniversário de Casamento!* 🥂\n\nA A∴R∴L∴S∴ Fraternidade da Franca Nº 3571 parabeniza o casal *Ir∴ {irmao} e Cunhada {cunhada}* pela celebração de *{anos} anos de união ({boda})*!\n\nQue o G∴A∴D∴U∴ continue abençoando o lar de vocês com harmonia, cumplicidade, amor e longevidade.\n\n_Votos de muitas felicidades de todos os Irmãos da Oficina!_ 🤍🕊️',
  },
  {
    id: 'tpl-iniciacao',
    category: 'iniciacao',
    title: 'Aniversário de Iniciação',
    template:
      '⚜️ *Aniversário de Iniciação Maçônica!* 📐\n\nNesta data comemoramos com grande júbilo os *{anos} anos da Iniciação do nosso querido Irmão {nome}* nos Augustos Mistérios da Maçonaria!\n\nAgradecemos por sua dedicação, trabalho e compromisso desinteressado no desbaste da Pedra Bruta.\n\n_TFA e votos de contínuo progresso na senda da Virtude!_ 🏛️🕯️',
  },
  {
    id: 'tpl-elevacao',
    category: 'elevacao',
    title: 'Aniversário de Elevação',
    template:
      '⭐ *Aniversário de Elevação ao Grau de Companheiro!* 🌾\n\nParabéns ao querido Irmão {nome} pelos seus *{anos} anos de Elevação ao Grau 2*!\n\nQue a busca pela Ciência e pelo aperfeiçoamento continue guiando seus passos através dos 5 lances da escada em caracol.\n\n_Fraterno abraço da Loja!_ 🌟',
  },
  {
    id: 'tpl-exaltacao',
    category: 'exaltacao',
    title: 'Aniversário de Exaltação',
    template:
      '🌿 *Aniversário de Exaltação ao Sublime Grau de Mestre!* 🕊️\n\nComemoramos hoje os *{anos} anos de Exaltação do amado Irmão {nome}* ao Sublime Grau de Mestre Maçom!\n\nQue a acácia continue sempre florescendo em seu coração, emanando sabedoria e luz para toda a nossa Oficina.\n\n_TFA e profunda estima!_ 🌲✨',
  },
  {
    id: 'tpl-instalacao',
    category: 'instalacao',
    title: 'Aniversário de Instalação e Posse',
    template:
      '🔨 *Aniversário de Instalação no Trono de Salomão!* 👑\n\nParabéns ao Ilustre Irmão Instalado {nome} pela passagem de *{anos} anos de sua Instalação e Posse*!\n\nAgradecemos por sua liderança e sabedoria na condução dos trabalhos da Arte Real.\n\n_Tríplice e Fraterno Abraço!_ 🏛️🤝',
  },
  {
    id: 'tpl-aniv-loja',
    category: 'aniversario_loja',
    title: 'Aniversário da Loja',
    template:
      '🏛️ *Hoje é dia de Glória! Aniversário da nossa Loja!* 🌟\n\nA A∴R∴L∴S∴ Fraternidade da Franca Nº 3571 comemora hoje *{anos} anos de fundação e trabalho fecundo*!\n\nParabéns a todos os valorosos Irmãos que construíram e continuam erguendo as colunas deste templo de fraternidade, tolerância e luz.\n\n_Viva a Fraternidade da Franca Nº 3571!_ ⚜️🇧🇷',
  },
];

/**
 * Calcula idade ou anos transcorridos entre uma data YYYY-MM-DD e o ano alvo
 */
export function calculateYearsPassed(
  dateString?: string,
  targetYear?: number
): number | undefined {
  if (!dateString) return undefined;
  const parts = dateString.split('-');
  if (parts.length < 3) return undefined;
  const birthYear = parseInt(parts[0], 10);
  if (isNaN(birthYear) || birthYear <= 0) return undefined;
  const currentYear = targetYear || new Date().getFullYear();
  return Math.max(0, currentYear - birthYear);
}

/**
 * Extrai dia e mês no formato DD/MM ou MM-DD
 */
export function extractMonthDay(dateString?: string): { month: number; day: number } | null {
  if (!dateString) return null;
  const parts = dateString.split('-');
  if (parts.length < 3) return null;
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  if (isNaN(month) || isNaN(day)) return null;
  return { month, day };
}

/**
 * Formata número de telefone para link internacional WhatsApp (55DDDNÚMERO)
 */
export function sanitizePhoneForWhatsApp(phone?: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('55') && digits.length >= 12) {
    return digits;
  }
  // Se for DDD + telefone (10 ou 11 dígitos)
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }
  // Se for apenas número local de 8 ou 9 dígitos sem DDD, assume DDD 16 (Franca)
  if (digits.length === 8 || digits.length === 9) {
    return `5516${digits}`;
  }
  return `55${digits}`;
}

/**
 * Gera URL pronta para abrir no WhatsApp com mensagem codificada
 */
export function generateWhatsAppUrl(phone?: string, text?: string): string {
  const cleanPhone = sanitizePhoneForWhatsApp(phone);
  const encodedText = encodeURIComponent(text || '');
  if (cleanPhone) {
    return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
  }
  return `https://api.whatsapp.com/send?text=${encodedText}`;
}

/**
 * Substitui tags dinâmicas no modelo de mensagem
 */
export function buildMessageFromTemplate(
  templateText: string,
  data: {
    nome?: string;
    idade?: number;
    grau?: string;
    cargo?: string;
    loja?: string;
    anos?: number;
    boda?: string;
    cunhada?: string;
    irmao?: string;
    pai?: string;
    mae?: string;
  }
): string {
  let result = templateText;
  const lojaNome = data.loja || 'A∴R∴L∴S∴ Fraternidade da Franca Nº 3571';
  result = result.replace(/{nome}/g, data.nome || '');
  result = result.replace(/{idade}/g, data.idade !== undefined ? String(data.idade) : '');
  result = result.replace(/{grau}/g, data.grau || 'Mestre Maçom');
  result = result.replace(/{cargo}/g, data.cargo || 'Obreiro');
  result = result.replace(/{loja}/g, lojaNome);
  result = result.replace(/{anos}/g, data.anos !== undefined ? String(data.anos) : '');
  result = result.replace(/{boda}/g, data.boda || '');
  result = result.replace(/{cunhada}/g, data.cunhada || data.nome || '');
  result = result.replace(/{irmao}/g, data.irmao || data.nome || '');
  result = result.replace(/{pai}/g, data.pai || '');
  result = result.replace(/{mae}/g, data.mae || '');
  return result;
}

/**
 * Gerador mestre que calcula e compila todos os eventos do calendário para um ano e mês específicos
 * (ou para todo o ano) a partir dos Membros, Sessões, Eventos Históricos e Customizados.
 */
export function generateAllComputedCalendarEvents(
  members: Member[],
  sessions: Session[] = [],
  customEvents: CustomEvent[] = [],
  year: number = new Date().getFullYear(),
  templates: MessageTemplate[] = DEFAULT_MESSAGE_TEMPLATES
): ComputedCalendarItem[] {
  const events: ComputedCalendarItem[] = [];

  // 1. Membros: Aniversários Natalícios e Maçônicos
  members.forEach((m) => {
    // 1.1 Aniversário Natalício do Irmão
    if (m.birthDate) {
      const md = extractMonthDay(m.birthDate);
      if (md) {
        const dateStr = `${year}-${String(md.month).padStart(2, '0')}-${String(md.day).padStart(2, '0')}`;
        const age = calculateYearsPassed(m.birthDate, year);
        events.push({
          id: `aniv-irmao-${m.id}-${year}`,
          title: `Aniversário: Ir∴ ${m.fullName}`,
          category: 'aniversario_irmao',
          date: dateStr,
          originalDate: m.birthDate,
          yearsCount: age,
          personName: m.fullName,
          memberId: m.id,
          memberCim: m.cim,
          phone: m.phone,
          degree: m.degree,
          role: m.currentOfficerRole || undefined,
          photoUrl: m.photoUrl,
          icon: '🎂',
          badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          subInfo: `${age} anos de vida • CIM ${m.cim}`,
          description: `Aniversário natalício do Irmão ${m.fullName} (${m.degree}${m.currentOfficerRole ? ` - ${m.currentOfficerRole}` : ''}).`,
        });
      }
    }

    // 1.2 Aniversário de Iniciação
    const initDate = m.initiationDate || m.joinedDate;
    if (initDate) {
      const md = extractMonthDay(initDate);
      if (md) {
        const dateStr = `${year}-${String(md.month).padStart(2, '0')}-${String(md.day).padStart(2, '0')}`;
        const years = calculateYearsPassed(initDate, year);
        if (years !== undefined && years > 0) {
          events.push({
            id: `iniciacao-${m.id}-${year}`,
            title: `Aniv. de Iniciação: Ir∴ ${m.fullName}`,
            category: 'iniciacao',
            date: dateStr,
            originalDate: initDate,
            yearsCount: years,
            personName: m.fullName,
            memberId: m.id,
            memberCim: m.cim,
            phone: m.phone,
            degree: m.degree,
            photoUrl: m.photoUrl,
            icon: '⚜️',
            badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
            subInfo: `${years} anos de Iniciação nos Mistérios`,
            description: `Comemoração de ${years} anos desde a Iniciação do Irmão ${m.fullName}.`,
          });
        }
      }
    }

    // 1.3 Aniversário de Elevação
    if (m.elevationDate) {
      const md = extractMonthDay(m.elevationDate);
      if (md) {
        const dateStr = `${year}-${String(md.month).padStart(2, '0')}-${String(md.day).padStart(2, '0')}`;
        const years = calculateYearsPassed(m.elevationDate, year);
        if (years !== undefined && years > 0) {
          events.push({
            id: `elevacao-${m.id}-${year}`,
            title: `Aniv. de Elevação: Ir∴ ${m.fullName}`,
            category: 'elevacao',
            date: dateStr,
            originalDate: m.elevationDate,
            yearsCount: years,
            personName: m.fullName,
            memberId: m.id,
            memberCim: m.cim,
            phone: m.phone,
            photoUrl: m.photoUrl,
            icon: '⭐',
            badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
            subInfo: `${years} anos de Elevação ao Grau 2`,
            description: `Comemoração de ${years} anos da Elevação do Irmão ${m.fullName}.`,
          });
        }
      }
    }

    // 1.4 Aniversário de Exaltação
    if (m.exaltationDate) {
      const md = extractMonthDay(m.exaltationDate);
      if (md) {
        const dateStr = `${year}-${String(md.month).padStart(2, '0')}-${String(md.day).padStart(2, '0')}`;
        const years = calculateYearsPassed(m.exaltationDate, year);
        if (years !== undefined && years > 0) {
          events.push({
            id: `exaltacao-${m.id}-${year}`,
            title: `Aniv. de Exaltação: Ir∴ ${m.fullName}`,
            category: 'exaltacao',
            date: dateStr,
            originalDate: m.exaltationDate,
            yearsCount: years,
            personName: m.fullName,
            memberId: m.id,
            memberCim: m.cim,
            phone: m.phone,
            photoUrl: m.photoUrl,
            icon: '🌿',
            badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
            subInfo: `${years} anos no Sublime Grau de Mestre`,
            description: `Comemoração de ${years} anos da Exaltação do Irmão ${m.fullName}.`,
          });
        }
      }
    }

    // 1.5 Aniversário de Instalação e Posse
    if (m.installationDate) {
      const md = extractMonthDay(m.installationDate);
      if (md) {
        const dateStr = `${year}-${String(md.month).padStart(2, '0')}-${String(md.day).padStart(2, '0')}`;
        const years = calculateYearsPassed(m.installationDate, year);
        if (years !== undefined && years > 0) {
          events.push({
            id: `instalacao-${m.id}-${year}`,
            title: `Aniv. de Instalação: Ir∴ ${m.fullName}`,
            category: 'instalacao',
            date: dateStr,
            originalDate: m.installationDate,
            yearsCount: years,
            personName: m.fullName,
            memberId: m.id,
            memberCim: m.cim,
            phone: m.phone,
            photoUrl: m.photoUrl,
            icon: '🔨',
            badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
            subInfo: `${years} anos como Mestre Instalado`,
            description: `Comemoração de ${years} anos de Instalação no Trono de Salomão do Irmão ${m.fullName}.`,
          });
        }
      }
    }

    // 2. Família do Irmão: Cunhada
    if (m.wife && m.wife.name) {
      // 2.1 Aniversário da Cunhada
      if (m.wife.birthDate) {
        const md = extractMonthDay(m.wife.birthDate);
        if (md) {
          const dateStr = `${year}-${String(md.month).padStart(2, '0')}-${String(md.day).padStart(2, '0')}`;
          const age = calculateYearsPassed(m.wife.birthDate, year);
          events.push({
            id: `aniv-cunhada-${m.id}-${year}`,
            title: `Aniversário: Cunhada ${m.wife.name}`,
            category: 'aniversario_cunhada',
            date: dateStr,
            originalDate: m.wife.birthDate,
            yearsCount: age,
            personName: m.wife.name,
            memberId: m.id,
            memberCim: m.cim,
            phone: m.wife.phone || m.phone,
            icon: '🌸',
            badgeColor: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
            subInfo: `${age} anos • Esposa do Ir∴ ${m.fullName}`,
            description: `Aniversário da Cunhada ${m.wife.name}, esposa do Irmão ${m.fullName}.`,
          });
        }
      }

      // 2.2 Aniversário de Casamento (Bodas)
      if (m.wife.marriageDate) {
        const md = extractMonthDay(m.wife.marriageDate);
        if (md) {
          const dateStr = `${year}-${String(md.month).padStart(2, '0')}-${String(md.day).padStart(2, '0')}`;
          const years = calculateYearsPassed(m.wife.marriageDate, year);
          if (years !== undefined && years > 0) {
            const bodaName = getWeddingBodaName(years);
            events.push({
              id: `casamento-${m.id}-${year}`,
              title: `Bodas: Ir∴ ${m.fullName} e Cunhada ${m.wife.name}`,
              category: 'casamento',
              date: dateStr,
              originalDate: m.wife.marriageDate,
              yearsCount: years,
              weddingBodaName: bodaName,
              personName: `${m.fullName} & ${m.wife.name}`,
              memberId: m.id,
              memberCim: m.cim,
              phone: m.phone || m.wife.phone,
              icon: '💍',
              badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
              subInfo: `${years} anos de Casados (${bodaName})`,
              description: `Comemoração de ${years} anos de casamento do Ir∴ ${m.fullName} e Cunhada ${m.wife.name} (${bodaName}).`,
            });
          }
        }
      }
    }

    // 3. Família do Irmão: Filhos (Sobrinhos)
    if (m.children && Array.isArray(m.children)) {
      m.children.forEach((child) => {
        if (child.birthDate) {
          const md = extractMonthDay(child.birthDate);
          if (md) {
            const dateStr = `${year}-${String(md.month).padStart(2, '0')}-${String(md.day).padStart(2, '0')}`;
            const age = calculateYearsPassed(child.birthDate, year);
            events.push({
              id: `aniv-sobrinho-${child.id || child.name}-${m.id}-${year}`,
              title: `Aniversário: Sobrinho(a) ${child.name}`,
              category: 'aniversario_sobrinho',
              date: dateStr,
              originalDate: child.birthDate,
              yearsCount: age,
              personName: child.name,
              memberId: m.id,
              memberCim: m.cim,
              phone: child.phone || m.phone,
              icon: '🎉',
              badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
              subInfo: `${age} anos • Filho(a) do Ir∴ ${m.fullName}`,
              description: `Aniversário do(a) sobrinho(a) ${child.name}, filho(a) do Ir∴ ${m.fullName}${child.motherName ? ` e Cunhada ${child.motherName}` : ''}.`,
            });
          }
        }
      });
    }
  });

  // 4. Datas Históricas Maçônicas
  HISTORICAL_MASONIC_EVENTS.forEach((h) => {
    const dateStr = `${year}-${h.dateMonthDay}`;
    const years = calculateYearsPassed(`${h.originalYear}-${h.dateMonthDay}`, year);
    events.push({
      id: `${h.id}-${year}`,
      title: h.title,
      category: h.category,
      date: dateStr,
      originalDate: `${h.originalYear}-${h.dateMonthDay}`,
      yearsCount: years,
      icon: h.icon,
      badgeColor: h.badgeColor,
      subInfo: years ? `${years} anos de história` : 'Data Comemorativa',
      description: h.description,
    });
  });

  // 6. Eventos Customizados / Personalizados da Loja
  customEvents.forEach((ce) => {
    if (!ce.date) return;
    const parts = ce.date.split('-');
    const ceYear = parseInt(parts[0], 10);
    const md = extractMonthDay(ce.date);

    // Se recorrência for anual, projeta para o ano atual
    if (ce.recurrence === 'anual' && md) {
      const dateStr = `${year}-${String(md.month).padStart(2, '0')}-${String(md.day).padStart(2, '0')}`;
      const years = calculateYearsPassed(ce.date, year);
      events.push({
        id: `custom-${ce.id}-${year}`,
        title: ce.title,
        category: ce.category || 'personalizado',
        date: dateStr,
        originalDate: ce.date,
        time: ce.time,
        yearsCount: years,
        icon: ce.icon || '📌',
        badgeColor: ce.color ? `border-${ce.color}-500/40 text-${ce.color}-300` : 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        subInfo: `${ce.time ? `${ce.time} • ` : ''}${ce.responsible ? `Resp: ${ce.responsible}` : 'Evento da Loja'}`,
        description: ce.description,
        customEventId: ce.id,
      });
    } else if (ceYear === year) {
      // Evento pontual no ano
      events.push({
        id: `custom-${ce.id}`,
        title: ce.title,
        category: ce.category || 'personalizado',
        date: ce.date,
        time: ce.time,
        icon: ce.icon || '📌',
        badgeColor: ce.color ? `border-${ce.color}-500/40 text-${ce.color}-300` : 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        subInfo: `${ce.time ? `${ce.time} • ` : ''}${ce.responsible ? `Resp: ${ce.responsible}` : 'Evento da Loja'}`,
        description: ce.description,
        customEventId: ce.id,
      });
    }
  });

  // Ordenar eventos por data (YYYY-MM-DD) e horário
  return events.sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    const timeA = a.time || '00:00';
    const timeB = b.time || '00:00';
    return timeA.localeCompare(timeB);
  });
}

/**
 * Obtém os eventos que ocorrem EXATAMENTE na data especificada (YYYY-MM-DD)
 */
export function getEventsForSpecificDate(
  allEvents: ComputedCalendarItem[],
  targetDateStr: string // YYYY-MM-DD
): ComputedCalendarItem[] {
  return allEvents.filter((e) => e.date === targetDateStr);
}

/**
 * Obtém os eventos dos próximos N dias a partir da data de referência
 */
export function getUpcomingEvents(
  allEvents: ComputedCalendarItem[],
  daysCount: number = 7,
  referenceDate: Date = new Date()
): ComputedCalendarItem[] {
  const startStr = referenceDate.toISOString().split('T')[0];
  const endDate = new Date(referenceDate);
  endDate.setDate(endDate.getDate() + daysCount);
  const endStr = endDate.toISOString().split('T')[0];

  return allEvents.filter((e) => e.date >= startStr && e.date <= endStr);
}

/**
 * Formata data YYYY-MM-DD para string humanizada brasileira (ex: "Quinta-feira, 27 de Agosto de 2026")
 */
export function formatFullBrazilianDate(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const d = new Date(year, month, day);

  const daysOfWeek = [
    'Domingo',
    'Segunda-feira',
    'Terça-feira',
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira',
    'Sábado',
  ];
  const months = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ];

  return `${daysOfWeek[d.getDay()]}, ${day} de ${months[month]} de ${year}`;
}
