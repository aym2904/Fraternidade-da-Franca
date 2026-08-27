import { Member, Session, AttendanceRecord, VisitorRecord, Justification, Balaustre } from '../types/masonic';

export const INITIAL_MEMBERS: Member[] = [
  {
    "id": "mem-1787107755749",
    "fullName": "ALYSSON MATHEUS VIEIRA SALVINO",
    "cpf": "41429830832",
    "email": "alysson2904@gmail.com",
    "photoUrl": "",
    "cim": "521257",
    "degree": "Aprendiz",
    "degreeLevel": 1,
    "status": "Regular",
    "currentOfficerRole": null,
    "joinedDate": "2025-11-11",
    "phone": "16992803016",
    "password": "19324510"
  },
  {
    "id": "mem-1787332723376",
    "fullName": "CLAUDIO SEBASTIÃO LIMIRIO",
    "cpf": "163.988.178-69",
    "email": "claudiolimirio@hotmail.com",
    "photoUrl": "",
    "cim": "519261",
    "degree": "Mestre",
    "degreeLevel": 3,
    "status": "Regular",
    "currentOfficerRole": "Mestre de Harmonia",
    "joinedDate": "2023-09-12",
    "phone": "(16) 99182-1858",
    "password": "clau6860"
  },
  {
    "id": "mem-1787333066142",
    "fullName": "ABÍLIO WENDER RAFAEL DE ALMEIDA",
    "cpf": "144.062.89",
    "email": "billbrutus81@gmail.com",
    "photoUrl": "",
    "cim": "521783",
    "degree": "Aprendiz",
    "degreeLevel": 1,
    "status": "Regular",
    "currentOfficerRole": null,
    "joinedDate": "2026-05-19",
    "phone": "(16) 99401-5983",
    "password": "1803"
  },
  {
    "id": "mem-1787333248202",
    "fullName": "JULIO CESAR CHEADE",
    "cpf": "033.976.088-56",
    "email": "julioccheade@gmail.com",
    "photoUrl": "",
    "cim": "169781",
    "degree": "Mestre",
    "degreeLevel": 3,
    "status": "Regular",
    "currentOfficerRole": null,
    "joinedDate": "1992-08-29",
    "phone": "(16) 99972-2022",
    "password": "ime056607"
  },
  {
    "id": "mem-1787334042106",
    "fullName": "JULIO CESAR COUTINHO NAHUZ",
    "cpf": "294.485.868-84",
    "email": "julionahuz@hotmail.com",
    "photoUrl": "",
    "cim": "278712",
    "degree": "Mestre",
    "degreeLevel": 3,
    "status": "Regular",
    "currentOfficerRole": null,
    "joinedDate": "2012-10-09",
    "phone": "(16) 99125-8157",
    "password": "278712"
  },
  {
    "id": "mem-1787334149610",
    "fullName": "ADRIANO MARANGONI RINALDI",
    "cpf": "132.319.268-90",
    "email": "adrianorinaldi2@hotmail.com",
    "photoUrl": "data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"128\" height=\"128\" viewBox=\"0 0 128 128\"><rect width=\"100%\" height=\"100%\" fill=\"%23020617\"/><circle cx=\"64\" cy=\"46\" r=\"22\" fill=\"%23334155\"/><path d=\"M20 110c0-24 20-38 44-38s44 14 44 38\" fill=\"%23334155\"/><circle cx=\"64\" cy=\"64\" r=\"60\" fill=\"none\" stroke=\"%23f59e0b\" stroke-width=\"3\" stroke-opacity=\"0.3\"/></svg>",
    "cim": "517114",
    "degree": "Mestre",
    "degreeLevel": 3,
    "status": "Regular",
    "currentOfficerRole": "1º Diácono",
    "joinedDate": "2022-03-08",
    "phone": "(16) 98113-4220",
    "password": "Gmrf60@@"
  },
  {
    "id": "mem-1787334476560",
    "fullName": "CESAR DO VALE",
    "cpf": "221.247.208-05",
    "email": "cesar.vale@gmail.com",
    "photoUrl": "",
    "cim": "500293",
    "degree": "Mestre",
    "degreeLevel": 3,
    "status": "Regular",
    "currentOfficerRole": "Mestre de Cerimônias",
    "joinedDate": "2018-12-04",
    "phone": "(16) 99122-0685",
    "password": "021627"
  },
  {
    "id": "mem-1787335762212",
    "fullName": "LEONARDO ARANTES",
    "cpf": "357.150.408-92",
    "email": "leo_arantes_86@hotmail.com",
    "photoUrl": "",
    "cim": "521258",
    "degree": "Aprendiz",
    "degreeLevel": 1,
    "status": "Regular",
    "currentOfficerRole": null,
    "joinedDate": "2025-11-11",
    "phone": "(16) 99174-3971",
    "password": "Leo521258@"
  },
  {
    "id": "mem-1787341216330",
    "fullName": "FREDERICO ARANTES",
    "cpf": "260.939.388-16",
    "email": "frederico_arantes@hotmail.com",
    "photoUrl": "",
    "cim": "276238",
    "degree": "Mestre",
    "degreeLevel": 3,
    "status": "Regular",
    "currentOfficerRole": "Venerável Mestre",
    "joinedDate": "2012-09-04",
    "phone": "(16) 99971-0221",
    "password": "99710221"
  },
  {
    "id": "mem-1787342261422",
    "fullName": "ELDER MOSCARDINI FILHO",
    "cpf": "365.379.598-29",
    "email": "elder.moscardini@gmail.com",
    "photoUrl": "",
    "cim": "520612",
    "degree": "Companheiro",
    "degreeLevel": 2,
    "status": "Regular",
    "currentOfficerRole": null,
    "joinedDate": "2025-02-18",
    "phone": "(16) 99153-0310",
    "password": "520612"
  },
  {
    "id": "mem-1787343445033",
    "fullName": "ANTONIO IVO DE MENDONÇA",
    "cpf": "048.512.178-62",
    "email": "antonioivomendonca@gmail.com",
    "photoUrl": "",
    "cim": "266391",
    "degree": "Mestre",
    "degreeLevel": 3,
    "status": "Regular",
    "currentOfficerRole": "Orador",
    "joinedDate": "2011-03-31",
    "phone": "(16) 98112-1587",
    "password": "266391"
  },
  {
    "id": "mem-1787345400407",
    "fullName": "JOÃO MANOEL LEMOS JÚNIOR",
    "cpf": "265.826.188-81",
    "email": "joaomarioroberto@hotmail.com",
    "photoUrl": "",
    "cim": "288489",
    "degree": "Mestre",
    "degreeLevel": 3,
    "status": "Regular",
    "currentOfficerRole": "Chanceler",
    "joinedDate": "2014-09-02",
    "phone": "(16) 99174-6000",
    "password": "50754315Jid#"
  },
  {
    "id": "mem-1787348990344",
    "fullName": "MAURICIO CESAR MAMEDE",
    "cpf": "020.612.888-63",
    "email": "mauriciomamede2017@gmail.com",
    "photoUrl": "",
    "cim": "169779",
    "degree": "Mestre",
    "degreeLevel": 3,
    "status": "Regular",
    "currentOfficerRole": null,
    "joinedDate": "1992-08-25",
    "phone": "(16) 99975-3445",
    "password": "mcmamede"
  },
  {
    "id": "mem-1787491333916",
    "fullName": "LUCIANO LIMONTI TAVEIRA",
    "cpf": "251.152.228-41",
    "email": "llimonti@hotmail.com",
    "photoUrl": "",
    "cim": "517205",
    "degree": "Mestre",
    "degreeLevel": 3,
    "status": "Regular",
    "currentOfficerRole": null,
    "joinedDate": "2023-03-22",
    "phone": "(16) 99967-5550",
    "password": "50LT1451"
  }
];

export const INITIAL_SESSIONS: Session[] = [
  {
    "id": "s-1787574611782",
    "title": "Sessão Ordinária de Companheiro nº 1487",
    "type": "Ordinária",
    "subtype": "Trabalho de Instrução",
    "degree": "Companheiro",
    "degreeLevel": 2,
    "date": "2026-08-24",
    "time": "20:00",
    "location": "Templo da Loja - Oriente de Franca/SP",
    "qrCodeToken": "QR-C2690-FRATERNIDADE3571-1787574611782",
    "active": false,
    "officers": {
      "Orador": "mem-1787343445033",
      "Chanceler": "mem-1787345400407",
      "1º Diácono": "mem-1787334149610",
      "Venerável Mestre": "mem-1787341216330",
      "Mestre de Harmonia": "mem-1787332723376",
      "Mestre de Cerimônias": "mem-1787334476560"
    },
    "notes": ""
  },
  {
    "id": "s-1787574254475",
    "title": "Sessão Ordinária de Aprendiz nº 1486",
    "type": "Ordinária",
    "subtype": "Trabalho de Instrução",
    "degree": "Aprendiz",
    "degreeLevel": 1,
    "date": "2026-08-24",
    "time": "20:00",
    "location": "Templo da Loja - Oriente de Franca/SP",
    "qrCodeToken": "QR-A8820-FRATERNIDADE3571-1787574254475",
    "active": false,
    "officers": {
      "Orador": "mem-1787343445033",
      "Chanceler": "mem-1787345400407",
      "1º Diácono": "mem-1787334149610",
      "Venerável Mestre": "mem-1787341216330",
      "Mestre de Harmonia": "mem-1787332723376",
      "Mestre de Cerimônias": "mem-1787334476560"
    },
    "notes": ""
  },
  {
    "id": "s-1787579634281",
    "title": "Sessão Ordinária de Mestre nº 1488",
    "type": "Ordinária",
    "subtype": "Trabalho de Instrução",
    "degree": "Mestre",
    "degreeLevel": 3,
    "date": "2026-08-24",
    "time": "20:00",
    "location": "Templo da Loja - Oriente de Franca/SP",
    "qrCodeToken": "QR-M2293-FRATERNIDADE3571-1787579634281",
    "active": false,
    "officers": {
      "Orador": "mem-1787343445033",
      "Chanceler": "mem-1787345400407",
      "1º Diácono": "mem-1787334149610",
      "Venerável Mestre": "mem-1787341216330",
      "Mestre de Harmonia": "mem-1787332723376",
      "Mestre de Cerimônias": "mem-1787334476560"
    },
    "notes": ""
  }
];

export const INITIAL_ATTENDANCES: AttendanceRecord[] = [
  {
    "id": "att-1786996337062",
    "sessionId": "s-1786995421652",
    "memberId": "m-1786631398759",
    "timestamp": "2026-08-17T19:52:17.062Z",
    "method": "QR_CODE",
    "confirmedBy": null
  },
  {
    "id": "att-1786997311031",
    "sessionId": "s-1786809917406",
    "memberId": "m-1786631398759",
    "timestamp": "2026-08-17T20:08:31.031Z",
    "method": "QR_CODE",
    "confirmedBy": null
  },
  {
    "id": "att-1787574337506",
    "sessionId": "s-1787574254475",
    "memberId": "mem-1787107755749",
    "timestamp": "2026-08-24T12:25:37.506Z",
    "method": "QR_CODE",
    "confirmedBy": null
  },
  {
    "id": "att-1787574389966",
    "sessionId": "s-1787574254475",
    "memberId": "mem-1787345400407",
    "timestamp": "2026-08-24T12:26:29.966Z",
    "method": "QR_CODE",
    "confirmedBy": null
  },
  {
    "id": "att-1787574407514",
    "sessionId": "s-1787574254475",
    "memberId": "mem-1787332723376",
    "timestamp": "2026-08-24T12:26:47.514Z",
    "method": "QR_CODE",
    "confirmedBy": null
  },
  {
    "id": "att-1787574445354",
    "sessionId": "s-1787574254475",
    "memberId": "mem-1787334042106",
    "timestamp": "2026-08-24T12:27:25.354Z",
    "method": "QR_CODE",
    "confirmedBy": null
  },
  {
    "id": "att-1787574502333",
    "sessionId": "s-1787574254475",
    "memberId": "mem-1787341216330",
    "timestamp": "2026-08-24T12:28:22.333Z",
    "method": "QR_CODE",
    "confirmedBy": null
  },
  {
    "id": "att-1787574628806",
    "sessionId": "s-1787574611782",
    "memberId": "mem-1787345400407",
    "timestamp": "2026-08-24T12:30:28.806Z",
    "method": "QR_CODE",
    "confirmedBy": null
  },
  {
    "id": "att-1787574645042",
    "sessionId": "s-1787574611782",
    "memberId": "mem-1787332723376",
    "timestamp": "2026-08-24T12:30:45.042Z",
    "method": "QR_CODE",
    "confirmedBy": null
  },
  {
    "id": "att-1787574688557",
    "sessionId": "s-1787574611782",
    "memberId": "mem-1787342261422",
    "timestamp": "2026-08-24T12:31:28.557Z",
    "method": "QR_CODE",
    "confirmedBy": null
  },
  {
    "id": "att-1787574770533",
    "sessionId": "s-1787574611782",
    "memberId": "mem-1787491333916",
    "timestamp": "2026-08-24T12:32:50.533Z",
    "method": "MANUAL",
    "confirmedBy": "JOÃO MANOEL LEMOS JÚNIOR"
  },
  {
    "id": "att-1787574771173",
    "sessionId": "s-1787574611782",
    "memberId": "mem-1787348990344",
    "timestamp": "2026-08-24T12:32:51.173Z",
    "method": "MANUAL",
    "confirmedBy": "JOÃO MANOEL LEMOS JÚNIOR"
  },
  {
    "id": "att-1787574771705",
    "sessionId": "s-1787574611782",
    "memberId": "mem-1787343445033",
    "timestamp": "2026-08-24T12:32:51.705Z",
    "method": "MANUAL",
    "confirmedBy": "JOÃO MANOEL LEMOS JÚNIOR"
  },
  {
    "id": "att-1787574772381",
    "sessionId": "s-1787574611782",
    "memberId": "mem-1787341216330",
    "timestamp": "2026-08-24T12:32:52.381Z",
    "method": "MANUAL",
    "confirmedBy": "JOÃO MANOEL LEMOS JÚNIOR"
  },
  {
    "id": "att-1787574776445",
    "sessionId": "s-1787574611782",
    "memberId": "mem-1787334476560",
    "timestamp": "2026-08-24T12:32:56.445Z",
    "method": "MANUAL",
    "confirmedBy": "JOÃO MANOEL LEMOS JÚNIOR"
  },
  {
    "id": "att-1787574776885",
    "sessionId": "s-1787574611782",
    "memberId": "mem-1787334149610",
    "timestamp": "2026-08-24T12:32:56.885Z",
    "method": "MANUAL",
    "confirmedBy": "JOÃO MANOEL LEMOS JÚNIOR"
  },
  {
    "id": "att-1787574777253",
    "sessionId": "s-1787574611782",
    "memberId": "mem-1787334042106",
    "timestamp": "2026-08-24T12:32:57.253Z",
    "method": "MANUAL",
    "confirmedBy": "JOÃO MANOEL LEMOS JÚNIOR"
  },
  {
    "id": "att-1787574778437",
    "sessionId": "s-1787574611782",
    "memberId": "mem-1787333248202",
    "timestamp": "2026-08-24T12:32:58.437Z",
    "method": "MANUAL",
    "confirmedBy": "JOÃO MANOEL LEMOS JÚNIOR"
  },
  {
    "id": "att-1787582188376",
    "sessionId": "s-1787579634281",
    "memberId": "mem-1787334476560",
    "timestamp": "2026-08-24T14:36:28.376Z",
    "method": "MANUAL",
    "confirmedBy": "JOÃO MANOEL LEMOS JÚNIOR"
  },
  {
    "id": "att-1787582189051",
    "sessionId": "s-1787579634281",
    "memberId": "mem-1787334149610",
    "timestamp": "2026-08-24T14:36:29.051Z",
    "method": "MANUAL",
    "confirmedBy": "JOÃO MANOEL LEMOS JÚNIOR"
  },
  {
    "id": "att-1787582189683",
    "sessionId": "s-1787579634281",
    "memberId": "mem-1787334042106",
    "timestamp": "2026-08-24T14:36:29.683Z",
    "method": "MANUAL",
    "confirmedBy": "JOÃO MANOEL LEMOS JÚNIOR"
  },
  {
    "id": "att-1787582190615",
    "sessionId": "s-1787579634281",
    "memberId": "mem-1787333248202",
    "timestamp": "2026-08-24T14:36:30.615Z",
    "method": "MANUAL",
    "confirmedBy": "JOÃO MANOEL LEMOS JÚNIOR"
  },
  {
    "id": "att-1787582191139",
    "sessionId": "s-1787579634281",
    "memberId": "mem-1787332723376",
    "timestamp": "2026-08-24T14:36:31.139Z",
    "method": "MANUAL",
    "confirmedBy": "JOÃO MANOEL LEMOS JÚNIOR"
  },
  {
    "id": "att-1787582192747",
    "sessionId": "s-1787579634281",
    "memberId": "mem-1787341216330",
    "timestamp": "2026-08-24T14:36:32.747Z",
    "method": "MANUAL",
    "confirmedBy": "JOÃO MANOEL LEMOS JÚNIOR"
  },
  {
    "id": "att-1787582193248",
    "sessionId": "s-1787579634281",
    "memberId": "mem-1787343445033",
    "timestamp": "2026-08-24T14:36:33.248Z",
    "method": "MANUAL",
    "confirmedBy": "JOÃO MANOEL LEMOS JÚNIOR"
  },
  {
    "id": "att-1787582193779",
    "sessionId": "s-1787579634281",
    "memberId": "mem-1787345400407",
    "timestamp": "2026-08-24T14:36:33.780Z",
    "method": "MANUAL",
    "confirmedBy": "JOÃO MANOEL LEMOS JÚNIOR"
  },
  {
    "id": "att-1787582194204",
    "sessionId": "s-1787579634281",
    "memberId": "mem-1787348990344",
    "timestamp": "2026-08-24T14:36:34.204Z",
    "method": "MANUAL",
    "confirmedBy": "JOÃO MANOEL LEMOS JÚNIOR"
  },
  {
    "id": "att-1787582194748",
    "sessionId": "s-1787579634281",
    "memberId": "mem-1787491333916",
    "timestamp": "2026-08-24T14:36:34.748Z",
    "method": "MANUAL",
    "confirmedBy": "JOÃO MANOEL LEMOS JÚNIOR"
  }
];

export const INITIAL_VISITORS: VisitorRecord[] = [
  {
    "id": "v-1787574736585",
    "sessionId": "s-1787574611782",
    "fullName": "IRMAO VISITANTE TESTE",
    "cim": "456789",
    "homeLodge": "LOJA TESTE",
    "potencia": "GOB",
    "degree": "Mestre",
    "degreeLevel": 3,
    "timestamp": "2026-08-24T12:32:16.585Z"
  }
];

export const INITIAL_JUSTIFICATIONS: Justification[] = [
  {
    "id": "j-1787581980988",
    "memberId": "mem-1787334476560",
    "sessionId": "s-1787579634281",
    "reason": "Viagem profissional a serviço",
    "category": "Viagem a Trabalho",
    "fileUrl": "",
    "fileName": "atestado_de_presença_519261_2026-08-24.pdf",
    "fileType": "application/pdf",
    "status": "Aprovado",
    "submittedAt": "2026-08-24T14:33:00.988Z",
    "reviewedAt": "2026-08-24T14:33:15.500Z",
    "reviewerNotes": "Falta abonada regimentalmente pelo Secretário."
  }
];

export const INITIAL_BALAUSTRES: Balaustre[] = [
  {
    "id": "b-1787574556481",
    "sessionId": "s-1787574254475",
    "number": "Balaústre nº 1486",
    "title": "Ata da Sessão Ordinária de Aprendiz nº 1486",
    "date": "2026-08-24",
    "summaryText": "Sessão no Grau de Aprendiz com a presença de 5 Irmãos do quadro.",
    "content": "Aos vinte e quatro dias do mês de agosto do ano de 2026 da E∴V∴, reuniram-se no Templo da A∴R∴L∴S∴ Fraternidade da Franca nº 3571 os valorosos Irmãos sob a presidência do Venerável Mestre. Os trabalhos transcorreram na mais perfeita harmonia e paz, com instrução dedicada ao Primeiro Grau.",
    "status": "Aprovado",
    "createdAt": "2026-08-24T12:29:16.481Z"
  },
  {
    "id": "b-1787574871357",
    "sessionId": "s-1787574611782",
    "number": "Balaústre nº 1487",
    "title": "Ata da Sessão Ordinária de Companheiro nº 1487",
    "date": "2026-08-24",
    "summaryText": "Sessão no Grau de Companheiro com a presença de 11 Irmãos do quadro.",
    "content": "Aos vinte e quatro dias do mês de agosto do ano de 2026 da E∴V∴, realizou-se a Sessão Ordinária no Grau de Companheiro. Procedeu-se à leitura do balaústre anterior e apresentação de instrução sobre o painel do grau.",
    "status": "Aprovado",
    "createdAt": "2026-08-24T12:34:31.357Z"
  },
  {
    "id": "b-1787582811767",
    "sessionId": "s-1787579634281",
    "number": "Balaústre nº 1488",
    "title": "Ata da Sessão Ordinária de Mestre nº 1488",
    "date": "2026-08-24",
    "summaryText": "Sessão no Grau de Mestre com a presença de 10 Irmãos do quadro.",
    "content": "Aos vinte e quatro dias do mês de agosto do ano de 2026 da E∴V∴, abriu-se a Câmara do Meio em Sessão Econômica para deliberações de ordem administrativa e financeira.",
    "status": "Aprovado",
    "createdAt": "2026-08-24T14:46:51.767Z"
  }
];
