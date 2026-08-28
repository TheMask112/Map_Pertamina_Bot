package com.mapbot.pertamina.data

import android.content.Context
import android.net.Uri
import com.mapbot.pertamina.util.Constants
import org.apache.poi.xssf.usermodel.XSSFWorkbook
import java.io.OutputStream

object ExcelWriter {
    fun writeSuccessfulNik(context: Context, uri: Uri, nikList: List<NikData>): Boolean {
        var outputStream: OutputStream? = null
        try {
            val successfulNiks = nikList.filter { it.status == Constants.STATUS_SUKSES }
            
            val workbook = XSSFWorkbook()
            val sheet = workbook.createSheet("Berhasil")
            
            // Header
            val headerRow = sheet.createRow(0)
            headerRow.createCell(0).setCellValue("NO")
            headerRow.createCell(1).setCellValue("NIK")
            headerRow.createCell(2).setCellValue("STATUS")
            headerRow.createCell(3).setCellValue("KETERANGAN")
            
            // Data
            successfulNiks.forEachIndexed { index, data ->
                val row = sheet.createRow(index + 1)
                row.createCell(0).setCellValue((index + 1).toDouble())
                row.createCell(1).setCellValue(data.nik)
                row.createCell(2).setCellValue(data.status)
                row.createCell(3).setCellValue(data.keterangan)
            }
            
            outputStream = context.contentResolver.openOutputStream(uri)
            if (outputStream != null) {
                workbook.write(outputStream)
                workbook.close()
                return true
            }
            workbook.close()
        } catch (e: Exception) {
            e.printStackTrace()
        } finally {
            outputStream?.close()
        }
        return false
    }

    fun writeSuccessfulNikToFile(context: Context, file: java.io.File, nikList: List<NikData>): Boolean {
        var outputStream: OutputStream? = null
        try {
            val successfulNiks = nikList.filter { it.status == Constants.STATUS_SUKSES }
            
            val workbook = XSSFWorkbook()
            val sheet = workbook.createSheet("Berhasil")
            
            val headerRow = sheet.createRow(0)
            headerRow.createCell(0).setCellValue("NO")
            headerRow.createCell(1).setCellValue("NIK")
            headerRow.createCell(2).setCellValue("STATUS")
            headerRow.createCell(3).setCellValue("KETERANGAN")
            
            successfulNiks.forEachIndexed { index, data ->
                val row = sheet.createRow(index + 1)
                row.createCell(0).setCellValue((index + 1).toDouble())
                row.createCell(1).setCellValue(data.nik)
                row.createCell(2).setCellValue(data.status)
                row.createCell(3).setCellValue(data.keterangan)
            }
            
            outputStream = java.io.FileOutputStream(file)
            workbook.write(outputStream)
            workbook.close()
            return true
        } catch (e: Exception) {
            e.printStackTrace()
        } finally {
            outputStream?.close()
        }
        return false
    }
}
