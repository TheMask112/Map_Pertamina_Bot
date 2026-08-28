package com.mapbot.pertamina

import android.app.Application
import android.util.Log
import org.opencv.android.OpenCVLoader

class App : Application() {
    override fun onCreate() {
        super.onCreate()
        if (!OpenCVLoader.initLocal()) {
            Log.e("App", "OpenCV initialization failed!")
        } else {
            Log.d("App", "OpenCV initialization succeeded!")
        }
    }
}
