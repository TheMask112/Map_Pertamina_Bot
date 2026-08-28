package com.mapbot.pertamina.data

import android.content.Context
import android.net.Uri
import android.util.Log
import org.apache.poi.ss.usermodel.CellType
import org.apache.poi.ss.usermodel.WorkbookFactory
import java.io.InputStream
import java.math.BigDecimal

object ExcelReader {
    private const val TAG = "ExcelReader"

    fun readNikFromExcel(context: Context, uri: Uri): List<NikData> {
        val nikList = mutableListOf<NikData>()
        var inputStream: InputStream? = null
        try {
            inputStream = context.contentResolver.openInputStream(uri)
            if (inputStream == null) {
                Log.e(TAG, "InputStream is null")
                return emptyList()
            }
            val workbook = WorkbookFactory.create(inputStream)
            val sheet = workbook.getSheetAt(0)
            
            var nikColIdx = -1
            val headerRow = sheet.getRow(0)
            if (headerRow != null) {
                for (cell in headerRow) {
                    val txt = getCellStringValue(cell)
                    if (txt.contains("NIK", ignoreCase = true)) {
                        nikColIdx = cell.columnIndex
                        break
                    }
                }
            }

            if (nikColIdx == -1) nikColIdx = 0

            for (i in 1..sheet.lastRowNum) {
                val row = sheet.getRow(i) ?: continue
                val cell = row.getCell(nikColIdx) ?: continue
                
                val rawVal = getCellStringValue(cell)
                val nikStr = rawVal.replace(Regex("[^0-9]"), "")
                if (nikStr.length == 16) {
                    nikList.add(NikData(index = i, nik = nikStr))
                }
            }
            workbook.close()
            Log.d(TAG, "Successfully loaded ${nikList.size} NIKs from Excel")
        } catch (t: Throwable) {
            Log.e(TAG, "Error reading Excel file: ${t.message}", t)
        } finally {
            try {
                inputStream?.close()
            } catch (_: Exception) {}
        }
        return nikList
    }

    private fun getCellStringValue(cell: org.apache.poi.ss.usermodel.Cell): String {
        return try {
            when (cell.cellType) {
                CellType.STRING -> cell.stringCellValue.trim()
                CellType.NUMERIC -> {
                    val num = cell.numericCellValue
                    BigDecimal.valueOf(num).toPlainString().replace(Regex("\\.0+$"), "")
                }
                CellType.BOOLEAN -> cell.booleanCellValue.toString()
                CellType.FORMULA -> {
                    try {
                        cell.stringCellValue.trim()
                    } catch (_: Exception) {
                        try {
                            BigDecimal.valueOf(cell.numericCellValue).toPlainString().replace(Regex("\\.0+$"), "")
                        } catch (_: Exception) {
                            ""
                        }
                    }
                }
                else -> ""
            }
        } catch (_: Exception) {
            cell.toString().trim()
        }
    }
}
