package com.mapbot.pertamina.data

import android.net.Uri
import android.content.Context
import org.apache.poi.ss.usermodel.WorkbookFactory
import java.io.InputStream

object ExcelReader {
    fun readNikFromExcel(context: Context, uri: Uri): List<NikData> {
        val nikList = mutableListOf<NikData>()
        var inputStream: InputStream? = null
        try {
            inputStream = context.contentResolver.openInputStream(uri)
            val workbook = WorkbookFactory.create(inputStream)
            val sheet = workbook.getSheetAt(0)
            
            var nikColIdx = -1
            val headerRow = sheet.getRow(0)
            if (headerRow != null) {
                for (cell in headerRow) {
                    if (cell.toString().contains("NIK", ignoreCase = true)) {
                        nikColIdx = cell.columnIndex
                        break
                    }
                }
            }

            if (nikColIdx == -1) nikColIdx = 0

            for (i in 1..sheet.lastRowNum) {
                val row = sheet.getRow(i) ?: continue
                val cell = row.getCell(nikColIdx) ?: continue
                
                var nikStr = cell.toString().replace(".0", "").replace("E15", "").replace(Regex("[^0-9]"), "")
                if (nikStr.length == 16) {
                    nikList.add(NikData(index = i, nik = nikStr))
                }
            }
            workbook.close()
        } catch (e: Exception) {
            e.printStackTrace()
        } finally {
            inputStream?.close()
        }
        return nikList
    }
}
