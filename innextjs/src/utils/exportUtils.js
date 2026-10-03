const buildFileName = (prefix, ext) => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${prefix}-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.${ext}`;
};

export const loadImageAsDataUrl = (url, size = 96) =>
    new Promise((resolve) => {
        if (!url) return resolve(null);
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, size, size);
                const side = Math.min(img.width, img.height);
                ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
                resolve(canvas.toDataURL('image/png'));
            } catch {
                resolve(null);
            }
        };
        img.onerror = () => resolve(null);
        img.src = url;
    });

const downloadBlob = (blob, fileName) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
};

/**
 * columns = [{ header: 'Col', key: 'key' | (row) => string, isImage: boolean, width: number, align: 'left'|'center', style: (val) => ({ fontColor: 'FF0000', bold: true, pdfColor: [255,0,0] }) }]
 */
export const exportToExcel = async ({ fileNamePrefix = 'export', sheetName = 'Data', columns, data }) => {
    const ExcelJS = (await import('exceljs')).default;
    
    // load images for image columns
    const imageCols = columns.map((c, i) => c.isImage ? { ...c, index: i } : null).filter(Boolean);
    const imagesCache = {}; 
    
    for (let r = 0; r < data.length; r++) {
        imagesCache[r] = {};
        for (const col of imageCols) {
            const val = typeof col.key === 'function' ? col.key(data[r]) : data[r][col.key];
            imagesCache[r][col.index] = await loadImageAsDataUrl(val);
        }
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(sheetName);

    const headers = columns.map(c => c.header);
    const headerRow = sheet.addRow(headers);
    headerRow.height = 24;
    headerRow.eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    data.forEach((item, r) => {
        const rowValues = columns.map(c => c.isImage ? '' : (typeof c.key === 'function' ? c.key(item) : item[c.key]));
        const added = sheet.addRow(rowValues);
        added.height = imageCols.length > 0 ? 40 : 20;

        added.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            const cIdx = colNumber - 1;
            const colDef = columns[cIdx];
            cell.alignment = {
                vertical: 'middle',
                horizontal: colDef.align === 'left' ? 'left' : 'center',
                wrapText: colDef.align === 'left'
            };
            
            if (colDef.style) {
                const styleObj = colDef.style(rowValues[cIdx], item);
                if (styleObj) {
                    if (styleObj.bold || styleObj.fontColor) {
                        cell.font = { 
                            bold: styleObj.bold, 
                            color: styleObj.fontColor ? { argb: styleObj.fontColor } : undefined 
                        };
                    }
                }
            }
        });

        for (const imgCol of imageCols) {
            const base64 = imagesCache[r][imgCol.index];
            if (base64) {
                const imageId = workbook.addImage({ base64, extension: 'png' });
                sheet.addImage(imageId, {
                    tl: { col: imgCol.index + 0.15, row: r + 1 + 0.1 },
                    ext: { width: 46, height: 46 }
                });
            }
        }
    });

    columns.forEach((c, i) => {
        if (c.width) sheet.getColumn(i + 1).width = c.width;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    downloadBlob(blob, buildFileName(fileNamePrefix, 'xlsx'));
};

export const exportToPdf = async ({ fileNamePrefix = 'export', columns, data }) => {
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;

    const imageCols = columns.map((c, i) => c.isImage ? { ...c, index: i } : null).filter(Boolean);
    const imagesCache = {}; 
    for (let r = 0; r < data.length; r++) {
        imagesCache[r] = {};
        for (const col of imageCols) {
            const val = typeof col.key === 'function' ? col.key(data[r]) : data[r][col.key];
            imagesCache[r][col.index] = await loadImageAsDataUrl(val);
        }
    }

    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const headers = columns.map(c => c.header);
    const body = data.map(item => columns.map(c => c.isImage ? '' : (typeof c.key === 'function' ? c.key(item) : item[c.key])));

    const IMG_SIZE = 32;
    const columnStyles = {};
    columns.forEach((c, i) => {
        columnStyles[i] = { halign: c.align === 'left' ? 'left' : 'center' };
        if (c.pdfWidth) {
            columnStyles[i].cellWidth = c.pdfWidth;
        } else if (c.isImage) {
            columnStyles[i].cellWidth = Math.max(c.width ? c.width * 4 : 60, 60);
        }
    });

    autoTable(doc, {
        startY: 30,
        head: [headers],
        body: body,
        styles: { fontSize: 9, cellPadding: 5, valign: 'middle' },
        headStyles: { fillColor: [37, 99, 235], halign: 'center' },
        bodyStyles: { minCellHeight: imageCols.length > 0 ? IMG_SIZE + 10 : 20 },
        columnStyles: columnStyles,
        didParseCell: (hook) => {
            if (hook.section === 'body') {
                const cIdx = hook.column.index;
                const colDef = columns[cIdx];
                if (colDef.style) {
                    const val = body[hook.row.index][cIdx];
                    const item = data[hook.row.index];
                    const styleObj = colDef.style(val, item);
                    if (styleObj) {
                        if (styleObj.bold) hook.cell.styles.fontStyle = 'bold';
                        if (styleObj.pdfColor) hook.cell.styles.textColor = styleObj.pdfColor;
                    }
                }
            }
        },
        didDrawCell: (hook) => {
            if (hook.section === 'body') {
                const cIdx = hook.column.index;
                const isImgCol = imageCols.some(c => c.index === cIdx);
                if (isImgCol) {
                    const img = imagesCache[hook.row.index][cIdx];
                    if (img) {
                        doc.addImage(
                            img,
                            'PNG',
                            hook.cell.x + (hook.cell.width - IMG_SIZE) / 2,
                            hook.cell.y + (hook.cell.height - IMG_SIZE) / 2,
                            IMG_SIZE,
                            IMG_SIZE
                        );
                    }
                }
            }
        }
    });

    doc.save(buildFileName(fileNamePrefix, 'pdf'));
};
