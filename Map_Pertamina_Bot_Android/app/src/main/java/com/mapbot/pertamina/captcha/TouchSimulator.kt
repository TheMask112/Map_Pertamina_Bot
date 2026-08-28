package com.mapbot.pertamina.captcha

import android.os.SystemClock
import android.view.InputDevice
import android.view.MotionEvent
import android.webkit.WebView
import kotlinx.coroutines.delay
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.PI
import kotlin.random.Random

class TouchSimulator(private val webView: WebView) {

    suspend fun dragHumanLike(startX: Float, startY: Float, endX: Float, endY: Float) {
        val downTime = SystemClock.uptimeMillis()
        var eventTime = downTime

        // 1. ACTION_DOWN
        val downEvent = MotionEvent.obtain(downTime, eventTime, MotionEvent.ACTION_DOWN, startX, startY, 0).apply {
            source = InputDevice.SOURCE_TOUCHSCREEN
        }
        webView.dispatchTouchEvent(downEvent)
        downEvent.recycle()
        delay(Random.nextLong(100, 300))

        val distance = endX - startX
        val steps = Random.nextInt(30, 50)
        
        // Overshoot mechanism
        val overshootAmount = if (Random.nextBoolean()) Random.nextFloat() * 10f else 0f
        val targetX = endX + overshootAmount
        
        // 2. ACTION_MOVE
        for (i in 0..steps) {
            val progress = i.toFloat() / steps
            
            // Ease in-out
            val easedProgress = (0.5 - cos(progress * PI) / 2).toFloat()
            
            val currentX = startX + (targetX - startX) * easedProgress
            
            // Tambahkan jitter Y (tangan gemetar)
            val jitterY = startY + (Random.nextFloat() * 4 - 2)
            
            eventTime += Random.nextLong(10, 25)
            val moveEvent = MotionEvent.obtain(downTime, eventTime, MotionEvent.ACTION_MOVE, currentX, jitterY, 0).apply {
                source = InputDevice.SOURCE_TOUCHSCREEN
            }
            webView.dispatchTouchEvent(moveEvent)
            moveEvent.recycle()
            
            delay(Random.nextLong(5, 15))
        }

        // Koreksi Overshoot
        if (overshootAmount > 0) {
            delay(Random.nextLong(50, 150))
            val correctionSteps = Random.nextInt(5, 10)
            for (i in 0..correctionSteps) {
                val currentX = targetX - (overshootAmount * (i.toFloat() / correctionSteps))
                val jitterY = startY + (Random.nextFloat() * 2 - 1)
                
                eventTime += Random.nextLong(10, 20)
                val moveEvent = MotionEvent.obtain(downTime, eventTime, MotionEvent.ACTION_MOVE, currentX, jitterY, 0).apply {
                    source = InputDevice.SOURCE_TOUCHSCREEN
                }
                webView.dispatchTouchEvent(moveEvent)
                moveEvent.recycle()
                
                delay(Random.nextLong(5, 15))
            }
        }

        delay(Random.nextLong(150, 400)) // Pause sblm lepas
        
        // 3. ACTION_UP
        eventTime += Random.nextLong(10, 30)
        val upEvent = MotionEvent.obtain(downTime, eventTime, MotionEvent.ACTION_UP, endX, startY, 0).apply {
            source = InputDevice.SOURCE_TOUCHSCREEN
        }
        webView.dispatchTouchEvent(upEvent)
        upEvent.recycle()
    }

    suspend fun tapHumanLike(x: Float, y: Float) {
        val downTime = SystemClock.uptimeMillis()
        val eventTime = downTime

        val downEvent = MotionEvent.obtain(downTime, eventTime, MotionEvent.ACTION_DOWN, x, y, 0).apply {
            source = InputDevice.SOURCE_TOUCHSCREEN
        }
        webView.dispatchTouchEvent(downEvent)
        downEvent.recycle()

        delay(Random.nextLong(60, 120))

        val upTime = SystemClock.uptimeMillis()
        val upEvent = MotionEvent.obtain(downTime, upTime, MotionEvent.ACTION_UP, x, y, 0).apply {
            source = InputDevice.SOURCE_TOUCHSCREEN
        }
        webView.dispatchTouchEvent(upEvent)
        upEvent.recycle()
    }
}
