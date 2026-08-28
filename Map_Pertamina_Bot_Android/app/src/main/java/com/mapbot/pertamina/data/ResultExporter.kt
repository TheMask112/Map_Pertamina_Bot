package com.mapbot.pertamina.data

import android.content.Context
import android.os.Environment
import org.apache.poi.xssf.usermodel.XSSFWorkbook
import java.io.File
import java.io.FileOutputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

object ResultExporter {
    fun exportToExcel(context: Context, nikList: List<NikData>): String? {
        try {
            val workbook = XSSFWorkbook()
            val sheet = workbook.createSheet("Hasil Bot MAP")
            
            val headerRow = sheet.createRow(0)
            headerRow.createCell(0).setCellValue("No")
            headerRow.createCell(1).setCellValue("NIK")
            headerRow.createCell(2).setCellValue("Status")
            headerRow.createCell(3).setCellValue("Keterangan")

            for ((i, data) in nikList.withIndex()) {
                val row = sheet.createRow(i + 1)
                row.createCell(0).setCellValue((i + 1).toDouble())
                row.createCell(1).setCellValue(data.nik)
                row.createCell(2).setCellValue(data.status)
                row.createCell(3).setCellValue(data.keterangan)
            }

            val downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
            val timeStamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())
            val fileName = "Hasil_MAP_$timeStamp.xlsx"
            val file = File(downloadsDir, fileName)

            FileOutputStream(file).use { out ->
                workbook.write(out)
            }
            workbook.close()
            
            return file.absolutePath
        } catch (e: Exception) {
            e.printStackTrace()
            return null
        }
    }
}
