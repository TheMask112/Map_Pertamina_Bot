package com.mapbot.pertamina.captcha

import android.graphics.BitmapFactory
import android.util.Base64
import org.opencv.android.Utils
import org.opencv.core.*
import org.opencv.imgproc.Imgproc

class CaptchaSolver {

    fun solveCaptchaBase64(bgBase64: String, sliderBase64: String): Pair<Float, Float>? {
        try {
            val bgBytes = Base64.decode(bgBase64, Base64.DEFAULT)
            val slBytes = Base64.decode(sliderBase64, Base64.DEFAULT)
            
            val bgBitmap = BitmapFactory.decodeByteArray(bgBytes, 0, bgBytes.size)
            val slBitmap = BitmapFactory.decodeByteArray(slBytes, 0, slBytes.size)

            val bgWidth = bgBitmap.width.toFloat()

            val bgMatRGBA = Mat()
            val slMatRGBA = Mat()
            Utils.bitmapToMat(bgBitmap, bgMatRGBA)
            Utils.bitmapToMat(slBitmap, slMatRGBA)

            // Convert background to RGB and Grayscale
            val bgMatRGB = Mat()
            val bgGray = Mat()
            Imgproc.cvtColor(bgMatRGBA, bgMatRGB, Imgproc.COLOR_RGBA2RGB)
            Imgproc.cvtColor(bgMatRGBA, bgGray, Imgproc.COLOR_RGBA2GRAY)

            // Split slider RGBA into channels to get Alpha
            val slChannels = ArrayList<Mat>()
            Core.split(slMatRGBA, slChannels)
            val slAlpha = slChannels[3]

            // Find bounding box of puzzle piece using alpha channel
            val contours = ArrayList<MatOfPoint>()
            val hierarchy = Mat()
            Imgproc.findContours(slAlpha, contours, hierarchy, Imgproc.RETR_EXTERNAL, Imgproc.CHAIN_APPROX_SIMPLE)
            
            if (contours.isEmpty()) return null

            var maxArea = 0.0
            var maxRect: Rect? = null
            for (c in contours) {
                val rect = Imgproc.boundingRect(c)
                val area = rect.area()
                if (area > maxArea) {
                    maxArea = area
                    maxRect = rect
                }
            }
            
            if (maxRect == null) return null

            // Crop slider RGB and Alpha mask
            val slRGB = Mat()
            Imgproc.cvtColor(slMatRGBA, slRGB, Imgproc.COLOR_RGBA2RGB)
            
            val croppedSlRGB = Mat(slRGB, maxRect)
            val croppedSlAlpha = Mat(slAlpha, maxRect)
            val croppedSlGray = Mat()
            Imgproc.cvtColor(croppedSlRGB, croppedSlGray, Imgproc.COLOR_RGB2GRAY)

            val bgCropRect = Rect(0, maxRect.y, bgWidth.toInt(), maxRect.height)
            val croppedBgGray = Mat(bgGray, bgCropRect)
            val croppedBgMatRGB = Mat(bgMatRGB, bgCropRect)

            // Method 1: Edge matching (TM_CCOEFF_NORMED)
            val bgBlur = Mat()
            Imgproc.GaussianBlur(croppedBgGray, bgBlur, Size(3.0, 3.0), 0.0)
            val bgEdge = Mat()
            val slEdge = Mat()
            Imgproc.Canny(bgBlur, bgEdge, 30.0, 90.0)
            // Deteksi edge puzzle menggunakan alpha mask
            val maskBinary = Mat()
            Imgproc.threshold(croppedSlAlpha, maskBinary, 127.0, 255.0, Imgproc.THRESH_BINARY)
            Imgproc.Canny(maskBinary, slEdge, 50.0, 150.0) 

            val resultEdge = Mat()
            Imgproc.matchTemplate(bgEdge, slEdge, resultEdge, Imgproc.TM_CCOEFF_NORMED)
            val mmrEdge = Core.minMaxLoc(resultEdge)

            // Method 2: Template matching dengan Mask (TM_CCORR_NORMED didukung untuk mask)
            val resultMask = Mat()
            Imgproc.matchTemplate(croppedBgMatRGB, croppedSlRGB, resultMask, Imgproc.TM_CCORR_NORMED, croppedSlAlpha)
            val mmrMask = Core.minMaxLoc(resultMask)

            // Method 3: Template matching Grayscale dengan Mask
            val resultGrayMask = Mat()
            Imgproc.matchTemplate(croppedBgGray, croppedSlGray, resultGrayMask, Imgproc.TM_CCORR_NORMED, croppedSlAlpha)
            val mmrGrayMask = Core.minMaxLoc(resultGrayMask)

            // Cleanup
            bgMatRGBA.release()
            slMatRGBA.release()
            bgMatRGB.release()
            bgGray.release()
            for (m in slChannels) m.release()
            hierarchy.release()
            slRGB.release()
            croppedSlRGB.release()
            croppedSlAlpha.release()
            croppedSlGray.release()
            bgBlur.release()
            bgEdge.release()
            maskBinary.release()
            slEdge.release()
            resultEdge.release()
            resultMask.release()
            resultGrayMask.release()
            croppedBgGray.release()
            croppedBgMatRGB.release()

            // Ambil konsensus dari ketiga metode. PENTING: Kurangi maxRect.x (posisi awal puzzle) dari koordinat hasil agar menjadi jarak drag sebenarnya!
            val strategies = listOf(
                mmrEdge.maxLoc.x.toFloat() - maxRect.x.toFloat(), 
                mmrMask.maxLoc.x.toFloat() - maxRect.x.toFloat(), 
                mmrGrayMask.maxLoc.x.toFloat() - maxRect.x.toFloat()
            )
            
            val valid = strategies.filter { it > 10f }.sorted()
            if (valid.isEmpty()) return null
    
            val clusters = mutableListOf<MutableList<Float>>()
            for (v in valid) {
                var added = false
                for (c in clusters) {
                    if (Math.abs(c.average() - v) <= 15.0) {
                        c.add(v)
                        added = true
                        break
                    }
                }
                if (!added) clusters.add(mutableListOf(v))
            }
    
            val bestCluster = clusters.maxByOrNull { it.size }
            val distance = bestCluster?.average()?.toFloat()

            return if (distance != null) Pair(distance, bgWidth) else null

        } catch (e: Exception) {
            return null
        }
    }
}
