package com.mapbot.pertamina.captcha

import android.graphics.RectF
import com.mapbot.pertamina.engine.WebViewManager
import com.mapbot.pertamina.util.Constants
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume
import kotlin.coroutines.suspendCoroutine
import org.json.JSONObject

class CaptchaExtractor(private val wvManager: WebViewManager) {
    suspend fun extractCaptchaImages(): Pair<String, String>? = suspendCoroutine { cont ->
        wvManager.getBridge().setOnCaptchaImagesReady { bg, slider ->
            cont.resume(Pair(bg, slider))
        }
        wvManager.executeJs("""
            (function() {
                // [OPSI A] ANTI-INTERCEPT: Sembunyikan semua overlay/loading yang menutupi layar
                var overlays = document.querySelectorAll('.ant-modal-mask, .ant-spin, .loading, .overlay, [class*="mask"], [class*="overlay"], [class*="spinner"], [class*="backdrop"]');
                overlays.forEach(function(el) {
                    try {
                        el.style.display = 'none';
                        el.style.pointerEvents = 'none';
                        // JANGAN gunakan removeChild karena akan membuat React crash (Failed to execute removeChild on Node)
                    } catch(e) {}
                });

                var bgImg = document.querySelector('${Constants.CAPTCHA_BG_IMG}');
                var sliderImg = document.querySelector('${Constants.CAPTCHA_SLIDER_IMG}');
                var sliderBtn = document.querySelector('${Constants.SLIDER_HANDLE}');
                
                if (bgImg && sliderImg) {
                    // Paksa popup captcha muncul di atas dan terlihat jelas
                    var popup = bgImg.closest('.rc-slider-captcha, .captcha-modal, [role="dialog"]') || bgImg.parentElement.parentElement.parentElement;
                    if (popup) {
                        // JANGAN Pindahkan ke document.body! (Itu merusak React Event Delegation)
                        // Sebagai gantinya, paksa SEMUA parent untuk visible agar tidak tersembunyi
                        var p = popup;
                        while(p && p !== document.body) {
                            p.style.display = 'block';
                            p.style.visibility = 'visible';
                            p.style.opacity = '1';
                            p.style.overflow = 'visible';
                            p.style.clipPath = 'none';
                            p = p.parentElement;
                        }
                        
                        popup.style.position = 'fixed';
                        popup.style.top = '10px';
                        popup.style.left = '10px';
                        popup.style.zIndex = '2147483647';
                        popup.style.transform = 'none';
                        popup.style.pointerEvents = 'auto';
                    }
                    
                    if (sliderBtn) {
                        sliderBtn.style.pointerEvents = 'auto'; // Pastikan tombol bisa diklik
                    }
                    
                    // Scroll captcha ke tengah layar agar terlihat dan bisa disentuh
                    bgImg.scrollIntoView({behavior: 'instant', block: 'center'});
                    
                    var bgSrc = bgImg.getAttribute('src') || '';
                    var slSrc = sliderImg.getAttribute('src') || '';
                    if (bgSrc.includes('base64,') && slSrc.includes('base64,')) {
                        var bgData = bgSrc.split('base64,')[1];
                        var slData = slSrc.split('base64,')[1];
                        AndroidBot.onCaptchaImages(bgData, slData);
                        return 'ok';
                    }
                }
                AndroidBot.onCaptchaImages('', '');
                return 'not_found';
            })()
        """)
    }
    
    // [OPSI B] PURE JS EVENT DISPATCHER (Bypass Android Native Touch)
    suspend fun simulateDragJs(distance: Float): Boolean = suspendCoroutine { cont ->
        wvManager.executeJs("""
            (function() {
                var btn = document.querySelector('${Constants.SLIDER_HANDLE}');
                if (!btn) return 'fail';
                
                var rect = btn.getBoundingClientRect();
                var startX = rect.left + rect.width / 2;
                var startY = rect.top + rect.height / 2;
                var endX = startX + $distance;
                
                function sendMouseEvent(type, x, y) {
                    var ev = new MouseEvent(type, { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y, screenX: x, screenY: y });
                    btn.dispatchEvent(ev);
                }
                function sendTouchEvent(type, x, y) {
                    try {
                        var touch = new Touch({ identifier: Date.now(), target: btn, clientX: x, clientY: y, pageX: x, pageY: y });
                        var ev = new TouchEvent(type, { bubbles: true, cancelable: true, view: window, touches: [touch], targetTouches: [touch], changedTouches: [touch] });
                        btn.dispatchEvent(ev);
                    } catch(e) {}
                }
                
                sendMouseEvent('mousedown', startX, startY);
                sendTouchEvent('touchstart', startX, startY);
                
                var steps = 30;
                var currentStep = 0;
                
                var interval = setInterval(function() {
                    currentStep++;
                    var progress = currentStep / steps;
                    var eased = 0.5 - Math.cos(progress * Math.PI) / 2; // Ease in out
                    var cx = startX + ((endX - startX) * eased);
                    var cy = startY + (Math.random() * 2 - 1);
                    
                    sendMouseEvent('mousemove', cx, cy);
                    sendTouchEvent('touchmove', cx, cy);
                    
                    if (currentStep >= steps) {
                        clearInterval(interval);
                        sendMouseEvent('mouseup', endX, startY);
                        sendTouchEvent('touchend', endX, startY);
                    }
                }, 20); // 600ms total drag
                
                return 'ok';
            })()
        """) {
            cont.resume(true)
        }
    }

    suspend fun getSliderHandleRect(): Pair<RectF, Float>? = suspendCoroutine { cont ->
        wvManager.executeJs("""
            (function() {
                var handle = document.querySelector('${Constants.SLIDER_HANDLE}');
                if (handle) {
                    var rect = handle.getBoundingClientRect();
                    return JSON.stringify({
                        left: rect.left, top: rect.top,
                        width: rect.width, height: rect.height,
                        innerWidth: window.innerWidth
                    });
                }
                return 'null';
            })()
        """) { result ->
            val cleanResult = result.replace("\\\"", "\"").trim('"')
            if (cleanResult != "null" && cleanResult.isNotBlank()) {
                try {
                    val json = JSONObject(cleanResult)
                    val left = json.getDouble("left").toFloat()
                    val top = json.getDouble("top").toFloat()
                    val width = json.getDouble("width").toFloat()
                    val height = json.getDouble("height").toFloat()
                    val innerWidth = json.getDouble("innerWidth").toFloat()
                    cont.resume(Pair(RectF(left, top, left + width, top + height), innerWidth))
                } catch (e: Exception) {
                    cont.resume(null)
                }
            } else {
                cont.resume(null)
            }
        }
    }

    suspend fun getBgImageRect(): RectF? = suspendCoroutine { cont ->
        wvManager.executeJs("""
            (function() {
                var bg = document.querySelector('${Constants.CAPTCHA_BG_IMG}');
                if (bg) {
                    var rect = bg.getBoundingClientRect();
                    return JSON.stringify({
                        left: rect.left, top: rect.top,
                        width: rect.width, height: rect.height
                    });
                }
                return 'null';
            })()
        """) { result ->
            val cleanResult = result.replace("\\\"", "\"").trim('"')
            if (cleanResult != "null" && cleanResult.isNotBlank()) {
                try {
                    val json = JSONObject(cleanResult)
                    val left = json.getDouble("left").toFloat()
                    val top = json.getDouble("top").toFloat()
                    val width = json.getDouble("width").toFloat()
                    val height = json.getDouble("height").toFloat()
                    cont.resume(RectF(left, top, left + width, top + height))
                } catch (e: Exception) {
                    cont.resume(null)
                }
            } else {
                cont.resume(null)
            }
        }
    }
}
