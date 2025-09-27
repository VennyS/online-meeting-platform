import { Injectable } from '@nestjs/common';
import { Workbook } from 'exceljs';
import { GetMeetingReportsDto } from 'src/modules/room/dto/getMeetingReportDto';

@Injectable()
export class ReportExportService {
  // --- Генерация Excel ---
  async generateExcel(data: GetMeetingReportsDto): Promise<ArrayBuffer> {
    const wb = new Workbook();

    const autoFitColumns = (worksheet) => {
      worksheet.columns?.forEach((col) => {
        let max = 10;
        col.eachCell?.({ includeEmpty: true }, (cell) => {
          const len = cell.value ? cell.value.toString().length : 0;
          if (len > max) max = len;
        });
        col.width = max + 2;
      });
    };

    const addTableStyle = (
      worksheet,
      name,
      columns,
      rows,
      theme = 'TableStyleMedium2',
    ) => {
      worksheet.addTable({
        name,
        ref: 'A1',
        headerRow: true,
        style: { theme, showRowStripes: true },
        columns: columns.map((c) => ({ name: c })),
        rows,
      });
      autoFitColumns(worksheet);
    };

    // --- Лист "Отчёты" ---
    const wsReports = wb.addWorksheet('Отчёты');
    addTableStyle(
      wsReports,
      'ReportsTable',
      [
        'ID',
        'ID комнаты',
        'Начало встречи',
        'Конец встречи',
        'Длительность (сек)',
      ],
      data.sessions.map((m) => [
        m.id,
        m.roomId,
        m.startTime,
        m.endTime || '',
        m.duration || '',
      ]),
    );

    // --- Лист "Участники" ---
    const wsParticipants = wb.addWorksheet('Участники');
    addTableStyle(
      wsParticipants,
      'ParticipantsTable',
      ['ID отчёта', 'ID участника', 'ID пользователя', 'Имя'],
      data.sessions.flatMap((m) =>
        m.participants.map((p) => [m.id, p.id, p.userId, p.name]),
      ),
      'TableStyleMedium9',
    );

    // --- Лист "Сессии" ---
    const wsSessions = wb.addWorksheet('Сессии');
    addTableStyle(
      wsSessions,
      'SessionsTable',
      ['ID отчёта', 'ID участника', 'Время входа', 'Время выхода'],
      data.sessions.flatMap((m) =>
        m.participants.flatMap((p) =>
          p.sessions.map((s) => [m.id, p.id, s.joinTime, s.leaveTime || '']),
        ),
      ),
    );

    const buffer = await wb.xlsx.writeBuffer();
    return buffer;
  }

  // --- Генерация CSV ---
  generateCsv(data: GetMeetingReportsDto): string {
    const rows: string[] = [];
    rows.push(
      [
        'ID отчёта',
        'ID комнаты',
        'Начало встречи',
        'Конец встречи',
        'ID участника',
        'ID пользователя',
        'Имя',
        'Вход',
        'Выход',
      ].join(';'),
    );

    data.sessions.forEach((m) => {
      m.participants.forEach((p) => {
        p.sessions.forEach((s) => {
          rows.push(
            [
              m.id,
              m.roomId,
              m.startTime,
              m.endTime || '',
              p.id,
              p.userId,
              p.name,
              s.joinTime,
              s.leaveTime || '',
            ].join(';'),
          );
        });
      });
    });

    return rows.join('\n');
  }
}
